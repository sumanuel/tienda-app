import { initAllTables } from "../database/db";
import { db } from "../database/db";
import { insertProduct } from "../database/products";
import { insertCustomer } from "../database/customers";
import { insertSale } from "../database/sales";
import { syncNow } from "./syncService";

const countOutboxByStatus = async () => {
  const rows = await db.getAllAsync(
    "SELECT status, COUNT(*) as count FROM outbox_events GROUP BY status;"
  );
  const counts = {};
  for (const row of rows) {
    counts[row.status] = row.count;
  }
  return counts;
};

export const runSyncSmoke = async ({ baseUrl, token }) => {
  if (!baseUrl || !token) {
    throw new Error("runSyncSmoke requires baseUrl and token");
  }

  await initAllTables();

  const suffix = String(Date.now());

  const productId = await insertProduct({
    name: `SMOKE Product ${suffix}`,
    barcode: `SMK-${suffix}`,
    category: "SMOKE",
    description: "Smoke test product",
    cost: 1,
    priceUSD: 2,
    priceVES: 0,
    margin: 0,
    stock: 5,
    minStock: 0,
    image: "",
  });

  const customerId = await insertCustomer({
    name: `SMOKE Customer ${suffix}`,
    documentType: "V",
    documentNumber: `SMK-${suffix}`,
    email: "",
    phone: "",
    address: "",
  });

  const itemPrice = 10;
  const quantity = 1;

  const saleId = await insertSale(
    {
      customerId,
      subtotal: itemPrice * quantity,
      tax: 0,
      discount: 0,
      total: itemPrice * quantity,
      currency: "VES",
      exchangeRate: 0,
      paymentMethod: "cash",
      paid: itemPrice * quantity,
      change: 0,
      status: "completed",
      notes: "smoke",
    },
    [
      {
        productId,
        productName: `SMOKE Product ${suffix}`,
        quantity,
        price: itemPrice,
        priceUSD: 0,
        subtotal: itemPrice * quantity,
      },
    ]
  );

  const outboxBefore = await countOutboxByStatus();
  const syncResult = await syncNow({ baseUrl, token });
  const outboxAfter = await countOutboxByStatus();

  return {
    created: { productId, customerId, saleId },
    outboxBefore,
    outboxAfter,
    syncResult,
  };
};

export default { runSyncSmoke };
