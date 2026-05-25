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

  return joinSections([
    `Factura ${saleNumber}`,
    `Fecha: ${created.toLocaleDateString("es-VE")} ${created.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    )}`,
    `Cliente: ${customerName || "Cliente"}`,
    "",
    "Productos:",
    ...items.map(
      (item) =>
        `- ${item.productName} x${Number(item.quantity) || 0}: ${formatCurrency(
          Number(item.subtotalVES) || 0,
          "VES",
        )}`,
    ),
    "",
    `Total: ${formatCurrency(Number(totalVES) || 0, "VES")}${
      Number(totalUSD) > 0
        ? ` (${formatCurrency(Number(totalUSD), "USD")})`
        : ""
    }`,
  ]);
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

  return joinSections([
    `Hola ${customerName || "Cliente"},`,
    "Te comparto un recordatorio de pago.",
    invoiceNumber ? `Factura: ${invoiceNumber}` : null,
    description ? `Concepto: ${description}` : null,
    dueDate ? `Vence: ${dueDate}` : null,
    `Monto: ${formatCurrency(Number(amountVES) || 0, "VES")}`,
    Number(baseAmountUSD) > 0
      ? `Monto (USD): ${formatCurrency(Number(baseAmountUSD), "USD")}`
      : null,
    hasPartialPayment
      ? `Pagado: ${formatCurrency(Number(paidAmountVES) || 0, "VES")}`
      : null,
    hasPartialPayment
      ? `Pendiente: ${formatCurrency(Number(pendingAmountVES) || 0, "VES")}`
      : null,
  ]);
};

export const buildReceivableConsolidatedWhatsAppMessage = ({
  customerName,
  documentNumber,
  totalPendingVES,
  totalPendingUSD,
  items = [],
}) => {
  return joinSections([
    `Hola ${customerName || "Cliente"},`,
    "Te comparto tu consolidado de cuentas por cobrar.",
    documentNumber ? `Documento: ${documentNumber}` : null,
    "",
    "Detalle pendiente:",
    ...items.map((item) => {
      const refLabel = item.invoiceNumber
        ? `Factura ${item.invoiceNumber}`
        : item.receivableNumber || "Cuenta";

      return joinSections([
        `- ${refLabel}`,
        item.description ? `  Concepto: ${item.description}` : null,
        item.dueDate ? `  Vence: ${item.dueDate}` : null,
        "",
        `  Pendiente: ${formatCurrency(Number(item.pendingAmountVES) || 0, "VES")}${
          Number(item.pendingAmountUSD) > 0
            ? ` (${formatCurrency(Number(item.pendingAmountUSD), "USD")})`
            : ""
        }`,
        "",
      ]);
    }),
    "",
    `Total pendiente: ${formatCurrency(Number(totalPendingVES) || 0, "VES")}${
      Number(totalPendingUSD) > 0
        ? ` (${formatCurrency(Number(totalPendingUSD), "USD")})`
        : ""
    }`,
    "",
  ]);
};
