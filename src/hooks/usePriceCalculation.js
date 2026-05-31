import { useState, useCallback, useMemo } from "react";
import {
  calculateSalePrice,
  calculateMargin,
  applyDiscount,
} from "../utils/pricing";
import { convertCurrency } from "../utils/exchange";
import { buildSaleItemMonetaryFields } from "../utils/currency";

/**
 * Hook para cálculos de precios y conversiones
 * @param {number} exchangeRate - Tasa de cambio actual
 * @returns {object} Funciones de cálculo
 */
export const usePriceCalculation = (exchangeRate, options = {}) => {
  const localCurrency = options?.localCurrency || "VES";
  const referenceCurrency = options?.referenceCurrency || "USD";
  const rateEnabled =
    options?.rateEnabled ?? referenceCurrency !== localCurrency;
  const defaultBaseCurrency = rateEnabled ? referenceCurrency : localCurrency;
  const [baseCurrency, setBaseCurrency] = useState(defaultBaseCurrency);

  /**
   * Calcula el precio de venta basado en costo y margen
   */
  const calculatePrice = useCallback((cost, margin) => {
    return calculateSalePrice(cost, margin, true);
  }, []);

  /**
   * Calcula el margen basado en costo y precio
   */
  const getMargin = useCallback((cost, price) => {
    return calculateMargin(cost, price);
  }, []);

  /**
   * Convierte un monto entre monedas
   */
  const convert = useCallback(
    (amount, from, to) => {
      if (!exchangeRate) return amount;
      return convertCurrency(amount, from, to, exchangeRate, {
        referenceCurrency,
        localCurrency,
        usesUsdConversion: rateEnabled,
      });
    },
    [exchangeRate, localCurrency, rateEnabled, referenceCurrency],
  );

  /**
   * Calcula precios en ambas monedas
   */
  const getDualPrice = useCallback(
    (amount, currency) => {
      if (!exchangeRate) {
        return {
          referenceAmount: 0,
          localAmount: 0,
          [referenceCurrency]: 0,
          [localCurrency]: 0,
          USD: 0,
          VES: 0,
        };
      }

      if (currency === referenceCurrency) {
        const localAmount = convert(amount, referenceCurrency, localCurrency);
        return {
          referenceAmount: amount,
          localAmount,
          [referenceCurrency]: amount,
          [localCurrency]: localAmount,
          USD: referenceCurrency === "USD" ? amount : 0,
          VES: localCurrency === "VES" ? localAmount : 0,
        };
      } else {
        const referenceAmount = convert(
          amount,
          localCurrency,
          referenceCurrency,
        );
        return {
          referenceAmount,
          localAmount: amount,
          [referenceCurrency]: referenceAmount,
          [localCurrency]: amount,
          USD: referenceCurrency === "USD" ? referenceAmount : 0,
          VES: localCurrency === "VES" ? amount : 0,
        };
      }
    },
    [exchangeRate, convert, localCurrency, referenceCurrency],
  );

  /**
   * Aplica descuento a un precio
   */
  const applyPriceDiscount = useCallback((price, discountPercent) => {
    return applyDiscount(price, discountPercent);
  }, []);

  /**
   * Calcula el total de un carrito
   */
  const calculateCartTotal = useCallback(
    (items) => {
      return items.reduce((total, item) => {
        const monetary = buildSaleItemMonetaryFields(item, {
          exchangeRate,
          localCurrency,
          referenceCurrency,
          rateEnabled,
        });
        const itemPrice =
          baseCurrency === referenceCurrency
            ? monetary.priceUSD
            : monetary.price;
        return total + itemPrice * item.quantity;
      }, 0);
    },
    [baseCurrency, exchangeRate, localCurrency, rateEnabled, referenceCurrency],
  );

  /**
   * Calcula subtotal, impuestos y total
   */
  const calculateSaleTotals = useCallback(
    (items, taxRate = 0.16, discount = 0) => {
      const subtotal = calculateCartTotal(items);
      const discountAmount = subtotal * (discount / 100);
      const subtotalAfterDiscount = subtotal - discountAmount;
      const tax = subtotalAfterDiscount * taxRate;
      const total = subtotalAfterDiscount + tax;

      return {
        subtotal,
        discount: discountAmount,
        subtotalAfterDiscount,
        tax,
        total,
      };
    },
    [calculateCartTotal],
  );

  return {
    baseCurrency,
    setBaseCurrency,
    localCurrency,
    referenceCurrency,
    calculatePrice,
    getMargin,
    convert,
    getDualPrice,
    applyPriceDiscount,
    calculateCartTotal,
    calculateSaleTotals,
  };
};

export default usePriceCalculation;
