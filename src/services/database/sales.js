import { db } from "./db";

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
      );`
    );

    // Tabla de items de venta
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        saleId INTEGER NOT NULL,
        productId INTEGER NOT NULL,
        productName TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        priceUSD REAL DEFAULT 0,
        subtotal REAL NOT NULL,
        FOREIGN KEY (saleId) REFERENCES sales(id)
      );`
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
      ]
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
        ]
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
    const result = await db.getAllAsync(
      `SELECT s.*, 
              (SELECT COUNT(*) FROM sale_items si WHERE si.saleId = s.id) as itemCount,
              (SELECT ROUND(SUM(si.quantity * COALESCE(si.priceUSD, 0)), 6) FROM sale_items si WHERE si.saleId = s.id) as totalUSD
       FROM sales s 
       WHERE s.status != 'cancelled'
       ORDER BY s.createdAt DESC LIMIT ?;`,
      [limit]
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
      [saleId]
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
    const result = await db.getAllAsync(
      "SELECT * FROM sales WHERE createdAt >= ? AND createdAt <= ? ORDER BY createdAt DESC;",
      [startDate, endDate]
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
    const today = new Date().toISOString().split("T")[0];
    const result = await db.getFirstAsync(
      `SELECT COUNT(*) as count, SUM(total) as total
       FROM sales
       WHERE DATE(createdAt) = ? AND status = 'completed';`,
      [today]
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
    const result = await db.runAsync(
      "UPDATE sales SET status = 'cancelled' WHERE id = ?;",
      [saleId]
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
    await db.runAsync(
      "DELETE FROM sale_items WHERE saleId = ?;",
      [saleId]
    );
    
    // Luego eliminar venta
    const result = await db.runAsync(
      "DELETE FROM sales WHERE id = ?;",
      [saleId]
    );
    
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
  getTodaySales,
  cancelSale,
  deleteSaleById,
};
