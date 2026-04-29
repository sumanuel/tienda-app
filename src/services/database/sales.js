import { db } from "./db";
import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as limitDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, firestore } from "../firebase/firebase";
import { handleCloudAccessError } from "../firebase/cloudAccess";
import {
  formatConsecutiveNumber,
  getNextCloudConsecutive,
  parseConsecutiveSequence,
} from "./consecutives";
import { assertSharedStoreCloudWriteAvailable } from "./cloudWriteGuard";
import {
  getActiveStoreSeedKey,
  getStoreCollectionRef,
  getStoreDocRef,
  hasActiveStoreContext,
} from "../store/storeRefs";

const cloudSalesSeeded = new Set();
const CLOUD_SALES_SEED_VERSION = 1;
const cloudSalesCache = new Map();

const isCloudSalesEnabled = () =>
  Boolean(auth.currentUser?.uid) && hasActiveStoreContext();

const createCloudNumericId = () =>
  Number(
    `${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`,
  );

const getSalesCollectionRef = () => getStoreCollectionRef("sales");

const getProductsCollectionRef = () => getStoreCollectionRef("products");

const getStoreSeedState = async () => {
  const snapshot = await getDoc(getStoreDocRef());
  return snapshot.data() || {};
};

const getUniqueProductIdsFromSaleItems = (items = []) => [
  ...new Set(
    (items || [])
      .map((item) => Number(item?.productId) || 0)
      .filter((productId) => productId > 0),
  ),
];

const buildProductSalesCountMap = (sales = []) => {
  return sales.reduce((acc, sale) => {
    if (sale?.status === "cancelled") {
      return acc;
    }

    getUniqueProductIdsFromSaleItems(sale.items).forEach((productId) => {
      acc[String(productId)] = (Number(acc[String(productId)]) || 0) + 1;
    });

    return acc;
  }, {});
};

const persistCloudProductSalesCounts = async (counts = {}) => {
  await setDoc(
    getStoreDocRef(),
    {
      metrics: {
        productSalesCounts: counts,
      },
    },
    { merge: true },
  );
};

const applyCloudProductSalesCountsDelta = async (items = [], delta = 0) => {
  const normalizedDelta = Number(delta) || 0;
  if (normalizedDelta === 0) {
    return;
  }

  const productIds = getUniqueProductIdsFromSaleItems(items);
  if (productIds.length === 0) {
    return;
  }

  const storeData = await getStoreSeedState();
  const currentCounts = {
    ...(storeData?.metrics?.productSalesCounts || {}),
  };

  productIds.forEach((productId) => {
    const key = String(productId);
    const nextValue = Math.max(
      0,
      (Number(currentCounts[key]) || 0) + normalizedDelta,
    );

    if (nextValue > 0) {
      currentCounts[key] = nextValue;
      return;
    }

    delete currentCounts[key];
  });

  await persistCloudProductSalesCounts(currentCounts);
};

const getCloudSalesCacheKey = () => getActiveStoreSeedKey() || "default";

const clearCloudSalesCache = () => {
  cloudSalesCache.delete(getCloudSalesCacheKey());
};

const getLocalSalesSeedStats = async () => {
  const result = await db.getFirstAsync(
    `SELECT COUNT(*) as totalCount,
            COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) as cancelledCount
     FROM sales;`,
  );

  return {
    totalCount: Number(result?.totalCount) || 0,
    cancelledCount: Number(result?.cancelledCount) || 0,
  };
};

const getLocalProductSalesCountMap = async () => {
  const rows = await db.getAllAsync(
    `SELECT si.productId as productId,
            COUNT(DISTINCT s.id) as count
     FROM sales s
     INNER JOIN sale_items si ON si.saleId = s.id
     WHERE s.status != 'cancelled'
       AND si.productId IS NOT NULL
     GROUP BY si.productId;`,
  );

  return rows.reduce((acc, row) => {
    const productId = Number(row?.productId) || 0;
    if (productId <= 0) {
      return acc;
    }

    acc[String(productId)] = Number(row?.count) || 0;
    return acc;
  }, {});
};

