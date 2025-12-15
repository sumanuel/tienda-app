import { db } from "./db";

/**
 * Inicializa la tabla de clientes
 */
export const initCustomersTable = async () => {
  try {
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        documentType TEXT,
        documentNumber TEXT,
        totalPurchases REAL DEFAULT 0,
        active INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );`
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene todos los clientes activos
 */
export const getAllCustomers = async () => {
  try {
    const result = await db.getAllAsync(
      "SELECT * FROM customers WHERE active = 1 ORDER BY name;"
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Busca clientes por nombre, teléfono o cédula
 */
export const searchCustomers = async (query) => {
  try {
    const result = await db.getAllAsync(
      `SELECT * FROM customers
       WHERE (name LIKE ? OR phone LIKE ? OR documentNumber LIKE ?) AND active = 1
       ORDER BY name;`,
      [`%${query}%`, `%${query}%`, `%${query}%`]
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Busca un cliente por número de cédula
 */
export const getCustomerByDocumentNumber = async (documentNumber) => {
  try {
    const result = await db.getAllAsync(
      "SELECT * FROM customers WHERE documentNumber = ? AND active = 1;",
      [documentNumber]
    );
    return result[0] || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Crea el cliente genérico si no existe
 */
export const createGenericCustomer = async () => {
  try {
    // Verificar si ya existe el cliente genérico
    const existing = await getCustomerByDocumentNumber("1");
    if (existing) {
      return existing.id;
    }

    // Crear cliente genérico
    const result = await db.runAsync(
      `INSERT INTO customers (name, documentNumber, documentType)
       VALUES (?, ?, ?);`,
      ["Cliente Genérico", "1", "V"]
    );
    return result.lastInsertRowId;
  } catch (error) {
    throw error;
  }
};

/**
 * Inserta un nuevo cliente
 */
export const insertCustomer = async (customer) => {
  try {
    const result = await db.runAsync(
      `INSERT INTO customers (name, email, phone, address, documentType, documentNumber)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        customer.name,
        customer.email || "",
        customer.phone || "",
        customer.address || "",
        customer.documentType || "",
        customer.documentNumber || "",
      ]
    );
    return result.lastInsertRowId;
  } catch (error) {
    throw error;
  }
};

/**
 * Actualiza un cliente
 */
export const updateCustomer = async (id, customer) => {
  try {
    const result = await db.runAsync(
      `UPDATE customers
       SET name = ?, email = ?, phone = ?, address = ?,
           documentType = ?, documentNumber = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?;`,
      [
        customer.name,
        customer.email,
        customer.phone,
        customer.address,
        customer.documentType,
        customer.documentNumber,
        id,
      ]
    );
    return result.changes;
  } catch (error) {
    throw error;
  }
};

/**
 * Elimina (desactiva) un cliente
 */
export const deleteCustomer = async (id) => {
  try {
    const result = await db.runAsync(
      "UPDATE customers SET active = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?;",
      [id]
    );
    return result.changes;
  } catch (error) {
    throw error;
  }
};

export default {
  initCustomersTable,
  getAllCustomers,
  searchCustomers,
  getCustomerByDocumentNumber,
  createGenericCustomer,
  insertCustomer,
  updateCustomer,
  deleteCustomer,
};
