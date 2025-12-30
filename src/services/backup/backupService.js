import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { db, initAllTables } from "../database/db";

const BACKUP_DIR = `${FileSystem.documentDirectory}backups/`;

const nowStamp = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours()
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
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
  );
  return rows.map((r) => r.name);
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
  ];

  const set = new Set(tables);
  const ordered = preferred.filter((t) => set.has(t));
  const rest = tables.filter((t) => !ordered.includes(t));
  return [...ordered, ...rest];
};

const toDeleteOrder = (tables) => {
  return [...toInsertOrder(tables)].reverse();
};

export const exportDatabaseBackup = async () => {
  await initAllTables();
  await ensureBackupDir();

  const tables = await getUserTables();
  const data = {};

  for (const table of tables) {
    const rows = await db.getAllAsync(`SELECT * FROM ${table};`);
    data[table] = rows;
  }

  const payload = {
    meta: {
      app: "tienda-app",
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
    },
    tables: data,
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

    for (const table of deleteOrder) {
      await db.runAsync(`DELETE FROM ${table};`);
    }

    for (const table of insertOrder) {
      const rows = parsed.tables[table] || [];
      if (!Array.isArray(rows) || rows.length === 0) continue;

      for (const row of rows) {
        const columns = Object.keys(row);
        const placeholders = columns.map(() => "?").join(", ");
        const values = columns.map((c) => row[c]);
        const sql = `INSERT INTO ${table} (${columns.join(
          ", "
        )}) VALUES (${placeholders});`;
        await db.runAsync(sql, values);
      }
    }

    await db.execAsync("PRAGMA foreign_keys = ON;");
  });

  return { importedTables: tables.length };
};
