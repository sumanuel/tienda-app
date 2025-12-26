import { db } from "../database/db";

const toIntActive = (value) => (value ? 1 : 0);

const upsertProduct = async (product) => {
  if (!product?.id) return { inserted: 0, updated: 0 };

  const existing = await db.getFirstAsync(
    "SELECT id FROM products WHERE uuid = ?;",
    [product.id]
  );

  const values = {
    uuid: product.id,
    name: product.name || "",
    barcode: product.barcode || null,
    category: product.category || null,
    description: product.description || null,
    cost: product.cost ?? 0,
    priceUSD: product.priceUSD ?? 0,
    priceVES: product.priceVES ?? 0,
    margin: product.margin ?? 0,
    stock: product.stock ?? 0,
    minStock: product.minStock ?? 0,
    image: product.image || null,
    active: toIntActive(product.active !== false),
    createdAt: product.createdAt || new Date().toISOString(),
    updatedAt: product.updatedAt || new Date().toISOString(),
  };

  // SQLite en el cliente tiene barcode UNIQUE. Si el servidor envía un barcode
  // que ya está asignado a otro UUID local, evitamos romper el pull.
  if (values.barcode) {
    const conflict = await db.getFirstAsync(
      "SELECT uuid FROM products WHERE barcode = ? AND uuid != ? LIMIT 1;",
      [values.barcode, values.uuid]
    );
    if (conflict?.uuid) {
      values.barcode = null;
    }
  }

  if (existing?.id) {
    await db.runAsync(
      `UPDATE products
       SET name = ?, barcode = ?, category = ?, description = ?, cost = ?, priceUSD = ?, priceVES = ?, margin = ?,
           stock = ?, minStock = ?, image = ?, active = ?, createdAt = ?, updatedAt = ?
       WHERE uuid = ?;`,
      [
        values.name,
        values.barcode,
        values.category,
        values.description,
        values.cost,
        values.priceUSD,
        values.priceVES,
        values.margin,
        values.stock,
        values.minStock,
        values.image,
        values.active,
        values.createdAt,
        values.updatedAt,
        values.uuid,
      ]
    );
    return { inserted: 0, updated: 1 };
  }

  await db.runAsync(
    `INSERT INTO products (uuid, name, barcode, category, description, cost, priceUSD, priceVES, margin, stock, minStock, image, active, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      values.uuid,
      values.name,
      values.barcode,
      values.category,
      values.description,
      values.cost,
      values.priceUSD,
      values.priceVES,
      values.margin,
      values.stock,
      values.minStock,
      values.image,
      values.active,
      values.createdAt,
      values.updatedAt,
    ]
  );
  return { inserted: 1, updated: 0 };
};

const upsertCustomer = async (customer) => {
  if (!customer?.id || !customer?.name) return { inserted: 0, updated: 0 };

  // Evitar duplicar el cliente genérico local.
  if (String(customer.documentNumber || "") === "1") {
    return { inserted: 0, updated: 0 };
  }

  const existing = await db.getFirstAsync(
    "SELECT id FROM customers WHERE uuid = ?;",
    [customer.id]
  );

  const values = {
    uuid: customer.id,
    name: customer.name,
    email: customer.email || "",
    phone: customer.phone || "",
    address: customer.address || "",
    documentType: customer.documentType || "",
    documentNumber: customer.documentNumber || "",
    totalPurchases: customer.totalPurchases ?? 0,
    active: toIntActive(customer.active !== false),
    createdAt: customer.createdAt || new Date().toISOString(),
    updatedAt: customer.updatedAt || new Date().toISOString(),
  };

  if (existing?.id) {
    await db.runAsync(
      `UPDATE customers
       SET name = ?, email = ?, phone = ?, address = ?, documentType = ?, documentNumber = ?, totalPurchases = ?, active = ?, createdAt = ?, updatedAt = ?
       WHERE uuid = ?;`,
      [
        values.name,
        values.email,
        values.phone,
        values.address,
        values.documentType,
        values.documentNumber,
        values.totalPurchases,
        values.active,
        values.createdAt,
        values.updatedAt,
        values.uuid,
      ]
    );
    return { inserted: 0, updated: 1 };
  }

  await db.runAsync(
    `INSERT INTO customers (uuid, name, email, phone, address, documentType, documentNumber, totalPurchases, active, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      values.uuid,
      values.name,
      values.email,
      values.phone,
      values.address,
      values.documentType,
      values.documentNumber,
      values.totalPurchases,
      values.active,
      values.createdAt,
      values.updatedAt,
    ]
  );

  return { inserted: 1, updated: 0 };
};

