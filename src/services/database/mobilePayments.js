import { db } from "./db";
import {
  doc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, firestore } from "../firebase/firebase";
import {
  getActiveStoreSeedKey,
  getStoreCollectionRef,
  hasActiveStoreContext,
} from "../store/storeRefs";
import { assertSharedStoreCloudWriteAvailable } from "./cloudWriteGuard";

const cloudMobilePaymentsSeeded = new Set();

const isCloudMobilePaymentsEnabled = () =>
  Boolean(auth.currentUser?.uid) && hasActiveStoreContext();

const createCloudNumericId = () =>
  Number(
    `${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`,
  );

const getMobilePaymentsCollectionRef = () =>
  getStoreCollectionRef("mobile_payments");

const normalizeMobilePaymentRecord = (payment = {}) => ({
  id: Number(payment.id) || createCloudNumericId(),
  reference: String(payment.reference || "").trim(),
  customerName: String(payment.customerName || "").trim(),
  amount: Number(payment.amount) || 0,
  verified: Number(payment.verified ?? 0),
  verifiedAt: payment.verifiedAt || null,
  createdAt: payment.createdAt || new Date().toISOString(),
});

const getCloudMobilePayments = async () => {
  const snapshot = await getDocs(getMobilePaymentsCollectionRef());
  return snapshot.docs.map((item) => normalizeMobilePaymentRecord(item.data()));
};

const mergeMissingLocalMobilePaymentsIntoCloud = async () => {
  const collectionRef = getMobilePaymentsCollectionRef();
  const existingSnapshot = await getDocs(collectionRef);
  const existingIds = new Set(
    existingSnapshot.docs.map(
      (item) => Number(item.data()?.id) || Number(item.id) || 0,
    ),
  );

  const rows = await db.getAllAsync(
    "SELECT * FROM mobile_payments ORDER BY createdAt DESC, id DESC;",
  );

  const missingRows = rows
    .map((row) => normalizeMobilePaymentRecord(row))
    .filter((row) => row.id > 0 && !existingIds.has(Number(row.id)));

  if (missingRows.length > 0) {
    const batch = writeBatch(firestore);
    missingRows.forEach((row) => {
      batch.set(doc(collectionRef, String(row.id)), row, { merge: true });
    });
    await batch.commit();
  }
};

const ensureCloudMobilePaymentsSeeded = async () => {
  if (!isCloudMobilePaymentsEnabled()) return;

  const seedKey = getActiveStoreSeedKey();
  if (cloudMobilePaymentsSeeded.has(seedKey)) return;

  const collectionRef = getMobilePaymentsCollectionRef();
  const existingSnapshot = await getDocs(collectionRef);
  if (!existingSnapshot.empty) {
    await mergeMissingLocalMobilePaymentsIntoCloud();
    cloudMobilePaymentsSeeded.add(seedKey);
    return;
  }

  const rows = await db.getAllAsync(
    "SELECT * FROM mobile_payments ORDER BY createdAt DESC, id DESC;",
  );

  if (rows.length > 0) {
    const batch = writeBatch(firestore);
    rows.forEach((row) => {
      const normalized = normalizeMobilePaymentRecord(row);
      batch.set(doc(collectionRef, String(normalized.id)), normalized, {
        merge: true,
      });
    });
    await batch.commit();
  }

  cloudMobilePaymentsSeeded.add(seedKey);
};

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

  if (!isCloudMobilePaymentsEnabled()) {
    assertSharedStoreCloudWriteAvailable();
  }

  if (isCloudMobilePaymentsEnabled()) {
    await ensureCloudMobilePaymentsSeeded();
    const id = createCloudNumericId();
    const payload = normalizeMobilePaymentRecord({
      id,
      reference: ref,
      customerName: customer,
      amount: numericAmount,
      verified: verified ? 1 : 0,
      verifiedAt: verified ? new Date().toISOString() : null,
    });
    await setDoc(doc(getMobilePaymentsCollectionRef(), String(id)), payload);
    return id;
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
  if (isCloudMobilePaymentsEnabled()) {
    await ensureCloudMobilePaymentsSeeded();
    const rows = (await getCloudMobilePayments())
      .filter((item) => Number(item.verified) === (verified ? 1 : 0))
      .sort((a, b) => {
        const aDate = verified
          ? a.verifiedAt || a.createdAt || ""
          : a.createdAt || "";
        const bDate = verified
          ? b.verifiedAt || b.createdAt || ""
          : b.createdAt || "";
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });

    return rows;
  }

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

  if (!isCloudMobilePaymentsEnabled()) {
    assertSharedStoreCloudWriteAvailable();
  }

  if (isCloudMobilePaymentsEnabled()) {
    await ensureCloudMobilePaymentsSeeded();
    await updateDoc(doc(getMobilePaymentsCollectionRef(), String(numericId)), {
      verified: 1,
      verifiedAt: new Date().toISOString(),
    });
    return 1;
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