const persistSalesSeedState = async (stats) => {
  await setDoc(
    getStoreDocRef(),
    {
      seedState: {
        sales: {
          version: CLOUD_SALES_SEED_VERSION,
          localSalesCount: Number(stats?.totalCount) || 0,
          localCancelledCount: Number(stats?.cancelledCount) || 0,
          checkedAt: new Date().toISOString(),
        },
      },
    },
    { merge: true },
  );
};

const canSkipSalesSeed = async () => {
  const [storeData, localStats] = await Promise.all([
    getStoreSeedState(),
    getLocalSalesSeedStats(),
  ]);

  const seedState = storeData?.seedState?.sales;
  const remoteCount = Number(storeData?.counters?.sale) || 0;

  if (seedState?.version !== CLOUD_SALES_SEED_VERSION) {
    return false;
  }

  return (
    Number(seedState?.localSalesCount) === localStats.totalCount &&
    Number(seedState?.localCancelledCount) === localStats.cancelledCount &&
    remoteCount >= localStats.totalCount
  );
};

const normalizeSaleItem = (item = {}) => ({
  productId: Number(item.productId) || 0,
  productName: String(item.productName || "").trim(),
  quantity: Number(item.quantity) || 0,
  price: Number(item.price) || 0,
  priceUSD: Number(item.priceUSD) || 0,
  subtotal:
    Number(item.subtotal) ||
    (Number(item.quantity) || 0) * (Number(item.price) || 0),
});

const normalizeSaleRecord = (sale = {}) => {
  const items = Array.isArray(sale.items)
    ? sale.items.map(normalizeSaleItem)
    : [];
  const totalUSD = items.reduce(
    (sum, item) =>
      sum + (Number(item.priceUSD) || 0) * (Number(item.quantity) || 0),
    0,
  );

  return {
    id:
      Number(sale.id) ||
      parseConsecutiveSequence(sale.saleNumber) ||
      createCloudNumericId(),
    saleNumber:
      String(sale.saleNumber || "").trim() ||
      formatConsecutiveNumber("sale", sale.id),
    customerId:
      sale.customerId != null
        ? Number(sale.customerId) || sale.customerId
        : null,
    subtotal: Number(sale.subtotal) || 0,
    tax: Number(sale.tax) || 0,
    discount: Number(sale.discount) || 0,
    total: Number(sale.total) || 0,
    currency: String(sale.currency || "VES"),
    exchangeRate: Number(sale.exchangeRate) || 0,
    paymentMethod: String(sale.paymentMethod || ""),
    paid: Number(sale.paid) || 0,
    change: Number(sale.change) || 0,
    status: String(sale.status || "completed"),
    notes: String(sale.notes || ""),
    createdAt: sale.createdAt || new Date().toISOString(),
    items,
    itemCount: items.length,
    totalUSD,
  };
};

const sortSalesByDateDesc = (sales = []) =>
  [...sales].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

const chunkArray = (items = [], size = 300) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const getLocalSaleItemsBySaleIds = async (saleIds = []) => {
  const normalizedIds = [
    ...new Set((saleIds || []).map((id) => Number(id)).filter(Boolean)),
  ];

  if (normalizedIds.length === 0) {
    return new Map();
  }

  const placeholders = normalizedIds.map(() => "?").join(",");
  const saleItems = await db.getAllAsync(
    `SELECT * FROM sale_items WHERE saleId IN (${placeholders});`,
    normalizedIds,
  );

  return saleItems.reduce((acc, item) => {
    const saleId = Number(item.saleId) || 0;
    if (!acc.has(saleId)) {
      acc.set(saleId, []);
    }
    acc.get(saleId).push(item);
    return acc;
  }, new Map());
};

const getCloudSales = async () => {
  const cacheKey = getCloudSalesCacheKey();
  const cachedSales = cloudSalesCache.get(cacheKey);
  if (cachedSales) {
    return [...cachedSales];
  }

  const snapshot = await getDocs(getSalesCollectionRef());
  const sales = snapshot.docs.map((item) => normalizeSaleRecord(item.data()));
  cloudSalesCache.set(cacheKey, sales);
  return [...sales];
};

