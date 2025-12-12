import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("tienda.db");

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
      );`
    );

    // Índice para búsqueda rápida de tasa activa
    await db.execAsync(
      "CREATE INDEX IF NOT EXISTS idx_active_rate ON exchange_rates(isActive, createdAt);"
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
    const result = await db.getFirstAsync(
      "SELECT * FROM exchange_rates WHERE isActive = 1 ORDER BY createdAt DESC LIMIT 1;"
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
    // Desactivar todas las tasas anteriores
    await db.runAsync("UPDATE exchange_rates SET isActive = 0;");

    // Insertar nueva tasa y activarla
    const result = await db.runAsync(
      `INSERT INTO exchange_rates (source, rate, fromCurrency, toCurrency, isActive)
       VALUES (?, ?, 'USD', 'VES', 1);`,
      [source, rate]
    );
    return result.lastInsertRowId;
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene el historial de tasas de cambio
 */
export const getExchangeRateHistory = async (limit = 30) => {
  try {
    const result = await db.getAllAsync(
      "SELECT * FROM exchange_rates ORDER BY createdAt DESC LIMIT ?;",
      [limit]
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
    const result = await db.getAllAsync(
      "SELECT * FROM exchange_rates WHERE createdAt >= ? AND createdAt <= ? ORDER BY createdAt;",
      [startDate, endDate]
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
    const result = await db.getFirstAsync(
      "SELECT * FROM exchange_rates WHERE source = ? ORDER BY createdAt DESC LIMIT 1;",
      [source]
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
