import { CURRENCIES } from "../constants/currencies";

/**
 * Convierte un precio de USD a VES usando la tasa actual
 * @param {number} usdPrice - Precio en USD
 * @param {number} exchangeRate - Tasa de cambio USD → VES
 * @returns {number} Precio convertido en VES
 */
export const convertUSDToVES = (usdPrice, exchangeRate) => {
  if (!usdPrice || !exchangeRate) return 0;
  return usdPrice * exchangeRate;
};

/**
 * Convierte un precio de VES a USD usando la tasa actual
 * @param {number} vesPrice - Precio en VES
 * @param {number} exchangeRate - Tasa de cambio USD → VES
 * @returns {number} Precio convertido en USD
 */
export const convertVESToUSD = (vesPrice, exchangeRate) => {
  if (!vesPrice || !exchangeRate) return 0;
  return vesPrice / exchangeRate;
};

/**
 * Formatea un monto en la moneda especificada
 * @param {number} amount - Monto a formatear
 * @param {string} currencyCode - Código de la moneda (VES, USD)
 * @param {boolean} showSymbol - Mostrar símbolo de moneda
 * @returns {string} Monto formateado
 */
export const formatCurrency = (
  amount,
  currencyCode = "VES",
  showSymbol = true
) => {
  if (!amount && amount !== 0) return "-";

  const currency = CURRENCIES[currencyCode];
  if (!currency) return amount.toString();

  const formatted = amount
    .toFixed(currency.decimals)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  if (!showSymbol) return formatted;

  return currency.position === "before"
    ? `${currency.symbol} ${formatted}`
    : `${formatted} ${currency.symbol}`;
};

/**
 * Parsea un string de moneda a número
 * @param {string} value - Valor en string
 * @returns {number} Valor numérico
 */
export const parseCurrency = (value) => {
  if (typeof value === "number") return value;
  if (!value) return 0;

  const cleaned = value.toString().replace(/[^\d.-]/g, "");
  return parseFloat(cleaned) || 0;
};

/**
 * Redondea un precio según las reglas del negocio
 * @param {number} price - Precio a redondear
 * @param {number} roundTo - Redondear a (0.5, 1, 5, etc)
 * @returns {number} Precio redondeado
 */
export const roundPrice = (price, roundTo = 0.5) => {
  if (!roundTo || roundTo === 0) return price;
  return Math.round(price / roundTo) * roundTo;
};

/**
 * Valida que un monto sea válido
 * @param {any} amount - Monto a validar
 * @returns {boolean} True si es válido
 */
export const isValidAmount = (amount) => {
  const num = parseCurrency(amount);
  return !isNaN(num) && isFinite(num) && num >= 0;
};

/**
 * Hook personalizado para conversiones de moneda en tiempo real
 * @param {number} exchangeRate - Tasa de cambio actual
 * @returns {object} Funciones de conversión
 */
export const useCurrencyConversion = (exchangeRate) => {
  return {
    convertToVES: (usdPrice) => convertUSDToVES(usdPrice, exchangeRate),
    convertToUSD: (vesPrice) => convertVESToUSD(vesPrice, exchangeRate),
    formatVES: (usdPrice) =>
      formatCurrency(convertUSDToVES(usdPrice, exchangeRate), "VES"),
    formatUSD: (vesPrice) =>
      formatCurrency(convertVESToUSD(vesPrice, exchangeRate), "USD"),
  };
};
