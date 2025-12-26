import { db } from "./db";
import { generateUuidV4 } from "./uuid";

export const enqueueOutboxEvent = async ({
  type,
  entityId = null,
  payload,
}) => {
  const eventId = generateUuidV4();
  const payloadJson = JSON.stringify(payload ?? {});

  await db.runAsync(
    `INSERT INTO outbox_events (eventId, type, entityId, payload, status, attempts, createdAt)
     VALUES (?, ?, ?, ?, 'pending', 0, ?);`,
    [eventId, type, entityId, payloadJson, new Date().toISOString()]
  );

  return eventId;
};

export const getPendingOutboxEvents = async (limit = 50) => {
  const rows = await db.getAllAsync(
    `SELECT id, eventId, type, entityId, payload, attempts, createdAt
     FROM outbox_events
     WHERE status = 'pending'
     ORDER BY id ASC
     LIMIT ?;`,
    [limit]
  );

  return rows.map((row) => {
    let parsedPayload = {};
    try {
      parsedPayload = JSON.parse(row.payload);
    } catch {}

    return {
      ...row,
      payload: parsedPayload,
    };
  });
};

export const markOutboxEventSent = async (eventId) => {
  await db.runAsync(
    `UPDATE outbox_events
     SET status = 'sent', sentAt = ?, lastError = NULL
     WHERE eventId = ?;`,
    [new Date().toISOString(), eventId]
  );
};

export const markOutboxEventFailed = async (eventId, errorMessage) => {
  await db.runAsync(
    `UPDATE outbox_events
     SET status = 'failed', lastError = ?, lastAttemptAt = ?
     WHERE eventId = ?;`,
    [String(errorMessage || "unknown error"), new Date().toISOString(), eventId]
  );
};

export const markOutboxEventRejected = async (eventId, reason) => {
  await db.runAsync(
    `UPDATE outbox_events
     SET status = 'rejected', lastError = ?, lastAttemptAt = ?
     WHERE eventId = ?;`,
    [String(reason || "rejected"), new Date().toISOString(), eventId]
  );
};

export const bumpOutboxAttempt = async (eventId, errorMessage = null) => {
  await db.runAsync(
    `UPDATE outbox_events
     SET attempts = COALESCE(attempts, 0) + 1,
         lastAttemptAt = ?,
         lastError = ?
     WHERE eventId = ?;`,
    [
      new Date().toISOString(),
      errorMessage ? String(errorMessage) : null,
      eventId,
    ]
  );
};

export default {
  enqueueOutboxEvent,
  getPendingOutboxEvents,
  markOutboxEventSent,
  markOutboxEventFailed,
  markOutboxEventRejected,
  bumpOutboxAttempt,
};
