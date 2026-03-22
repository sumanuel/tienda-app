import { db } from "./db";

const TABLE = "rate_notifications";

export const insertRateNotification = async ({
  type = "exchange_rate",
  message,
  rate = null,
  source = null,
}) => {
  if (!message || !String(message).trim()) {
    throw new Error("Message is required");
  }

  const result = await db.runAsync(
    `INSERT INTO ${TABLE} (type, message, rate, source)
     VALUES (?, ?, ?, ?);`,
    [type, String(message).trim(), rate, source],
  );

  return result.lastInsertRowId;
};

export const getRateNotifications = async ({ limit = 100 } = {}) => {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
  return await db.getAllAsync(
    `SELECT id, type, message, rate, source, createdAt
     FROM ${TABLE}
     ORDER BY datetime(createdAt) DESC
     LIMIT ?;`,
    [safeLimit],
  );
};

export const deleteRateNotification = async (id) => {
  if (!id) return false;
  await db.runAsync(`DELETE FROM ${TABLE} WHERE id = ?;`, [id]);
  return true;
};

export const getRateNotificationsCount = async () => {
  const row = await db.getFirstAsync(`SELECT COUNT(*) AS cnt FROM ${TABLE};`);
  return Number(row?.cnt || 0);
};

export default {
  insertRateNotification,
  getRateNotifications,
  deleteRateNotification,
  getRateNotificationsCount,
};
