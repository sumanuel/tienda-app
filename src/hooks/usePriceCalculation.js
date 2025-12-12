import { useState, useCallback, useMemo } from "react";
import {
  calculateSalePrice,
  calculateMargin,
  applyDiscount,
} from "../utils/pricing";
import { convertCurrency } from "../utils/exchange";

/**
 * Hook para cálculos de precios y conversiones
 * @param {number} exchangeRate - Tasa de cambio actual
 * @returns {object} Funciones de cálculo
 */
export const usePriceCalculation = (exchangeRate) => {
  const [baseCurrency, setBaseCurrency] = useState("USD");

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
      return convertCurrency(amount, from, to, exchangeRate);
    },
    [exchangeRate]
  );

  /**
   * Calcula precios en ambas monedas
   */
  const getDualPrice = useCallback(
    (amount, currency) => {
      if (!exchangeRate) {
        return { USD: 0, VES: 0 };
      }

      if (currency === "USD") {
        return {
          USD: amount,
          VES: convert(amount, "USD", "VES"),
        };
      } else {
        return {
          USD: convert(amount, "VES", "USD"),
          VES: amount,
        };
      }
    },
    [exchangeRate, convert]
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
        const itemPrice =
          baseCurrency === "USD" ? item.priceUSD : item.priceVES;
        return total + itemPrice * item.quantity;
      }, 0);
    },
    [baseCurrency]
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
    [calculateCartTotal]
  );

  return {
    baseCurrency,
    setBaseCurrency,
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
