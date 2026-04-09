import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, firestore } from "./firebase";
import { db } from "../database/db";
import {
  getStoreCollectionRef,
  getStoreDocRef,
  getStoreNestedDocRef,
  getUserDocRef,
  hasActiveStoreContext,
} from "../store/storeRefs";

const SYNC_CHUNK_SIZE = 300;
const CLOUD_SNAPSHOT_DATASETS = [
  "exchange_rates",
  "rate_notifications",
  "mobile_payments",
];
let syncTimer = null;
let inFlightSync = null;

const sanitizeValue = (value) => {
  if (value === undefined) return null;
  if (value === null) return null;
  if (Number.isNaN(value)) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, itemValue]) => [
        key,
        sanitizeValue(itemValue),
      ]),
    );
  }
  return value;
};

const makeRowDocId = (tableName, row, index) => {
  if (row?.id != null) return String(row.id);
  if (row?.documentNumber) return String(row.documentNumber);
  if (row?.reference) return String(row.reference);
  return `${tableName}-${index + 1}`;
};

const chunkItems = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const getUserTables = async () => {
  const rows = await db.getAllAsync(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;",
  );
  return rows.map((row) => row.name).filter(Boolean);
};

const syncRowsToSnapshot = async ({ bucket, datasetName, rows, syncRunId }) => {
  const storeRef = getStoreDocRef();
  const datasetRef = getStoreNestedDocRef([bucket, datasetName]);
  const rowsCollectionRef = collection(
    firestore,
    "stores",
    storeRef.id,
    bucket,
    datasetName,
    "rows",
  );

  await setDoc(
    datasetRef,
    {
      name: datasetName,
      rowCount: rows.length,
      syncRunId,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  const currentRowIds = new Set(
    rows.map((row, index) => makeRowDocId(datasetName, row, index)),
  );
  const existingSnapshot = await getDocs(rowsCollectionRef);
  const staleDocs = existingSnapshot.docs.filter(
    (existingDoc) => !currentRowIds.has(existingDoc.id),
  );

  const staleChunks = chunkItems(staleDocs, SYNC_CHUNK_SIZE);
  for (const staleChunk of staleChunks) {
    const deleteBatch = writeBatch(firestore);
    staleChunk.forEach((staleDoc) => {
      deleteBatch.delete(staleDoc.ref);
    });
    await deleteBatch.commit();
  }

  const chunks = chunkItems(rows, SYNC_CHUNK_SIZE);
  for (const chunk of chunks) {
    const batch = writeBatch(firestore);
    chunk.forEach((row, index) => {
      const rowId = makeRowDocId(datasetName, row, index);
      const rowRef = doc(rowsCollectionRef, rowId);

      batch.set(
        rowRef,
        {
          ...sanitizeValue(row),
          _rowId: rowId,
          _table: datasetName,
          _syncRunId: syncRunId,
          _updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    });
    await batch.commit();
  }
};

const syncAuxiliaryCloudDatasets = async (syncRunId) => {
  const settingsSnapshot = await getDoc(
    getStoreNestedDocRef(["settings", "app_settings"]),
  );

  const settingsRows = settingsSnapshot.exists()
    ? [{ id: "app_settings", ...(settingsSnapshot.data() || {}) }]
    : [];

  await syncRowsToSnapshot({
    bucket: "cloud_snapshots",
    datasetName: "settings",
    rows: settingsRows,
    syncRunId,
  });

  for (const datasetName of CLOUD_SNAPSHOT_DATASETS) {
    const snapshot = await getDocs(getStoreCollectionRef(datasetName));
    const rows = snapshot.docs.map((item) => item.data() || {});
    await syncRowsToSnapshot({
      bucket: "cloud_snapshots",
      datasetName,
      rows,
      syncRunId,
    });
  }
};

export const syncCurrentUserSQLiteToFirestore = async (options = {}) => {
  const user = auth.currentUser;
  if (!user) {
    return { skipped: true, reason: "no-user" };
  }

  if (!hasActiveStoreContext()) {
    return { skipped: true, reason: "no-active-store" };
  }

  if (inFlightSync) {
    return inFlightSync;
  }

  inFlightSync = (async () => {
    const syncRunId = new Date().toISOString();
    const tables = await getUserTables();
    const userRef = getUserDocRef(user.uid);
    const storeRef = getStoreDocRef();

    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "",
        lastCloudSyncAt: serverTimestamp(),
        lastCloudSyncRunId: syncRunId,
        lastCloudSyncReason: options.reason || "manual",
        tableCount: tables.length,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    await setDoc(
      storeRef,
      {
        lastCloudSyncAt: serverTimestamp(),
        lastCloudSyncRunId: syncRunId,
        lastCloudSyncReason: options.reason || "manual",
        tableCount: tables.length,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    for (const tableName of tables) {
      const rows = await db.getAllAsync(`SELECT * FROM ${tableName};`);
      await syncRowsToSnapshot({
        bucket: "tables",
        datasetName: tableName,
        rows,
        syncRunId,
      });
    }

    await syncAuxiliaryCloudDatasets(syncRunId);

    return {
      skipped: false,
      syncRunId,
      tablesSynced: tables.length,
      cloudDatasetsSynced: CLOUD_SNAPSHOT_DATASETS.length + 1,
    };
  })();

  try {
    return await inFlightSync;
  } finally {
    inFlightSync = null;
  }
};

export const requestCloudSync = (reason = "mutation") => {
  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  syncTimer = setTimeout(() => {
    syncCurrentUserSQLiteToFirestore({ reason }).catch((error) => {
      console.warn("Cloud sync failed:", error);
    });
  }, 1200);
};
