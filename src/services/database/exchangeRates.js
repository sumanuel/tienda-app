import { db } from "./db";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, firestore } from "../firebase/firebase";
import { handleCloudAccessError } from "../firebase/cloudAccess";
import {
  getActiveStoreSeedKey,
  getStoreCollectionRef,
  getStoreNestedDocRef,
  getUserMembershipDocRef,
} from "../store/storeRefs";
import { assertSharedStoreCloudWriteAvailable } from "./cloudWriteGuard";
import { getActiveStoreId } from "../store/storeSession";
import { getSettings } from "./settings";
import {
  getCurrencyBehavior,
  normalizeCurrencyCode,
} from "../../utils/currency";

const cloudExchangeRatesSeeded = new Set();

const isCloudExchangeRatesEnabled = () =>
  Boolean(auth.currentUser?.uid) && Boolean(getActiveStoreId());

const createCloudNumericId = () =>
  Number(
    `${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`,
  );

const getExchangeRatesCollectionRef = () =>
  getStoreCollectionRef("exchange_rates");

const getSettingsDocRef = () =>
  getStoreNestedDocRef(["settings", "app_settings"]);

const getDefaultExchangeCurrencies = () => ({
  fromCurrency: "USD",
  toCurrency: "VES",
});

const resolveExchangeCurrencies = (settings = {}) => {
  const behavior = getCurrencyBehavior(settings);
  const fromCurrency = normalizeCurrencyCode(
    behavior.referenceCurrency,
    getDefaultExchangeCurrencies().fromCurrency,
  );
  const toCurrency = normalizeCurrencyCode(
    behavior.localCurrency,
    getDefaultExchangeCurrencies().toCurrency,
  );

  return {
    fromCurrency,
    toCurrency,
  };
};

const getExchangeCurrenciesFromSettings = async () => {
  try {
    const settings = await getSettings();
    return resolveExchangeCurrencies(settings);
  } catch (error) {
    console.warn("Error resolving exchange currencies from settings:", error);
    return getDefaultExchangeCurrencies();
  }
};

const normalizeExchangeRateResult = (rate) =>
  rate ? normalizeExchangeRateRecord(rate) : null;

const canManageCloudExchangeRates = async () => {
  if (!isCloudExchangeRatesEnabled()) {
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
    console.warn("Error resolving exchange rate permissions:", error);
    return false;
  }
};

const normalizeExchangeRateRecord = (rate = {}) => ({
  id: Number(rate.id) || createCloudNumericId(),
  source: String(rate.source || "MANUAL").trim(),
  rate: Number(rate.rate) || 0,
  fromCurrency: normalizeCurrencyCode(
    rate.fromCurrency,
    getDefaultExchangeCurrencies().fromCurrency,
  ),
  toCurrency: normalizeCurrencyCode(
    rate.toCurrency,
    getDefaultExchangeCurrencies().toCurrency,
  ),
  isActive: Number(rate.isActive ?? 0),
  createdAt: rate.createdAt || new Date().toISOString(),
});

const sortExchangeRatesByDateDesc = (items = []) =>
  [...items].sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime(),
  );

const buildFallbackRateRecord = (settings = {}) => {
  const { fromCurrency, toCurrency } = resolveExchangeCurrencies(settings);
  const explicitRate = Number(settings?.exchange?.lastKnownRate);
  const pricingRate = Number(settings?.pricing?.currencies?.[fromCurrency]);
  const hasExplicitRate = Number.isFinite(explicitRate) && explicitRate > 0;
  const hasCustomizedPricingRate =
    Number.isFinite(pricingRate) && pricingRate > 0;

  const resolvedRate = hasExplicitRate
    ? explicitRate
    : hasCustomizedPricingRate
      ? pricingRate
      : 0;

  if (!resolvedRate) {
    return null;
  }

  return normalizeExchangeRateRecord({
    id: Number(settings?.exchange?.lastKnownRateId) || createCloudNumericId(),
    source: String(settings?.exchange?.lastKnownRateSource || "SETTINGS")
      .trim()
      .toUpperCase(),
    rate: resolvedRate,
    fromCurrency: settings?.exchange?.lastKnownFromCurrency || fromCurrency,
    toCurrency: settings?.exchange?.lastKnownToCurrency || toCurrency,
    isActive: 1,
    createdAt:
      settings?.exchange?.lastRateUpdatedAt ||
      settings?.updatedAt ||
      new Date().toISOString(),
  });
};

const getFallbackRateFromCloudSettings = async () => {
  if (!isCloudExchangeRatesEnabled()) {
    return null;
  }

  const snapshot = await getDoc(getSettingsDocRef());
  if (!snapshot.exists()) {
    return null;
  }

  return buildFallbackRateRecord(snapshot.data() || {});
};

const getFallbackRateFromLocalSettings = async () => {
  const result = await db.getFirstAsync(
    "SELECT value FROM settings WHERE key = 'app_settings' LIMIT 1;",
  );

  if (!result?.value) {
    return null;
  }

  try {
    return buildFallbackRateRecord(JSON.parse(result.value));
  } catch (error) {
    console.warn(
      "Error parsing local settings fallback for exchange rate:",
      error,
    );
    return null;
  }
};

