import { db } from "./db";
import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, firestore } from "../firebase/firebase";
import {
  getActiveStoreSeedKey,
  getStoreCollectionRef,
  getUserMembershipDocRef,
  hasActiveStoreContext,
} from "../store/storeRefs";
import { assertSharedStoreCloudWriteAvailable } from "./cloudWriteGuard";

const TABLE = "rate_notifications";
const cloudRateNotificationsSeeded = new Set();

const isCloudRateNotificationsEnabled = () =>
  Boolean(auth.currentUser?.uid) && hasActiveStoreContext();

const createCloudNumericId = () =>
  Number(
    `${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`,
  );

const getRateNotificationsCollectionRef = () =>
  getStoreCollectionRef("rate_notifications");

const canManageCloudRateNotifications = async () => {
  if (!isCloudRateNotificationsEnabled()) {
    return false;
  }

  try {
    const membershipSnapshot = await getDoc(
      getUserMembershipDocRef(auth.currentUser?.uid),
    );

    if (!membershipSnapshot.exists()) {
      return false;
    }

    const role = String(membershipSnapshot.data()?.role || "")
      .trim()
      .toLowerCase();

    return role === "owner" || role === "admin";
  } catch (error) {
    console.warn("Error resolving rate notifications permissions:", error);
    return false;
  }
};

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

  const canManageNotifications = await canManageCloudRateNotifications();
  if (!canManageNotifications) {
    return;
  }

  const seedKey = getActiveStoreSeedKey();
  if (cloudRateNotificationsSeeded.has(seedKey)) return;

  const collectionRef = getRateNotificationsCollectionRef();
  const existingSnapshot = await getDocs(collectionRef);
  if (!existingSnapshot.empty) {
    cloudRateNotificationsSeeded.add(seedKey);
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

  cloudRateNotificationsSeeded.add(seedKey);
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

  if (!isCloudRateNotificationsEnabled()) {
    assertSharedStoreCloudWriteAvailable();
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

  if (!isCloudRateNotificationsEnabled()) {
    assertSharedStoreCloudWriteAvailable();
  }

  if (isCloudRateNotificationsEnabled()) {
    await ensureCloudRateNotificationsSeeded();
    await deleteDoc(doc(getRateNotificationsCollectionRef(), String(id)));
    return true;
  }

  await db.runAsync(`DELETE FROM ${TABLE} WHERE id = ?;`, [id]);
  return true;
};

export const getRateNotificationsCount = async () => {
  try {
    if (isCloudRateNotificationsEnabled()) {
      await ensureCloudRateNotificationsSeeded();
      const notifications = await getCloudRateNotifications();
      return notifications.length;
    }

    const row = await db.getFirstAsync(`SELECT COUNT(*) AS cnt FROM ${TABLE};`);
    return Number(row?.cnt || 0);
  } catch (error) {
    console.warn(
      "Cloud rate notifications count failed, falling back locally:",
      error,
    );
    const row = await db.getFirstAsync(`SELECT COUNT(*) AS cnt FROM ${TABLE};`);
    return Number(row?.cnt || 0);
  }
};

export default {
  insertRateNotification,
  getRateNotifications,
  deleteRateNotification,
  getRateNotificationsCount,
};
