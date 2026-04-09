import { db } from "./db";
import { getDoc, setDoc } from "firebase/firestore";
import { auth } from "../firebase/firebase";
import { handleCloudAccessError } from "../firebase/cloudAccess";
import { assertSharedStoreCloudWriteAvailable } from "./cloudWriteGuard";
import {
  getStoreDocRef,
  getStoreNestedDocRef,
  getUserMembershipDocRef,
  hasActiveStoreContext,
} from "../store/storeRefs";

const isCloudSettingsEnabled = () =>
  Boolean(auth.currentUser?.uid) && hasActiveStoreContext();

const getSettingsDocRef = () =>
  getStoreNestedDocRef(["settings", "app_settings"]);

const canManageCloudStoreSettings = async () => {
  if (!isCloudSettingsEnabled()) {
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
    console.warn("Error resolving settings permissions:", error);
    return false;
  }
};

const persistSettingsLocally = async (settings) => {
  const settingsJson = JSON.stringify(settings);
  await db.runAsync(
    `INSERT OR REPLACE INTO settings (key, value, updatedAt) 
     VALUES ('app_settings', ?, datetime('now'));`,
    [settingsJson],
  );
  return true;
};

const pickTextValue = (...values) => {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) {
      return normalized;
    }
  }

  return "";
};

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
    if (isCloudSettingsEnabled()) {
      const existing = await getDoc(getSettingsDocRef());
      const canManageSettings = await canManageCloudStoreSettings();

      if (!existing.exists() && canManageSettings) {
        await setDoc(getSettingsDocRef(), getDefaultSettings(), {
          merge: true,
        });
      }
      return;
    }

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
    if (handleCloudAccessError(error, "settings:init")) {
      return await initSettingsTable();
    }
    console.error("Error initializing settings:", error);
    throw error;
  }
};

/**
 * Obtiene todas las configuraciones
 */
export const getSettings = async () => {
  try {
    if (isCloudSettingsEnabled()) {
      const canManageSettings = await canManageCloudStoreSettings();
      const [snapshot, storeSnapshot] = await Promise.all([
        getDoc(getSettingsDocRef()),
        getDoc(getStoreDocRef()),
      ]);
      const parsed = snapshot.exists() ? snapshot.data() || {} : {};
      const storeData = storeSnapshot.exists()
        ? storeSnapshot.data() || {}
        : {};
      const defaults = getDefaultSettings();
      const merged = deepMergeDefaults(defaults, parsed);

      merged.business = {
        ...(merged.business || {}),
        name: pickTextValue(
          storeData?.name,
          merged?.business?.name,
          defaults.business.name,
        ),
        rif: pickTextValue(storeData?.rif, merged?.business?.rif),
        address: pickTextValue(storeData?.address, merged?.business?.address),
        phone: pickTextValue(storeData?.phone, merged?.business?.phone),
        email: pickTextValue(
          storeData?.email,
          merged?.business?.email,
        ).toLowerCase(),
      };

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

      if (
        canManageSettings &&
        stableStringify(parsed) !== stableStringify(merged)
      ) {
        await saveSettings(merged);
      }

      return merged;
    }

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
    if (handleCloudAccessError(error, "settings:get")) {
      return await getSettings();
    }
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
    if (!isCloudSettingsEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudSettingsEnabled()) {
      const canManageSettings = await canManageCloudStoreSettings();

      if (!canManageSettings) {
        throw new Error(
          "Solo el propietario o un administrador puede cambiar los datos de esta tienda.",
        );
      }
    }

    await persistSettingsLocally(settings);

    if (isCloudSettingsEnabled()) {
      await setDoc(getSettingsDocRef(), settings, { merge: true });

      const businessName = String(settings?.business?.name || "").trim();
      if (businessName) {
        await setDoc(
          getStoreDocRef(),
          {
            name: businessName,
            rif: String(settings?.business?.rif || "")
              .trim()
              .toUpperCase(),
            address: String(settings?.business?.address || "").trim(),
            phone: String(settings?.business?.phone || "").trim(),
            email: String(settings?.business?.email || "")
              .trim()
              .toLowerCase(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );

        await setDoc(
          getUserMembershipDocRef(auth.currentUser?.uid),
          {
            storeName: businessName,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      }

      return true;
    }

    return true;
  } catch (error) {
    if (handleCloudAccessError(error, "settings:save")) {
      return await saveSettings(settings);
    }
    console.error("Error saving settings:", error);
    throw error;
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
    throw error;
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
    throw error;
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
