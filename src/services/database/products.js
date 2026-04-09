import { db } from "./db";
import {
  doc,
  getDocs,
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
import {
  getActiveStoreSeedKey,
  getStoreCollectionRef,
  getStoreDocRef,
  hasActiveStoreContext,
} from "../store/storeRefs";
import { assertSharedStoreCloudWriteAvailable } from "./cloudWriteGuard";

let productsColumnsChecked = false;
let productsHasAdditionalCostColumn = false;
const cloudProductsSeeded = new Set();

const isCloudProductsEnabled = () =>
  Boolean(auth.currentUser?.uid) && hasActiveStoreContext();

const createCloudNumericId = () =>
  Number(
    `${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`,
  );

const getProductsCollectionRef = () => getStoreCollectionRef("products");

const getSalesCollectionRef = () => getStoreCollectionRef("sales");

const getInventoryMovementsCollectionRef = () =>
  getStoreCollectionRef("inventory_movements");

const normalizeProductRecord = (product = {}) => ({
  id:
    Number(product.id) ||
    parseConsecutiveSequence(product.productNumber) ||
    createCloudNumericId(),
  productNumber:
    String(product.productNumber || "").trim() ||
    formatConsecutiveNumber("product", product.id),
  name: String(product.name || "").trim(),
  barcode: String(product.barcode || "").trim(),
  category: String(product.category || "").trim(),
  description: String(product.description || "").trim(),
  cost: Number(product.cost) || 0,
  additionalCost: Number(product.additionalCost) || 0,
  priceUSD: Number(product.priceUSD) || 0,
  priceVES: Number(product.priceVES) || 0,
  margin: Number(product.margin) || 0,
  stock: Number(product.stock) || 0,
  minStock: Number(product.minStock) || 0,
  image: String(product.image || "").trim(),
  active: Number(product.active ?? 1),
  createdAt: product.createdAt || new Date().toISOString(),
  updatedAt: product.updatedAt || new Date().toISOString(),
});

const normalizeInventoryMovementRecord = (movement = {}) => ({
  id:
    Number(movement.id) ||
    parseConsecutiveSequence(movement.movementNumber) ||
    createCloudNumericId(),
  movementNumber:
    String(movement.movementNumber || "").trim() ||
    formatConsecutiveNumber("movement", movement.id),
  productId: Number(movement.productId) || 0,
  type: movement.type === "exit" ? "exit" : "entry",
  quantity: Number(movement.quantity) || 0,
  previousStock: Number(movement.previousStock) || 0,
  newStock: Number(movement.newStock) || 0,
  notes: String(movement.notes || "").trim(),
  createdAt: movement.createdAt || new Date().toISOString(),
});

const sortProductsByName = (products = []) =>
  [...products].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "es", {
      sensitivity: "base",
    }),
  );

const getCloudProducts = async () => {
  const snapshot = await getDocs(getProductsCollectionRef());
  return snapshot.docs.map((item) => normalizeProductRecord(item.data()));
};

const getCloudInventoryMovements = async (filters = {}) => {
  const constraints = [];

  if (filters.productId != null) {
    constraints.push(where("productId", "==", Number(filters.productId)));
  }

  if (filters.type) {
    constraints.push(where("type", "==", filters.type));
  }

  const snapshot = constraints.length
    ? await getDocs(query(getInventoryMovementsCollectionRef(), ...constraints))
    : await getDocs(getInventoryMovementsCollectionRef());

  const productsSnapshot = await getDocs(getProductsCollectionRef());
  const validActiveProductIds = new Set(
    productsSnapshot.docs
      .map((item) => normalizeProductRecord(item.data()))
      .filter((item) => item.active === 1)
      .map((item) => Number(item.id)),
  );

  return snapshot.docs
    .map((item) => normalizeInventoryMovementRecord(item.data()))
    .filter((item) => validActiveProductIds.has(Number(item.productId)))
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );
};

