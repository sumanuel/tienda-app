import { db } from "./db";

/**
 * Obtiene todas las cuentas por cobrar
 */
export const getAllAccountsReceivable = async () => {
  try {
    const result = await db.getAllAsync(
      "SELECT id, customerName, documentNumber, description, ROUND(amount, 2) as amount, MAX(0, ROUND(COALESCE(paidAmount, 0), 2)) as paidAmount, status, invoiceNumber, dueDate, baseCurrency, baseAmountUSD, exchangeRateAtCreation, createdAt, updatedAt FROM accounts_receivable ORDER BY createdAt DESC;"
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
      `SELECT id, customerName, documentNumber, description, ROUND(amount, 2) as amount, MAX(0, ROUND(COALESCE(paidAmount, 0), 2)) as paidAmount, status, invoiceNumber, dueDate, baseCurrency, baseAmountUSD, exchangeRateAtCreation, createdAt, updatedAt FROM accounts_receivable 
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
      "SELECT id, supplierName, documentNumber, description, ROUND(amount, 2) as amount, MAX(0, ROUND(COALESCE(paidAmount, 0), 2)) as paidAmount, status, createdAt, updatedAt FROM accounts_payable ORDER BY createdAt DESC;"
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
      `SELECT id, supplierName, documentNumber, description, ROUND(amount, 2) as amount, MAX(0, ROUND(COALESCE(paidAmount, 0), 2)) as paidAmount, status, createdAt, updatedAt FROM accounts_payable 
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
      baseCurrency,
      baseAmountUSD,
      exchangeRateAtCreation,
      description,
      dueDate,
      documentNumber,
      invoiceNumber,
      createdAt,
    } = accountData;
    const roundedAmount = Math.round(amount * 100) / 100;
    const result = await db.runAsync(
      `INSERT INTO accounts_receivable (customerId, customerName, amount, baseCurrency, baseAmountUSD, exchangeRateAtCreation, description, dueDate, documentNumber, invoiceNumber, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        customerId || null,
        customerName,
        roundedAmount,
        baseCurrency || "VES",
        baseAmountUSD || null,
        exchangeRateAtCreation || null,
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
    const roundedAmount = Math.round(amount * 100) / 100;
    const result = await db.runAsync(
      `INSERT INTO accounts_payable (supplierId, supplierName, amount, description, dueDate, documentNumber, invoiceNumber, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        supplierId || null,
        supplierName,
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
 * Actualiza una cuenta por cobrar
 */
export const updateAccountReceivable = async (id, accountData) => {
  try {
    const {
      customerName,
      amount,
      baseCurrency,
      baseAmountUSD,
      exchangeRateAtCreation,
      description,
      dueDate,
      documentNumber,
      invoiceNumber,
    } = accountData;
    await db.runAsync(
      `UPDATE accounts_receivable
       SET customerName = ?, amount = ?, baseCurrency = ?, baseAmountUSD = ?, exchangeRateAtCreation = ?, description = ?, dueDate = ?, documentNumber = ?, invoiceNumber = ?, updatedAt = datetime('now')
       WHERE id = ?`,
      [
        customerName,
        amount,
        baseCurrency || "VES",
        baseAmountUSD ?? null,
        exchangeRateAtCreation ?? null,
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
    // Primero eliminar los pagos asociados
    await db.runAsync(
      "DELETE FROM account_payments WHERE accountId = ? AND accountType = 'receivable'",
      [id]
    );
    // Luego eliminar la cuenta
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
    // Primero eliminar los pagos asociados
    await db.runAsync(
      "DELETE FROM account_payments WHERE accountId = ? AND accountType = 'payable'",
      [id]
    );
    // Luego eliminar la cuenta
    await db.runAsync("DELETE FROM accounts_payable WHERE id = ?", [id]);
  } catch (error) {
    throw error;
  }
};

/**
 * Registra un pago parcial para una cuenta por cobrar
 */
export const recordAccountPayment = async (
  accountId,
  paymentData,
  accountType = "receivable"
) => {
  try {
    const { amount, paymentMethod, paymentDate, reference, notes } =
      paymentData;

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error("Monto de pago inválido");
    }

    const roundedAmount = Math.round(numericAmount * 100) / 100;

    const tableName =
      accountType === "payable" ? "accounts_payable" : "accounts_receivable";

    // Evitar pagar más de lo debido (validación a nivel de BD)
    const currentAccount = await db.getFirstAsync(
      `SELECT ROUND(amount, 2) as amount, MAX(0, ROUND(COALESCE(paidAmount, 0), 2)) as paidAmount FROM ${tableName} WHERE id = ?`,
      [accountId]
    );

    if (!currentAccount) {
      throw new Error("Cuenta no encontrada");
    }

    const remaining = Math.max(
      0,
      (currentAccount.amount || 0) - (currentAccount.paidAmount || 0)
    );

    if (remaining <= 0) {
      throw new Error("La cuenta ya está pagada");
    }

    if (roundedAmount > remaining + 0.01) {
      throw new Error("El monto no puede ser mayor al saldo pendiente");
    }

    // Insertar el pago
    await db.runAsync(
      `INSERT INTO account_payments (accountId, accountType, amount, paymentMethod, paymentDate, reference, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        accountId,
        accountType,
        roundedAmount,
        paymentMethod,
        paymentDate || new Date().toISOString(),
        reference || "",
        notes || "",
      ]
    );

    // Actualizar el monto pagado en la cuenta
    await db.runAsync(
      `UPDATE ${tableName}
       SET paidAmount = ROUND(CASE WHEN (COALESCE(paidAmount, 0) + ?) < 0 THEN 0 ELSE (COALESCE(paidAmount, 0) + ?) END, 2), updatedAt = datetime('now')
       WHERE id = ?`,
      [roundedAmount, roundedAmount, accountId]
    );

    // Verificar si la cuenta está completamente pagada (con tolerancia de 1 centavo)
    const account = await db.getFirstAsync(
      `SELECT ROUND(amount, 2) as amount, ROUND(paidAmount, 2) as paidAmount FROM ${tableName} WHERE id = ?`,
      [accountId]
    );

    if (account && account.paidAmount + 0.01 >= account.amount) {
      await db.runAsync(
        `UPDATE ${tableName}
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
 * Obtiene todos los pagos de una cuenta
 */
export const getAccountPayments = async (
  accountId,
  accountType = "receivable"
) => {
  try {
    const result = await db.getAllAsync(
      `SELECT id, accountId, accountType, ROUND(amount, 2) as amount, paymentMethod, paymentDate, reference, notes FROM account_payments
       WHERE accountId = ? AND accountType = ?
       ORDER BY paymentDate DESC`,
      [accountId, accountType]
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Calcula el saldo pendiente de una cuenta
 */
export const getAccountBalance = async (
  accountId,
  accountType = "receivable"
) => {
  try {
    const tableName =
      accountType === "payable" ? "accounts_payable" : "accounts_receivable";

    const account = await db.getFirstAsync(
      `SELECT ROUND(amount, 2) as amount, MAX(0, ROUND(COALESCE(paidAmount, 0), 2)) as paidAmount FROM ${tableName} WHERE id = ?`,
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
 * Corrige datos corruptos en cuentas (paidAmount negativo, etc.)
 */
export const fixCorruptedAccountData = async () => {
  try {
    // Verificar si hay datos corruptos antes de proceder
    const orphanedPaymentsReceivable = await db.getFirstAsync(`
      SELECT COUNT(*) as count FROM account_payments 
      WHERE accountType = 'receivable' 
      AND accountId NOT IN (SELECT id FROM accounts_receivable)
    `);

    const orphanedPaymentsPayable = await db.getFirstAsync(`
      SELECT COUNT(*) as count FROM account_payments 
      WHERE accountType = 'payable' 
      AND accountId NOT IN (SELECT id FROM accounts_payable)
    `);

    const negativePaidReceivable = await db.getFirstAsync(`
      SELECT COUNT(*) as count FROM accounts_receivable 
      WHERE COALESCE(paidAmount, 0) < 0
    `);

    const negativePaidPayable = await db.getFirstAsync(`
      SELECT COUNT(*) as count FROM accounts_payable 
      WHERE COALESCE(paidAmount, 0) < 0
    `);

    const hasCorruptedData =
      orphanedPaymentsReceivable?.count > 0 ||
      orphanedPaymentsPayable?.count > 0 ||
      negativePaidReceivable?.count > 0 ||
      negativePaidPayable?.count > 0;

    if (!hasCorruptedData) {
      return; // No hay datos corruptos, salir
    }

    console.log("Corrigiendo datos corruptos en cuentas...");

    // Eliminar pagos huérfanos (pagos sin cuenta asociada)
    await db.runAsync(`
      DELETE FROM account_payments 
      WHERE accountType = 'receivable' 
      AND accountId NOT IN (SELECT id FROM accounts_receivable)
    `);

    await db.runAsync(`
      DELETE FROM account_payments 
      WHERE accountType = 'payable' 
      AND accountId NOT IN (SELECT id FROM accounts_payable)
    `);

    // Corregir cuentas por cobrar con paidAmount negativo
    await db.runAsync(
      `UPDATE accounts_receivable 
       SET paidAmount = 0 
       WHERE COALESCE(paidAmount, 0) < 0`
    );

    // Corregir cuentas por pagar con paidAmount negativo
    await db.runAsync(
      `UPDATE accounts_payable 
       SET paidAmount = 0 
       WHERE COALESCE(paidAmount, 0) < 0`
    );

    // Recalcular paidAmount basado en los pagos registrados
    const recalculatePaidAmount = async (tableName) => {
      const accounts = await db.getAllAsync(`SELECT id FROM ${tableName}`);
      for (const account of accounts) {
        const totalPaid = await db.getFirstAsync(
          `SELECT SUM(amount) as total FROM account_payments 
           WHERE accountId = ? AND accountType = ?`,
          [
            account.id,
            tableName === "accounts_payable" ? "payable" : "receivable",
          ]
        );
        const correctPaidAmount = Math.max(
          0,
          Math.round((totalPaid?.total || 0) * 100) / 100
        );
        await db.runAsync(
          `UPDATE ${tableName} SET paidAmount = ? WHERE id = ?`,
          [correctPaidAmount, account.id]
        );
      }
    };

    await recalculatePaidAmount("accounts_receivable");
    await recalculatePaidAmount("accounts_payable");

    console.log("Datos corruptos corregidos");
  } catch (error) {
    console.error("Error fixing corrupted data:", error);
    throw error;
  }
};

export const updateReceivableAmountsOnRateChange = async (newRate) => {
  try {
    // 1) Congelar las que ya están efectivamente pagadas (tolerancia 0.01) antes de tocar montos.
    // Esto evita que por redondeos queden como "pendientes" y luego cambien/disappezcan al recalcular.
    await db.runAsync(
      `UPDATE accounts_receivable
       SET status = 'paid',
           paidAt = COALESCE(paidAt, datetime('now')),
           updatedAt = datetime('now')
       WHERE status != 'paid'
         AND (ROUND(COALESCE(paidAmount, 0), 2) + 0.01) >= ROUND(amount, 2)`
    );

    // Actualizar amounts para cuentas por cobrar USD-base (manuales y originadas en ventas)
    // Regla: NO tocar pagadas ni ya totalmente pagadas (aunque status esté inconsistente)
    await db.runAsync(
      `UPDATE accounts_receivable 
       SET amount = ROUND(baseAmountUSD * ?, 2) 
       WHERE status != 'paid'
         AND (ROUND(COALESCE(paidAmount, 0), 2) + 0.01) < ROUND(amount, 2)
         AND baseCurrency = 'USD'
         AND baseAmountUSD IS NOT NULL AND baseAmountUSD > 0`,
      [newRate]
    );
    console.log("Amounts de cuentas por cobrar actualizados con nueva tasa");
  } catch (error) {
    console.error("Error updating receivable amounts:", error);
    throw error;
  }
};
