import { updateProduct } from "../database/products";
import { recalculatePrices } from "./priceCalculator";

/**
 * Actualiza precios de todos los productos según nueva tasa
 * @param {array} products - Lista de productos
 * @param {number} newRate - Nueva tasa de cambio
 * @returns {Promise<array>} Productos actualizados
 */
export const updateAllPrices = async (products, newRate) => {
  try {
    const updatedProducts = recalculatePrices(products, newRate);

    // Actualizar cada producto en la base de datos
    const updatePromises = updatedProducts.map((product) =>
      updateProduct(product.id, product)
    );

    await Promise.all(updatePromises);

    return updatedProducts;
  } catch (error) {
    throw new Error(`Failed to update prices: ${error.message}`);
  }
};

/**
 * Actualiza el precio de un producto específico
 * @param {object} product - Producto a actualizar
 * @param {number} rate - Tasa de cambio actual
 * @returns {Promise<object>} Producto actualizado
 */
export const updateProductPrice = async (product, rate) => {
  try {
    const priceUSD = product.cost * (1 + product.margin / 100);
    const priceVES = priceUSD * rate;

    const updated = {
      ...product,
      priceUSD,
      priceVES,
      lastUpdated: new Date().toISOString(),
    };

    await updateProduct(product.id, updated);

    return updated;
  } catch (error) {
    throw new Error(`Failed to update product price: ${error.message}`);
  }
};

/**
 * Verifica qué productos necesitan actualización de precio
 * @param {array} products - Lista de productos
 * @param {number} currentRate - Tasa actual
 * @param {number} threshold - % de diferencia para actualizar
 * @returns {array} Productos que necesitan actualización
 */
export const getProductsNeedingUpdate = (
  products,
  currentRate,
  threshold = 2
) => {
  return products.filter((product) => {
    if (!product.priceUSD || !product.priceVES) return true;

    const expectedVES = product.priceUSD * currentRate;
    const difference =
      Math.abs((expectedVES - product.priceVES) / expectedVES) * 100;

    return difference >= threshold;
  });
};

export default {
  updateAllPrices,
  updateProductPrice,
  getProductsNeedingUpdate,
};
