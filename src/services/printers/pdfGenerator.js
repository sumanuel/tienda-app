import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { generateReceiptHTML } from "../../utils/receipts";

/**
 * Genera un PDF de un recibo
 * @param {object} sale - Datos de la venta
 * @param {object} business - Datos del negocio
 * @returns {Promise<string>} URI del PDF generado
 */
export const generateReceiptPDF = async (sale, business) => {
  try {
    const html = generateReceiptHTML(sale, business);

    const { uri } = await Print.printToFileAsync({
      html,
      width: 210, // A4 width in mm
      height: 297, // A4 height in mm
    });

    return uri;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};

/**
 * Genera y comparte un PDF de recibo
 * @param {object} sale - Datos de la venta
 * @param {object} business - Datos del negocio
 * @returns {Promise<void>}
 */
export const shareReceiptPDF = async (sale, business) => {
  try {
    const uri = await generateReceiptPDF(sale, business);

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Factura #${sale.id}`,
      });
    }

    return { success: true, uri };
  } catch (error) {
    throw new Error(`Share PDF failed: ${error.message}`);
  }
};

/**
 * Genera un PDF de reporte de ventas
 * @param {array} sales - Lista de ventas
 * @param {object} summary - Resumen
 * @param {object} business - Datos del negocio
 * @returns {Promise<string>} URI del PDF
 */
export const generateSalesReportPDF = async (sales, summary, business) => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #4CAF50; color: white; }
          .summary { margin: 20px 0; padding: 15px; background-color: #f5f5f5; }
        </style>
      </head>
      <body>
        <h1>${business.name}</h1>
        <h2 style="text-align:center;">Reporte de Ventas</h2>
        
        <div class="summary">
          <h3>Resumen</h3>
          <p><strong>Total Ventas:</strong> ${summary.count}</p>
          <p><strong>Total Ingreso:</strong> VES. ${summary.total.toFixed(
            2
          )}</p>
          <p><strong>Promedio por Venta:</strong> VES. ${summary.average.toFixed(
            2
          )}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Método Pago</th>
            </tr>
          </thead>
          <tbody>
            ${sales
              .map(
                (sale) => `
              <tr>
                <td>${sale.id}</td>
                <td>${new Date(sale.createdAt).toLocaleString()}</td>
                <td>VES. ${sale.total.toFixed(2)}</td>
                <td>${sale.paymentMethod}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        
        <p style="margin-top: 30px; text-align: center; color: #666;">
          Generado el ${new Date().toLocaleString()}
        </p>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  } catch (error) {
    throw new Error(`Report PDF generation failed: ${error.message}`);
  }
};

export default {
  generateReceiptPDF,
  shareReceiptPDF,
  generateSalesReportPDF,
};
