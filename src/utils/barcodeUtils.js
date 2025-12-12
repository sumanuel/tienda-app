/**
 * Genera un código de barras aleatorio
 * @param {number} length - Longitud del código
 * @returns {string} Código de barras
 */
export const generateBarcode = (length = 13) => {
  let barcode = "";
  for (let i = 0; i < length; i++) {
    barcode += Math.floor(Math.random() * 10);
  }
  return barcode;
};

/**
 * Valida un código de barras EAN-13
 * @param {string} barcode - Código a validar
 * @returns {boolean} True si es válido
 */
export const validateEAN13 = (barcode) => {
  if (!barcode || barcode.length !== 13) return false;

  const digits = barcode.split("").map(Number);
  const checkDigit = digits.pop();

  let sum = 0;
  digits.forEach((digit, index) => {
    sum += digit * (index % 2 === 0 ? 1 : 3);
  });

  const calculatedCheckDigit = (10 - (sum % 10)) % 10;
  return calculatedCheckDigit === checkDigit;
};

/**
 * Formatea un código de barras para mostrar
 * @param {string} barcode - Código a formatear
 * @returns {string} Código formateado
 */
export const formatBarcode = (barcode) => {
  if (!barcode) return "";
  return barcode.replace(/(.{4})/g, "$1 ").trim();
};
