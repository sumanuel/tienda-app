import * as SQLite from "expo-sqlite";
import { createGenericCustomer } from "./customers";

/**
 * Instancia única de la base de datos
 * Todos los servicios deben importar esta instancia
 * para evitar múltiples conexiones y bloqueos
 */
export const db = SQLite.openDatabaseSync("tienda.db");

// Flag para saber si las tablas ya fueron inicializadas
let tablesInitialized = false;

/**
 * Inicializa todas las tablas de la base de datos
 * Ejecuta todas las creaciones de tablas en una sola transacción
 * para evitar bloqueos
 */
export const initAllTables = async () => {
  try {
    // Ejecutar migraciones primero (siempre, independientemente del estado de inicialización)
    await runMigrations();

    if (tablesInitialized) {
      console.log("Tables already initialized, skipping table creation...");
      return;
    }

    // Activar WAL mode ANTES de la transacción
    await db.execAsync("PRAGMA journal_mode = WAL;");

    // Crear todas las tablas en una transacción
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        -- Tabla de productos
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uuid TEXT,
          name TEXT NOT NULL,
          barcode TEXT UNIQUE,
          category TEXT,
          description TEXT,
          cost REAL DEFAULT 0,
          priceUSD REAL DEFAULT 0,
          priceVES REAL DEFAULT 0,
          margin REAL DEFAULT 0,
          stock INTEGER DEFAULT 0,
          minStock INTEGER DEFAULT 0,
          image TEXT,
          active INTEGER DEFAULT 1,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Tabla de ventas (schema actual)
        CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uuid TEXT,
          customerId INTEGER,
          subtotal REAL DEFAULT 0,
          tax REAL DEFAULT 0,
          discount REAL DEFAULT 0,
          total REAL DEFAULT 0,
          currency TEXT DEFAULT 'VES',
          exchangeRate REAL DEFAULT 0,
          paymentMethod TEXT,
          paid REAL DEFAULT 0,
          change REAL DEFAULT 0,
          status TEXT DEFAULT 'completed',
          notes TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Tabla de items de venta
        CREATE TABLE IF NOT EXISTS sale_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uuid TEXT,
          saleId INTEGER NOT NULL,
          productId INTEGER NOT NULL,
          productName TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          price REAL NOT NULL,
          priceUSD REAL DEFAULT 0,
          subtotal REAL NOT NULL,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (saleId) REFERENCES sales(id)
        );

        -- Outbox para sincronización (offline-first)
        CREATE TABLE IF NOT EXISTS outbox_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          eventId TEXT NOT NULL,
          type TEXT NOT NULL,
          entityId TEXT,
          payload TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          attempts INTEGER DEFAULT 0,
          lastAttemptAt TEXT,
          sentAt TEXT,
          lastError TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Tabla de clientes
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uuid TEXT,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          address TEXT,
          documentType TEXT,
          documentNumber TEXT,
          totalPurchases REAL DEFAULT 0,
          active INTEGER DEFAULT 1,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Tabla de proveedores
        CREATE TABLE IF NOT EXISTS suppliers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          documentNumber TEXT NOT NULL,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          address TEXT,
          contactPerson TEXT,
          paymentTerms TEXT,
          active INTEGER DEFAULT 1,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Tabla de cuentas por cobrar
        CREATE TABLE IF NOT EXISTS accounts_receivable (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customerId INTEGER,
          customerName TEXT NOT NULL,
          documentNumber TEXT,
          amount REAL NOT NULL,
          paidAmount REAL DEFAULT 0,
          paidAt TEXT,
          baseCurrency TEXT DEFAULT 'VES',
          baseAmountUSD REAL DEFAULT 0,
          exchangeRateAtCreation REAL DEFAULT 0,
          description TEXT,
          invoiceNumber TEXT,
          dueDate TEXT,
          status TEXT DEFAULT 'pending',
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customerId) REFERENCES customers (id)
        );

        -- Tabla de cuentas por pagar
        CREATE TABLE IF NOT EXISTS accounts_payable (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          supplierId INTEGER,
          supplierName TEXT NOT NULL,
          amount REAL NOT NULL,
          paidAmount REAL DEFAULT 0,
          paidAt TEXT,
          description TEXT,
          dueDate TEXT,
          documentNumber TEXT,
          invoiceNumber TEXT,
          status TEXT DEFAULT 'pending',
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (supplierId) REFERENCES suppliers (id)
        );

        -- Tabla de pagos de cuentas por cobrar
        CREATE TABLE IF NOT EXISTS account_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          accountId INTEGER NOT NULL,
          accountType TEXT NOT NULL, -- 'receivable' o 'payable'
          amount REAL NOT NULL,
          paymentMethod TEXT NOT NULL,
          paymentDate TEXT DEFAULT CURRENT_TIMESTAMP,
          reference TEXT,
          notes TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (accountId) REFERENCES accounts_receivable (id) ON DELETE CASCADE
        );

        -- Tabla de tasas de cambio
        CREATE TABLE IF NOT EXISTS exchange_rates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source TEXT NOT NULL,
          rate REAL NOT NULL,
          fromCurrency TEXT DEFAULT 'USD',
          toCurrency TEXT DEFAULT 'VES',
          isActive INTEGER DEFAULT 0,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Tabla de configuraciones
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          value TEXT NOT NULL,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
    });

    // Crear índices fuera de la transacción principal
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_barcode ON products(barcode);
      CREATE INDEX IF NOT EXISTS idx_products_uuid ON products(uuid);
      CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(createdAt);
      CREATE INDEX IF NOT EXISTS idx_sales_uuid ON sales(uuid);
      CREATE INDEX IF NOT EXISTS idx_sale_items_uuid ON sale_items(uuid);
      CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON outbox_events(status, createdAt);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_outbox_eventId ON outbox_events(eventId);
      CREATE INDEX IF NOT EXISTS idx_customer_name ON customers(name);
      CREATE INDEX IF NOT EXISTS idx_customers_uuid ON customers(uuid);
      CREATE INDEX IF NOT EXISTS idx_supplier_name ON suppliers(name);
      CREATE INDEX IF NOT EXISTS idx_accounts_receivable_status ON accounts_receivable(status, dueDate);
      CREATE INDEX IF NOT EXISTS idx_accounts_payable_status ON accounts_payable(status, dueDate);
      CREATE INDEX IF NOT EXISTS idx_active_rate ON exchange_rates(isActive, createdAt);
    `);

    // Crear cliente genérico si no existe
    await createGenericCustomer();

    tablesInitialized = true;
    console.log("All tables created successfully");
  } catch (error) {
    console.error("Error creating tables:", error);
    throw error;
  }
};

/**
 * Ejecuta migraciones de base de datos
 * Agrega columnas faltantes a tablas existentes
 */
const runMigrations = async () => {
  try {
    console.log("Running database migrations...");

    const tableExists = async (tableName) => {
      const row = await db.getFirstAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?;",
        [tableName]
      );
      return !!row;
    };

    // Tabla outbox_events (siempre antes de encolar eventos)
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS outbox_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        eventId TEXT NOT NULL,
        type TEXT NOT NULL,
        entityId TEXT,
        payload TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        lastAttemptAt TEXT,
        sentAt TEXT,
        lastError TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );`
    );
    await db.execAsync(
      "CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON outbox_events(status, createdAt);"
    );
    await db.execAsync(
      "CREATE UNIQUE INDEX IF NOT EXISTS uq_outbox_eventId ON outbox_events(eventId);"
    );

    // Asegurar tabla sale_items y columna priceUSD
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT,
        saleId INTEGER NOT NULL,
        productId INTEGER NOT NULL,
        productName TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        priceUSD REAL DEFAULT 0,
        subtotal REAL NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (saleId) REFERENCES sales(id)
      );`
    );

    const saleItemColumns = await db.getAllAsync(
      "PRAGMA table_info(sale_items)"
    );
    const hasSaleItemUuid = saleItemColumns.some((col) => col.name === "uuid");
    const hasSaleItemPriceUSD = saleItemColumns.some(
      (col) => col.name === "priceUSD"
    );
    const hasSaleItemCreatedAt = saleItemColumns.some(
      (col) => col.name === "createdAt"
    );
    const hasSaleItemUpdatedAt = saleItemColumns.some(
      (col) => col.name === "updatedAt"
    );

    if (!hasSaleItemUuid) {
      console.log("Adding uuid column to sale_items table...");
      await db.runAsync("ALTER TABLE sale_items ADD COLUMN uuid TEXT");
      console.log("uuid column added successfully");
    }

    if (!hasSaleItemCreatedAt) {
      console.log("Adding createdAt column to sale_items table...");
      await db.runAsync(
        "ALTER TABLE sale_items ADD COLUMN createdAt TEXT DEFAULT CURRENT_TIMESTAMP"
      );
      console.log("createdAt column added successfully");
    }

    if (!hasSaleItemUpdatedAt) {
      console.log("Adding updatedAt column to sale_items table...");
      await db.runAsync(
        "ALTER TABLE sale_items ADD COLUMN updatedAt TEXT DEFAULT CURRENT_TIMESTAMP"
      );
      console.log("updatedAt column added successfully");
    }
    if (!hasSaleItemPriceUSD) {
      console.log("Adding priceUSD column to sale_items table...");
      await db.runAsync(
        "ALTER TABLE sale_items ADD COLUMN priceUSD REAL DEFAULT 0"
      );
      console.log("priceUSD column added successfully");
    }

    // Backfill UUIDs en sale_items
    await db.runAsync(
      "UPDATE sale_items SET uuid = lower(hex(randomblob(16))) WHERE uuid IS NULL OR TRIM(uuid) = '';"
    );

    await db.runAsync(
      "UPDATE sale_items SET createdAt = COALESCE(NULLIF(createdAt, ''), datetime('now')) WHERE createdAt IS NULL OR TRIM(createdAt) = '';"
    );
    await db.runAsync(
      "UPDATE sale_items SET updatedAt = COALESCE(NULLIF(updatedAt, ''), createdAt) WHERE updatedAt IS NULL OR TRIM(updatedAt) = '';"
    );

    // Backfill básico para ventas existentes: priceUSD = price / exchangeRate
    // (solo si priceUSD está en 0 y la venta tiene exchangeRate > 0)
    await db.runAsync(
      `UPDATE sale_items
       SET priceUSD = ROUND(
         price / (SELECT exchangeRate FROM sales WHERE sales.id = sale_items.saleId),
         6
       )
       WHERE (priceUSD IS NULL OR priceUSD = 0)
         AND COALESCE((SELECT exchangeRate FROM sales WHERE sales.id = sale_items.saleId), 0) > 0;`
    );

    // UUID + updatedAt para sales
    if (await tableExists("sales")) {
      const salesColumns = await db.getAllAsync("PRAGMA table_info(sales)");
      const hasSalesUuid = salesColumns.some((col) => col.name === "uuid");
      const hasSalesUpdatedAt = salesColumns.some(
        (col) => col.name === "updatedAt"
      );

      if (!hasSalesUuid) {
        console.log("Adding uuid column to sales table...");
        await db.runAsync("ALTER TABLE sales ADD COLUMN uuid TEXT");
        console.log("uuid column added successfully to sales");
      }

      if (!hasSalesUpdatedAt) {
        console.log("Adding updatedAt column to sales table...");
        await db.runAsync("ALTER TABLE sales ADD COLUMN updatedAt TEXT");
        console.log("updatedAt column added successfully to sales");
      }

      await db.runAsync(
        "UPDATE sales SET uuid = lower(hex(randomblob(16))) WHERE uuid IS NULL OR TRIM(uuid) = '';"
      );
      await db.runAsync(
        "UPDATE sales SET updatedAt = COALESCE(NULLIF(updatedAt, ''), createdAt) WHERE updatedAt IS NULL OR TRIM(updatedAt) = '';"
      );

      await db.execAsync(
        "CREATE INDEX IF NOT EXISTS idx_sales_uuid ON sales(uuid);"
      );
    }

    // UUID para products/customers (tienen updatedAt ya)
    if (await tableExists("products")) {
      const productColumns = await db.getAllAsync(
        "PRAGMA table_info(products)"
      );
      const hasProductUuid = productColumns.some((col) => col.name === "uuid");
      if (!hasProductUuid) {
        console.log("Adding uuid column to products table...");
        await db.runAsync("ALTER TABLE products ADD COLUMN uuid TEXT");
        console.log("uuid column added successfully to products");
      }
      await db.runAsync(
        "UPDATE products SET uuid = lower(hex(randomblob(16))) WHERE uuid IS NULL OR TRIM(uuid) = '';"
      );
      await db.execAsync(
        "CREATE INDEX IF NOT EXISTS idx_products_uuid ON products(uuid);"
      );
    }

    if (await tableExists("customers")) {
      const customerColumns = await db.getAllAsync(
        "PRAGMA table_info(customers)"
      );
      const hasCustomerUuid = customerColumns.some(
        (col) => col.name === "uuid"
      );
      if (!hasCustomerUuid) {
        console.log("Adding uuid column to customers table...");
        await db.runAsync("ALTER TABLE customers ADD COLUMN uuid TEXT");
        console.log("uuid column added successfully to customers");
      }
      await db.runAsync(
        "UPDATE customers SET uuid = lower(hex(randomblob(16))) WHERE uuid IS NULL OR TRIM(uuid) = '';"
      );
      await db.execAsync(
        "CREATE INDEX IF NOT EXISTS idx_customers_uuid ON customers(uuid);"
      );
    }

    // Verificar y agregar columna documentNumber a accounts_receivable
    const receivableColumns = await db.getAllAsync(
      "PRAGMA table_info(accounts_receivable)"
    );
    const hasDocumentNumber = receivableColumns.some(
      (col) => col.name === "documentNumber"
    );
    const hasInvoiceNumber = receivableColumns.some(
      (col) => col.name === "invoiceNumber"
    );

    const hasPaidAtReceivable = receivableColumns.some(
      (col) => col.name === "paidAt"
    );
    const hasBaseCurrency = receivableColumns.some(
      (col) => col.name === "baseCurrency"
    );

    const hasBaseAmountUSD = receivableColumns.some(
      (col) => col.name === "baseAmountUSD"
    );
    const hasExchangeRateAtCreation = receivableColumns.some(
      (col) => col.name === "exchangeRateAtCreation"
    );

    if (!hasDocumentNumber) {
      console.log(
        "Adding documentNumber column to accounts_receivable table..."
      );
      await db.runAsync(
        "ALTER TABLE accounts_receivable ADD COLUMN documentNumber TEXT"
      );
      console.log("documentNumber column added successfully");
    } else {
      // documentNumber column already exists
    }

    if (!hasInvoiceNumber) {
      console.log(
        "Adding invoiceNumber column to accounts_receivable table..."
      );
      await db.runAsync(
        "ALTER TABLE accounts_receivable ADD COLUMN invoiceNumber TEXT"
      );
      console.log("invoiceNumber column added successfully");
    } else {
      // invoiceNumber column already exists
    }

    // Verificar y agregar columna paidAmount a accounts_receivable
    const hasPaidAmount = receivableColumns.some(
      (col) => col.name === "paidAmount"
    );
    if (!hasPaidAmount) {
      console.log("Adding paidAmount column to accounts_receivable table...");
      await db.runAsync(
        "ALTER TABLE accounts_receivable ADD COLUMN paidAmount REAL DEFAULT 0"
      );
      console.log("paidAmount column added successfully");
    } else {
      // paidAmount column already exists
    }

    if (!hasPaidAtReceivable) {
      console.log("Adding paidAt column to accounts_receivable table...");
      await db.runAsync(
        "ALTER TABLE accounts_receivable ADD COLUMN paidAt TEXT"
      );
      console.log("paidAt column added successfully");
    } else {
      // paidAt column already exists
    }

    if (!hasBaseCurrency) {
      console.log("Adding baseCurrency column to accounts_receivable table...");
      await db.runAsync(
        "ALTER TABLE accounts_receivable ADD COLUMN baseCurrency TEXT DEFAULT 'VES'"
      );
      console.log("baseCurrency column added successfully");
    } else {
      // baseCurrency column already exists
    }

    if (!hasBaseAmountUSD) {
      console.log(
        "Adding baseAmountUSD column to accounts_receivable table..."
      );
      await db.runAsync(
        "ALTER TABLE accounts_receivable ADD COLUMN baseAmountUSD REAL DEFAULT 0"
      );
      console.log("baseAmountUSD column added successfully");
    } else {
      // baseAmountUSD column already exists
    }

    if (!hasExchangeRateAtCreation) {
      console.log(
        "Adding exchangeRateAtCreation column to accounts_receivable table..."
      );
      await db.runAsync(
        "ALTER TABLE accounts_receivable ADD COLUMN exchangeRateAtCreation REAL DEFAULT 0"
      );
      console.log("exchangeRateAtCreation column added successfully");
    } else {
      // exchangeRateAtCreation column already exists
    }

    // Normalizar baseCurrency
    await db.runAsync(
      `UPDATE accounts_receivable
       SET baseCurrency = 'USD'
       WHERE (invoiceNumber IS NOT NULL AND TRIM(invoiceNumber) != '')
         AND COALESCE(baseAmountUSD, 0) > 0;`
    );

    await db.runAsync(
      `UPDATE accounts_receivable
       SET baseCurrency = COALESCE(NULLIF(baseCurrency, ''), 'VES')
       WHERE baseCurrency IS NULL OR TRIM(baseCurrency) = '';`
    );

    // Corregir status para cuentas ya saldadas (evita que "desaparezcan" al cambiar la tasa)
    await db.runAsync(
      `UPDATE accounts_receivable
       SET status = 'paid', paidAt = COALESCE(paidAt, datetime('now')), updatedAt = datetime('now')
       WHERE status != 'paid'
         AND (COALESCE(paidAmount, 0) + 0.01) >= COALESCE(amount, 0);`
    );

    // Backfill baseAmountUSD para cuentas por cobrar originadas en ventas (invoiceNumber)
    // baseAmountUSD = SUM(sale_items.quantity * sale_items.priceUSD)
    await db.runAsync(
      `UPDATE accounts_receivable
       SET baseAmountUSD = COALESCE(
         (SELECT ROUND(SUM(si.quantity * COALESCE(si.priceUSD, 0)), 6)
          FROM sale_items si
          WHERE CAST(si.saleId AS TEXT) = CAST(accounts_receivable.invoiceNumber AS TEXT)),
         COALESCE(baseAmountUSD, 0)
       )
       WHERE (invoiceNumber IS NOT NULL AND TRIM(invoiceNumber) != '')
         AND (baseAmountUSD IS NULL OR baseAmountUSD = 0);`
    );

    // Verificar y agregar columnas faltantes a accounts_payable
    const payableColumns = await db.getAllAsync(
      "PRAGMA table_info(accounts_payable)"
    );

    const hasPayableSupplierId = payableColumns.some(
      (col) => col.name === "supplierId"
    );
    const hasPayableDocumentNumber = payableColumns.some(
      (col) => col.name === "documentNumber"
    );
    const hasPayableInvoiceNumber = payableColumns.some(
      (col) => col.name === "invoiceNumber"
    );

    const hasPayablePaidAmount = payableColumns.some(
      (col) => col.name === "paidAmount"
    );
    const hasPayablePaidAt = payableColumns.some(
      (col) => col.name === "paidAt"
    );

    if (!hasPayablePaidAmount) {
      console.log("Adding paidAmount column to accounts_payable table...");
      await db.runAsync(
        "ALTER TABLE accounts_payable ADD COLUMN paidAmount REAL DEFAULT 0"
      );
      console.log("paidAmount column added successfully to accounts_payable");
    }

    if (!hasPayablePaidAt) {
      console.log("Adding paidAt column to accounts_payable table...");
      await db.runAsync("ALTER TABLE accounts_payable ADD COLUMN paidAt TEXT");
      console.log("paidAt column added successfully to accounts_payable");
    }

    if (!hasPayableSupplierId) {
      console.log("Adding supplierId column to accounts_payable table...");
      await db.runAsync(
        "ALTER TABLE accounts_payable ADD COLUMN supplierId INTEGER REFERENCES suppliers (id)"
      );
      console.log("supplierId column added successfully to accounts_payable");
    } else {
      // supplierId column already exists in accounts_payable
    }

    if (!hasPayableDocumentNumber) {
      console.log("Adding documentNumber column to accounts_payable table...");
      await db.runAsync(
        "ALTER TABLE accounts_payable ADD COLUMN documentNumber TEXT"
      );
      console.log(
        "documentNumber column added successfully to accounts_payable"
      );
    } else {
      // documentNumber column already exists in accounts_payable
    }

    if (!hasPayableInvoiceNumber) {
      console.log("Adding invoiceNumber column to accounts_payable table...");
      await db.runAsync(
        "ALTER TABLE accounts_payable ADD COLUMN invoiceNumber TEXT"
      );
      console.log(
        "invoiceNumber column added successfully to accounts_payable"
      );
    } else {
      // invoiceNumber column already exists in accounts_payable
    }

    // Check for currency columns in accounts_payable
    const hasPayableBaseCurrency = payableColumns.some(
      (col) => col.name === "baseCurrency"
    );
    const hasPayableBaseAmountUSD = payableColumns.some(
      (col) => col.name === "baseAmountUSD"
    );
    const hasPayableExchangeRateAtCreation = payableColumns.some(
      (col) => col.name === "exchangeRateAtCreation"
    );

    if (!hasPayableBaseCurrency) {
      console.log("Adding baseCurrency column to accounts_payable table...");
      await db.runAsync(
        "ALTER TABLE accounts_payable ADD COLUMN baseCurrency TEXT DEFAULT 'VES'"
      );
      console.log("baseCurrency column added successfully to accounts_payable");
    }

    if (!hasPayableBaseAmountUSD) {
      console.log("Adding baseAmountUSD column to accounts_payable table...");
      await db.runAsync(
        "ALTER TABLE accounts_payable ADD COLUMN baseAmountUSD REAL"
      );
      console.log(
        "baseAmountUSD column added successfully to accounts_payable"
      );
    }

    if (!hasPayableExchangeRateAtCreation) {
      console.log(
        "Adding exchangeRateAtCreation column to accounts_payable table..."
      );
      await db.runAsync(
        "ALTER TABLE accounts_payable ADD COLUMN exchangeRateAtCreation REAL"
      );
      console.log(
        "exchangeRateAtCreation column added successfully to accounts_payable"
      );
    }

    console.log("Database migrations completed");
  } catch (error) {
    console.error("Error running migrations:", error);
    throw error;
  }
};

export default db;
