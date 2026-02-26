import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";
import { db, initAllTables } from "../database/db";

const EXPORT_DIR = `${FileSystem.documentDirectory}exports/`;

const nowStamp = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

const ensureExportDir = async () => {
  const info = await FileSystem.getInfoAsync(EXPORT_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(EXPORT_DIR, { intermediates: true });
  }
};

const getUserTables = async () => {
  const rows = await db.getAllAsync(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;",
  );
  return rows.map((r) => r.name);
};

const toSheetName = (tableName) => {
  const raw = String(tableName || "Hoja");
  // Excel: nombre de hoja <= 31 caracteres y sin caracteres especiales.
  const cleaned = raw.replace(/[\\/?*\[\]:]/g, "-");
  return cleaned.length > 31 ? cleaned.slice(0, 31) : cleaned;
};

export const exportDataToExcel = async () => {
  await initAllTables();
  await ensureExportDir();

  const tables = await getUserTables();
  const workbook = XLSX.utils.book_new();

  for (const table of tables) {
    const rows = await db.getAllAsync(`SELECT * FROM ${table};`);
    const worksheet = XLSX.utils.json_to_sheet(rows || []);
    XLSX.utils.book_append_sheet(workbook, worksheet, toSheetName(table));
  }

  const fileName = `tienda-datos-${nowStamp()}.xlsx`;
  const uri = `${EXPORT_DIR}${fileName}`;

  const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });

  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return { uri, fileName, sheetCount: tables.length };
};

export const shareExcelFile = async (uri) => {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    return { shared: false };
  }

  await Sharing.shareAsync(uri, {
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: "Exportar a Excel",
    UTI: "com.microsoft.excel.xlsx",
  });

  return { shared: true };
};

export default {
  exportDataToExcel,
  shareExcelFile,
};
