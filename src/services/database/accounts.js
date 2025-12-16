import { db } from "./db";

/**
 * Obtiene todas las cuentas por cobrar
 */
export const getAllAccountsReceivable = async () => {
  try {
    const result = await db.getAllAsync(
      "SELECT * FROM accounts_receivable ORDER BY createdAt DESC;"
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Busca cuentas por cobrar por nombre de cliente, cédula o descripción
 */
export const searchAccountsReceivable = async (query) => {
  try {
    const searchTerm = `%${query}%`;
    const result = await db.getAllAsync(
      `SELECT * FROM accounts_receivable 
       WHERE customerName LIKE ? 
       OR documentNumber LIKE ? 
       OR description LIKE ?
       ORDER BY createdAt DESC;`,
      [searchTerm, searchTerm, searchTerm]
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene todas las cuentas por pagar
 */
export const getAllAccountsPayable = async () => {
  try {
    const result = await db.getAllAsync(
      "SELECT * FROM accounts_payable ORDER BY createdAt DESC;"
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Busca cuentas por pagar por nombre de proveedor, cédula o descripción
 */
export const searchAccountsPayable = async (query) => {
  try {
    const searchTerm = `%${query}%`;
    const result = await db.getAllAsync(
      `SELECT * FROM accounts_payable 
       WHERE supplierName LIKE ? 
       OR documentNumber LIKE ? 
       OR description LIKE ?
       ORDER BY createdAt DESC;`,
      [searchTerm, searchTerm, searchTerm]
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene estadísticas de cuentas por cobrar
 */
export const getAccountsReceivableStats = async () => {
  try {
    const result = await db.getAllAsync(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END) as overdue,
        SUM(amount) as totalAmount
      FROM accounts_receivable
    `);
    return result[0] || { total: 0, pending: 0, overdue: 0, totalAmount: 0 };
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene estadísticas de cuentas por pagar
 */
export const getAccountsPayableStats = async () => {
  try {
    const result = await db.getAllAsync(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END) as overdue,
        SUM(amount) as totalAmount
      FROM accounts_payable
    `);
    return result[0] || { total: 0, pending: 0, overdue: 0, totalAmount: 0 };
  } catch (error) {
    throw error;
  }
};

/**
 * Crea una nueva cuenta por cobrar
 */
export const createAccountReceivable = async (accountData) => {
  try {
    const {
      customerName,
      amount,
      description,
      dueDate,
      documentNumber,
      invoiceNumber,
      createdAt,
    } = accountData;
    const result = await db.runAsync(
      `INSERT INTO accounts_receivable (customerName, amount, description, dueDate, documentNumber, invoiceNumber, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        customerName,
        amount,
        description || null,
        dueDate || null,
        documentNumber || null,
        invoiceNumber || null,
        createdAt || new Date().toISOString(),
      ]
    );
    return result.lastInsertRowId;
  } catch (error) {
    throw error;
  }
};

/**
 * Crea una nueva cuenta por pagar
 */
export const createAccountPayable = async (accountData) => {
  try {
    const {
      supplierName,
      amount,
      description,
      dueDate,
      documentNumber,
      invoiceNumber,
      createdAt,
    } = accountData;
    const result = await db.runAsync(
      `INSERT INTO accounts_payable (supplierName, amount, description, dueDate, documentNumber, invoiceNumber, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        supplierName,
        amount,
        description || null,
        dueDate || null,
        documentNumber || null,
        invoiceNumber || null,
        createdAt || new Date().toISOString(),
      ]
    );
    return result.lastInsertRowId;
  } catch (error) {
    throw error;
  }
};

/**
 * Actualiza una cuenta por cobrar
 */
export const updateAccountReceivable = async (id, accountData) => {
  try {
    const {
      customerName,
      amount,
      description,
      dueDate,
      documentNumber,
      invoiceNumber,
    } = accountData;
    await db.runAsync(
      `UPDATE accounts_receivable
       SET customerName = ?, amount = ?, description = ?, dueDate = ?, documentNumber = ?, invoiceNumber = ?, updatedAt = datetime('now')
       WHERE id = ?`,
      [
        customerName,
        amount,
        description || null,
        dueDate || null,
        documentNumber || null,
        invoiceNumber || null,
        id,
      ]
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Actualiza una cuenta por pagar
 */
export const updateAccountPayable = async (id, accountData) => {
  try {
    const { supplierName, amount, description, dueDate } = accountData;
    await db.runAsync(
      `UPDATE accounts_payable
       SET supplierName = ?, amount = ?, description = ?, dueDate = ?, updatedAt = datetime('now')
       WHERE id = ?`,
      [supplierName, amount, description || null, dueDate || null, id]
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Marca una cuenta por cobrar como pagada
 */
export const markAccountReceivableAsPaid = async (id) => {
  try {
    await db.runAsync(
      `UPDATE accounts_receivable
       SET status = 'paid', paidAt = datetime('now'), updatedAt = datetime('now')
       WHERE id = ?`,
      [id]
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Marca una cuenta por pagar como pagada
 */
export const markAccountPayableAsPaid = async (id) => {
  try {
    await db.runAsync(
      `UPDATE accounts_payable
       SET status = 'paid', paidAt = datetime('now'), updatedAt = datetime('now')
       WHERE id = ?`,
      [id]
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Elimina una cuenta por cobrar
 */
export const deleteAccountReceivable = async (id) => {
  try {
    await db.runAsync("DELETE FROM accounts_receivable WHERE id = ?", [id]);
  } catch (error) {
    throw error;
  }
};

/**
 * Elimina una cuenta por pagar
 */
export const deleteAccountPayable = async (id) => {
  try {
    await db.runAsync("DELETE FROM accounts_payable WHERE id = ?", [id]);
  } catch (error) {
    throw error;
  }
};

export default {
  getAllAccountsReceivable,
  searchAccountsReceivable,
  getAllAccountsPayable,
  getAccountsReceivableStats,
  getAccountsPayableStats,
  createAccountReceivable,
  createAccountPayable,
  updateAccountReceivable,
  updateAccountPayable,
  markAccountReceivableAsPaid,
  markAccountPayableAsPaid,
  deleteAccountReceivable,
  deleteAccountPayable,
};
