import { db } from "./db";

/**
 * Inicializa la tabla de proveedores
 */
export const initSuppliersTable = async () => {
  try {
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        documentNumber TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        contactPerson TEXT,
        paymentTerms TEXT,
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
 * Obtiene todos los proveedores activos
 */
export const getAllSuppliers = async () => {
  try {
    const result = await db.getAllAsync(
      "SELECT * FROM suppliers WHERE active = 1 ORDER BY name;"
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Busca proveedores por nombre, teléfono o cédula/RIF
 */
export const searchSuppliers = async (query) => {
  try {
    const result = await db.getAllAsync(
      `SELECT * FROM suppliers
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
 * Inserta un nuevo proveedor
 */
export const insertSupplier = async (supplier) => {
  try {
    const result = await db.runAsync(
      `INSERT INTO suppliers (documentNumber, name, email, phone, address, contactPerson, paymentTerms)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        supplier.documentNumber,
        supplier.name,
        supplier.email || "",
        supplier.phone || "",
        supplier.address || "",
        supplier.contactPerson || "",
        supplier.paymentTerms || "",
      ]
    );
    return result.lastInsertRowId;
  } catch (error) {
    throw error;
  }
};

/**
 * Actualiza un proveedor
 */
export const updateSupplier = async (id, supplier) => {
  try {
    const result = await db.runAsync(
      `UPDATE suppliers
       SET documentNumber = ?, name = ?, email = ?, phone = ?, address = ?,
           contactPerson = ?, paymentTerms = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?;`,
      [
        supplier.documentNumber,
        supplier.name,
        supplier.email,
        supplier.phone,
        supplier.address,
        supplier.contactPerson,
        supplier.paymentTerms,
        id,
      ]
    );
    return result.changes;
  } catch (error) {
    throw error;
  }
};

/**
 * Elimina (desactiva) un proveedor
 */
export const deleteSupplier = async (id) => {
  try {
    const result = await db.runAsync(
      "UPDATE suppliers SET active = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?;",
      [id]
    );
    return result.changes;
  } catch (error) {
    throw error;
  }
};

export default {
  initSuppliersTable,
  getAllSuppliers,
  searchSuppliers,
  insertSupplier,
  updateSupplier,
  deleteSupplier,
};
