import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db, initAllTables } from "../database/db";
import { auth, firestore } from "../firebase/firebase";
import { ensureSettingsDefaults } from "../database/settings";

const BACKUP_DIR = `${FileSystem.documentDirectory}backups/`;
const CLOUD_BACKUP_COLLECTIONS = [
  "products",
  "customers",
  "suppliers",
  "sales",
  "accounts_receivable",
  "accounts_payable",
  "account_payments",
  "inventory_movements",
  "exchange_rates",
  "rate_notifications",
  "mobile_payments",
];

const nowStamp = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

const ensureBackupDir = async () => {
  const info = await FileSystem.getInfoAsync(BACKUP_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
  }
};

const getUserTables = async () => {
  const rows = await db.getAllAsync(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;",
  );
  return rows.map((r) => r.name);
};

const isSafeIdentifier = (name) => {
  return /^[A-Za-z0-9_]+$/.test(String(name || ""));
};

const q = (name) => {
  const raw = String(name || "");
  // Nota: igual validamos con isSafeIdentifier; esto es defensa extra.
  return `"${raw.replace(/"/g, '""')}"`;
};

const toInsertOrder = (tables) => {
  // Orden recomendado para respetar llaves foráneas
  const preferred = [
    "customers",
    "suppliers",
    "products",
    "inventory_movements",
    "sales",
    "sale_items",
    "accounts_receivable",
    "accounts_payable",
    "account_payments",
    "exchange_rates",
    "settings",
    "mobile_payments",
    "rate_notifications",
  ];

  const set = new Set(tables);
  const ordered = preferred.filter((t) => set.has(t));
  const rest = tables.filter((t) => !ordered.includes(t));
  return [...ordered, ...rest];
};

const tableExists = async (table) => {
  if (!table) return false;
  const found = await db.getFirstAsync(
    "SELECT name FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1;",
    [table],
  );
  return !!found?.name;
};

const getTableColumns = async (table) => {
  if (!isSafeIdentifier(table)) return [];
  const cols = await db.getAllAsync(`PRAGMA table_info(${q(table)});`);
  return cols.map((c) => c.name);
};

const ensureGenericCustomerAfterImport = async () => {
  try {
    if (!(await tableExists("customers"))) return;

    const existing = await db.getFirstAsync(
      "SELECT id FROM customers WHERE documentNumber = ? AND active = 1 LIMIT 1;",
      ["1"],
    );
    if (existing?.id) return;

    await db.runAsync(
      `INSERT INTO customers (name, documentNumber, documentType)
       VALUES (?, ?, ?);`,
      ["Cliente Genérico", "1", "V"],
    );
  } catch (error) {
    console.warn("Warning ensuring generic customer after import:", error);
  }
};

const toDeleteOrder = (tables) => {
  return [...toInsertOrder(tables)].reverse();
};

const getCloudBackupPayload = async () => {
  const user = auth.currentUser;
  if (!user) return null;

  const settingsSnapshot = await getDoc(
    doc(firestore, "users", user.uid, "settings", "app_settings"),
  );

  const collections = {};
  for (const collectionName of CLOUD_BACKUP_COLLECTIONS) {
    const snapshot = await getDocs(
      collection(firestore, "users", user.uid, collectionName),
    );
    collections[collectionName] = snapshot.docs.map((item) => item.data());
  }

  return {
    settings: settingsSnapshot.exists() ? settingsSnapshot.data() || {} : null,
    collections,
  };
};

const restoreCloudBackupPayload = async (cloudPayload) => {
  const user = auth.currentUser;
  if (!user || !cloudPayload || typeof cloudPayload !== "object") {
    return { restoredCollections: 0 };
  }

  let restoredCollections = 0;

  if (cloudPayload.settings && typeof cloudPayload.settings === "object") {
    await setDoc(
      doc(firestore, "users", user.uid, "settings", "app_settings"),
      cloudPayload.settings,
      { merge: false },
    );
  }

  const collections = cloudPayload.collections || {};
  for (const collectionName of Object.keys(collections)) {
    const rows = Array.isArray(collections[collectionName])
      ? collections[collectionName]
      : [];
    const collectionRef = collection(
      firestore,
      "users",
      user.uid,
      collectionName,
    );
    const existingSnapshot = await getDocs(collectionRef);

    const deleteChunks = [];
    for (let index = 0; index < existingSnapshot.docs.length; index += 300) {
      deleteChunks.push(existingSnapshot.docs.slice(index, index + 300));
    }

    for (const chunk of deleteChunks) {
      const deleteBatch = writeBatch(firestore);
      chunk.forEach((item) => deleteBatch.delete(item.ref));
      await deleteBatch.commit();
    }

    for (let index = 0; index < rows.length; index += 300) {
      const batch = writeBatch(firestore);
      rows.slice(index, index + 300).forEach((row, rowIndex) => {
        const rowId =
          row?.id != null
            ? String(row.id)
            : row?.documentNumber
              ? String(row.documentNumber)
              : row?.reference
                ? String(row.reference)
                : `${collectionName}-${index + rowIndex + 1}`;
        batch.set(doc(collectionRef, rowId), row || {}, { merge: false });
      });
      await batch.commit();
    }

    restoredCollections += 1;
  }

  return { restoredCollections };
};

