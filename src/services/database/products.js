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
 * Obtiene todos los productos activos
 */
export const getAllProducts = async () => {
  try {
    const result = await db.getAllAsync(
      "SELECT * FROM products WHERE active = 1 ORDER BY name;"
    );
    return result;
  } catch (error) {
    throw error;
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
    const result = await db.runAsync(
      `INSERT INTO products (name, barcode, category, description, cost, priceUSD, priceVES, margin, stock, minStock, image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        product.name,
        product.barcode,
        product.category,
        product.description || "",
        product.cost || 0,
        product.priceUSD || 0,
        product.priceVES || 0,
        product.margin || 0,
        product.stock || 0,
        product.minStock || 0,
        product.image || "",
      ]
    );
    return result.lastInsertRowId;
  } catch (error) {
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
           cost = ?, priceUSD = ?, priceVES = ?, margin = ?,
           stock = ?, minStock = ?, image = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?;`,
      [
        product.name,
        product.barcode,
        product.category,
        product.description,
        product.cost,
        product.priceUSD,
        product.priceVES,
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
};
