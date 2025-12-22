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
      customerId,
      customerName,
      amount,
      description,
      dueDate,
      documentNumber,
      invoiceNumber,
      createdAt,
    } = accountData;
    const roundedAmount = Math.round(amount * 100) / 100;
    const result = await db.runAsync(
      `INSERT INTO accounts_receivable (customerId, customerName, amount, description, dueDate, documentNumber, invoiceNumber, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        customerId || null,
        customerName,
        roundedAmount,
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
      supplierId,
      supplierName,
      amount,
      description,
      dueDate,
      documentNumber,
      invoiceNumber,
      createdAt,
    } = accountData;
    const result = await db.runAsync(
      `INSERT INTO accounts_payable (supplierId, supplierName, amount, description, dueDate, documentNumber, invoiceNumber, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        supplierId || null,
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

/**
 * Registra un pago parcial para una cuenta por cobrar
 */
export const recordAccountPayment = async (accountId, paymentData) => {
  try {
    const { amount, paymentMethod, paymentDate, reference, notes } =
      paymentData;

    // Redondear el monto del pago a 2 decimales
    const roundedAmount = Math.round(amount * 100) / 100;

    // Insertar el pago
    await db.runAsync(
      `INSERT INTO account_payments (accountId, accountType, amount, paymentMethod, paymentDate, reference, notes)
       VALUES (?, 'receivable', ?, ?, ?, ?, ?)`,
      [
        accountId,
        roundedAmount,
        paymentMethod,
        paymentDate || new Date().toISOString(),
        reference || "",
        notes || "",
      ]
    );

    // Actualizar el monto pagado en la cuenta
    await db.runAsync(
      `UPDATE accounts_receivable
       SET paidAmount = ROUND(COALESCE(paidAmount, 0) + ?, 2), updatedAt = datetime('now')
       WHERE id = ?`,
      [roundedAmount, accountId]
    );

    // Verificar si la cuenta está completamente pagada (con tolerancia de 1 centavo)
    const account = await db.getFirstAsync(
      `SELECT ROUND(amount, 2) as amount, ROUND(paidAmount, 2) as paidAmount FROM accounts_receivable WHERE id = ?`,
      [accountId]
    );

    if (account && account.paidAmount + 0.01 >= account.amount) {
      await db.runAsync(
        `UPDATE accounts_receivable
         SET status = 'paid', paidAt = datetime('now'), updatedAt = datetime('now')
         WHERE id = ?`,
        [accountId]
      );
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene todos los pagos de una cuenta por cobrar
 */
export const getAccountPayments = async (accountId) => {
  try {
    const result = await db.getAllAsync(
      `SELECT * FROM account_payments
       WHERE accountId = ? AND accountType = 'receivable'
       ORDER BY paymentDate DESC`,
      [accountId]
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Calcula el saldo pendiente de una cuenta por cobrar
 */
export const getAccountBalance = async (accountId) => {
  try {
    const account = await db.getFirstAsync(
      `SELECT amount, COALESCE(paidAmount, 0) as paidAmount FROM accounts_receivable WHERE id = ?`,
      [accountId]
    );

    if (!account) {
      throw new Error("Cuenta no encontrada");
    }

    const balance = account.amount - account.paidAmount;
    return {
      totalAmount: account.amount,
      paidAmount: account.paidAmount,
      balance: Math.max(0, balance), // No permitir saldos negativos
      isPaid: balance <= 0,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Corrige los montos de cuentas existentes para usar exactamente 2 decimales
 */
export const fixAccountDecimalPrecision = async () => {
  try {
    // Corregir cuentas por cobrar
    await db.runAsync(
      `UPDATE accounts_receivable 
       SET amount = ROUND(amount, 2), paidAmount = ROUND(COALESCE(paidAmount, 0), 2)`
    );

    // Corregir cuentas por pagar
    await db.runAsync(
      `UPDATE accounts_payable 
       SET amount = ROUND(amount, 2), paidAmount = ROUND(COALESCE(paidAmount, 0), 2)`
    );

    // Corregir pagos
    await db.runAsync(
      `UPDATE account_payments 
       SET amount = ROUND(amount, 2)`
    );

    console.log("Precisión decimal corregida en todas las cuentas y pagos");
  } catch (error) {
    throw error;
  }
};
