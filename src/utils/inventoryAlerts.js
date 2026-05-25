/**
 * Verifica si un producto tiene stock bajo
 * @param {object} product - Producto a verificar
 * @param {number} threshold - Umbral de stock bajo
 * @returns {boolean} True si tiene stock bajo
 */
export const isLowStock = (product, threshold = 10) => {
  if (Number(product?.trackInventory ?? 1) !== 1) return false;
  return product.stock <= threshold && product.stock > 0;
};

/**
 * Verifica si un producto está sin stock
 * @param {object} product - Producto a verificar
 * @returns {boolean} True si no tiene stock
 */
export const isOutOfStock = (product) => {
  if (Number(product?.trackInventory ?? 1) !== 1) return false;
  return product.stock <= 0;
};

/**
 * Obtiene el nivel de alerta de stock
 * @param {object} product - Producto
 * @param {number} lowThreshold - Umbral de stock bajo
 * @returns {string} Nivel de alerta: 'ok', 'low', 'out'
 */
export const getStockLevel = (product, lowThreshold = 10) => {
  if (isOutOfStock(product)) return "out";
  if (isLowStock(product, lowThreshold)) return "low";
  return "ok";
};

/**
 * Obtiene todos los productos con stock bajo
 * @param {array} products - Lista de productos
 * @param {number} threshold - Umbral de stock bajo
 * @returns {array} Productos con stock bajo
 */
export const getLowStockProducts = (products, threshold = 10) => {
  return products.filter((product) => isLowStock(product, threshold));
};

/**
 * Obtiene todos los productos sin stock
 * @param {array} products - Lista de productos
 * @returns {array} Productos sin stock
 */
export const getOutOfStockProducts = (products) => {
  return products.filter((product) => isOutOfStock(product));
};

/**
 * Calcula el valor total del inventario
 * @param {array} products - Lista de productos
 * @returns {number} Valor total
 */
export const calculateInventoryValue = (products) => {
  return products.reduce((total, product) => {
    if (Number(product?.trackInventory ?? 1) !== 1) {
      return total;
    }
    return total + product.cost * product.stock;
  }, 0);
};
