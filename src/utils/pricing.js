import { roundPrice } from "./currency";

/**
 * Calcula el precio de venta basado en costo y margen
 * @param {number} cost - Costo del producto
 * @param {number} margin - Margen de ganancia (%)
 * @param {boolean} round - Redondear precio
 * @returns {number} Precio de venta
 */
export const calculateSalePrice = (cost, margin, round = true) => {
  if (!cost || !margin) return 0;

  const price = cost * (1 + margin / 100);
  return round ? roundPrice(price) : price;
};

/**
 * Calcula el margen de ganancia basado en costo y precio
 * @param {number} cost - Costo del producto
 * @param {number} salePrice - Precio de venta
 * @returns {number} Margen en porcentaje
 */
export const calculateMargin = (cost, salePrice) => {
  if (!cost || cost === 0) return 0;
  return ((salePrice - cost) / cost) * 100;
};

/**
 * Calcula la ganancia neta
 * @param {number} cost - Costo
 * @param {number} salePrice - Precio de venta
 * @param {number} quantity - Cantidad
 * @returns {number} Ganancia neta
 */
export const calculateProfit = (cost, salePrice, quantity = 1) => {
  return (salePrice - cost) * quantity;
};

/**
 * Calcula el precio con descuento aplicado
 * @param {number} price - Precio original
 * @param {number} discount - Descuento (%)
 * @returns {number} Precio con descuento
 */
export const applyDiscount = (price, discount) => {
  if (!discount || discount === 0) return price;
  return price * (1 - discount / 100);
};

/**
 * Calcula el precio de un producto en múltiples monedas
 * @param {number} basePrice - Precio base (en USD)
 * @param {number} exchangeRate - Tasa de cambio USD/VES
 * @returns {object} Objeto con precios en USD y VES
 */
export const calculateMultiCurrencyPrice = (basePrice, exchangeRate) => {
  return {
    USD: basePrice,
    VES: basePrice * exchangeRate,
  };
};

/**
 * Actualiza precios cuando cambia la tasa de cambio
 * @param {array} products - Lista de productos
 * @param {number} newRate - Nueva tasa de cambio
 * @param {string} baseCurrency - Moneda base de los precios
 * @returns {array} Productos con precios actualizados
 */
export const updatePricesOnRateChange = (
  products,
  newRate,
  baseCurrency = "USD"
) => {
  return products.map((product) => {
    const basePrice =
      baseCurrency === "USD" ? product.priceUSD : product.priceVES / newRate;

    return {
      ...product,
      priceUSD: basePrice,
      priceVES: basePrice * newRate,
      lastUpdated: new Date().toISOString(),
    };
  });
};

/**
 * Valida que el margen esté dentro de los límites permitidos
 * @param {number} margin - Margen a validar
 * @param {number} minMargin - Margen mínimo
 * @param {number} maxMargin - Margen máximo
 * @returns {boolean} True si es válido
 */
export const isValidMargin = (margin, minMargin = 0, maxMargin = 200) => {
  return margin >= minMargin && margin <= maxMargin;
};
