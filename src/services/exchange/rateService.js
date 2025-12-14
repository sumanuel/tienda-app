import {
  insertExchangeRate,
  getActiveExchangeRate,
} from "../database/exchangeRates";
import { fetchRateWithFallback } from "./rateApi";

/**
 * Actualiza la tasa de cambio desde una fuente externa
 * @param {string} sourceId - ID de la fuente
 * @returns {Promise<object>} Nueva tasa
 */
export const updateExchangeRate = async (sourceId = "BCV") => {
  try {
    const { source, rate } = await fetchRateWithFallback([sourceId]);
    await insertExchangeRate(source, rate);

    return {
      source,
      rate,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(`Failed to update exchange rate: ${error.message}`);
  }
};

/**
 * Obtiene la tasa de cambio actual
 * @returns {Promise<object>} Tasa actual
 */
export const getCurrentRate = async () => {
  try {
    const rate = await getActiveExchangeRate();

    if (!rate) {
      // Si no hay tasa, intentar obtener una nueva
      return await updateExchangeRate();
    }

    return rate;
  } catch (error) {
    throw new Error(`Failed to get current rate: ${error.message}`);
  }
};

/**
 * Actualiza la tasa manualmente
 * @param {number} rate - Tasa manual
 * @returns {Promise<object>} Tasa guardada
 */
export const setManualRate = async (rate) => {
  try {
    if (!rate || rate <= 0) {
      throw new Error("Invalid rate value");
    }

    console.log("Saving manual rate to DB:", rate);
    await insertExchangeRate("MANUAL", rate);

    return {
      source: "MANUAL",
      rate,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error in setManualRate:", error);
    throw new Error(`Failed to set manual rate: ${error.message}`);
  }
};

/**
 * Verifica si la tasa necesita actualización
 * @param {number} maxMinutes - Minutos máximos sin actualizar
 * @returns {Promise<boolean>} True si necesita actualización
 */
export const needsUpdate = async (maxMinutes = 30) => {
  try {
    const currentRate = await getActiveExchangeRate();

    if (!currentRate) return true;

    const lastUpdate = new Date(currentRate.createdAt);
    const now = new Date();
    const minutesSinceUpdate = (now - lastUpdate) / 1000 / 60;

    return minutesSinceUpdate >= maxMinutes;
  } catch (error) {
    return true; // En caso de error, intentar actualizar
  }
};

/**
 * Auto-actualización de tasa si es necesario
 * @param {object} settings - Configuración de actualización
 * @returns {Promise<object|null>} Nueva tasa o null si no actualizó
 */
export const autoUpdateRate = async (settings = {}) => {
  const { enabled = true, interval = 30, source = "BCV" } = settings;

  if (!enabled) return null;

  const shouldUpdate = await needsUpdate(interval);

  if (shouldUpdate) {
    return await updateExchangeRate(source);
  }

  return null;
};

export default {
  updateExchangeRate,
  getCurrentRate,
  setManualRate,
  needsUpdate,
  autoUpdateRate,
};
