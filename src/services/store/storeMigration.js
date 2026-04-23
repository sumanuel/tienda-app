import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { firestore } from "../firebase/firebase";

const LEGACY_COLLECTIONS = [
  "products",
  "inventory_movements",
  "sales",
  "customers",
  "suppliers",
  "accounts_receivable",
  "accounts_payable",
  "account_payments",
  "exchange_rates",
  "mobile_payments",
  "rate_notifications",
];

const chunkItems = (items, size = 300) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const copyCollectionIfTargetEmpty = async ({
  uid,
  storeId,
  collectionName,
}) => {
  const sourceRef = collection(firestore, "users", uid, collectionName);
  const targetRef = collection(firestore, "stores", storeId, collectionName);

  const [sourceSnapshot, targetSnapshot] = await Promise.all([
    getDocs(sourceRef),
    getDocs(targetRef),
  ]);

  if (sourceSnapshot.empty || !targetSnapshot.empty) {
    return { copied: false, count: 0 };
  }

  const chunks = chunkItems(sourceSnapshot.docs);
  for (const chunk of chunks) {
    const batch = writeBatch(firestore);
    chunk.forEach((item) => {
      batch.set(doc(targetRef, item.id), item.data() || {}, { merge: true });
    });
    await batch.commit();
  }

  return { copied: true, count: sourceSnapshot.size };
};

export const migrateLegacyUserDataToStoreIfNeeded = async ({
  uid,
  storeId,
}) => {
  const normalizedUid = String(uid || "").trim();
  const normalizedStoreId = String(storeId || "").trim();

  if (!normalizedUid || !normalizedStoreId) {
    return { migrated: false, reason: "missing-context" };
  }

  const storeRef = doc(firestore, "stores", normalizedStoreId);
  const legacySettingsRef = doc(
    firestore,
    "users",
    normalizedUid,
    "settings",
    "app_settings",
  );
  const storeSettingsRef = doc(
    firestore,
    "stores",
    normalizedStoreId,
    "settings",
    "app_settings",
  );

  const [
    storeSnapshot,
    legacySettingsSnapshot,
    storeSettingsSnapshot,
    legacyUserSnapshot,
  ] = await Promise.all([
    getDoc(storeRef),
    getDoc(legacySettingsRef),
    getDoc(storeSettingsRef),
    getDoc(doc(firestore, "users", normalizedUid)),
  ]);

  const storeData = storeSnapshot.exists() ? storeSnapshot.data() || {} : {};
  if (storeData?.legacyMigratedFromUserId === normalizedUid) {
    return { migrated: false, reason: "already-migrated" };
  }

  if (legacySettingsSnapshot.exists() && !storeSettingsSnapshot.exists()) {
    await setDoc(storeSettingsRef, legacySettingsSnapshot.data() || {}, {
      merge: true,
    });
  }

  let totalCollectionsCopied = 0;
  let totalDocumentsCopied = 0;

  for (const collectionName of LEGACY_COLLECTIONS) {
    const result = await copyCollectionIfTargetEmpty({
      uid: normalizedUid,
      storeId: normalizedStoreId,
      collectionName,
    });

    if (result.copied) {
      totalCollectionsCopied += 1;
      totalDocumentsCopied += result.count;
    }
  }

  const legacyUserData = legacyUserSnapshot.exists()
    ? legacyUserSnapshot.data() || {}
    : {};

  await setDoc(
    storeRef,
    {
      counters: legacyUserData?.counters || {},
      legacyMigratedFromUserId: normalizedUid,
      legacyMigratedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return {
    migrated: totalCollectionsCopied > 0 || legacySettingsSnapshot.exists(),
    collectionsCopied: totalCollectionsCopied,
    documentsCopied: totalDocumentsCopied,
  };
};
