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

const parseCurrencySnapshotJson = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(String(value));
  } catch (_) {
    return null;
  }
};

const convertSnapshotAmount = (
  amount,
  fromCurrency,
  toCurrency,
  exchangeRate,
  options = {},
) => {
  const numericAmount = Number(amount) || 0;
  if (!numericAmount) return 0;

  const behavior = getCurrencyBehavior(options?.settings || options);
  const normalizedFrom = normalizeCurrencyCode(
    fromCurrency,
    behavior.referenceCurrency,
  );
  const normalizedTo = normalizeCurrencyCode(
    toCurrency,
    behavior.localCurrency,
  );

  if (normalizedFrom === normalizedTo) return numericAmount;

  const numericRate = Number(exchangeRate) || 0;
  if (numericRate <= 0) return numericAmount;

  if (
    normalizedFrom === behavior.referenceCurrency &&
    normalizedTo === behavior.localCurrency
  ) {
    return numericAmount * numericRate;
  }

  if (
    normalizedFrom === behavior.localCurrency &&
    normalizedTo === behavior.referenceCurrency
  ) {
    return numericAmount / numericRate;
  }

  return numericAmount;
};

export const resolveProductPricing = (product = {}, options = {}) => {
  const snapshot = parseCurrencySnapshotJson(product?.pricingSnapshot);
  const localCurrency = normalizeCurrencyCode(
    snapshot?.localCurrency || options?.localCurrency || product?.localCurrency,
    DEFAULT_CURRENCY,
  );
  const referenceCurrency = normalizeCurrencyCode(
    snapshot?.referenceCurrency ||
      options?.referenceCurrency ||
      product?.referenceCurrency,
    localCurrency,
  );
  const referencePrice =
    Number(snapshot?.referenceAmount ?? product?.priceUSD) || 0;
  const localPriceSnapshot = Number(snapshot?.localAmount ?? product?.priceVES);
  const exchangeRate = Number(options?.exchangeRate) || 0;
  const rateEnabled = Boolean(options?.rateEnabled);

  const localPrice = Number.isFinite(localPriceSnapshot)
    ? localPriceSnapshot
    : rateEnabled && exchangeRate > 0 && referencePrice > 0
      ? convertSnapshotAmount(
          referencePrice,
          referenceCurrency,
          localCurrency,
          exchangeRate,
          {
            localCurrency,
            referenceCurrency,
            usesUsdConversion: rateEnabled,
          },
        )
      : referencePrice;

  return {
    snapshot,
    localCurrency,
    referenceCurrency,
    localPrice,
    referencePrice,
    costReferenceAmount:
      Number(snapshot?.costReferenceAmount ?? product?.cost) || 0,
    additionalCostReferenceAmount:
      Number(
        snapshot?.additionalCostReferenceAmount ?? product?.additionalCost,
      ) || 0,
  };
};

export const resolveSaleItemPricing = (item = {}, options = {}) => {
  const snapshot = parseCurrencySnapshotJson(item?.priceSnapshot);
  const localCurrency = normalizeCurrencyCode(
    snapshot?.localCurrency || options?.localCurrency,
    DEFAULT_CURRENCY,
  );
  const referenceCurrency = normalizeCurrencyCode(
    snapshot?.referenceCurrency || options?.referenceCurrency,
    localCurrency,
  );
  const referencePrice =
    Number(snapshot?.referenceAmount ?? item?.priceUSD) || 0;
  const localPriceSnapshot = Number(snapshot?.localAmount ?? item?.price);
  const exchangeRate =
    Number(snapshot?.exchangeRate ?? options?.exchangeRate) || 0;
  const rateEnabled = Boolean(
    snapshot?.rateEnabled ??
    options?.rateEnabled ??
    referenceCurrency !== localCurrency,
  );

  const localPrice = Number.isFinite(localPriceSnapshot)
    ? localPriceSnapshot
    : rateEnabled && exchangeRate > 0 && referencePrice > 0
      ? convertSnapshotAmount(
          referencePrice,
          referenceCurrency,
          localCurrency,
          exchangeRate,
          {
            localCurrency,
            referenceCurrency,
            usesUsdConversion: rateEnabled,
          },
        )
      : referencePrice;

  return {
    snapshot,
    localCurrency,
    referenceCurrency,
    localPrice,
    referencePrice,
    subtotalLocal: (Number(item?.quantity) || 0) * (Number(localPrice) || 0),
    subtotalReference:
      (Number(item?.quantity) || 0) * (Number(referencePrice) || 0),
  };
};

export const buildSaleItemMonetaryFields = (item = {}, options = {}) => {
  const pricing = resolveSaleItemPricing(item, options);

  return {
    localCurrency: pricing.localCurrency,
    referenceCurrency: pricing.referenceCurrency,
    price: Number(item?.price) || pricing.localPrice,
    priceUSD: Number(item?.priceUSD) || pricing.referencePrice,
    subtotal: Number(item?.subtotal) || pricing.subtotalLocal,
    subtotalReference:
      Number(item?.subtotalReference) || pricing.subtotalReference,
  };
};

export const sumSaleItemsReferenceTotal = (items = [], options = {}) =>
  items.reduce(
    (sum, item) =>
      sum + buildSaleItemMonetaryFields(item, options).subtotalReference,
    0,
  );

export const resolveSaleMonetaryTotals = (sale = {}, options = {}) => {
  const snapshot = parseCurrencySnapshotJson(sale?.monetarySnapshot);
  const localCurrency = normalizeCurrencyCode(
    snapshot?.localCurrency || options?.localCurrency || sale?.currency,
    DEFAULT_CURRENCY,
  );
  const referenceCurrency = normalizeCurrencyCode(
    snapshot?.referenceCurrency || options?.referenceCurrency,
    localCurrency,
  );

  return {
    snapshot,
    localCurrency,
    referenceCurrency,
    totalLocal: Number(snapshot?.totalLocalAmount ?? sale?.total) || 0,
    totalReference:
      Number(snapshot?.totalReferenceAmount ?? sale?.totalUSD) || 0,
    exchangeRate:
      Number(
        snapshot?.exchangeRate ?? sale?.exchangeRate ?? options?.exchangeRate,
      ) || 0,
    rateEnabled: Boolean(
      snapshot?.rateEnabled ??
      options?.rateEnabled ??
      referenceCurrency !== localCurrency,
    ),
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
