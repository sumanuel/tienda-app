import { convertCurrency } from "../../utils/exchange";
import { buildSaleItemMonetaryFields } from "../../utils/currency";

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
export const calculateDualPrice = (
  baseAmount,
  baseCurrency,
  rate,
  options = {},
) => {
  const localCurrency = options?.localCurrency || "VES";
  const referenceCurrency = options?.referenceCurrency || "USD";

  if (baseCurrency === referenceCurrency) {
    const localAmount = convert(
      baseAmount,
      referenceCurrency,
      localCurrency,
      rate,
    );
    return {
      referenceAmount: baseAmount,
      localAmount,
      [referenceCurrency]: baseAmount,
      [localCurrency]: localAmount,
      USD: referenceCurrency === "USD" ? baseAmount : 0,
      VES: localCurrency === "VES" ? localAmount : 0,
    };
  } else {
    const referenceAmount = convert(
      baseAmount,
      localCurrency,
      referenceCurrency,
      rate,
    );
    return {
      referenceAmount,
      localAmount: baseAmount,
      [referenceCurrency]: referenceAmount,
      [localCurrency]: baseAmount,
      USD: referenceCurrency === "USD" ? referenceAmount : 0,
      VES: localCurrency === "VES" ? baseAmount : 0,
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
export const calculateCartTotal = (items, baseCurrency, rate, options = {}) => {
  const localCurrency = options?.localCurrency || "VES";
  const referenceCurrency = options?.referenceCurrency || "USD";
  const rateEnabled =
    options?.rateEnabled ?? referenceCurrency !== localCurrency;
  const total = items.reduce((sum, item) => {
    const monetary = buildSaleItemMonetaryFields(item, {
      exchangeRate: rate,
      localCurrency,
      referenceCurrency,
      rateEnabled,
    });
    const itemTotal =
      baseCurrency === referenceCurrency ? monetary.priceUSD : monetary.price;
    return sum + itemTotal * item.quantity;
  }, 0);

  return calculateDualPrice(total, baseCurrency, rate, options);
};

export default {
  convert,
  calculateDualPrice,
  calculateCartTotal,
};
