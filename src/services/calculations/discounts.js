/**
 * Aplica un descuento porcentual a un monto
 * @param {number} amount - Monto original
 * @param {number} discountPercent - Descuento en %
 * @returns {object} Objeto con original, discount y final
 */
export const applyPercentDiscount = (amount, discountPercent) => {
  const discount = amount * (discountPercent / 100);
  const final = amount - discount;

  return {
    original: amount,
    discountPercent,
    discount,
    final,
  };
};

/**
 * Aplica un descuento fijo a un monto
 * @param {number} amount - Monto original
 * @param {number} discountAmount - Descuento fijo
 * @returns {object} Objeto con original, discount y final
 */
export const applyFixedDiscount = (amount, discountAmount) => {
  const final = Math.max(0, amount - discountAmount);
  const discountPercent = (discountAmount / amount) * 100;

  return {
    original: amount,
    discountPercent,
    discount: discountAmount,
    final,
  };
};

/**
 * Valida que un descuento sea permitido
 * @param {number} discount - Descuento a validar (%)
 * @param {number} maxDiscount - Descuento máximo permitido (%)
 * @returns {boolean} True si es válido
 */
export const isValidDiscount = (discount, maxDiscount = 20) => {
  return discount >= 0 && discount <= maxDiscount;
};

/**
 * Calcula descuento total de un carrito
 * @param {array} items - Items del carrito
 * @param {number} discountPercent - Descuento global (%)
 * @returns {object} Desglose del descuento
 */
export const calculateCartDiscount = (items, discountPercent) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  return applyPercentDiscount(subtotal, discountPercent);
};

export default {
  applyPercentDiscount,
  applyFixedDiscount,
  isValidDiscount,
  calculateCartDiscount,
};