const syncRateSnapshotToCloudSettings = async (rateRecord) => {
  if (!isCloudExchangeRatesEnabled()) {
    return;
  }

  await setDoc(
    getSettingsDocRef(),
    {
      pricing: {
        currencies: {
          [normalizeCurrencyCode(
            rateRecord?.fromCurrency,
            getDefaultExchangeCurrencies().fromCurrency,
          )]: Number(rateRecord?.rate) || 0,
        },
      },
      exchange: {
        lastKnownRate: Number(rateRecord?.rate) || 0,
        lastKnownRateId: Number(rateRecord?.id) || null,
        lastKnownRateSource: String(rateRecord?.source || "MANUAL")
          .trim()
          .toUpperCase(),
        lastKnownFromCurrency: normalizeCurrencyCode(
          rateRecord?.fromCurrency,
          getDefaultExchangeCurrencies().fromCurrency,
        ),
        lastKnownToCurrency: normalizeCurrencyCode(
          rateRecord?.toCurrency,
          getDefaultExchangeCurrencies().toCurrency,
        ),
        lastRateUpdatedAt: rateRecord?.createdAt || new Date().toISOString(),
      },
    },
    { merge: true },
  );
};

const getCloudExchangeRates = async () => {
  const snapshot = await getDocs(getExchangeRatesCollectionRef());
  return sortExchangeRatesByDateDesc(
    snapshot.docs.map((item) => normalizeExchangeRateRecord(item.data())),
  );
};

const ensureCloudExchangeRatesSeeded = async () => {
  if (!isCloudExchangeRatesEnabled()) return;

  const canManageExchangeRates = await canManageCloudExchangeRates();
  if (!canManageExchangeRates) {
    return;
  }

  const seedKey = getActiveStoreSeedKey();
  if (cloudExchangeRatesSeeded.has(seedKey)) return;

  const collectionRef = getExchangeRatesCollectionRef();
  const existingSnapshot = await getDocs(collectionRef);
  if (!existingSnapshot.empty) {
    cloudExchangeRatesSeeded.add(seedKey);
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

  cloudExchangeRatesSeeded.add(seedKey);
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
        fromCurrency TEXT,
        toCurrency TEXT,
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
      const activeRate = rates.find((item) => Number(item.isActive) === 1);

      if (activeRate) {
        return normalizeExchangeRateResult(activeRate);
      }

      return normalizeExchangeRateResult(
        await getFallbackRateFromCloudSettings(),
      );
    }

    const result = await db.getFirstAsync(
      "SELECT * FROM exchange_rates WHERE isActive = 1 ORDER BY createdAt DESC LIMIT 1;",
    );
    return normalizeExchangeRateResult(
      result || (await getFallbackRateFromLocalSettings()),
    );
  } catch (error) {
    console.warn(
      "Cloud exchange rate read failed, falling back locally:",
      error,
    );
    const localRate = await db.getFirstAsync(
      "SELECT * FROM exchange_rates WHERE isActive = 1 ORDER BY createdAt DESC LIMIT 1;",
    );
    return normalizeExchangeRateResult(
      localRate || (await getFallbackRateFromLocalSettings()),
    );
  }
};

/**
 * Inserta una nueva tasa de cambio y la activa
 */
export const insertExchangeRate = async (source, rate, options = {}) => {
  try {
    console.log(`Inserting exchange rate: ${source} = ${rate}`);
    const defaultCurrencies = await getExchangeCurrenciesFromSettings();
    const fromCurrency = normalizeCurrencyCode(
      options?.fromCurrency,
      defaultCurrencies.fromCurrency,
    );
    const toCurrency = normalizeCurrencyCode(
      options?.toCurrency,
      defaultCurrencies.toCurrency,
    );

    if (!isCloudExchangeRatesEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudExchangeRatesEnabled()) {
      const canManageExchangeRates = await canManageCloudExchangeRates();

      if (!canManageExchangeRates) {
        throw new Error(
          "Solo el propietario o un administrador puede cambiar la tasa de esta tienda.",
        );
      }

      await ensureCloudExchangeRatesSeeded();
      const activeRates = (await getCloudExchangeRates()).filter(
        (item) => Number(item.isActive) === 1,
      );
      const id = createCloudNumericId();
      const payload = normalizeExchangeRateRecord({
        id,
        source,
        rate,
        fromCurrency,
        toCurrency,
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
      await syncRateSnapshotToCloudSettings(payload);
      return id;
    }

    // Desactivar todas las tasas anteriores
    await db.runAsync("UPDATE exchange_rates SET isActive = 0;");

    // Insertar nueva tasa y activarla
    const result = await db.runAsync(
      `INSERT INTO exchange_rates (source, rate, fromCurrency, toCurrency, isActive)
       VALUES (?, ?, ?, ?, 1);`,
      [source, rate, fromCurrency, toCurrency],
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
    return result.map((item) => normalizeExchangeRateRecord(item));
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
    return result.map((item) => normalizeExchangeRateRecord(item));
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
    return result ? normalizeExchangeRateRecord(result) : null;
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
