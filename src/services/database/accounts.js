import { db } from "./db";

/**
 * Obtiene todas las cuentas por cobrar
 */
export const getAllAccountsReceivable = async () => {
  try {
    const result = await db.getAllAsync(
      "SELECT * FROM accounts_receivable ORDER BY dueDate ASC;"
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
      "SELECT * FROM accounts_payable ORDER BY dueDate ASC;"
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

export default {
  getAllAccountsReceivable,
  getAllAccountsPayable,
  getAccountsReceivableStats,
  getAccountsPayableStats,
};