const getRecentCloudSales = async (maxItems = 100) => {
  const normalizedLimit = Number.isFinite(maxItems)
    ? Math.max(1, Math.trunc(maxItems))
    : null;

  if (!normalizedLimit) {
    return getCloudSales();
  }

  const snapshot = await getDocs(
    query(
      getSalesCollectionRef(),
      orderBy("createdAt", "desc"),
      limitDocs(normalizedLimit),
    ),
  );

  return snapshot.docs.map((item) => normalizeSaleRecord(item.data()));
};

const getCloudSalesByIds = async (saleIds = []) => {
  const uniqueIds = [
    ...new Set((saleIds || []).map((id) => Number(id)).filter(Boolean)),
  ];

  if (uniqueIds.length === 0) {
    return [];
  }

  const snapshots = await Promise.all(
    uniqueIds.map((id) => getDoc(doc(getSalesCollectionRef(), String(id)))),
  );

  return snapshots
    .filter((snapshot) => snapshot.exists())
    .map((snapshot) => normalizeSaleRecord(snapshot.data()));
};

const getCloudProductCostByIds = async (productIds = []) => {
  const uniqueIds = [
    ...new Set((productIds || []).map((id) => Number(id)).filter(Boolean)),
  ];

  if (uniqueIds.length === 0) {
    return {};
  }

  const snapshots = await Promise.all(
    uniqueIds.map((id) => getDoc(doc(getProductsCollectionRef(), String(id)))),
  );

  return snapshots.reduce((acc, snapshot) => {
    if (!snapshot.exists()) {
      return acc;
    }

    const product = snapshot.data() || {};
    acc[Number(product.id) || Number(snapshot.id) || 0] =
      Number(product.cost) || 0;
    return acc;
  }, {});
};

const getCloudCompletedSalesInRange = async (startIso, endIso) => {
  const snapshot = await getDocs(
    query(
      getSalesCollectionRef(),
      where("createdAt", ">=", startIso),
      where("createdAt", "<", endIso),
      orderBy("createdAt", "desc"),
    ),
  );

  return snapshot.docs
    .map((item) => normalizeSaleRecord(item.data()))
    .filter((item) => item.status === "completed");
};

const getCloudSalesInRange = async (startIso, endIso) => {
  const snapshot = await getDocs(
    query(
      getSalesCollectionRef(),
      where("createdAt", ">=", startIso),
      where("createdAt", "<=", endIso),
      orderBy("createdAt", "desc"),
    ),
  );

  return snapshot.docs.map((item) => normalizeSaleRecord(item.data()));
};

const normalizeExistingCloudSales = async (existingSnapshot) => {
  const collectionRef = getSalesCollectionRef();

  const existingRows = existingSnapshot.docs
    .map((item) => normalizeSaleRecord(item.data()))
    .sort((a, b) => {
      const createdDiff =
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime();
      if (createdDiff !== 0) return createdDiff;
      return Number(a.id) - Number(b.id);
    });

  const requiresNormalization = existingSnapshot.docs.some((item, index) => {
    const targetId = index + 1;
    const data = normalizeSaleRecord(item.data());
    return Number(data.id) !== targetId || item.id !== String(targetId);
  });

  if (!requiresNormalization) {
    await setDoc(
      getStoreDocRef(),
      {
        counters: {
          sale: existingRows.length,
        },
      },
      { merge: true },
    );
    await persistCloudProductSalesCounts(
      buildProductSalesCountMap(existingRows),
    );
    return;
  }

  for (let index = 0; index < existingSnapshot.docs.length; index += 300) {
    const batch = writeBatch(firestore);
    existingSnapshot.docs.slice(index, index + 300).forEach((item) => {
      batch.delete(item.ref);
    });
    await batch.commit();
  }

  for (let index = 0; index < existingRows.length; index += 300) {
    const batch = writeBatch(firestore);
    existingRows.slice(index, index + 300).forEach((item, offset) => {
      const sequence = index + offset + 1;
      batch.set(
        doc(collectionRef, String(sequence)),
        {
          ...item,
          id: sequence,
          saleNumber: formatConsecutiveNumber("sale", sequence),
        },
        { merge: false },
      );
    });
    await batch.commit();
  }

  await setDoc(
    getStoreDocRef(),
    {
      counters: {
        sale: existingRows.length,
      },
    },
    { merge: true },
  );

  await persistCloudProductSalesCounts(buildProductSalesCountMap(existingRows));
  await persistSalesSeedState(await getLocalSalesSeedStats());
};

