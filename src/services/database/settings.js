import AsyncStorage from "@react-native-async-storage/async-storage";

const SETTINGS_KEY = "@tienda_settings";

/**
 * Obtiene todas las configuraciones
 */
export const getSettings = async () => {
  try {
    const settings = await AsyncStorage.getItem(SETTINGS_KEY);
    return settings ? JSON.parse(settings) : getDefaultSettings();
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
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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
  getSettings,
  saveSettings,
  updateSetting,
  resetSettings,
};
