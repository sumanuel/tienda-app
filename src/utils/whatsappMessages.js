import { formatCurrency } from "./currency";

const joinSections = (sections) =>
  sections
    .filter((section) => section != null)
    .map((section) => String(section).trim())
    .filter(Boolean)
    .join("\n");

export const buildSaleInvoiceWhatsAppMessage = ({
  saleNumber,
  createdAt,
  customerName,
  items = [],
  totalVES,
  totalUSD,
}) => {
  const created = createdAt ? new Date(createdAt) : new Date();

  const headerBlock = joinSections([
    `Hola ${customerName || "Cliente"},`,
    "Te comparto los detalles de tu compra.",
    `Factura ${saleNumber}`,
    `Fecha: ${created.toLocaleDateString("es-VE")} ${created.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    )}`,
    `Cliente: ${customerName || "Cliente"}`,
  ]);

  const itemBlocks = items.map((item) =>
    [
      `- ${item.productName}`,
      `Cantidad: ${Number(item.quantity) || 0}`,
      `Subtotal: ${formatCurrency(Number(item.subtotalVES) || 0, "VES")}`,
    ].join("\n"),
  );

  const totalBlock = `Total: ${formatCurrency(Number(totalVES) || 0, "VES")}${
    Number(totalUSD) > 0 ? ` (${formatCurrency(Number(totalUSD), "USD")})` : ""
  }`;

  return [headerBlock, "Productos:", ...itemBlocks, totalBlock]
    .filter(Boolean)
    .join("\n\n");
};

export const buildReceivableReminderWhatsAppMessage = ({
  customerName,
  invoiceNumber,
  description,
  dueDate,
  amountVES,
  baseAmountUSD,
  paidAmountVES,
  pendingAmountVES,
}) => {
  const hasPartialPayment = Number(paidAmountVES) > 0;

  const headerBlock = joinSections([
    `Hola ${customerName || "Cliente"},`,
    "Te comparto un recordatorio de pago.",
    invoiceNumber ? `Factura: ${invoiceNumber}` : null,
  ]);

  const detailBlock = joinSections([
    description ? `Concepto: ${description}` : null,
    dueDate ? `Vence: ${dueDate}` : null,
  ]);

  const amountBlock = joinSections([
    `Monto: ${formatCurrency(Number(amountVES) || 0, "VES")}`,
    Number(baseAmountUSD) > 0
      ? `Monto (USD): ${formatCurrency(Number(baseAmountUSD), "USD")}`
      : null,
  ]);

  const balanceBlock = joinSections([
    hasPartialPayment
      ? `Pagado: ${formatCurrency(Number(paidAmountVES) || 0, "VES")}`
      : null,
    hasPartialPayment
      ? `Pendiente: ${formatCurrency(Number(pendingAmountVES) || 0, "VES")}`
      : null,
  ]);

  return [headerBlock, detailBlock, amountBlock, balanceBlock]
    .filter(Boolean)
    .join("\n\n");
};

export const buildReceivableConsolidatedWhatsAppMessage = ({
  customerName,
  documentNumber,
  totalPendingVES,
  totalPendingUSD,
  items = [],
}) => {
  const headerBlock = joinSections([
    `Hola ${customerName || "Cliente"},`,
    "Te comparto tu consolidado de cuentas por cobrar.",
    documentNumber ? `Documento: ${documentNumber}` : null,
  ]);

  const detailBlocks = items.map((item) => {
    const refLabel = item.invoiceNumber
      ? `Factura ${item.invoiceNumber}`
      : item.receivableNumber || "Cuenta";

    return [
      `- ${refLabel}`,
      item.description ? `Concepto: ${item.description}` : null,
      item.dueDate ? `Vence: ${item.dueDate}` : null,
      "",
      `Pendiente: ${formatCurrency(Number(item.pendingAmountVES) || 0, "VES")}${
        Number(item.pendingAmountUSD) > 0
          ? ` (${formatCurrency(Number(item.pendingAmountUSD), "USD")})`
          : ""
      }`,
    ]
      .filter((line) => line != null)
      .join("\n");
  });

  const totalBlock = `Total pendiente: ${formatCurrency(Number(totalPendingVES) || 0, "VES")}${
    Number(totalPendingUSD) > 0
      ? ` (${formatCurrency(Number(totalPendingUSD), "USD")})`
      : ""
  }`;

  return [headerBlock, "Detalle pendiente:", ...detailBlocks, totalBlock]
    .filter(Boolean)
    .join("\n\n");
};