const mergeMissingLocalSalesIntoCloud = async () => {
  const collectionRef = getSalesCollectionRef();
  const existingSnapshot = await getDocs(collectionRef);
  const existingRows = existingSnapshot.docs.map((item) =>
    normalizeSaleRecord(item.data()),
  );
  const existingIds = new Set(
    existingSnapshot.docs.map(
      (item) => Number(item.data()?.id) || Number(item.id) || 0,
    ),
  );

  const salesRows = await db.getAllAsync(
    "SELECT * FROM sales ORDER BY createdAt DESC;",
  );
  const saleItemsBySaleId = await getLocalSaleItemsBySaleIds(
    salesRows.map((saleRow) => saleRow.id),
  );

  const missingRows = [];
  for (const saleRow of salesRows) {
    const normalizedId = Number(saleRow?.id) || 0;
    if (normalizedId <= 0 || existingIds.has(normalizedId)) {
      continue;
    }

    missingRows.push(
      normalizeSaleRecord({
        ...saleRow,
        items: saleItemsBySaleId.get(Number(saleRow.id)) || [],
      }),
    );
  }

  if (missingRows.length > 0) {
    for (const rowsChunk of chunkArray(missingRows, 300)) {
      const batch = writeBatch(firestore);
      rowsChunk.forEach((row) => {
        batch.set(doc(collectionRef, String(row.id)), row, { merge: true });
      });
      await batch.commit();
    }
  }

  await setDoc(
    getStoreDocRef(),
    {
      counters: {
        sale: existingIds.size + missingRows.length,
      },
    },
    { merge: true },
  );

  await persistCloudProductSalesCounts(
    buildProductSalesCountMap([...existingRows, ...missingRows]),
  );
  await persistSalesSeedState(await getLocalSalesSeedStats());
};

const ensureCloudSalesSeeded = async () => {
  if (!isCloudSalesEnabled()) return;

  const seedKey = getActiveStoreSeedKey();
  if (cloudSalesSeeded.has(seedKey)) return;

  if (await canSkipSalesSeed()) {
    const storeData = await getStoreSeedState();
    if (!storeData?.metrics?.productSalesCounts) {
      await persistCloudProductSalesCounts(
        await getLocalProductSalesCountMap(),
      );
    }
    cloudSalesSeeded.add(seedKey);
    return;
  }

  const collectionRef = getSalesCollectionRef();
  const existingSnapshot = await getDocs(collectionRef);
  if (!existingSnapshot.empty) {
    await normalizeExistingCloudSales(existingSnapshot);
    await mergeMissingLocalSalesIntoCloud();
    cloudSalesSeeded.add(seedKey);
    return;
  }

  const salesRows = await db.getAllAsync(
    "SELECT * FROM sales ORDER BY createdAt DESC;",
  );
  if (salesRows.length > 0) {
    const saleItemsBySaleId = await getLocalSaleItemsBySaleIds(
      salesRows.map((saleRow) => saleRow.id),
    );

    const normalizedRows = salesRows.map((saleRow) =>
      normalizeSaleRecord({
        ...saleRow,
        items: saleItemsBySaleId.get(Number(saleRow.id)) || [],
      }),
    );

    for (const rowsChunk of chunkArray(normalizedRows, 300)) {
      const batch = writeBatch(firestore);
      rowsChunk.forEach((normalized) => {
        batch.set(doc(collectionRef, String(normalized.id)), normalized, {
          merge: true,
        });
      });
      await batch.commit();
    }

    await setDoc(
      getStoreDocRef(),
      {
        counters: {
          sale: salesRows.length,
        },
      },
      { merge: true },
    );

    await persistCloudProductSalesCounts(
      buildProductSalesCountMap(normalizedRows),
    );
  }

  await persistSalesSeedState(await getLocalSalesSeedStats());

  clearCloudSalesCache();
  cloudSalesSeeded.add(seedKey);
};

