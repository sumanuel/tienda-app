const buildPairKey = (fromCurrency, toCurrency) =>
  `${String(fromCurrency || "")
    .trim()
    .toUpperCase()}/${String(toCurrency || "")
    .trim()
    .toUpperCase()}`;

// Fuentes API específicas por mercado/par monetario.
export const REGIONAL_EXCHANGE_API_SOURCES = {
  BCV: {
    id: "BCV",
    name: "Banco Central de Venezuela",
    url: "https://www.bcv.org.ve/",
    apiUrl: "https://pydolarvenezuela-api.vercel.app/api/v1/dollar/page/bcv",
    priority: 1,
    official: true,
    market: "VE",
    supportedPairs: [buildPairKey("USD", "VES")],
  },
  DOLAR_TODAY: {
    id: "DOLAR_TODAY",
    name: "DolarToday",
    url: "https://dolartoday.com/",
    apiUrl:
      "https://pydolarvenezuela-api.vercel.app/api/v1/dollar/page/dolartoday",
    priority: 2,
    official: false,
    market: "VE",
    supportedPairs: [buildPairKey("USD", "VES")],
  },
  BINANCE: {
    id: "BINANCE",
    name: "Binance P2P",
    url: "https://www.binance.com/",
    apiUrl:
      "https://pydolarvenezuela-api.vercel.app/api/v1/dollar/page/binance",
    priority: 3,
    official: false,
    market: "VE",
    supportedPairs: [buildPairKey("USD", "VES")],
  },
  PARALLEL: {
    id: "PARALLEL",
    name: "Monitor Dólar",
    url: "https://monitordolarvenezuela.com/",
    apiUrl:
      "https://pydolarvenezuela-api.vercel.app/api/v1/dollar/page/monitordolar",
    priority: 4,
    official: false,
    market: "VE",
    supportedPairs: [buildPairKey("USD", "VES")],
  },
};

export const BASE_EXCHANGE_SOURCES = {
  MANUAL: {
    id: "MANUAL",
    name: "Manual",
    priority: 999,
    official: false,
    description: "Tasa ingresada manualmente",
    supportedPairs: ["*"],
  },
};

// Catálogo completo usado por la app actual.
export const EXCHANGE_SOURCES = {
  ...REGIONAL_EXCHANGE_API_SOURCES,
  ...BASE_EXCHANGE_SOURCES,
};

export const getExchangeSourcesForPair = ({
  fromCurrency = "USD",
  toCurrency = "VES",
  includeManual = true,
  apiOnly = false,
} = {}) => {
  const pairKey = buildPairKey(fromCurrency, toCurrency);

  return Object.values(EXCHANGE_SOURCES)
    .filter((source) => {
      if (apiOnly && !source.apiUrl) {
        return false;
      }

      if (!includeManual && source.id === "MANUAL") {
        return false;
      }

      const supportedPairs = Array.isArray(source.supportedPairs)
        ? source.supportedPairs
        : [];

      return supportedPairs.includes("*") || supportedPairs.includes(pairKey);
    })
    .sort(
      (left, right) =>
        Number(left.priority || 999) - Number(right.priority || 999),
    );
};

export const getApiExchangeSourcesForPair = (options = {}) =>
  getExchangeSourcesForPair({
    ...options,
    includeManual: false,
    apiOnly: true,
  });

export const getDefaultExchangeSource = (options = {}) =>
  getExchangeSourcesForPair({ ...options, includeManual: false })[0]?.id ||
  "MANUAL";

export const DEFAULT_EXCHANGE_SOURCE = getDefaultExchangeSource();

// Intervalo de actualización automática (en minutos)
export const AUTO_UPDATE_INTERVALS = {
  EVERY_5_MIN: 5,
  EVERY_15_MIN: 15,
  EVERY_30_MIN: 30,
  EVERY_HOUR: 60,
  EVERY_2_HOURS: 120,
  MANUAL: 0,
};

export const DEFAULT_UPDATE_INTERVAL = AUTO_UPDATE_INTERVALS.EVERY_30_MIN;
