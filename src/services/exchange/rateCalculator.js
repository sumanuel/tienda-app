import { convertCurrency } from "../../utils/exchange";

/**
 * Convierte un monto usando la tasa activa
 * @param {number} amount - Monto a convertir
 * @param {string} fromCurrency - Moneda origen
 * @param {string} toCurrency - Moneda destino
 * @param {number} rate - Tasa de cambio USD/VES
 * @returns {number} Monto convertido
 */
export const convert = (amount, fromCurrency, toCurrency, rate) => {
  return convertCurrency(amount, fromCurrency, toCurrency, rate);
};

/**
 * Calcula precios en ambas monedas
 * @param {number} baseAmount - Monto base
 * @param {string} baseCurrency - Moneda base
 * @param {number} rate - Tasa de cambio
 * @returns {object} Objeto con USD y VES
 */
export const calculateDualPrice = (baseAmount, baseCurrency, rate) => {
  if (baseCurrency === "USD") {
    return {
      USD: baseAmount,
      VES: convert(baseAmount, "USD", "VES", rate),
    };
  } else {
    return {
      USD: convert(baseAmount, "VES", "USD", rate),
      VES: baseAmount,
    };
  }
};

/**
 * Calcula el total de un carrito en ambas monedas
 * @param {array} items - Items del carrito
 * @param {string} baseCurrency - Moneda base
 * @param {number} rate - Tasa de cambio
 * @returns {object} Total en USD y VES
 */
export const calculateCartTotal = (items, baseCurrency, rate) => {
  const total = items.reduce((sum, item) => {
    const itemTotal = baseCurrency === "USD" ? item.priceUSD : item.priceVES;
    return sum + itemTotal * item.quantity;
  }, 0);

  return calculateDualPrice(total, baseCurrency, rate);
};

export default {
  convert,
  calculateDualPrice,
  calculateCartTotal,
};
