import { db } from "./db";

/**
 * Inicializa la tabla de configuraciones con valores por defecto
 */
export const initSettingsTable = async () => {
  try {
    // Verificar si ya existen configuraciones
    const existing = await db.getFirstAsync(
      "SELECT value FROM settings WHERE key = 'app_settings';"
    );

    // Solo insertar si no existen
    if (!existing) {
      const defaultSettings = getDefaultSettings();
      const settingsJson = JSON.stringify(defaultSettings);

      await db.runAsync(
        `INSERT INTO settings (key, value) VALUES ('app_settings', ?);`,
        [settingsJson]
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
      "SELECT value FROM settings WHERE key = 'app_settings';"
    );

    if (result && result.value) {
      return JSON.parse(result.value);
    }

    return getDefaultSettings();
  } catch (error) {
    console.error("Error getting settings:", error);
    return getDefaultSettings();
  }
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
      [settingsJson]
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
};
