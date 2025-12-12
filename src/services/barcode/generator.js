import { generateBarcode as genBarcode } from "../../utils/barcodeUtils";

/**
 * Genera un nuevo código de barras para un producto
 * @param {string} prefix - Prefijo del código (ej: categoría)
 * @returns {string} Código de barras generado
 */
export const generateProductBarcode = (prefix = "200") => {
  const randomPart = Math.floor(Math.random() * 1000000000)
    .toString()
    .padStart(9, "0");
  const barcode = prefix + randomPart;

  // Calcular dígito verificador EAN-13
  const digits = barcode.split("").map(Number);
  let sum = 0;
  digits.forEach((digit, index) => {
    sum += digit * (index % 2 === 0 ? 1 : 3);
  });
  const checkDigit = (10 - (sum % 10)) % 10;

  return barcode + checkDigit;
};

/**
 * Genera código de barras simple
 * @returns {string} Código de barras
 */
export const generateSimpleBarcode = () => {
  return genBarcode(13);
};

/**
 * Verifica si un código de barras ya existe
 * @param {string} barcode - Código a verificar
 * @param {array} existingProducts - Productos existentes
 * @returns {boolean} True si existe
 */
export const barcodeExists = (barcode, existingProducts) => {
  return existingProducts.some((product) => product.barcode === barcode);
};

export default {
  generateProductBarcode,
  generateSimpleBarcode,
  barcodeExists,
};
