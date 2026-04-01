import { db } from "./db";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, firestore } from "../firebase/firebase";

const cloudExchangeRatesSeeded = new Set();

const isCloudExchangeRatesEnabled = () => Boolean(auth.currentUser?.uid);

const createCloudNumericId = () =>
  Number(
    `${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`,
  );

const getExchangeRatesCollectionRef = () =>
  collection(firestore, "users", auth.currentUser.uid, "exchange_rates");

const normalizeExchangeRateRecord = (rate = {}) => ({
  id: Number(rate.id) || createCloudNumericId(),
  source: String(rate.source || "MANUAL").trim(),
  rate: Number(rate.rate) || 0,
  fromCurrency: String(rate.fromCurrency || "USD").trim(),
  toCurrency: String(rate.toCurrency || "VES").trim(),
  isActive: Number(rate.isActive ?? 0),
  createdAt: rate.createdAt || new Date().toISOString(),
});

const sortExchangeRatesByDateDesc = (items = []) =>
  [...items].sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime(),
  );

const getCloudExchangeRates = async () => {
  const snapshot = await getDocs(getExchangeRatesCollectionRef());
  return sortExchangeRatesByDateDesc(
    snapshot.docs.map((item) => normalizeExchangeRateRecord(item.data())),
  );
};

const ensureCloudExchangeRatesSeeded = async () => {
  if (!isCloudExchangeRatesEnabled()) return;

  const uid = auth.currentUser.uid;
  if (cloudExchangeRatesSeeded.has(uid)) return;

  const collectionRef = getExchangeRatesCollectionRef();
  const existingSnapshot = await getDocs(collectionRef);
  if (!existingSnapshot.empty) {
    cloudExchangeRatesSeeded.add(uid);
    return;
  }

  const rows = await db.getAllAsync(
    "SELECT * FROM exchange_rates ORDER BY createdAt DESC;",
  );

  if (rows.length > 0) {
    const batch = writeBatch(firestore);
    rows.forEach((row) => {
      const normalized = normalizeExchangeRateRecord(row);
      batch.set(doc(collectionRef, String(normalized.id)), normalized, {
        merge: true,
      });
    });
    await batch.commit();
  }

  cloudExchangeRatesSeeded.add(uid);
};

/**
 * Inicializa la tabla de tasas de cambio
 */
export const initExchangeRatesTable = async () => {
  try {
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS exchange_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        rate REAL NOT NULL,
        fromCurrency TEXT DEFAULT 'USD',
        toCurrency TEXT DEFAULT 'VES',
        isActive INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );`,
    );

    // Índice para búsqueda rápida de tasa activa
    await db.execAsync(
      "CREATE INDEX IF NOT EXISTS idx_active_rate ON exchange_rates(isActive, createdAt);",
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene la tasa de cambio activa actual
 */
export const getActiveExchangeRate = async () => {
  try {
    if (isCloudExchangeRatesEnabled()) {
      await ensureCloudExchangeRatesSeeded();
      const rates = await getCloudExchangeRates();
      return rates.find((item) => Number(item.isActive) === 1) || null;
    }

    const result = await db.getFirstAsync(
      "SELECT * FROM exchange_rates WHERE isActive = 1 ORDER BY createdAt DESC LIMIT 1;",
    );
    return result || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Inserta una nueva tasa de cambio y la activa
 */
export const insertExchangeRate = async (source, rate) => {
  try {
    console.log(`Inserting exchange rate: ${source} = ${rate}`);

    if (isCloudExchangeRatesEnabled()) {
      await ensureCloudExchangeRatesSeeded();
      const activeRates = (await getCloudExchangeRates()).filter(
        (item) => Number(item.isActive) === 1,
      );
      const id = createCloudNumericId();
      const payload = normalizeExchangeRateRecord({
        id,
        source,
        rate,
        fromCurrency: "USD",
        toCurrency: "VES",
        isActive: 1,
      });

      const batch = writeBatch(firestore);
      activeRates.forEach((item) => {
        batch.set(
          doc(getExchangeRatesCollectionRef(), String(item.id)),
          { isActive: 0 },
          { merge: true },
        );
      });
      batch.set(doc(getExchangeRatesCollectionRef(), String(id)), payload);
      await batch.commit();
      return id;
    }

    // Desactivar todas las tasas anteriores
    await db.runAsync("UPDATE exchange_rates SET isActive = 0;");

    // Insertar nueva tasa y activarla
    const result = await db.runAsync(
      `INSERT INTO exchange_rates (source, rate, fromCurrency, toCurrency, isActive)
       VALUES (?, ?, 'USD', 'VES', 1);`,
      [source, rate],
    );

    console.log(`Exchange rate inserted with ID: ${result.lastInsertRowId}`);
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error inserting exchange rate:", error);
    throw error;
  }
};

/**
 * Obtiene el historial de tasas de cambio
 */
export const getExchangeRateHistory = async (limit = 30) => {
  try {
    if (isCloudExchangeRatesEnabled()) {
      await ensureCloudExchangeRatesSeeded();
      const rates = await getCloudExchangeRates();
      return rates.slice(0, limit);
    }

    const result = await db.getAllAsync(
      "SELECT * FROM exchange_rates ORDER BY createdAt DESC LIMIT ?;",
      [limit],
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene tasas de cambio por rango de fechas
 */
export const getExchangeRatesByDateRange = async (startDate, endDate) => {
  try {
    if (isCloudExchangeRatesEnabled()) {
      await ensureCloudExchangeRatesSeeded();
      const startTime = new Date(startDate).getTime();
      const endTime = new Date(endDate).getTime();
      return (await getCloudExchangeRates()).filter((item) => {
        const createdAt = new Date(item.createdAt).getTime();
        return createdAt >= startTime && createdAt <= endTime;
      });
    }

    const result = await db.getAllAsync(
      "SELECT * FROM exchange_rates WHERE createdAt >= ? AND createdAt <= ? ORDER BY createdAt;",
      [startDate, endDate],
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene la última tasa de una fuente específica
 */
export const getLatestRateBySource = async (source) => {
  try {
    if (isCloudExchangeRatesEnabled()) {
      await ensureCloudExchangeRatesSeeded();
      return (
        (await getCloudExchangeRates()).find(
          (item) => String(item.source || "") === String(source || ""),
        ) || null
      );
    }

    const result = await db.getFirstAsync(
      "SELECT * FROM exchange_rates WHERE source = ? ORDER BY createdAt DESC LIMIT 1;",
      [source],
    );
    return result || null;
  } catch (error) {
    throw error;
  }
};

export default {
  initExchangeRatesTable,
  getActiveExchangeRate,
  insertExchangeRate,
  getExchangeRateHistory,
  getExchangeRatesByDateRange,
  getLatestRateBySource,
};
