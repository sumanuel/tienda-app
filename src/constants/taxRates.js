// Tasas de impuestos
export const TAX_RATES = {
  IVA: {
    id: "IVA",
    name: "IVA",
    rate: 0.16, // 16%
    applies_to: "all",
  },
  IGTF: {
    id: "IGTF",
    name: "IGTF",
    rate: 0.03, // 3%
    applies_to: "foreign_currency", // Solo para pagos en moneda extranjera
    description: "Impuesto a las Grandes Transacciones Financieras",
  },
};

export const DEFAULT_TAX = "IVA";

// Configuración de aplicación de impuestos
export const TAX_CONFIG = {
  includeInPrice: false, // Si el precio ya incluye impuestos
  applyIGTF: true, // Aplicar IGTF a pagos en USD
  showTaxBreakdown: true, // Mostrar desglose de impuestos en recibo
};