const getTodayUtcRangeForDevice = () => {
  // Start/end of today's date in the device's local timezone.
  // Converting to ISO gives us the equivalent UTC boundaries.
  const startLocal = new Date();
  startLocal.setHours(0, 0, 0, 0);
  const endLocal = new Date(startLocal);
  endLocal.setDate(endLocal.getDate() + 1);

  return {
    startIso: startLocal.toISOString(),
    endIso: endLocal.toISOString(),
  };
};

/**
 * Inicializa la tabla de ventas
 */
export const initSalesTable = async () => {
  try {
    // Tabla de ventas
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerId INTEGER,
        subtotal REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        total REAL DEFAULT 0,
        currency TEXT DEFAULT 'VES',
        exchangeRate REAL DEFAULT 0,
        paymentMethod TEXT,
        paid REAL DEFAULT 0,
        change REAL DEFAULT 0,
        status TEXT DEFAULT 'completed',
        notes TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );`,
    );

    // Tabla de items de venta
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        saleId INTEGER NOT NULL,
        productId INTEGER NOT NULL,
        productName TEXT NOT NULL,
        quantity REAL NOT NULL,
        price REAL NOT NULL,
        priceUSD REAL DEFAULT 0,
        subtotal REAL NOT NULL,
        FOREIGN KEY (saleId) REFERENCES sales(id)
      );`,
    );
  } catch (error) {
    if (handleCloudAccessError(error, "sales:getAll")) {
      return;
    }
    throw error;
  }
};

/**
 * Inserta una nueva venta
 */
export const insertSale = async (sale, items) => {
  try {
    if (!isCloudSalesEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudSalesEnabled()) {
      await ensureCloudSalesSeeded();
      const storeData = await getStoreSeedState();
      const maxSequence = Number(storeData?.counters?.sale) || 0;
      const consecutive = await getNextCloudConsecutive("sale", {
        minimum: maxSequence,
      });
      const id = consecutive.sequence;
      const payload = normalizeSaleRecord({
        ...sale,
        id,
        saleNumber: consecutive.value,
        createdAt: new Date().toISOString(),
        items,
      });
      await setDoc(doc(getSalesCollectionRef(), String(id)), payload);
      if (payload.status !== "cancelled") {
        await applyCloudProductSalesCountsDelta(payload.items, 1);
      }
      clearCloudSalesCache();
      return { id, saleNumber: payload.saleNumber };
    }

    // Insertar venta
    const saleResult = await db.runAsync(
      `INSERT INTO sales (customerId, subtotal, tax, discount, total, currency, exchangeRate, paymentMethod, paid, change, status, notes, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        sale.customerId || null,
        sale.subtotal,
        sale.tax,
        sale.discount || 0,
        sale.total,
        sale.currency,
        sale.exchangeRate,
        sale.paymentMethod,
        sale.paid,
        sale.change,
        sale.status || "completed",
        sale.notes || "",
        new Date().toISOString(),
      ],
    );

    const saleId = saleResult.lastInsertRowId;
    const saleNumber = formatConsecutiveNumber("sale", saleId);

    await db.runAsync("UPDATE sales SET saleNumber = ? WHERE id = ?;", [
      saleNumber,
      saleId,
    ]);

    // Insertar items de la venta
    for (const item of items) {
      await db.runAsync(
        `INSERT INTO sale_items (saleId, productId, productName, quantity, price, priceUSD, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          saleId,
          item.productId,
          item.productName,
          item.quantity,
          item.price,
          item.priceUSD || 0,
          item.quantity * item.price,
        ],
      );
    }

    return { id: saleId, saleNumber };
  } catch (error) {
    if (handleCloudAccessError(error, "sales:getToday")) {
      throw error;
    }
    throw error;
  }
};

