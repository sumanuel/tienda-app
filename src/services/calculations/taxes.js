import { TAX_RATES, TAX_CONFIG } from "../../constants/taxRates";

/**
 * Calcula el IVA de un monto
 * @param {number} amount - Monto base
 * @param {boolean} included - Si el IVA ya está incluido
 * @returns {object} Objeto con base, tax y total
 */
export const calculateIVA = (amount, included = false) => {
  const rate = TAX_RATES.IVA.rate;

  if (included) {
    // El precio ya incluye IVA, calcular cuánto es
    const base = amount / (1 + rate);
    const tax = amount - base;
    return { base, tax, total: amount };
  } else {
    // Agregar IVA al precio
    const tax = amount * rate;
    const total = amount + tax;
    return { base: amount, tax, total };
  }
};

/**
 * Calcula el IGTF (solo para pagos en USD)
 * @param {number} amount - Monto en USD
 * @returns {object} Objeto con base, tax y total
 */
export const calculateIGTF = (amount) => {
  const rate = TAX_RATES.IGTF.rate;
  const tax = amount * rate;
  const total = amount + tax;

  return { base: amount, tax, total };
};

/**
 * Calcula todos los impuestos aplicables a una venta
 * @param {number} subtotal - Subtotal de la venta
 * @param {string} paymentCurrency - Moneda de pago (USD/VES)
 * @returns {object} Desglose completo de impuestos
 */
export const calculateAllTaxes = (subtotal, paymentCurrency = "VES") => {
  const result = {
    subtotal,
    iva: 0,
    igtf: 0,
    total: subtotal,
  };

  // Calcular IVA
  const ivaCalc = calculateIVA(subtotal, TAX_CONFIG.includeInPrice);
  result.iva = ivaCalc.tax;
  result.total = ivaCalc.total;

  // Calcular IGTF solo si es pago en USD y está configurado
  if (paymentCurrency === "USD" && TAX_CONFIG.applyIGTF) {
    const igtfCalc = calculateIGTF(result.total);
    result.igtf = igtfCalc.tax;
    result.total = igtfCalc.total;
  }

  return result;
};

/**
 * Obtiene el desglose de impuestos para mostrar
 * @param {object} taxData - Datos de impuestos calculados
 * @returns {array} Array de items de impuestos
 */
export const getTaxBreakdown = (taxData) => {
  const breakdown = [];

  if (taxData.iva > 0) {
    breakdown.push({
      name: "IVA (16%)",
      amount: taxData.iva,
    });
  }

  if (taxData.igtf > 0) {
    breakdown.push({
      name: "IGTF (3%)",
      amount: taxData.igtf,
    });
  }

  return breakdown;
};

export default {
  calculateIVA,
  calculateIGTF,
  calculateAllTaxes,
  getTaxBreakdown,
};
