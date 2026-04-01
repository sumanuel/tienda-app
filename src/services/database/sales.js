import { db } from "./db";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, firestore } from "../firebase/firebase";

const cloudSalesSeeded = new Set();

const isCloudSalesEnabled = () => Boolean(auth.currentUser?.uid);

const createCloudNumericId = () =>
  Number(
    `${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`,
  );

const getSalesCollectionRef = () =>
  collection(firestore, "users", auth.currentUser.uid, "sales");

const getProductsCollectionRef = () =>
  collection(firestore, "users", auth.currentUser.uid, "products");

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
    id: Number(sale.id) || createCloudNumericId(),
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

const getCloudSales = async () => {
  const snapshot = await getDocs(getSalesCollectionRef());
  return snapshot.docs.map((item) => normalizeSaleRecord(item.data()));
};

const ensureCloudSalesSeeded = async () => {
  if (!isCloudSalesEnabled()) return;

  const uid = auth.currentUser.uid;
  if (cloudSalesSeeded.has(uid)) return;

  const collectionRef = getSalesCollectionRef();
  const existingSnapshot = await getDocs(collectionRef);
  if (!existingSnapshot.empty) {
    cloudSalesSeeded.add(uid);
    return;
  }

  const salesRows = await db.getAllAsync(
    "SELECT * FROM sales ORDER BY createdAt DESC;",
  );
  if (salesRows.length > 0) {
    const batch = writeBatch(firestore);
    for (const saleRow of salesRows) {
      const saleItems = await db.getAllAsync(
        "SELECT * FROM sale_items WHERE saleId = ?;",
        [saleRow.id],
      );
      const normalized = normalizeSaleRecord({
        ...saleRow,
        items: saleItems,
      });
      batch.set(doc(collectionRef, String(normalized.id)), normalized, {
        merge: true,
      });
    }
    await batch.commit();
  }

  cloudSalesSeeded.add(uid);
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
    throw error;
  }
};

/**
 * Inserta una nueva venta
 */
export const insertSale = async (sale, items) => {
  try {
    if (isCloudSalesEnabled()) {
      await ensureCloudSalesSeeded();
      const id = createCloudNumericId();
      const payload = normalizeSaleRecord({
        ...sale,
        id,
        createdAt: new Date().toISOString(),
        items,
      });
      await setDoc(doc(getSalesCollectionRef(), String(id)), payload);
      return id;
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

    return saleId;
  } catch (error) {
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
      const sales = sortSalesByDateDesc(
        (await getCloudSales()).filter((item) => item.status !== "cancelled"),
      );
      return Number.isFinite(limit) ? sales.slice(0, limit) : sales;
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
      const sales = await getCloudSales();
      const startTime = new Date(startDate).getTime();
      const endTime = new Date(endDate).getTime();
      return sortSalesByDateDesc(
        sales.filter((item) => {
          const createdAt = new Date(item.createdAt).getTime();
          return createdAt >= startTime && createdAt <= endTime;
        }),
      );
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
      const [sales, productsSnapshot] = await Promise.all([
        getCloudSales(),
        getDocs(getProductsCollectionRef()),
      ]);

      const productCostById = productsSnapshot.docs.reduce((acc, item) => {
        const product = item.data();
        acc[Number(product.id)] = Number(product.cost) || 0;
        return acc;
      }, {});

      return sales
        .filter((sale) => saleIds.some((id) => Number(id) === Number(sale.id)))
        .map((sale) => ({
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
      const startTime = new Date(startIso).getTime();
      const endTime = new Date(endIso).getTime();
      const sales = await getCloudSales();
      const todaySales = sales.filter((sale) => {
        const createdAt = new Date(sale.createdAt).getTime();
        return (
          createdAt >= startTime &&
          createdAt < endTime &&
          sale.status === "completed"
        );
      });
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
    throw error;
  }
};

/**
 * Cancela una venta
 */
export const cancelSale = async (saleId) => {
  try {
    if (isCloudSalesEnabled()) {
      await ensureCloudSalesSeeded();
      await updateDoc(doc(getSalesCollectionRef(), String(saleId)), {
        status: "cancelled",
      });
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
  cancelSale,
  deleteSaleById,
};
