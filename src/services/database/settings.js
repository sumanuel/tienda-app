import { db } from "./db";

const isPlainObject = (value) => {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
};

const deepMergeDefaults = (defaults, current) => {
  if (!isPlainObject(defaults)) return current;
  if (!isPlainObject(current)) return { ...defaults };

  const merged = { ...defaults };

  for (const key of Object.keys(current)) {
    const currentValue = current[key];
    const defaultValue = defaults[key];

    if (isPlainObject(defaultValue) && isPlainObject(currentValue)) {
      merged[key] = deepMergeDefaults(defaultValue, currentValue);
      continue;
    }

    // Arrays u otros tipos: respetar lo que ya tenga el usuario
    merged[key] = currentValue;
  }

  return merged;
};

const stableStringify = (value) => {
  // Para comparar objetos sin depender del orden de claves en JSON.stringify.
  const seen = new WeakSet();
  const replacer = (_, v) => {
    if (!isPlainObject(v)) return v;
    if (seen.has(v)) return v;
    seen.add(v);
    return Object.keys(v)
      .sort()
      .reduce((acc, k) => {
        acc[k] = v[k];
        return acc;
      }, {});
  };
  return JSON.stringify(value, replacer);
};

/**
 * Inicializa la tabla de configuraciones con valores por defecto
 */
export const initSettingsTable = async () => {
  try {
    // Verificar si ya existen configuraciones
    const existing = await db.getFirstAsync(
      "SELECT value FROM settings WHERE key = 'app_settings';",
    );

    // Solo insertar si no existen
    if (!existing) {
      const defaultSettings = getDefaultSettings();
      const settingsJson = JSON.stringify(defaultSettings);

      await db.runAsync(
        `INSERT INTO settings (key, value) VALUES ('app_settings', ?);`,
        [settingsJson],
      );
      console.log("Default settings inserted");
    }
  } catch (error) {
    console.error("Error initializing settings:", error);
    throw error;
  }
};

/**
 * Obtiene todas las configuraciones
 */
export const getSettings = async () => {
  try {
    const result = await db.getFirstAsync(
      "SELECT value FROM settings WHERE key = 'app_settings';",
    );

    if (result && result.value) {
      const parsed = JSON.parse(result.value);
      const defaults = getDefaultSettings();
      const merged = deepMergeDefaults(defaults, parsed);

      // Migración suave: si el usuario ya tenía un nombre distinto al default,
      // considerar que el negocio ya fue configurado.
      try {
        const name = String(merged?.business?.name || "").trim();
        const isConfigured = Boolean(merged?.business?.isConfigured);
        const nameIsDefault = name.toLowerCase() === "mi tienda";
        const hasAnyExtraData = [
          merged?.business?.rif,
          merged?.business?.address,
          merged?.business?.phone,
          merged?.business?.email,
        ].some((v) => String(v || "").trim().length > 0);

        if (!isConfigured && ((name && !nameIsDefault) || hasAnyExtraData)) {
          merged.business = {
            ...(merged.business || {}),
            isConfigured: true,
          };
        }
      } catch (_) {
        // noop
      }

      // Si agregamos claves nuevas por defaults, persistirlas.
      if (stableStringify(parsed) !== stableStringify(merged)) {
        await saveSettings(merged);
      }

      return merged;
    }

    return getDefaultSettings();
  } catch (error) {
    console.error("Error getting settings:", error);
    return getDefaultSettings();
  }
};

/**
 * Asegura que existan los defaults y que el JSON tenga nuevas claves.
 * Útil después de importar un respaldo.
 */
export const ensureSettingsDefaults = async () => {
  await initSettingsTable();
  await getSettings();
  return true;
};

/**
 * Guarda las configuraciones
 */
export const saveSettings = async (settings) => {
  try {
    const settingsJson = JSON.stringify(settings);
    await db.runAsync(
      `INSERT OR REPLACE INTO settings (key, value, updatedAt) 
       VALUES ('app_settings', ?, datetime('now'));`,
      [settingsJson],
    );
    return true;
  } catch (error) {
    console.error("Error saving settings:", error);
    return false;
  }
};

/**
 * Actualiza una configuración específica
 */
export const updateSetting = async (key, value) => {
  try {
    const settings = await getSettings();
    settings[key] = value;
    await saveSettings(settings);
    return true;
  } catch (error) {
    console.error("Error updating setting:", error);
    return false;
  }
};

/**
 * Obtiene configuraciones por defecto
 */
const getDefaultSettings = () => ({
  business: {
    name: "Mi Tienda",
    rif: "",
    address: "",
    phone: "",
    email: "",
    isConfigured: false,
  },
  pricing: {
    baseCurrency: "USD",
    displayCurrency: "VES",
    defaultMargin: 30,
    minMargin: 10,
    maxMargin: 200,
    roundPrices: true,
    roundTo: 0.5,
    currencies: {
      USD: 280,
      EURO: 300,
      USD2: 350,
    },
    iva: 16,
  },
  exchange: {
    autoUpdate: true,
    updateInterval: 30,
    defaultSource: "BCV",
    alertOnRateChange: true,
    rateChangeThreshold: 5,
    // Consulta diaria (7pm) desde API externa con confirmación del usuario
    dailyPromptEnabled: true,
    dailyPromptHour: 19,
    dailyPromptMinute: 0,
    externalApiUrl: "https://ve.dolarapi.com/v1/dolares/oficial",
    // Ruta del valor dentro del JSON, por ejemplo: "rate" o "data.usd".
    // Para DolarApi oficial: "promedio"
    externalApiValuePath: "promedio",
  },
  inventory: {
    trackStock: true,
    lowStockThreshold: 10,
    enableNegativeStock: false,
  },
  sales: {
    requireCustomer: false,
    allowDiscounts: true,
    maxDiscountPercent: 20,
    printReceiptAuto: false,
  },
  printer: {
    enabled: false,
    type: "thermal",
    paperWidth: 58,
  },
});

/**
 * Resetea las configuraciones a valores por defecto
 */
export const resetSettings = async () => {
  try {
    await saveSettings(getDefaultSettings());
    return true;
  } catch (error) {
    console.error("Error resetting settings:", error);
    return false;
  }
};

export default {
  initSettingsTable,
  getSettings,
  saveSettings,
  updateSetting,
  resetSettings,
  ensureSettingsDefaults,
};
