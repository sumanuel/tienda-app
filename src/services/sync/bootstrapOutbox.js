import { db } from "../database/db";
import { enqueueOutboxEvent } from "../database/outbox";
import { getSettings, saveSettings } from "../database/settings";

const truthy = (v) => v === 1 || v === true;

const normalizeIso = (value) => {
  const str = String(value || "").trim();
  return str || new Date().toISOString();
};

const mapProductRow = (row) => ({
  id: row.uuid,
  name: row.name,
  barcode: row.barcode || null,
  category: row.category || null,
  description: row.description || null,
  cost: row.cost ?? 0,
  priceUSD: row.priceUSD ?? 0,
  priceVES: row.priceVES ?? 0,
  margin: row.margin ?? 0,
  stock: row.stock ?? 0,
  minStock: row.minStock ?? 0,
  image: row.image || null,
  active: truthy(row.active),
  createdAt: row.createdAt ? String(row.createdAt) : null,
  updatedAt: row.updatedAt ? String(row.updatedAt) : null,
});

const mapCustomerRow = (row) => ({
  id: row.uuid,
  name: row.name,
  email: row.email || null,
  phone: row.phone || null,
  address: row.address || null,
  documentType: row.documentType || null,
  documentNumber: row.documentNumber || null,
  totalPurchases: row.totalPurchases ?? 0,
  active: truthy(row.active),
  createdAt: row.createdAt ? String(row.createdAt) : null,
  updatedAt: row.updatedAt ? String(row.updatedAt) : null,
});

export const bootstrapOutboxIfNeeded = async () => {
  const settings = await getSettings();
  const sync = settings.sync || {};

  if (sync.bootstrapDone) {
    return { bootstrapped: false };
  }

  const stats = {
    bootstrapped: true,
    productsEnqueued: 0,
    customersEnqueued: 0,
    salesEnqueued: 0,
    salesCancelledEnqueued: 0,
    salesSkippedMissingRefs: 0,
  };

  // 1) Products
  const products = await db.getAllAsync(
    "SELECT * FROM products WHERE uuid IS NOT NULL AND TRIM(uuid) != '' ORDER BY id ASC;"
  );
  for (const row of products) {
    await enqueueOutboxEvent({
      type: "product.upserted",
      entityId: row.uuid,
      payload: mapProductRow(row),
    });
    stats.productsEnqueued += 1;
  }

  // 2) Customers (skip generic)
  const customers = await db.getAllAsync(
    "SELECT * FROM customers WHERE uuid IS NOT NULL AND TRIM(uuid) != '' AND COALESCE(active, 1) = 1 AND COALESCE(documentNumber, '') != '1' ORDER BY id ASC;"
  );
  for (const row of customers) {
    await enqueueOutboxEvent({
      type: "customer.upserted",
      entityId: row.uuid,
      payload: mapCustomerRow(row),
    });
    stats.customersEnqueued += 1;
  }

  // 3) Sales (+ items)
  const sales = await db.getAllAsync(
    "SELECT * FROM sales WHERE uuid IS NOT NULL AND TRIM(uuid) != '' ORDER BY id ASC;"
  );

  for (const sale of sales) {
    const saleUuid = sale.uuid;
    const saleStatus = String(sale.status || "completed");

    if (saleStatus === "cancelled") {
      await enqueueOutboxEvent({
        type: "sale.cancelled",
        entityId: saleUuid,
        payload: { id: saleUuid, saleId: saleUuid },
      });
      stats.salesCancelledEnqueued += 1;
      continue;
    }

    let customerUuid = null;
    if (sale.customerId) {
      const row = await db.getFirstAsync(
        "SELECT uuid, documentNumber FROM customers WHERE id = ?;",
        [sale.customerId]
      );
      if (String(row?.documentNumber || "") !== "1") {
        customerUuid = row?.uuid || null;
      }
    }

    const itemRows = await db.getAllAsync(
      "SELECT * FROM sale_items WHERE saleId = ? ORDER BY id ASC;",
      [sale.id]
    );

    const itemsForSync = [];
    for (const item of itemRows) {
      const productRow = await db.getFirstAsync(
        "SELECT uuid FROM products WHERE id = ?;",
        [item.productId]
      );
      const productUuid = productRow?.uuid || null;

      if (!productUuid) {
        continue;
      }

      itemsForSync.push({
        id: item.uuid || null,
        productId: productUuid,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price ?? 0,
        priceUSD: item.priceUSD ?? 0,
        subtotal: item.subtotal ?? (item.quantity ?? 0) * (item.price ?? 0),
        createdAt: item.createdAt ? String(item.createdAt) : null,
        updatedAt: item.updatedAt ? String(item.updatedAt) : null,
      });
    }

    if (itemsForSync.length === 0) {
      stats.salesSkippedMissingRefs += 1;
      continue;
    }

    const createdAt = normalizeIso(sale.createdAt);
    const updatedAt = normalizeIso(sale.updatedAt || sale.createdAt);

    await enqueueOutboxEvent({
      type: "sale.created",
      entityId: saleUuid,
      payload: {
        id: saleUuid,
        sale: {
          id: saleUuid,
          customerId: customerUuid,
          subtotal: sale.subtotal ?? 0,
          tax: sale.tax ?? 0,
          discount: sale.discount ?? 0,
          total: sale.total ?? 0,
          currency: sale.currency || "VES",
          exchangeRate: sale.exchangeRate ?? 0,
          paymentMethod: sale.paymentMethod || null,
          paid: sale.paid ?? 0,
          change: sale.change ?? 0,
          status: saleStatus,
          notes: sale.notes || null,
          createdAt,
          updatedAt,
        },
        items: itemsForSync,
      },
    });

    stats.salesEnqueued += 1;
  }

  await saveSettings({
    ...settings,
    sync: {
      ...sync,
      bootstrapDone: true,
    },
  });

  return stats;
};

export default { bootstrapOutboxIfNeeded };