/**
 * Obtiene todas las ventas
 */
export const getAllSales = async (limit = 100) => {
  try {
    if (isCloudSalesEnabled()) {
      await ensureCloudSalesSeeded();
      const sales = (await getRecentCloudSales(limit)).filter(
        (item) => item.status !== "cancelled",
      );
      return Number.isFinite(limit)
        ? sales.slice(0, Math.max(1, Math.trunc(limit)))
        : sales;
    }

    const result = await db.getAllAsync(
      `SELECT s.*, 
              (SELECT COUNT(*) FROM sale_items si WHERE si.saleId = s.id) as itemCount,
              (SELECT ROUND(SUM(si.quantity * COALESCE(si.priceUSD, 0)), 6) FROM sale_items si WHERE si.saleId = s.id) as totalUSD
       FROM sales s 
       WHERE s.status != 'cancelled'
       ORDER BY s.createdAt DESC LIMIT ?;`,
      [limit],
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene una venta por ID con sus items
 */
export const getSaleById = async (saleId) => {
  try {
    if (isCloudSalesEnabled()) {
      await ensureCloudSalesSeeded();
      const saleSnapshot = await getDoc(
        doc(getSalesCollectionRef(), String(saleId)),
      );
      return saleSnapshot.exists()
        ? normalizeSaleRecord(saleSnapshot.data())
        : null;
    }

    // Obtener venta
    const sale = await db.getFirstAsync("SELECT * FROM sales WHERE id = ?;", [
      saleId,
    ]);

    if (!sale) {
      return null;
    }

    // Obtener items
    const items = await db.getAllAsync(
      "SELECT * FROM sale_items WHERE saleId = ?;",
      [saleId],
    );

    sale.items = items;
    return sale;
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene ventas por rango de fechas
 */
export const getSalesByDateRange = async (startDate, endDate) => {
  try {
    if (isCloudSalesEnabled()) {
      await ensureCloudSalesSeeded();
      const sales = await getCloudSalesInRange(startDate, endDate);
      return sales.filter((item) => item.status !== "cancelled");
    }

    const result = await db.getAllAsync(
      "SELECT * FROM sales WHERE createdAt >= ? AND createdAt <= ? ORDER BY createdAt DESC;",
      [startDate, endDate],
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene el costo total (USD) de los items por cada saleId.
 * Nota: se basa en products.cost (costo actual) y no guarda el costo histórico.
 */
export const getSaleItemsCostUSDBySaleIds = async (saleIds = []) => {
  try {
    if (!Array.isArray(saleIds) || saleIds.length === 0) {
      return [];
    }

    if (isCloudSalesEnabled()) {
      await ensureCloudSalesSeeded();
      const sales = await getCloudSalesByIds(saleIds);
      const productIds = sales.flatMap((sale) =>
        (sale.items || []).map((item) => Number(item.productId) || 0),
      );
      const productCostById = await getCloudProductCostByIds(productIds);

      return sales.map((sale) => ({
        saleId: sale.id,
        costUSD: (sale.items || []).reduce((sum, item) => {
          const unitCost = productCostById[Number(item.productId)] || 0;
          return sum + unitCost * (Number(item.quantity) || 0);
        }, 0),
      }));
    }

    const placeholders = saleIds.map(() => "?").join(",");
    const result = await db.getAllAsync(
      `SELECT si.saleId as saleId,
              COALESCE(SUM(si.quantity * COALESCE(p.cost, 0)), 0) as costUSD
       FROM sale_items si
       LEFT JOIN products p ON p.id = si.productId
       WHERE si.saleId IN (${placeholders})
       GROUP BY si.saleId;`,
      saleIds,
    );

    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene el total de ventas de hoy
 */
export const getTodaySales = async () => {
  try {
    if (isCloudSalesEnabled()) {
      await ensureCloudSalesSeeded();
      const { startIso, endIso } = getTodayUtcRangeForDevice();
      const todaySales = await getCloudCompletedSalesInRange(startIso, endIso);
      return {
        count: todaySales.length,
        total: todaySales.reduce(
          (sum, sale) => sum + (Number(sale.total) || 0),
          0,
        ),
      };
    }

    const { startIso, endIso } = getTodayUtcRangeForDevice();
    const result = await db.getFirstAsync(
      `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
       FROM sales
       WHERE datetime(createdAt) >= datetime(?)
         AND datetime(createdAt) < datetime(?)
         AND status = 'completed';`,
      [startIso, endIso],
    );
    return result;
  } catch (error) {
    if (handleCloudAccessError(error, "sales:getToday")) {
      const { startIso, endIso } = getTodayUtcRangeForDevice();
      return await db.getFirstAsync(
        `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
         FROM sales
         WHERE datetime(createdAt) >= datetime(?)
           AND datetime(createdAt) < datetime(?)
           AND status = 'completed';`,
        [startIso, endIso],
      );
    }
    throw error;
  }
};

/**
 * Cuenta cuántas ventas incluyen un producto específico.
 */
export const countSalesByProduct = async (productId) => {
  try {
    const normalizedProductId = Number(productId) || 0;
    if (normalizedProductId <= 0) {
      return 0;
    }

    if (isCloudSalesEnabled()) {
      await ensureCloudSalesSeeded();
      const storeData = await getStoreSeedState();
      const existingCount =
        storeData?.metrics?.productSalesCounts?.[String(normalizedProductId)];

      if (Number.isFinite(Number(existingCount))) {
        return Number(existingCount) || 0;
      }

      const sales = await getCloudSales();
      const counts = buildProductSalesCountMap(sales);
      await persistCloudProductSalesCounts(counts);
      return Number(counts[String(normalizedProductId)]) || 0;
    }

    const result = await db.getFirstAsync(
      `SELECT COUNT(DISTINCT s.id) as count
       FROM sales s
       INNER JOIN sale_items si ON si.saleId = s.id
       WHERE s.status != 'cancelled' AND si.productId = ?;`,
      [normalizedProductId],
    );

    return Number(result?.count) || 0;
  } catch (error) {
    throw error;
  }
};

/**
 * Cancela una venta
 */
export const cancelSale = async (saleId) => {
  try {
    if (!isCloudSalesEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudSalesEnabled()) {
      await ensureCloudSalesSeeded();
      const existingSale = await getSaleById(saleId);
      if (!existingSale || existingSale.status === "cancelled") {
        return 0;
      }

      await updateDoc(doc(getSalesCollectionRef(), String(saleId)), {
        status: "cancelled",
      });
      await applyCloudProductSalesCountsDelta(existingSale.items, -1);
      clearCloudSalesCache();
      return 1;
    }

    const result = await db.runAsync(
      "UPDATE sales SET status = 'cancelled' WHERE id = ?;",
      [saleId],
    );
    return result.changes;
  } catch (error) {
    throw error;
  }
};

/**
 * Elimina una venta específica por ID
 */
export const deleteSaleById = async (saleId) => {
  try {
    if (!isCloudSalesEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudSalesEnabled()) {
      await ensureCloudSalesSeeded();
      const existingSale = await getSaleById(saleId);
      await deleteDoc(doc(getSalesCollectionRef(), String(saleId)));
      if (existingSale && existingSale.status !== "cancelled") {
        await applyCloudProductSalesCountsDelta(existingSale.items, -1);
      }
      clearCloudSalesCache();
      return 1;
    }

    // Primero eliminar items de venta
    await db.runAsync("DELETE FROM sale_items WHERE saleId = ?;", [saleId]);

    // Luego eliminar venta
    const result = await db.runAsync("DELETE FROM sales WHERE id = ?;", [
      saleId,
    ]);

    return result.changes;
  } catch (error) {
    throw error;
  }
};

export default {
  initSalesTable,
  insertSale,
  getAllSales,
  getSaleById,
  getSalesByDateRange,
  getSaleItemsCostUSDBySaleIds,
  getTodaySales,
  countSalesByProduct,
  cancelSale,
  deleteSaleById,
};
