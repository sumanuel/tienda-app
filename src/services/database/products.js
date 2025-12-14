import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("tienda.db");

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
        priceUSD REAL DEFAULT 0,
        priceVES REAL DEFAULT 0,
        margin REAL DEFAULT 0,
        stock INTEGER DEFAULT 0,
        minStock INTEGER DEFAULT 0,
        image TEXT,
        active INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );`
    );

    // Índice para búsqueda rápida por código de barras
    await db.execAsync(
      "CREATE INDEX IF NOT EXISTS idx_barcode ON products(barcode);"
    );
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
      "SELECT name FROM sqlite_master WHERE type='table' AND name='products';"
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
    console.log("Intentando obtener productos de BD...");

    // Verificar si la tabla existe
    const tableExists = await checkTableExists();
    if (!tableExists) {
      console.log("Tabla products no existe, inicializando...");
      await initDatabase();
    }

    const result = await db.getAllAsync(
      "SELECT * FROM products WHERE active = 1 ORDER BY name;"
    );
    console.log("Productos obtenidos de BD:", result.length);
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
    const result = await db.getFirstAsync(
      "SELECT * FROM products WHERE barcode = ? AND active = 1;",
      [barcode]
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
    const result = await db.getAllAsync(
      `SELECT * FROM products
       WHERE (name LIKE ? OR category LIKE ?) AND active = 1
       ORDER BY name;`,
      [`%${query}%`, `%${query}%`]
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
    console.log("Insertando producto en BD:", product);
    const result = await db.runAsync(
      `INSERT INTO products (name, barcode, category, description, cost, priceUSD, margin, stock, minStock, image, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        product.name,
        product.barcode,
        product.category,
        product.description || "",
        product.cost || 0,
        product.priceUSD || 0,
        product.margin || 0,
        product.stock || 0,
        product.minStock || 0,
        product.image || "",
        1, // active
      ]
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
    const result = await db.runAsync(
      `UPDATE products
       SET name = ?, barcode = ?, category = ?, description = ?,
           cost = ?, priceUSD = ?, margin = ?,
           stock = ?, minStock = ?, image = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?;`,
      [
        product.name,
        product.barcode,
        product.category,
        product.description,
        product.cost,
        product.priceUSD,
        product.margin,
        product.stock,
        product.minStock,
        product.image,
        id,
      ]
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
    const result = await db.runAsync(
      "UPDATE products SET stock = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?;",
      [newStock, id]
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
    const result = await db.runAsync(
      "UPDATE products SET active = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?;",
      [id]
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
    const result = await db.getAllAsync(
      "SELECT * FROM products WHERE stock <= minStock AND active = 1 ORDER BY stock;"
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Actualiza todos los precios VES basados en la nueva tasa de cambio
 * @param {number} exchangeRate - Nueva tasa de cambio USD → VES
 */
export const updateAllPricesWithExchangeRate = async (exchangeRate) => {
  try {
    console.log(
      `Actualizando precios con nueva tasa: 1 USD = ${exchangeRate} VES`
    );

    // Actualizar todos los productos activos con precio USD > 0
    const result = await db.runAsync(
      `UPDATE products
       SET priceVES = ROUND(priceUSD * ?, 2),
           updatedAt = CURRENT_TIMESTAMP
       WHERE active = 1 AND priceUSD > 0;`,
      [exchangeRate]
    );

    console.log(`Precios actualizados: ${result.changes} productos`);
    return result.changes;
  } catch (error) {
    console.error("Error actualizando precios con tasa de cambio:", error);
    throw error;
  }
};

export default {
  initDatabase,
  getAllProducts,
  getProductByBarcode,
  searchProducts,
  insertProduct,
  updateProduct,
  updateProductStock,
  deleteProduct,
  getLowStockProducts,
  updateAllPricesWithExchangeRate,
};
