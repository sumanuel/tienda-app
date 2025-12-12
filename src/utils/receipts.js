import { formatCurrency } from "./currency";

/**
 * Genera el contenido de un recibo
 * @param {object} sale - Información de la venta
 * @param {object} business - Información del negocio
 * @returns {string} Contenido del recibo en texto
 */
export const generateReceiptText = (sale, business) => {
  const { items, total, subtotal, tax, payment, customer } = sale;
  const date = new Date(sale.date);

  let receipt = "\n";
  receipt += `${business.name}\n`;
  receipt += `${business.rif}\n`;
  receipt += `${business.address}\n`;
  receipt += `${business.phone}\n`;
  receipt += "================================\n";
  receipt += `Factura #${sale.id}\n`;
  receipt += `Fecha: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}\n`;

  if (customer) {
    receipt += `Cliente: ${customer.name}\n`;
  }

  receipt += "================================\n";
  receipt += "PRODUCTOS\n";
  receipt += "================================\n";

  items.forEach((item) => {
    receipt += `${item.name}\n`;
    receipt += `  ${item.quantity} x ${formatCurrency(
      item.price,
      sale.currency
    )}\n`;
    receipt += `  ${formatCurrency(
      item.quantity * item.price,
      sale.currency
    )}\n`;
  });

  receipt += "================================\n";
  receipt += `Subtotal: ${formatCurrency(subtotal, sale.currency)}\n`;

  if (tax && tax > 0) {
    receipt += `IVA (16%): ${formatCurrency(tax, sale.currency)}\n`;
  }

  receipt += `TOTAL: ${formatCurrency(total, sale.currency)}\n`;
  receipt += "================================\n";

  if (payment) {
    receipt += `Pagado: ${formatCurrency(payment.paid, sale.currency)}\n`;
    receipt += `Cambio: ${formatCurrency(payment.change, sale.currency)}\n`;
    receipt += `Método: ${payment.method}\n`;
  }

  receipt += "================================\n";
  receipt += "Gracias por su compra!\n";
  receipt += "\n";

  return receipt;
};

/**
 * Genera HTML para impresión de recibo
 * @param {object} sale - Información de la venta
 * @param {object} business - Información del negocio
 * @returns {string} HTML del recibo
 */
export const generateReceiptHTML = (sale, business) => {
  const { items, total, subtotal, tax, payment, customer } = sale;
  const date = new Date(sale.date);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: monospace; width: 58mm; margin: 0; padding: 10px; }
        h1 { font-size: 16px; text-align: center; margin: 5px 0; }
        p { font-size: 12px; margin: 3px 0; }
        .center { text-align: center; }
        .right { text-align: right; }
        .line { border-top: 1px dashed #000; margin: 10px 0; }
        .item { margin: 5px 0; }
        .total { font-weight: bold; font-size: 14px; }
      </style>
    </head>
    <body>
      <h1>${business.name}</h1>
      <p class="center">${business.rif}</p>
      <p class="center">${business.address}</p>
      <p class="center">${business.phone}</p>
      <div class="line"></div>
      <p>Factura #${sale.id}</p>
      <p>Fecha: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}</p>
      ${customer ? `<p>Cliente: ${customer.name}</p>` : ""}
      <div class="line"></div>
      ${items
        .map(
          (item) => `
        <div class="item">
          <p>${item.name}</p>
          <p>${item.quantity} x ${formatCurrency(
            item.price,
            sale.currency
          )} = ${formatCurrency(item.quantity * item.price, sale.currency)}</p>
        </div>
      `
        )
        .join("")}
      <div class="line"></div>
      <p>Subtotal: <span class="right">${formatCurrency(
        subtotal,
        sale.currency
      )}</span></p>
      ${
        tax
          ? `<p>IVA (16%): <span class="right">${formatCurrency(
              tax,
              sale.currency
            )}</span></p>`
          : ""
      }
      <p class="total">TOTAL: <span class="right">${formatCurrency(
        total,
        sale.currency
      )}</span></p>
      <div class="line"></div>
      ${
        payment
          ? `
        <p>Pagado: ${formatCurrency(payment.paid, sale.currency)}</p>
        <p>Cambio: ${formatCurrency(payment.change, sale.currency)}</p>
        <p>Método: ${payment.method}</p>
      `
          : ""
      }
      <div class="line"></div>
      <p class="center">Gracias por su compra!</p>
    </body>
    </html>
  `;
};
