import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, firestore } from "./firebase";
import { db } from "../database/db";

const SYNC_CHUNK_SIZE = 300;
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

export const syncCurrentUserSQLiteToFirestore = async (options = {}) => {
  const user = auth.currentUser;
  if (!user) {
    return { skipped: true, reason: "no-user" };
  }

  if (inFlightSync) {
    return inFlightSync;
  }

  inFlightSync = (async () => {
    const syncRunId = new Date().toISOString();
    const tables = await getUserTables();
    const userRef = doc(firestore, "users", user.uid);

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

    for (const tableName of tables) {
      const rows = await db.getAllAsync(`SELECT * FROM ${tableName};`);
      const tableRef = doc(firestore, "users", user.uid, "tables", tableName);
      const rowsCollectionRef = collection(
        firestore,
        "users",
        user.uid,
        "tables",
        tableName,
        "rows",
      );

      await setDoc(
        tableRef,
        {
          name: tableName,
          rowCount: rows.length,
          syncRunId,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      const currentRowIds = new Set(
        rows.map((row, index) => makeRowDocId(tableName, row, index)),
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
          const rowId = makeRowDocId(tableName, row, index);
          const rowRef = doc(rowsCollectionRef, rowId);

          batch.set(
            rowRef,
            {
              ...sanitizeValue(row),
              _rowId: rowId,
              _table: tableName,
              _syncRunId: syncRunId,
              _updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        });
        await batch.commit();
      }
    }

    return {
      skipped: false,
      syncRunId,
      tablesSynced: tables.length,
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