const upsertSale = async (sale) => {
  if (!sale?.id) return { inserted: 0, updated: 0 };

  const existing = await db.getFirstAsync(
    "SELECT id FROM sales WHERE uuid = ?;",
    [sale.id]
  );

  let customerIdLocal = null;
  if (sale.customerId) {
    const customerRow = await db.getFirstAsync(
      "SELECT id FROM customers WHERE uuid = ?;",
      [sale.customerId]
    );
    customerIdLocal = customerRow?.id || null;
  }

  const values = {
    uuid: sale.id,
    customerId: customerIdLocal,
    subtotal: sale.subtotal ?? 0,
    tax: sale.tax ?? 0,
    discount: sale.discount ?? 0,
    total: sale.total ?? 0,
    currency: sale.currency || "VES",
    exchangeRate: sale.exchangeRate ?? 0,
    paymentMethod: sale.paymentMethod || null,
    paid: sale.paid ?? 0,
    change: sale.change ?? 0,
    status: sale.status || "completed",
    notes: sale.notes || null,
    createdAt: sale.createdAt || new Date().toISOString(),
    updatedAt: sale.updatedAt || new Date().toISOString(),
  };

  if (existing?.id) {
    await db.runAsync(
      `UPDATE sales
       SET customerId = ?, subtotal = ?, tax = ?, discount = ?, total = ?, currency = ?, exchangeRate = ?, paymentMethod = ?,
           paid = ?, change = ?, status = ?, notes = ?, createdAt = ?, updatedAt = ?
       WHERE uuid = ?;`,
      [
        values.customerId,
        values.subtotal,
        values.tax,
        values.discount,
        values.total,
        values.currency,
        values.exchangeRate,
        values.paymentMethod,
        values.paid,
        values.change,
        values.status,
        values.notes,
        values.createdAt,
        values.updatedAt,
        values.uuid,
      ]
    );

    return { inserted: 0, updated: 1 };
  }

  await db.runAsync(
    `INSERT INTO sales (uuid, customerId, subtotal, tax, discount, total, currency, exchangeRate, paymentMethod, paid, change, status, notes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      values.uuid,
      values.customerId,
      values.subtotal,
      values.tax,
      values.discount,
      values.total,
      values.currency,
      values.exchangeRate,
      values.paymentMethod,
      values.paid,
      values.change,
      values.status,
      values.notes,
      values.createdAt,
      values.updatedAt,
    ]
  );

  return { inserted: 1, updated: 0 };
};

const upsertSaleItem = async (saleItem) => {
  if (!saleItem?.id || !saleItem?.saleId || !saleItem?.productId) {
    return { inserted: 0, updated: 0, skipped: 1 };
  }

  const existing = await db.getFirstAsync(
    "SELECT id FROM sale_items WHERE uuid = ?;",
    [saleItem.id]
  );

  const saleRow = await db.getFirstAsync(
    "SELECT id FROM sales WHERE uuid = ?;",
    [saleItem.saleId]
  );
  const productRow = await db.getFirstAsync(
    "SELECT id FROM products WHERE uuid = ?;",
    [saleItem.productId]
  );

  if (!saleRow?.id || !productRow?.id) {
    return { inserted: 0, updated: 0, skipped: 1 };
  }

  const values = {
    uuid: saleItem.id,
    saleId: saleRow.id,
    productId: productRow.id,
    productName: saleItem.productName || "",
    quantity: saleItem.quantity ?? 0,
    price: saleItem.price ?? 0,
    priceUSD: saleItem.priceUSD ?? 0,
    subtotal:
      saleItem.subtotal ?? (saleItem.quantity ?? 0) * (saleItem.price ?? 0),
    createdAt: saleItem.createdAt || new Date().toISOString(),
    updatedAt: saleItem.updatedAt || new Date().toISOString(),
  };

  if (existing?.id) {
    await db.runAsync(
      `UPDATE sale_items
       SET saleId = ?, productId = ?, productName = ?, quantity = ?, price = ?, priceUSD = ?, subtotal = ?, createdAt = ?, updatedAt = ?
       WHERE uuid = ?;`,
      [
        values.saleId,
        values.productId,
        values.productName,
        values.quantity,
        values.price,
        values.priceUSD,
        values.subtotal,
        values.createdAt,
        values.updatedAt,
        values.uuid,
      ]
    );
    return { inserted: 0, updated: 1, skipped: 0 };
  }

  await db.runAsync(
    `INSERT INTO sale_items (uuid, saleId, productId, productName, quantity, price, priceUSD, subtotal, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      values.uuid,
      values.saleId,
      values.productId,
      values.productName,
      values.quantity,
      values.price,
      values.priceUSD,
      values.subtotal,
      values.createdAt,
      values.updatedAt,
    ]
  );

  return { inserted: 1, updated: 0, skipped: 0 };
};

export const applyPullData = async ({
  products = [],
  customers = [],
  sales = [],
  saleItems = [],
}) => {
  const counters = {
    productsInserted: 0,
    productsUpdated: 0,
    customersInserted: 0,
    customersUpdated: 0,
    salesInserted: 0,
    salesUpdated: 0,
    saleItemsInserted: 0,
    saleItemsUpdated: 0,
    saleItemsSkipped: 0,
  };

  await db.withTransactionAsync(async () => {
    for (const product of products) {
      const { inserted, updated } = await upsertProduct(product);
      counters.productsInserted += inserted;
      counters.productsUpdated += updated;
    }

    for (const customer of customers) {
      const { inserted, updated } = await upsertCustomer(customer);
      counters.customersInserted += inserted;
      counters.customersUpdated += updated;
    }

    for (const sale of sales) {
      const { inserted, updated } = await upsertSale(sale);
      counters.salesInserted += inserted;
      counters.salesUpdated += updated;
    }

    for (const item of saleItems) {
      const { inserted, updated, skipped } = await upsertSaleItem(item);
      counters.saleItemsInserted += inserted;
      counters.saleItemsUpdated += updated;
      counters.saleItemsSkipped += skipped;
    }
  });

  return counters;
};

export default { applyPullData };
