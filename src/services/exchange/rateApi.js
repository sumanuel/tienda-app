import axios from "axios";
import { EXCHANGE_SOURCES } from "../../constants/exchangeSources";

/**
 * Obtiene la tasa de cambio desde una API externa
 * @param {string} sourceId - ID de la fuente (BCV, DOLAR_TODAY, etc)
 * @returns {Promise<number>} Tasa de cambio
 */
export const fetchRateFromAPI = async (sourceId) => {
  const source = EXCHANGE_SOURCES[sourceId];

  if (!source || !source.apiUrl) {
    throw new Error(`Invalid source: ${sourceId}`);
  }

  try {
    const response = await axios.get(source.apiUrl, {
      timeout: 10000,
    });

    // La API retorna diferentes estructuras según la fuente
    let rate = null;

    if (response.data && response.data.price) {
      rate = parseFloat(response.data.price);
    } else if (response.data && response.data.promedio) {
      rate = parseFloat(response.data.promedio);
    } else if (response.data && response.data.rate) {
      rate = parseFloat(response.data.rate);
    }

    if (!rate || isNaN(rate) || rate <= 0) {
      throw new Error("Invalid rate received from API");
    }

    return rate;
  } catch (error) {
    console.error(`Error fetching rate from ${sourceId}:`, error.message);
    throw error;
  }
};

/**
 * Obtiene tasa de cambio con fallback a múltiples fuentes
 * @param {array} sources - Array de IDs de fuentes en orden de prioridad
 * @returns {Promise<object>} Objeto con source y rate
 */
export const fetchRateWithFallback = async (
  sources = ["BCV", "DOLAR_TODAY", "BINANCE"]
) => {
  for (const sourceId of sources) {
    try {
      const rate = await fetchRateFromAPI(sourceId);
      return { source: sourceId, rate };
    } catch (error) {
      console.log(`Failed to fetch from ${sourceId}, trying next source...`);
      continue;
    }
  }

  throw new Error("All exchange rate sources failed");
};

/**
 * Obtiene tasas de múltiples fuentes para comparación
 * @returns {Promise<array>} Array de objetos con source y rate
 */
export const fetchRatesFromAllSources = async () => {
  const sources = ["BCV", "DOLAR_TODAY", "BINANCE", "PARALLEL"];
  const results = [];

  const promises = sources.map(async (sourceId) => {
    try {
      const rate = await fetchRateFromAPI(sourceId);
      return { source: sourceId, rate, success: true };
    } catch (error) {
      return {
        source: sourceId,
        rate: null,
        success: false,
        error: error.message,
      };
    }
  });

  const settled = await Promise.allSettled(promises);

  settled.forEach((result) => {
    if (result.status === "fulfilled") {
      results.push(result.value);
    }
  });

  return results;
};

export default {
  fetchRateFromAPI,
  fetchRateWithFallback,
  fetchRatesFromAllSources,
};
