import {
  calculateSalePrice,
  calculateMargin,
  calculateProfit,
} from "../../utils/pricing";

/**
 * Calcula el precio de venta de un producto
 * @param {object} product - Producto con costo y margen
 * @param {boolean} round - Redondear precio
 * @returns {number} Precio de venta
 */
export const calculateProductPrice = (product, round = true) => {
  return calculateSalePrice(product.cost, product.margin, round);
};

/**
 * Calcula el margen de un producto
 * @param {object} product - Producto con costo y precio
 * @returns {number} Margen en %
 */
export const calculateProductMargin = (product) => {
  const price = product.priceUSD || product.salePrice;
  return calculateMargin(product.cost, price);
};

/**
 * Calcula la ganancia de una venta
 * @param {array} items - Items vendidos
 * @returns {object} Objeto con ganancia total y por item
 */
export const calculateSaleProfit = (items) => {
  let totalProfit = 0;
  const itemProfits = [];

  items.forEach((item) => {
    const profit = calculateProfit(item.cost, item.price, item.quantity);
    totalProfit += profit;
    itemProfits.push({
      productId: item.productId,
      productName: item.productName,
      profit,
      margin: calculateMargin(item.cost, item.price),
    });
  });

  return {
    total: totalProfit,
    items: itemProfits,
  };
};

/**
 * Recalcula precios de productos cuando cambia la tasa
 * @param {array} products - Lista de productos
 * @param {number} newRate - Nueva tasa de cambio
 * @returns {array} Productos actualizados
 */
export const recalculatePrices = (products, newRate) => {
  return products.map((product) => {
    const priceUSD = product.cost * (1 + product.margin / 100);
    const priceVES = priceUSD * newRate;

    return {
      ...product,
      priceUSD,
      priceVES,
      lastUpdated: new Date().toISOString(),
    };
  });
};

export default {
  calculateProductPrice,
  calculateProductMargin,
  calculateSaleProfit,
  recalculatePrices,
};
