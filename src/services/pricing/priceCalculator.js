import {
  calculateSalePrice,
  calculateMargin,
  calculateProfit,
} from "../../utils/pricing";
import { convertCurrency } from "../../utils/exchange";
import { normalizeCurrencyCode } from "../../utils/currency";

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const calculateProductPricing = ({
  cost,
  additionalCost = 0,
  costCurrency,
  margin = 0,
  exchangeRate,
  localCurrency = "VES",
  referenceCurrency = "USD",
  rateEnabled = true,
} = {}) => {
  const normalizedLocalCurrency = normalizeCurrencyCode(localCurrency, "VES");
  const normalizedReferenceCurrency = normalizeCurrencyCode(
    referenceCurrency,
    "USD",
  );
  const normalizedCostCurrency = normalizeCurrencyCode(
    costCurrency,
    rateEnabled ? normalizedReferenceCurrency : normalizedLocalCurrency,
  );
  const parsedCost = Number(cost) || 0;
  const parsedAdditionalCost = Number(additionalCost) || 0;
  const parsedMargin = Number(margin) || 0;
  const activeRate = Number(exchangeRate) || 0;

  const totalCostInInputCurrency = parsedCost + parsedAdditionalCost;
  const salePriceInInputCurrency =
    totalCostInInputCurrency * (1 + parsedMargin / 100);

  let referencePrice = null;
  let localPrice = null;

  if (normalizedCostCurrency === normalizedReferenceCurrency) {
    referencePrice = salePriceInInputCurrency;
    localPrice = rateEnabled
      ? activeRate > 0
        ? convertCurrency(
            salePriceInInputCurrency,
            normalizedReferenceCurrency,
            normalizedLocalCurrency,
            activeRate,
            {
              referenceCurrency: normalizedReferenceCurrency,
              localCurrency: normalizedLocalCurrency,
              usesUsdConversion: rateEnabled,
            },
          )
        : null
      : salePriceInInputCurrency;
  } else {
    localPrice = salePriceInInputCurrency;
    referencePrice = rateEnabled
      ? activeRate > 0
        ? convertCurrency(
            salePriceInInputCurrency,
            normalizedLocalCurrency,
            normalizedReferenceCurrency,
            activeRate,
            {
              referenceCurrency: normalizedReferenceCurrency,
              localCurrency: normalizedLocalCurrency,
              usesUsdConversion: rateEnabled,
            },
          )
        : null
      : salePriceInInputCurrency;
  }

  return {
    costCurrency: normalizedCostCurrency,
    salePriceInInputCurrency: roundMoney(salePriceInInputCurrency),
    referencePrice: referencePrice == null ? null : roundMoney(referencePrice),
    localPrice: localPrice == null ? null : roundMoney(localPrice),
    legacyPriceUSD: roundMoney(referencePrice ?? localPrice),
    legacyPriceVES: roundMoney(localPrice ?? referencePrice),
  };
};

export const normalizeLegacyProductCosts = ({
  cost,
  additionalCost = 0,
  costCurrency,
  exchangeRate,
  localCurrency = "VES",
  referenceCurrency = "USD",
  rateEnabled = true,
} = {}) => {
  const normalizedLocalCurrency = normalizeCurrencyCode(localCurrency, "VES");
  const normalizedReferenceCurrency = normalizeCurrencyCode(
    referenceCurrency,
    "USD",
  );
  const normalizedCostCurrency = normalizeCurrencyCode(
    costCurrency,
    rateEnabled ? normalizedReferenceCurrency : normalizedLocalCurrency,
  );
  const parsedCost = Number(cost) || 0;
  const parsedAdditionalCost = Number(additionalCost) || 0;
  const activeRate = Number(exchangeRate) || 0;

  if (
    normalizedCostCurrency === normalizedReferenceCurrency ||
    !rateEnabled ||
    activeRate <= 0
  ) {
    return {
      referenceCost: roundMoney(parsedCost),
      referenceAdditionalCost: roundMoney(parsedAdditionalCost),
    };
  }

  return {
    referenceCost: roundMoney(
      convertCurrency(
        parsedCost,
        normalizedLocalCurrency,
        normalizedReferenceCurrency,
        activeRate,
        {
          referenceCurrency: normalizedReferenceCurrency,
          localCurrency: normalizedLocalCurrency,
          usesUsdConversion: rateEnabled,
        },
      ),
    ),
    referenceAdditionalCost: roundMoney(
      convertCurrency(
        parsedAdditionalCost,
        normalizedLocalCurrency,
        normalizedReferenceCurrency,
        activeRate,
        {
          referenceCurrency: normalizedReferenceCurrency,
          localCurrency: normalizedLocalCurrency,
          usesUsdConversion: rateEnabled,
        },
      ),
    ),
  };
};

/**
 * Calcula el precio de venta de un producto
 * @param {object} product - Producto con costo y margen
 * @param {boolean} round - Redondear precio
 * @returns {number} Precio de venta
 */
export const calculateProductPrice = (product, round = true) => {
  const baseCost = Number(product?.cost) || 0;
  const additionalCost = Number(product?.additionalCost) || 0;
  return calculateSalePrice(baseCost + additionalCost, product.margin, round);
};

/**
 * Calcula el margen de un producto
 * @param {object} product - Producto con costo y precio
 * @returns {number} Margen en %
 */
export const calculateProductMargin = (product) => {
  const price = product.priceUSD || product.salePrice;
  const baseCost = Number(product?.cost) || 0;
  const additionalCost = Number(product?.additionalCost) || 0;
  return calculateMargin(baseCost + additionalCost, price);
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
    const baseCost = Number(product?.cost) || 0;
    const additionalCost = Number(product?.additionalCost) || 0;
    const priceUSD = (baseCost + additionalCost) * (1 + product.margin / 100);
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
  calculateProductPricing,
  normalizeLegacyProductCosts,
  recalculatePrices,
};
