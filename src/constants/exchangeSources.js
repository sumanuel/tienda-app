// Fuentes de tasas de cambio disponibles
export const EXCHANGE_SOURCES = {
  BCV: {
    id: "BCV",
    name: "Banco Central de Venezuela",
    url: "https://www.bcv.org.ve/",
    apiUrl: "https://pydolarvenezuela-api.vercel.app/api/v1/dollar/page/bcv",
    priority: 1,
    official: true,
  },
  DOLAR_TODAY: {
    id: "DOLAR_TODAY",
    name: "DolarToday",
    url: "https://dolartoday.com/",
    apiUrl:
      "https://pydolarvenezuela-api.vercel.app/api/v1/dollar/page/dolartoday",
    priority: 2,
    official: false,
  },
  BINANCE: {
    id: "BINANCE",
    name: "Binance P2P",
    url: "https://www.binance.com/",
    apiUrl:
      "https://pydolarvenezuela-api.vercel.app/api/v1/dollar/page/binance",
    priority: 3,
    official: false,
  },
  PARALLEL: {
    id: "PARALLEL",
    name: "Monitor Dólar",
    url: "https://monitordolarvenezuela.com/",
    apiUrl:
      "https://pydolarvenezuela-api.vercel.app/api/v1/dollar/page/monitordolar",
    priority: 4,
    official: false,
  },
  MANUAL: {
    id: "MANUAL",
    name: "Manual",
    priority: 999,
    official: false,
    description: "Tasa ingresada manualmente",
  },
};

export const DEFAULT_EXCHANGE_SOURCE = "BCV";

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
