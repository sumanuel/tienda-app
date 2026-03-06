import { db } from "./db";

const normalizeText = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

export const insertMobilePayment = async ({
  reference,
  customerName,
  amount,
  verified = false,
}) => {
  const ref = normalizeText(reference);
  const customer = normalizeText(customerName);
  const numericAmount = Number(amount);

  if (!ref) throw new Error("Referencia requerida");
  if (!customer) throw new Error("Cliente requerido");
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Monto inválido");
  }

  if (verified) {
    const result = await db.runAsync(
      `INSERT INTO mobile_payments (reference, customerName, amount, verified, verifiedAt)
       VALUES (?, ?, ?, 1, datetime('now'));`,
      [ref, customer, numericAmount],
    );
    return result.lastInsertRowId;
  }

  const result = await db.runAsync(
    `INSERT INTO mobile_payments (reference, customerName, amount, verified)
     VALUES (?, ?, ?, 0);`,
    [ref, customer, numericAmount],
  );

  return result.lastInsertRowId;
};

export const getMobilePaymentsByVerified = async (verified) => {
  const verifiedInt = verified ? 1 : 0;

  const orderBy = verified
    ? "ORDER BY COALESCE(verifiedAt, createdAt) DESC, id DESC"
    : "ORDER BY createdAt DESC, id DESC";

  const rows = await db.getAllAsync(
    `SELECT *
     FROM mobile_payments
     WHERE verified = ?
     ${orderBy};`,
    [verifiedInt],
  );

  return rows || [];
};

export const verifyMobilePayment = async (id) => {
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    throw new Error("ID inválido");
  }

  const result = await db.runAsync(
    `UPDATE mobile_payments
     SET verified = 1,
         verifiedAt = datetime('now')
     WHERE id = ?;`,
    [numericId],
  );

  return result.changes;
};
