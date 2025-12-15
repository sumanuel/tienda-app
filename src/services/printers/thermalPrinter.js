import * as Print from "expo-print";
import { generateReceiptHTML } from "../../utils/receipts";

/**
 * Imprime un recibo en impresora térmica
 * @param {object} sale - Datos de la venta
 * @param {object} business - Datos del negocio
 * @returns {Promise<void>}
 */
export const printReceipt = async (sale, business) => {
  try {
    const html = generateReceiptHTML(sale, business);

    await Print.printAsync({
      html,
      width: 58, // mm para impresora térmica de 58mm
    });

    return { success: true };
  } catch (error) {
    console.error("Error printing receipt:", error);
    throw new Error(`Print failed: ${error.message}`);
  }
};

/**
 * Imprime un reporte de ventas
 * @param {array} sales - Lista de ventas
 * @param {object} summary - Resumen del período
 * @param {object} business - Datos del negocio
 * @returns {Promise<void>}
 */
export const printSalesReport = async (sales, summary, business) => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: monospace; width: 58mm; margin: 0; padding: 10px; }
          h1 { font-size: 14px; text-align: center; }
          .line { border-top: 1px dashed #000; margin: 5px 0; }
          .row { display: flex; justify-content: space-between; font-size: 11px; }
        </style>
      </head>
      <body>
        <h1>${business.name}</h1>
        <h2 style="text-align:center;font-size:12px;">REPORTE DE VENTAS</h2>
        <div class="line"></div>
        <div class="row">
          <span>Total Ventas:</span>
          <span>${summary.count}</span>
        </div>
        <div class="row">
          <span>Total Ingreso:</span>
          <span>VES. ${summary.total.toFixed(2)}</span>
        </div>
        <div class="row">
          <span>Promedio:</span>
          <span>VES. ${summary.average.toFixed(2)}</span>
        </div>
        <div class="line"></div>
        <p style="text-align:center;font-size:10px;">${new Date().toLocaleString()}</p>
      </body>
      </html>
    `;

    await Print.printAsync({ html, width: 58 });
    return { success: true };
  } catch (error) {
    throw new Error(`Print report failed: ${error.message}`);
  }
};

export default {
  printReceipt,
  printSalesReport,
};