const normalizeExistingCloudInventoryMovements = async (existingSnapshot) => {
  const collectionRef = getInventoryMovementsCollectionRef();
  const productsSnapshot = await getDocs(getProductsCollectionRef());
  const validActiveProductIds = new Set(
    productsSnapshot.docs
      .map((item) => normalizeProductRecord(item.data()))
      .filter((item) => item.active === 1)
      .map((item) => Number(item.id)),
  );

  const validRows = existingSnapshot.docs
    .map((item) => ({
      ref: item.ref,
      docId: item.id,
      data: normalizeInventoryMovementRecord(item.data()),
    }))
    .filter((item) => validActiveProductIds.has(Number(item.data.productId)))
    .sort((a, b) => {
      const createdDiff =
        new Date(a.data.createdAt || 0).getTime() -
        new Date(b.data.createdAt || 0).getTime();
      if (createdDiff !== 0) return createdDiff;
      return Number(a.data.id) - Number(b.data.id);
    });

  const hasOrphanRows = existingSnapshot.docs.length !== validRows.length;
  const requiresNormalization =
    hasOrphanRows ||
    validRows.some((item, index) => {
      const targetId = index + 1;
      return (
        Number(item.data.id) !== targetId ||
        item.docId !== String(targetId) ||
        String(item.data.movementNumber || "").trim() !==
          formatConsecutiveNumber("movement", targetId)
      );
    });

  if (!requiresNormalization) {
    await setDoc(
      getStoreDocRef(),
      {
        counters: {
          movement: validRows.length,
        },
      },
      { merge: true },
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

  for (let index = 0; index < validRows.length; index += 300) {
    const batch = writeBatch(firestore);
    validRows.slice(index, index + 300).forEach((item, offset) => {
      const sequence = index + offset + 1;
      batch.set(
        doc(collectionRef, String(sequence)),
        {
          ...item.data,
          id: sequence,
          movementNumber: formatConsecutiveNumber("movement", sequence),
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
        movement: validRows.length,
      },
    },
    { merge: true },
  );
};

const normalizeExistingCloudProducts = async (existingSnapshot) => {
  const collectionRef = getProductsCollectionRef();
  const salesCollectionRef = getSalesCollectionRef();
  const movementsCollectionRef = getInventoryMovementsCollectionRef();

  const existingRows = existingSnapshot.docs
    .map((item) => normalizeProductRecord(item.data()))
    .sort((a, b) => {
      const createdDiff =
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime();
      if (createdDiff !== 0) return createdDiff;
      return Number(a.id) - Number(b.id);
    });

  const requiresNormalization = existingSnapshot.docs.some((item, index) => {
    const targetId = index + 1;
    const data = normalizeProductRecord(item.data());
    return Number(data.id) !== targetId || item.id !== String(targetId);
  });

  if (!requiresNormalization) {
    await setDoc(
      getStoreDocRef(),
      {
        counters: {
          product: existingRows.length,
        },
      },
      { merge: true },
    );
    return;
  }

  const productIdMap = new Map();
  existingRows.forEach((item, index) => {
    productIdMap.set(Number(item.id), index + 1);
  });

  const salesSnapshot = await getDocs(salesCollectionRef);
  const movementsSnapshot = await getDocs(movementsCollectionRef);

  for (let index = 0; index < existingSnapshot.docs.length; index += 300) {
    const deleteBatch = writeBatch(firestore);
    existingSnapshot.docs.slice(index, index + 300).forEach((item) => {
      deleteBatch.delete(item.ref);
    });
    await deleteBatch.commit();
  }

  for (let index = 0; index < existingRows.length; index += 300) {
    const insertBatch = writeBatch(firestore);
    existingRows.slice(index, index + 300).forEach((item, offset) => {
      const sequence = index + offset + 1;
      insertBatch.set(
        doc(collectionRef, String(sequence)),
        {
          ...item,
          id: sequence,
          productNumber: formatConsecutiveNumber("product", sequence),
        },
        { merge: false },
      );
    });
    await insertBatch.commit();
  }

  const normalizedSales = salesSnapshot.docs.map((item) => {
    const sale = item.data() || {};
    const items = Array.isArray(sale.items)
      ? sale.items.map((saleItem) => ({
          ...saleItem,
          productId:
            productIdMap.get(Number(saleItem.productId)) ??
            Number(saleItem.productId) ??
            0,
        }))
      : [];
    return { ref: item.ref, sale: { ...sale, items } };
  });

  for (let index = 0; index < normalizedSales.length; index += 300) {
    const batch = writeBatch(firestore);
    normalizedSales.slice(index, index + 300).forEach(({ ref, sale }) => {
      batch.set(ref, sale, { merge: true });
    });
    await batch.commit();
  }

  const normalizedMovements = movementsSnapshot.docs.map((item) => {
    const movement = item.data() || {};
    const nextProductId = productIdMap.get(Number(movement.productId));
    return {
      ref: item.ref,
      shouldDelete: nextProductId == null,
      movement: {
        ...movement,
        productId: nextProductId ?? Number(movement.productId) ?? 0,
      },
    };
  });

  for (let index = 0; index < normalizedMovements.length; index += 300) {
    const batch = writeBatch(firestore);
    normalizedMovements
      .slice(index, index + 300)
      .forEach(({ ref, movement, shouldDelete }) => {
        if (shouldDelete) {
          batch.delete(ref);
          return;
        }
        batch.set(ref, movement, { merge: true });
      });
    await batch.commit();
  }

  await setDoc(
    getStoreDocRef(),
    {
      counters: {
        product: existingRows.length,
      },
    },
    { merge: true },
  );
};

const ensureCloudProductsSeeded = async () => {
  if (!isCloudProductsEnabled()) return;

  const seedKey = getActiveStoreSeedKey();
  if (cloudProductsSeeded.has(seedKey)) return;

  const collectionRef = getProductsCollectionRef();
  const existingSnapshot = await getDocs(collectionRef);
  if (!existingSnapshot.empty) {
    await normalizeExistingCloudProducts(existingSnapshot);
    cloudProductsSeeded.add(seedKey);
    return;
  }

  await ensureProductsAdditionalCostColumn();
  const rows = await db.getAllAsync(
    "SELECT * FROM products WHERE active = 1 ORDER BY name;",
  );

  if (rows.length > 0) {
    const batch = writeBatch(firestore);
    rows.forEach((row) => {
      const normalized = normalizeProductRecord(row);
      batch.set(doc(collectionRef, String(normalized.id)), normalized, {
        merge: true,
      });
    });
    await batch.commit();

    await setDoc(
      getStoreDocRef(),
      {
        counters: {
          product: rows.length,
        },
      },
      { merge: true },
    );
  }

  cloudProductsSeeded.add(seedKey);
};

const ensureCloudInventoryMovementsSeeded = async () => {
  if (!isCloudProductsEnabled()) return;

  const seedKey = `${getActiveStoreSeedKey()}:inventory_movements`;
  if (cloudProductsSeeded.has(seedKey)) return;

  const collectionRef = getInventoryMovementsCollectionRef();
  const existingSnapshot = await getDocs(collectionRef);
  if (!existingSnapshot.empty) {
    await normalizeExistingCloudInventoryMovements(existingSnapshot);

    cloudProductsSeeded.add(seedKey);
    return;
  }

  const rows = await db.getAllAsync(
    `SELECT im.*
     FROM inventory_movements im
     INNER JOIN products p ON p.id = im.productId
     WHERE p.active = 1
     ORDER BY im.createdAt ASC, im.id ASC;`,
  );

  if (rows.length > 0) {
    const batch = writeBatch(firestore);
    rows.forEach((row, index) => {
      const sequence = index + 1;
      const normalized = normalizeInventoryMovementRecord({
        ...row,
        id: sequence,
        movementNumber: formatConsecutiveNumber("movement", sequence),
      });
      batch.set(doc(collectionRef, String(sequence)), normalized, {
        merge: true,
      });
    });
    await batch.commit();

    await setDoc(
      getStoreDocRef(),
      {
        counters: {
          movement: rows.length,
        },
      },
      { merge: true },
    );
  }

  cloudProductsSeeded.add(seedKey);
};

const ensureProductsAdditionalCostColumn = async () => {
  if (productsColumnsChecked && productsHasAdditionalCostColumn) {
    return;
  }

  try {
    const table = await db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='products';",
    );

    if (!table?.name) {
      productsColumnsChecked = true;
      productsHasAdditionalCostColumn = false;
      return;
    }

    const columns = await db.getAllAsync("PRAGMA table_info(products);");
    productsHasAdditionalCostColumn = (columns || []).some(
      (c) => c?.name === "additionalCost",
    );

    if (!productsHasAdditionalCostColumn) {
      await db.execAsync(
        "ALTER TABLE products ADD COLUMN additionalCost REAL DEFAULT 0;",
      );
      productsHasAdditionalCostColumn = true;
    }

    productsColumnsChecked = true;
  } catch (error) {
    // No bloquear: si falla, el caller mostrará el error original.
    console.warn("Warning ensuring products additionalCost column:", error);
  }
};

/**
 * Inicializa la base de datos y crea las tablas necesarias
 */
export const initDatabase = async () => {
  try {
    // Tabla de productos
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        barcode TEXT UNIQUE,
        category TEXT,
        description TEXT,
        cost REAL DEFAULT 0,
        additionalCost REAL DEFAULT 0,
        priceUSD REAL DEFAULT 0,
        priceVES REAL DEFAULT 0,
        margin REAL DEFAULT 0,
        stock INTEGER DEFAULT 0,
        minStock INTEGER DEFAULT 0,
        image TEXT,
        active INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );`,
    );

    // Índice para búsqueda rápida por código de barras
    await db.execAsync(
      "CREATE INDEX IF NOT EXISTS idx_barcode ON products(barcode);",
    );

    await ensureProductsAdditionalCostColumn();
  } catch (error) {
    throw error;
  }
};

/**
 * Verifica si la tabla products existe
 */
export const checkTableExists = async () => {
  try {
    const result = await db.getAllAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='products';",
    );
    return result.length > 0;
  } catch (error) {
    console.error("Error checking table:", error);
    return false;
  }
};

/**
 * Obtiene todos los productos activos
 */
export const getAllProducts = async () => {
  try {
    if (isCloudProductsEnabled()) {
      await ensureCloudProductsSeeded();
      const products = await getCloudProducts();
      return sortProductsByName(products.filter((item) => item.active === 1));
    }

    // Verificar si la tabla existe
    const tableExists = await checkTableExists();
    if (!tableExists) {
      console.log("Tabla products no existe, inicializando...");
      await initDatabase();
    }

    await ensureProductsAdditionalCostColumn();

    const result = await db.getAllAsync(
      "SELECT * FROM products WHERE active = 1 ORDER BY name;",
    );
    // console.log("Productos obtenidos de BD:", result.length);
    return result;
  } catch (error) {
    if (handleCloudAccessError(error, "products:getAll")) {
      await ensureProductsAdditionalCostColumn();
      return await db.getAllAsync(
        "SELECT * FROM products WHERE active = 1 ORDER BY name;",
      );
    }
    console.error("Error obteniendo productos:", error);
    throw new Error(`Error al acceder a la base de datos: ${error.message}`);
  }
};

/**
 * Busca un producto por código de barras
 */
export const getProductByBarcode = async (barcode) => {
  try {
    if (isCloudProductsEnabled()) {
      await ensureCloudProductsSeeded();
      const products = await getCloudProducts();
      return (
        products.find(
          (item) => item.active === 1 && String(item.barcode || "") === barcode,
        ) || null
      );
    }

    await ensureProductsAdditionalCostColumn();
    const result = await db.getFirstAsync(
      "SELECT * FROM products WHERE barcode = ? AND active = 1;",
      [barcode],
    );
    return result || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Busca productos por nombre o categoría
 */
export const searchProducts = async (query) => {
  try {
    if (isCloudProductsEnabled()) {
      await ensureCloudProductsSeeded();
      const searchTerm = String(query || "")
        .trim()
        .toLowerCase();
      const products = await getCloudProducts();
      return sortProductsByName(
        products.filter((item) => {
          if (item.active !== 1) return false;
          if (!searchTerm) return true;
          return [item.name, item.category, item.barcode, item.description]
            .join(" ")
            .toLowerCase()
            .includes(searchTerm);
        }),
      );
    }

    await ensureProductsAdditionalCostColumn();
    const result = await db.getAllAsync(
      `SELECT * FROM products
       WHERE (name LIKE ? OR category LIKE ?) AND active = 1
       ORDER BY name;`,
      [`%${query}%`, `%${query}%`],
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Inserta un nuevo producto
 */
export const insertProduct = async (product) => {
  try {
    assertSharedStoreCloudWriteAvailable();

    if (isCloudProductsEnabled()) {
      await ensureCloudProductsSeeded();
      const now = new Date().toISOString();
      const existingProducts = await getCloudProducts();
      const maxSequence = existingProducts.reduce((maxValue, item) => {
        return Math.max(
          maxValue,
          Number(item.id) || 0,
          parseConsecutiveSequence(item.productNumber),
        );
      }, 0);
      const consecutive = await getNextCloudConsecutive("product", {
        minimum: maxSequence,
      });
      const id = consecutive.sequence;
      const payload = normalizeProductRecord({
        ...product,
        id,
        productNumber: consecutive.value,
        active: 1,
        createdAt: now,
        updatedAt: now,
      });
      await setDoc(doc(getProductsCollectionRef(), String(id)), payload);
      return id;
    }

    await ensureProductsAdditionalCostColumn();
    console.log("Insertando producto en BD:", product);
    const result = await db.runAsync(
      `INSERT INTO products (name, barcode, category, description, cost, additionalCost, priceUSD, priceVES, margin, stock, minStock, image, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        product.name,
        product.barcode,
        product.category,
        product.description || "",
        product.cost || 0,
        product.additionalCost || 0,
        product.priceUSD || 0,
        product.priceVES || 0,
        product.margin || 0,
        product.stock || 0,
        product.minStock || 0,
        product.image || "",
        1, // active
      ],
    );
    await db.runAsync("UPDATE products SET productNumber = ? WHERE id = ?;", [
      formatConsecutiveNumber("product", result.lastInsertRowId),
      result.lastInsertRowId,
    ]);
    console.log("Producto insertado, lastInsertRowId:", result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error insertando producto:", error);
    throw error;
  }
};

/**
 * Actualiza un producto existente
 */
export const updateProduct = async (id, product) => {
  try {
    assertSharedStoreCloudWriteAvailable();

    if (isCloudProductsEnabled()) {
      await ensureCloudProductsSeeded();
      const payload = normalizeProductRecord({
        ...product,
        id: Number(id),
        updatedAt: new Date().toISOString(),
      });
      await setDoc(doc(getProductsCollectionRef(), String(id)), payload, {
        merge: true,
      });
      return 1;
    }

    await ensureProductsAdditionalCostColumn();
    const result = await db.runAsync(
      `UPDATE products
       SET name = ?, barcode = ?, category = ?, description = ?,
           cost = ?, additionalCost = ?, priceUSD = ?, priceVES = ?, margin = ?,
           stock = ?, minStock = ?, image = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?;`,
      [
        product.name,
        product.barcode,
        product.category,
        product.description,
        product.cost,
        product.additionalCost || 0,
        product.priceUSD,
        product.priceVES || 0,
        product.margin,
        product.stock,
        product.minStock,
        product.image,
        id,
      ],
    );
    return result.changes;
  } catch (error) {
    throw error;
  }
};

/**
 * Actualiza el stock de un producto
 */
export const updateProductStock = async (id, newStock) => {
  try {
    assertSharedStoreCloudWriteAvailable();

    if (isCloudProductsEnabled()) {
      await ensureCloudProductsSeeded();
      await updateDoc(doc(getProductsCollectionRef(), String(id)), {
        stock: Number(newStock) || 0,
        updatedAt: new Date().toISOString(),
      });
      return 1;
    }

    const result = await db.runAsync(
      "UPDATE products SET stock = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?;",
      [newStock, id],
    );
    return result.changes;
  } catch (error) {
    throw error;
  }
};

/**
 * Elimina (desactiva) un producto
 */
export const deleteProduct = async (id) => {
  try {
    assertSharedStoreCloudWriteAvailable();

    if (isCloudProductsEnabled()) {
      await ensureCloudProductsSeeded();
      await updateDoc(doc(getProductsCollectionRef(), String(id)), {
        active: 0,
        updatedAt: new Date().toISOString(),
      });
      return 1;
    }

    const result = await db.runAsync(
      "UPDATE products SET active = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?;",
      [id],
    );
    return result.changes;
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene productos con stock bajo
 */
export const getLowStockProducts = async () => {
  try {
    if (isCloudProductsEnabled()) {
      await ensureCloudProductsSeeded();
      const products = await getCloudProducts();
      return sortProductsByName(
        products.filter(
          (item) =>
            item.active === 1 &&
            Number(item.stock) <= Number(item.minStock || 0),
        ),
      );
    }

    const result = await db.getAllAsync(
      "SELECT * FROM products WHERE stock <= minStock AND active = 1 ORDER BY stock;",
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Inicializa productos de ejemplo
 */
export const initSampleProducts = async () => {
  try {
    if (!isCloudProductsEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    // Evitar poblar productos “fantasma” fuera de desarrollo
    if (!__DEV__) {
      return;
    }

    // Verificar si ya hay productos
    const existingProducts = await db.getAllAsync(
      "SELECT COUNT(*) as count FROM products;",
    );
    if (existingProducts[0].count > 0) {
      console.log("Productos ya existen, saltando inicialización");
      return;
    }

    console.log("Inicializando productos de ejemplo...");

    const sampleProducts = [
      {
        name: "Leche Entera 1L",
        priceUSD: 2.5,
        category: "Lácteos",
        stock: 50,
      },
      { name: "Pan Francés", priceUSD: 1.2, category: "Panadería", stock: 30 },
      { name: "Arroz 1Kg", priceUSD: 1.8, category: "Granos", stock: 40 },
      {
        name: "Aceite de Oliva 500ml",
        priceUSD: 4.5,
        category: "Aceites",
        stock: 25,
      },
      { name: "Huevos Docena", priceUSD: 3.0, category: "Huevos", stock: 20 },
      {
        name: "Queso Cheddar 200g",
        priceUSD: 5.2,
        category: "Lácteos",
        stock: 15,
      },
      { name: "Manzanas 1Kg", priceUSD: 2.8, category: "Frutas", stock: 35 },
      {
        name: "Pollo Entero 1Kg",
        priceUSD: 6.5,
        category: "Carnes",
        stock: 12,
      },
      { name: "Pasta 500g", priceUSD: 1.5, category: "Pastas", stock: 28 },
      { name: "Café Molido 250g", priceUSD: 4.0, category: "Café", stock: 18 },
      { name: "Azúcar 1Kg", priceUSD: 2.2, category: "Endulzantes", stock: 45 },
      { name: "Sal 500g", priceUSD: 0.8, category: "Condimentos", stock: 60 },
      {
        name: "Jabón en Polvo 1Kg",
        priceUSD: 3.8,
        category: "Limpieza",
        stock: 22,
      },
      {
        name: "Detergente Líquido 1L",
        priceUSD: 2.9,
        category: "Limpieza",
        stock: 16,
      },
      {
        name: "Cereal de Maíz 500g",
        priceUSD: 2.1,
        category: "Cereales",
        stock: 32,
      },
      {
        name: "Yogurt Natural 150g",
        priceUSD: 1.0,
        category: "Lácteos",
        stock: 40,
      },
      {
        name: "Mantequilla 200g",
        priceUSD: 3.5,
        category: "Lácteos",
        stock: 14,
      },
      { name: "Tomates 1Kg", priceUSD: 2.0, category: "Verduras", stock: 38 },
      { name: "Cebollas 1Kg", priceUSD: 1.6, category: "Verduras", stock: 42 },
      { name: "Papas 1Kg", priceUSD: 1.4, category: "Verduras", stock: 50 },
    ];

    await db.withTransactionAsync(async () => {
      for (const product of sampleProducts) {
        await db.runAsync(
          "INSERT INTO products (name, priceUSD, category, stock, active) VALUES (?, ?, ?, ?, ?);",
          [product.name, product.priceUSD, product.category, product.stock, 1],
        );
      }
    });

    console.log("Productos de ejemplo inicializados correctamente");
  } catch (error) {
    console.error("Error inicializando productos:", error);
    throw error;
  }
};

/**
 * Actualiza todos los precios VES basados en la nueva tasa de cambio
 * @param {number} exchangeRate - Nueva tasa de cambio USD → VES
 */
export const updateAllPricesWithExchangeRate = async (exchangeRate) => {
  try {
    if (!isCloudProductsEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudProductsEnabled()) {
      await ensureCloudProductsSeeded();
      const products = await getCloudProducts();
      const batch = writeBatch(firestore);
      const activeProducts = products.filter((item) => item.active === 1);

      activeProducts.forEach((item) => {
        batch.set(
          doc(getProductsCollectionRef(), String(item.id)),
          {
            priceVES:
              Math.round(
                (Number(item.priceUSD) || 0) * Number(exchangeRate) * 100,
              ) / 100,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      });

      if (activeProducts.length > 0) {
        await batch.commit();
      }

      return activeProducts.length;
    }

    console.log(
      `Actualizando precios con nueva tasa: 1 USD = ${exchangeRate} VES`,
    );

    // Actualizar todos los productos activos con precio USD > 0
    const result = await db.runAsync(
      `UPDATE products
       SET priceVES = ROUND(priceUSD * ?, 2),
           updatedAt = CURRENT_TIMESTAMP
       WHERE active = 1 AND priceUSD > 0;`,
      [exchangeRate],
    );

    console.log(`Precios actualizados: ${result.changes} productos`);
    return result.changes;
  } catch (error) {
    console.error("Error actualizando precios con tasa de cambio:", error);
    throw error;
  }
};

/**
 * Obtiene todos los productos con sus códigos QR
 */
export const getAllProductsWithQRCodes = async () => {
  try {
    if (isCloudProductsEnabled()) {
      const products = await getAllProducts();
      return products.map((product) => ({
        id: product.id,
        name: product.name,
        productNumber: product.productNumber,
        barcode: product.barcode,
        category: product.category,
        priceUSD: product.priceUSD,
        stock: product.stock,
        qrCode:
          product.barcode ||
          product.productNumber ||
          formatConsecutiveNumber("product", product.id),
      }));
    }

    const result = await db.getAllAsync(
      `SELECT id, name, barcode, category, priceUSD, stock
       FROM products
       WHERE active = 1
       ORDER BY name ASC;`,
    );

    // Agregar código QR generado para cada producto
    return result.map((product) => ({
      ...product,
      qrCode:
        product.barcode ||
        product.productNumber ||
        formatConsecutiveNumber("product", product.id),
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Registra un movimiento de inventario
 */
export const insertInventoryMovement = async (
  productId,
  type,
  quantity,
  previousStock,
  notes = null,
) => {
  try {
    assertSharedStoreCloudWriteAvailable();

    const newStock =
      type === "entry" ? previousStock + quantity : previousStock - quantity;

    const createdAt = new Date().toISOString();

    if (isCloudProductsEnabled()) {
      await ensureCloudInventoryMovementsSeeded();
      const existingMovements = await getCloudInventoryMovements();
      const maxSequence = existingMovements.reduce((maxValue, item) => {
        return Math.max(
          maxValue,
          Number(item.id) || 0,
          parseConsecutiveSequence(item.movementNumber),
        );
      }, 0);
      const consecutive = await getNextCloudConsecutive("movement", {
        minimum: maxSequence,
      });
      const id = consecutive.sequence;
      const payload = normalizeInventoryMovementRecord({
        id,
        movementNumber: consecutive.value,
        productId,
        type,
        quantity,
        previousStock,
        newStock,
        notes,
        createdAt,
      });
      await setDoc(
        doc(getInventoryMovementsCollectionRef(), String(id)),
        payload,
      );
      return id;
    }

    const result = await db.runAsync(
      `INSERT INTO inventory_movements (productId, type, quantity, previousStock, newStock, notes, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [productId, type, quantity, previousStock, newStock, notes, createdAt],
    );

    await db.runAsync(
      "UPDATE inventory_movements SET movementNumber = ? WHERE id = ?;",
      [
        formatConsecutiveNumber("movement", result.lastInsertRowId),
        result.lastInsertRowId,
      ],
    );

    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error insertando movimiento de inventario:", error);
    throw error;
  }
};

/**
 * Obtiene los movimientos de entrada de un producto
 */
export const getProductEntryMovements = async (productId) => {
  try {
    if (isCloudProductsEnabled()) {
      await ensureCloudInventoryMovementsSeeded();
      return getCloudInventoryMovements({ productId, type: "entry" });
    }

    const result = await db.getAllAsync(
      `SELECT im.id, im.movementNumber, im.type, im.quantity, im.previousStock, im.newStock, im.notes, im.createdAt
       FROM inventory_movements im
       INNER JOIN products p ON p.id = im.productId
       WHERE im.productId = ? AND im.type = 'entry' AND p.active = 1
       ORDER BY im.createdAt DESC;`,
      [productId],
    );

    return result;
  } catch (error) {
    console.error("Error obteniendo movimientos de entrada:", error);
    throw error;
  }
};

/**
 * Obtiene los movimientos de salida de un producto
 */
export const getProductExitMovements = async (productId) => {
  try {
    if (isCloudProductsEnabled()) {
      await ensureCloudInventoryMovementsSeeded();
      return getCloudInventoryMovements({ productId, type: "exit" });
    }

    const result = await db.getAllAsync(
      `SELECT im.id, im.movementNumber, im.type, im.quantity, im.previousStock, im.newStock, im.notes, im.createdAt
       FROM inventory_movements im
       INNER JOIN products p ON p.id = im.productId
       WHERE im.productId = ? AND im.type = 'exit' AND p.active = 1
       ORDER BY im.createdAt DESC;`,
      [productId],
    );

    return result;
  } catch (error) {
    console.error("Error obteniendo movimientos de salida:", error);
    throw error;
  }
};

/**
 * Obtiene los movimientos de inventario (entradas y salidas) de un producto
 */
export const getProductInventoryMovements = async (productId) => {
  try {
    if (isCloudProductsEnabled()) {
      await ensureCloudInventoryMovementsSeeded();
      return getCloudInventoryMovements({ productId });
    }

    const result = await db.getAllAsync(
      `SELECT im.id, im.movementNumber, im.type, im.quantity, im.previousStock, im.newStock, im.notes, im.createdAt
       FROM inventory_movements im
       INNER JOIN products p ON p.id = im.productId
       WHERE im.productId = ? AND im.type IN ('entry', 'exit') AND p.active = 1
       ORDER BY im.createdAt DESC;`,
      [productId],
    );

    return result;
  } catch (error) {
    console.error("Error obteniendo movimientos de inventario:", error);
    throw error;
  }
};

export const countProductInventoryMovements = async (productId) => {
  const movements = await getProductInventoryMovements(productId);
  return Array.isArray(movements) ? movements.length : 0;
};

export default {
  initDatabase,
  checkTableExists,
  initSampleProducts,
  getAllProducts,
  getProductByBarcode,
  searchProducts,
  insertProduct,
  updateProduct,
  updateProductStock,
  deleteProduct,
  getLowStockProducts,
  updateAllPricesWithExchangeRate,
  getAllProductsWithQRCodes,
  insertInventoryMovement,
  getProductEntryMovements,
  getProductExitMovements,
  getProductInventoryMovements,
  countProductInventoryMovements,
};
