import { CURRENCIES } from "../constants/currencies";

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
 * Calcula el cambio en una transacción
 * @param {number} paid - Monto pagado
 * @param {number} total - Total a pagar
 * @returns {number} Cambio
 */
export const calculateChange = (paid, total) => {
  return Math.max(0, paid - total);
};
