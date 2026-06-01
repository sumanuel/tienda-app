import {
  DEFAULT_COUNTRY_METADATA,
  buildCurrencyConfig,
  buildExchangeDefaults,
} from "./countryMetadata";
import { getApiExchangeSourcesForPair } from "./exchangeSources";

const defaultCurrencyConfig = buildCurrencyConfig({
  countryCode: DEFAULT_COUNTRY_METADATA.code,
  usesUsdConversion: undefined,
});

const defaultExchangeConfig = buildExchangeDefaults({
  countryCode: DEFAULT_COUNTRY_METADATA.code,
  usesUsdConversion: undefined,
  referenceCurrency: defaultCurrencyConfig.referenceCurrency,
  localCurrency: defaultCurrencyConfig.localCurrency,
});

// Configuración general del negocio
export const BUSINESS_SETTINGS = {
  // Información del negocio
  business: {
    name: "Mi Tienda",
    rif: "J-123456789",
    address: "Dirección del negocio",
    phone: "+58-412-1234567",
    email: "contacto@mitienda.com",
  },

  // Configuración de precios
  pricing: {
    baseCurrency: defaultCurrencyConfig.baseCurrency,
    displayCurrency: defaultCurrencyConfig.displayCurrency,
    defaultMargin: 30, // Margen de ganancia por defecto (%)
    iva: 16, // IVA por defecto (%)
    applyIvaOnSales: false, // Aplicar IVA al momento del cobro
    minMargin: 10, // Margen mínimo permitido (%)
    maxMargin: 200, // Margen máximo permitido (%)
    roundPrices: true, // Redondear precios
    roundTo: 0.5, // Redondear a 0.5, 1, 5, etc.
  },

  // Configuración de inventario
  inventory: {
    trackStock: true,
    lowStockThreshold: 10,
    enableNegativeStock: false,
    autoReorder: false,
  },

  // Configuración de ventas
  sales: {
    requireCustomer: false,
    allowDiscounts: true,
    maxDiscountPercent: 20,
    allowPartialPayments: true,
    printReceiptAuto: false,
  },

  // Configuración de tasas de cambio
  exchange: {
    autoUpdate: defaultExchangeConfig.autoUpdate,
    updateInterval: 30, // minutos
    defaultSource: defaultExchangeConfig.defaultSource,
    fallbackSources: getApiExchangeSourcesForPair({
      fromCurrency: defaultCurrencyConfig.referenceCurrency,
      toCurrency: defaultCurrencyConfig.localCurrency,
    })
      .slice(1)
      .map((source) => source.id),
    alertOnRateChange: true,
    rateChangeThreshold: 5, // % de cambio para alertar
  },

  // Configuración de impresión
  printer: {
    enabled: false,
    type: "thermal", // thermal, pdf
    paperWidth: 58, // mm
    fontSize: 12,
    printLogo: true,
  },

  // Configuración de backup
  backup: {
    autoBackup: true,
    backupInterval: "daily", // daily, weekly, monthly
    keepBackups: 7, // días
  },
};

export default BUSINESS_SETTINGS;
