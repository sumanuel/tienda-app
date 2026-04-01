import { db } from "./db";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, firestore } from "../firebase/firebase";

let productsColumnsChecked = false;
let productsHasAdditionalCostColumn = false;
const cloudProductsSeeded = new Set();

const isCloudProductsEnabled = () => Boolean(auth.currentUser?.uid);

const createCloudNumericId = () =>
  Number(
    `${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`,
  );

const getProductsCollectionRef = () =>
  collection(firestore, "users", auth.currentUser.uid, "products");

const normalizeProductRecord = (product = {}) => ({
  id: Number(product.id) || createCloudNumericId(),
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

const ensureCloudProductsSeeded = async () => {
  if (!isCloudProductsEnabled()) return;

  const uid = auth.currentUser.uid;
  if (cloudProductsSeeded.has(uid)) return;

  const collectionRef = getProductsCollectionRef();
  const existingSnapshot = await getDocs(collectionRef);
  if (!existingSnapshot.empty) {
    cloudProductsSeeded.add(uid);
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
  }

  cloudProductsSeeded.add(uid);
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
    if (isCloudProductsEnabled()) {
      await ensureCloudProductsSeeded();
      const id = createCloudNumericId();
      const now = new Date().toISOString();
      const payload = normalizeProductRecord({
        ...product,
        id,
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
        barcode: product.barcode,
        category: product.category,
        priceUSD: product.priceUSD,
        stock: product.stock,
        qrCode: product.barcode || `PROD-${product.id}`,
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
      qrCode: product.barcode || `PROD-${product.id}`,
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
    const newStock =
      type === "entry" ? previousStock + quantity : previousStock - quantity;

    const createdAt = new Date().toISOString();

    const result = await db.runAsync(
      `INSERT INTO inventory_movements (productId, type, quantity, previousStock, newStock, notes, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [productId, type, quantity, previousStock, newStock, notes, createdAt],
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
    const result = await db.getAllAsync(
      `SELECT id, type, quantity, previousStock, newStock, notes, createdAt
       FROM inventory_movements
       WHERE productId = ? AND type = 'entry'
       ORDER BY createdAt DESC;`,
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
    const result = await db.getAllAsync(
      `SELECT id, type, quantity, previousStock, newStock, notes, createdAt
       FROM inventory_movements
       WHERE productId = ? AND type = 'exit'
       ORDER BY createdAt DESC;`,
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
    const result = await db.getAllAsync(
      `SELECT id, type, quantity, previousStock, newStock, notes, createdAt
       FROM inventory_movements
       WHERE productId = ? AND type IN ('entry', 'exit')
       ORDER BY createdAt DESC;`,
      [productId],
    );

    return result;
  } catch (error) {
    console.error("Error obteniendo movimientos de inventario:", error);
    throw error;
  }
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
};
