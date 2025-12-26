import { db } from "./db";
import { generateUuidV4 } from "./uuid";
import { enqueueOutboxEvent } from "./outbox";

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
        uuid TEXT,
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
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );`
    );

    // Tabla de items de venta
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT,
        saleId INTEGER NOT NULL,
        productId INTEGER NOT NULL,
        productName TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        priceUSD REAL DEFAULT 0,
        subtotal REAL NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
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
    const nowIso = new Date().toISOString();
    const saleUuid = sale.uuid || generateUuidV4();

    // Mapear customerId (INTEGER local) -> UUID (server)
    let customerUuid = null;
    if (sale.customerId) {
      const customerRow = await db.getFirstAsync(
        "SELECT uuid FROM customers WHERE id = ?;",
        [sale.customerId]
      );
      customerUuid = customerRow?.uuid || null;
    }

    // Pre-cargar uuids de productos para items (productId INTEGER local -> products.uuid)
    const productIdSet = new Set(items.map((i) => i.productId).filter(Boolean));
    const productUuidByLocalId = {};
    for (const localProductId of productIdSet) {
      const productRow = await db.getFirstAsync(
        "SELECT id, uuid FROM products WHERE id = ?;",
        [localProductId]
      );
      if (productRow?.id && productRow?.uuid) {
        productUuidByLocalId[String(productRow.id)] = productRow.uuid;
      }
    }

    // Insertar venta
    const saleResult = await db.runAsync(
      `INSERT INTO sales (uuid, customerId, subtotal, tax, discount, total, currency, exchangeRate, paymentMethod, paid, change, status, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        saleUuid,
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
        nowIso,
        nowIso,
      ]
    );

    const saleId = saleResult.lastInsertRowId;

    // Insertar items de la venta y preparar payload de sync usando los UUID reales
    const itemsForSync = [];
    for (const item of items) {
      const itemUuid = item.uuid || generateUuidV4();
      const subtotal = item.subtotal ?? item.quantity * item.price;

      await db.runAsync(
        `INSERT INTO sale_items (uuid, saleId, productId, productName, quantity, price, priceUSD, subtotal, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          itemUuid,
          saleId,
          item.productId,
          item.productName,
          item.quantity,
          item.price,
          item.priceUSD || 0,
          subtotal,
          nowIso,
          nowIso,
        ]
      );

      const productUuid = productUuidByLocalId[String(item.productId)] || null;
      itemsForSync.push({
        id: itemUuid,
        productId: productUuid,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        priceUSD: item.priceUSD || 0,
        subtotal,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }

    await enqueueOutboxEvent({
      type: "sale.created",
      entityId: saleUuid,
      payload: {
        id: saleUuid,
        sale: {
          id: saleUuid,
          customerId: customerUuid,
          subtotal: sale.subtotal,
          tax: sale.tax,
          discount: sale.discount || 0,
          total: sale.total,
          currency: sale.currency,
          exchangeRate: sale.exchangeRate,
          paymentMethod: sale.paymentMethod || null,
          paid: sale.paid,
          change: sale.change,
          status: sale.status || "completed",
          notes: sale.notes || null,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        items: itemsForSync,
      },
    });

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
    const { startIso, endIso } = getTodayUtcRangeForDevice();
    const result = await db.getFirstAsync(
      `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
       FROM sales
       WHERE datetime(createdAt) >= datetime(?)
         AND datetime(createdAt) < datetime(?)
         AND status = 'completed';`,
      [startIso, endIso]
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
    const row = await db.getFirstAsync("SELECT uuid FROM sales WHERE id = ?;", [
      saleId,
    ]);

    const result = await db.runAsync(
      "UPDATE sales SET status = 'cancelled', updatedAt = ? WHERE id = ?;",
      [new Date().toISOString(), saleId]
    );

    if (row?.uuid) {
      await enqueueOutboxEvent({
        type: "sale.cancelled",
        entityId: row.uuid,
        payload: { id: row.uuid, saleId: row.uuid },
      });
    }

    return result.changes;
  } catch (error) {
    throw error;
  }
};

/**
 * Cancela una venta por UUID
 */
export const cancelSaleByUuid = async (saleUuid) => {
  try {
    const result = await db.runAsync(
      "UPDATE sales SET status = 'cancelled', updatedAt = ? WHERE uuid = ?;",
      [new Date().toISOString(), saleUuid]
    );

    await enqueueOutboxEvent({
      type: "sale.cancelled",
      entityId: saleUuid,
      payload: { id: saleUuid, saleId: saleUuid },
    });

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
  getTodaySales,
  cancelSale,
  cancelSaleByUuid,
  deleteSaleById,
};