export const exportDatabaseBackup = async () => {
  await initAllTables();
  await ensureBackupDir();

  const tables = await getUserTables();
  const data = {};

  for (const table of tables) {
    if (!isSafeIdentifier(table)) continue;
    const rows = await db.getAllAsync(`SELECT * FROM ${q(table)};`);
    data[table] = rows;
  }

  const payload = {
    meta: {
      app: "tienda-app",
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      hasCloudData: Boolean(auth.currentUser),
    },
    tables: data,
    cloud: await getCloudBackupPayload(),
  };

  const fileName = `tienda-backup-${nowStamp()}.json`;
  const uri = `${BACKUP_DIR}${fileName}`;

  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return { uri, fileName, tableCount: tables.length };
};

export const shareBackupFile = async (uri) => {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    // Si no se puede compartir, al menos dejamos el archivo en el directorio
    return { shared: false };
  }

  await Sharing.shareAsync(uri, {
    mimeType: "application/json",
    dialogTitle: "Exportar respaldo",
    UTI: "public.json",
  });

  return { shared: true };
};

export const pickBackupFile = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/json", "public.json"],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) {
    return null;
  }

  const file = result.assets?.[0];
  if (!file?.uri) {
    return null;
  }

  return { uri: file.uri, name: file.name };
};

export const importDatabaseBackupFromUri = async (uri) => {
  await initAllTables();

  const content = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error("El archivo no es un JSON válido");
  }

  if (!parsed?.tables || typeof parsed.tables !== "object") {
    throw new Error("Formato de respaldo inválido (falta 'tables')");
  }

  const tables = Object.keys(parsed.tables);
  const insertOrder = toInsertOrder(tables);
  const deleteOrder = toDeleteOrder(tables);

  await db.withTransactionAsync(async () => {
    // Evitar bloqueos por FKs durante restore
    await db.execAsync("PRAGMA foreign_keys = OFF;");

    try {
      // Limpiar tablas existentes (solo las que existan en esta instalación)
      for (const table of deleteOrder) {
        if (!isSafeIdentifier(table)) continue;
        if (!(await tableExists(table))) continue;
        await db.runAsync(`DELETE FROM ${q(table)};`);
      }

      // Insertar datos respetando el schema actual (compatibilidad entre versiones)
      for (const table of insertOrder) {
        if (!isSafeIdentifier(table)) continue;
        if (!(await tableExists(table))) continue;

        const rows = parsed.tables[table] || [];
        if (!Array.isArray(rows) || rows.length === 0) continue;

        const tableColumns = new Set(await getTableColumns(table));

        for (const row of rows) {
          if (!row || typeof row !== "object") continue;

          const columns = Object.keys(row).filter((c) => tableColumns.has(c));
          if (columns.length === 0) continue;

          const placeholders = columns.map(() => "?").join(", ");
          const values = columns.map((c) => row[c]);

          const sql = `INSERT INTO ${q(table)} (${columns
            .map((c) => q(c))
            .join(", ")}) VALUES (${placeholders});`;
          await db.runAsync(sql, values);
        }
      }
    } finally {
      await db.execAsync("PRAGMA foreign_keys = ON;");
    }
  });

  // Reasegurar datos mínimos y defaults post-restore
  await ensureGenericCustomerAfterImport();
  await ensureSettingsDefaults();

  const cloudResult = await restoreCloudBackupPayload(parsed.cloud);

  return { importedTables: tables.length, ...cloudResult };
};
