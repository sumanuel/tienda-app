// Monedas soportadas en la aplicación
export const CURRENCIES = {
  VES: {
    code: "VES",
    symbol: "Bs.",
    name: "Bolívares",
    decimals: 2,
    position: "before", // before o after del monto
  },
  USD: {
    code: "USD",
    symbol: "$",
    name: "Dólares",
    decimals: 2,
    position: "before",
  },
};

export const DEFAULT_CURRENCY = "VES";
export const SECONDARY_CURRENCY = "USD";
