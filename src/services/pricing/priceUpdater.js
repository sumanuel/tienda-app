import { updateProduct } from "../database/products";
import { calculateProductPricing, recalculatePrices } from "./priceCalculator";
import { resolveProductPricing } from "../../utils/currency";

/**
 * Actualiza precios de todos los productos según nueva tasa
 * @param {array} products - Lista de productos
 * @param {number} newRate - Nueva tasa de cambio
 * @returns {Promise<array>} Productos actualizados
 */
export const updateAllPrices = async (products, newRate, options = {}) => {
  try {
    const updatedProducts = recalculatePrices(products, newRate, options);

    // Actualizar cada producto en la base de datos
    const updatePromises = updatedProducts.map((product) =>
      updateProduct(product.id, product),
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
export const updateProductPrice = async (product, rate, options = {}) => {
  try {
    const localCurrency =
      options?.localCurrency || product?.localCurrency || "VES";
    const referenceCurrency =
      options?.referenceCurrency || product?.referenceCurrency || "USD";
    const rateEnabled =
      options?.rateEnabled ?? referenceCurrency !== localCurrency;
    const pricing = calculateProductPricing({
      cost: product?.cost,
      additionalCost: product?.additionalCost,
      costCurrency:
        product?.costCurrency ||
        product?.referenceCurrency ||
        referenceCurrency,
      margin: product?.margin,
      exchangeRate: rate,
      localCurrency,
      referenceCurrency,
      rateEnabled,
    });

    const updated = {
      ...product,
      priceUSD: pricing.legacyPriceUSD,
      priceVES: pricing.legacyPriceVES,
      localCurrency,
      referenceCurrency,
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
  threshold = 2,
  options = {},
) => {
  const localCurrency = options?.localCurrency || "VES";
  const referenceCurrency = options?.referenceCurrency || "USD";
  const rateEnabled =
    options?.rateEnabled ?? referenceCurrency !== localCurrency;

  return products.filter((product) => {
    const pricing = resolveProductPricing(product, {
      exchangeRate: currentRate,
      localCurrency: product?.localCurrency || localCurrency,
      referenceCurrency: product?.referenceCurrency || referenceCurrency,
      rateEnabled: product?.rateEnabled ?? rateEnabled,
    });

    if (!pricing.referencePrice || !pricing.localPrice) return true;

    const expectedLocal = pricing.referencePrice * currentRate;
    const difference =
      Math.abs((expectedLocal - pricing.localPrice) / expectedLocal) * 100;

    return difference >= threshold;
  });
};

export default {
  updateAllPrices,
  updateProductPrice,
  getProductsNeedingUpdate,
};
