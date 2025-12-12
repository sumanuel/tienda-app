import { isValidMargin } from "../../utils/pricing";

/**
 * Aplica un margen a un producto
 * @param {number} cost - Costo del producto
 * @param {number} margin - Margen a aplicar (%)
 * @param {object} settings - Configuración de márgenes
 * @returns {object} Resultado con precio y validación
 */
export const applyMargin = (cost, margin, settings = {}) => {
  const {
    minMargin = 0,
    maxMargin = 200,
    roundPrices = true,
    roundTo = 0.5,
  } = settings;

  const valid = isValidMargin(margin, minMargin, maxMargin);

  if (!valid) {
    return {
      valid: false,
      error: `Margin must be between ${minMargin}% and ${maxMargin}%`,
    };
  }

  let price = cost * (1 + margin / 100);

  if (roundPrices && roundTo > 0) {
    price = Math.round(price / roundTo) * roundTo;
  }

  return {
    valid: true,
    price,
    margin,
    profit: price - cost,
  };
};

/**
 * Aplica márgenes diferentes según categoría
 * @param {object} product - Producto
 * @param {object} marginsByCategory - Márgenes por categoría
 * @returns {number} Margen aplicable
 */
export const getMarginByCategory = (product, marginsByCategory = {}) => {
  const categoryMargin = marginsByCategory[product.category];
  return categoryMargin || product.margin || 30;
};

/**
 * Sugiere un margen basado en el costo
 * @param {number} cost - Costo del producto
 * @returns {number} Margen sugerido
 */
export const suggestMargin = (cost) => {
  // Márgenes sugeridos según rango de costo
  if (cost < 1) return 50; // Productos muy económicos
  if (cost < 10) return 40;
  if (cost < 50) return 35;
  if (cost < 100) return 30;
  return 25; // Productos costosos
};

export default {
  applyMargin,
  getMarginByCategory,
  suggestMargin,
};
