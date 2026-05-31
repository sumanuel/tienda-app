import { CURRENCIES, DEFAULT_CURRENCY } from "../constants/currencies";

export const normalizeCurrencyCode = (
  currencyCode,
  fallbackCurrency = DEFAULT_CURRENCY,
) => {
  const normalizedCode = String(currencyCode || "")
    .trim()
    .toUpperCase();

  if (normalizedCode) {
    return normalizedCode;
  }

  return String(fallbackCurrency || DEFAULT_CURRENCY)
    .trim()
    .toUpperCase();
};

export const getCurrencyDefinition = (
  currencyCode,
  fallbackCurrency = DEFAULT_CURRENCY,
) => {
  const resolvedCode = normalizeCurrencyCode(currencyCode, fallbackCurrency);

  return (
    CURRENCIES[resolvedCode] || {
      code: resolvedCode,
      symbol: resolvedCode,
      name: resolvedCode,
      decimals: 2,
      position: "before",
    }
  );
};

export const getCurrencyBehavior = (settings = {}) => {
  const pricing = settings?.pricing || {};
  const exchange = settings?.exchange || {};

  const localCurrency = normalizeCurrencyCode(
    pricing.localCurrency || pricing.displayCurrency,
    DEFAULT_CURRENCY,
  );
  const referenceCurrency = normalizeCurrencyCode(
    pricing.referenceCurrency || pricing.baseCurrency,
    "USD",
  );
  const usesUsdConversion = Boolean(pricing.usesUsdConversion);
  const exchangeMode = String(
    exchange.mode ||
      (usesUsdConversion && referenceCurrency !== localCurrency
        ? "manual"
        : "disabled"),
  )
    .trim()
    .toLowerCase();

  return {
    localCurrency,
    referenceCurrency,
    displayCurrency: normalizeCurrencyCode(
      pricing.displayCurrency || localCurrency,
      localCurrency,
    ),
    baseCurrency: normalizeCurrencyCode(
      pricing.baseCurrency ||
        (usesUsdConversion ? referenceCurrency : localCurrency),
      localCurrency,
    ),
    usesUsdConversion,
    exchangeMode,
    rateEnabled:
      usesUsdConversion &&
      exchangeMode !== "disabled" &&
      referenceCurrency !== localCurrency,
    exchangeSource: String(
      exchange.source ||
        exchange.defaultSource ||
        (exchangeMode === "official_ve" ? "BCV" : "MANUAL"),
    )
      .trim()
      .toUpperCase(),
  };
};

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
  currencyCode = DEFAULT_CURRENCY,
  showSymbol = true,
) => {
  if (!amount && amount !== 0) return "-";

  const currency = getCurrencyDefinition(currencyCode, DEFAULT_CURRENCY);
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
  const referenceCurrency = "USD";
  const localCurrency = DEFAULT_CURRENCY;

  return {
    convertToLocal: (referenceAmount) =>
      convertUSDToVES(referenceAmount, exchangeRate),
    convertToReference: (localAmount) =>
      convertVESToUSD(localAmount, exchangeRate),
    convertToVES: (usdPrice) => convertUSDToVES(usdPrice, exchangeRate),
    convertToUSD: (vesPrice) => convertVESToUSD(vesPrice, exchangeRate),
    formatLocal: (referenceAmount) =>
      formatCurrency(
        convertUSDToVES(referenceAmount, exchangeRate),
        localCurrency,
      ),
    formatReference: (localAmount) =>
      formatCurrency(
        convertVESToUSD(localAmount, exchangeRate),
        referenceCurrency,
      ),
    formatVES: (usdPrice) =>
      formatCurrency(convertUSDToVES(usdPrice, exchangeRate), "VES"),
    formatUSD: (vesPrice) =>
      formatCurrency(convertVESToUSD(vesPrice, exchangeRate), "USD"),
  };
};
