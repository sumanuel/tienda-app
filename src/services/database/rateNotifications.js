import { db } from "./db";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, firestore } from "../firebase/firebase";

const TABLE = "rate_notifications";
const cloudRateNotificationsSeeded = new Set();

const isCloudRateNotificationsEnabled = () => Boolean(auth.currentUser?.uid);

const createCloudNumericId = () =>
  Number(
    `${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`,
  );

const getRateNotificationsCollectionRef = () =>
  collection(firestore, "users", auth.currentUser.uid, "rate_notifications");

const normalizeRateNotificationRecord = (notification = {}) => ({
  id: Number(notification.id) || createCloudNumericId(),
  type: String(notification.type || "exchange_rate").trim(),
  message: String(notification.message || "").trim(),
  rate:
    notification.rate == null || notification.rate === ""
      ? null
      : Number(notification.rate) || 0,
  source:
    notification.source == null ? null : String(notification.source).trim(),
  createdAt: notification.createdAt || new Date().toISOString(),
});

const getCloudRateNotifications = async () => {
  const snapshot = await getDocs(getRateNotificationsCollectionRef());
  return snapshot.docs
    .map((item) => normalizeRateNotificationRecord(item.data()))
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );
};

const ensureCloudRateNotificationsSeeded = async () => {
  if (!isCloudRateNotificationsEnabled()) return;

  const uid = auth.currentUser.uid;
  if (cloudRateNotificationsSeeded.has(uid)) return;

  const collectionRef = getRateNotificationsCollectionRef();
  const existingSnapshot = await getDocs(collectionRef);
  if (!existingSnapshot.empty) {
    cloudRateNotificationsSeeded.add(uid);
    return;
  }

  const rows = await db.getAllAsync(
    `SELECT id, type, message, rate, source, createdAt FROM ${TABLE} ORDER BY createdAt DESC;`,
  );

  if (rows.length > 0) {
    const batch = writeBatch(firestore);
    rows.forEach((row) => {
      const normalized = normalizeRateNotificationRecord(row);
      batch.set(doc(collectionRef, String(normalized.id)), normalized, {
        merge: true,
      });
    });
    await batch.commit();
  }

  cloudRateNotificationsSeeded.add(uid);
};

export const insertRateNotification = async ({
  type = "exchange_rate",
  message,
  rate = null,
  source = null,
}) => {
  if (!message || !String(message).trim()) {
    throw new Error("Message is required");
  }

  if (isCloudRateNotificationsEnabled()) {
    await ensureCloudRateNotificationsSeeded();
    const id = createCloudNumericId();
    const payload = normalizeRateNotificationRecord({
      id,
      type,
      message,
      rate,
      source,
    });
    await setDoc(doc(getRateNotificationsCollectionRef(), String(id)), payload);
    return id;
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

  if (isCloudRateNotificationsEnabled()) {
    await ensureCloudRateNotificationsSeeded();
    const notifications = await getCloudRateNotifications();
    return notifications.slice(0, safeLimit);
  }

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

  if (isCloudRateNotificationsEnabled()) {
    await ensureCloudRateNotificationsSeeded();
    await deleteDoc(doc(getRateNotificationsCollectionRef(), String(id)));
    return true;
  }

  await db.runAsync(`DELETE FROM ${TABLE} WHERE id = ?;`, [id]);
  return true;
};

export const getRateNotificationsCount = async () => {
  if (isCloudRateNotificationsEnabled()) {
    await ensureCloudRateNotificationsSeeded();
    const notifications = await getCloudRateNotifications();
    return notifications.length;
  }

  const row = await db.getFirstAsync(`SELECT COUNT(*) AS cnt FROM ${TABLE};`);
  return Number(row?.cnt || 0);
};

export default {
  insertRateNotification,
  getRateNotifications,
  deleteRateNotification,
  getRateNotificationsCount,
};
