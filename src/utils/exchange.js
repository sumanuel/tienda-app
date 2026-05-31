import { getCurrencyBehavior, normalizeCurrencyCode } from "./currency";

/**
 * Convierte un monto de una moneda a otra
 * @param {number} amount - Monto a convertir
 * @param {string} fromCurrency - Moneda origen
 * @param {string} toCurrency - Moneda destino
 * @param {number} exchangeRate - Tasa de cambio
 * @returns {number} Monto convertido
 */
export const convertCurrency = (
  amount,
  fromCurrency,
  toCurrency,
  exchangeRate,
  options = {},
) => {
  if (!amount) return 0;
  const behavior = getCurrencyBehavior(options?.settings || options);
  const normalizedFrom = normalizeCurrencyCode(
    fromCurrency,
    behavior.referenceCurrency,
  );
  const normalizedTo = normalizeCurrencyCode(
    toCurrency,
    behavior.localCurrency,
  );

  if (normalizedFrom === normalizedTo) return amount;
  if (!exchangeRate || exchangeRate <= 0) return amount;

  if (
    normalizedFrom === behavior.referenceCurrency &&
    normalizedTo === behavior.localCurrency
  ) {
    return amount * exchangeRate;
  }

  if (
    normalizedFrom === behavior.localCurrency &&
    normalizedTo === behavior.referenceCurrency
  ) {
    return amount / exchangeRate;
  }

  return amount;
};

export const getExchangeRateLabel = (rate, options = {}) => {
  const behavior = getCurrencyBehavior(options?.settings || options);

  if (!behavior.rateEnabled) {
    return `La tienda opera sin tasa activa`;
  }

  return `1 ${behavior.referenceCurrency} = ${behavior.localCurrency} ${formatExchangeRate(rate)}`;
};

/**
 * Calcula la diferencia porcentual entre dos tasas
 * @param {number} oldRate - Tasa anterior
 * @param {number} newRate - Tasa nueva
 * @returns {number} Diferencia en porcentaje
 */
export const calculateRateChange = (oldRate, newRate) => {
  if (!oldRate || oldRate === 0) return 0;
  return ((newRate - oldRate) / oldRate) * 100;
};

/**
 * Obtiene el promedio de múltiples tasas
 * @param {array} rates - Array de tasas
 * @returns {number} Promedio
 */
export const getAverageRate = (rates) => {
  if (!rates || rates.length === 0) return 0;
  const sum = rates.reduce((acc, rate) => acc + rate, 0);
  return sum / rates.length;
};

/**
 * Valida que una tasa sea razonable
 * @param {number} rate - Tasa a validar
 * @param {number} minRate - Tasa mínima aceptable
 * @param {number} maxRate - Tasa máxima aceptable
 * @returns {boolean} True si es válida
 */
export const isValidRate = (rate, minRate = 0.1, maxRate = 1000) => {
  return rate >= minRate && rate <= maxRate;
};

/**
 * Formatea una tasa de cambio para mostrar
 * @param {number} rate - Tasa
 * @param {number} decimals - Decimales a mostrar
 * @returns {string} Tasa formateada
 */
export const formatExchangeRate = (rate, decimals = 2) => {
  if (!rate) return "0.00";
  return rate.toFixed(decimals);
};
