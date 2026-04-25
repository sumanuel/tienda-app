import * as SQLite from "expo-sqlite";

const LEGACY_DB_NAME = "tienda.db";
const TABLE_MIGRATION_ORDER = [
  "products",
  "inventory_movements",
  "sales",
  "sale_items",
  "customers",
  "suppliers",
  "accounts_receivable",
  "accounts_payable",
  "account_payments",
  "exchange_rates",
  "settings",
  "mobile_payments",
  "rate_notifications",
];

let currentDbName = LEGACY_DB_NAME;
let currentDbPromise = null;
const initializedDatabases = new Set();

const openDatabase = async (name) => SQLite.openDatabaseAsync(name);

const isRecoverableDatabaseError = (error) => {
  const message = String(error?.message || "");
  return (
    message.includes("NativeDatabase.prepareAsync") ||
    message.includes("NativeDatabase.execAsync") ||
    message.includes("NativeDatabase.runAsync") ||
    message.includes("java.lang.NullPointerException")
  );
};

const ensureCurrentDb = async () => {
  if (!currentDbPromise) {
    currentDbPromise = openDatabase(currentDbName);
  }

  return await currentDbPromise;
};

const closeDatabaseQuietly = async (databasePromise) => {
  if (!databasePromise) return;

  try {
    const database = await databasePromise;
    if (database?.closeAsync) {
      await database.closeAsync();
    }
  } catch (_) {
    // noop
  }
};

const reopenCurrentDatabase = async () => {
  await closeDatabaseQuietly(currentDbPromise);
  currentDbPromise = openDatabase(currentDbName);
  return await currentDbPromise;
};

const callDatabaseMethod = async (property, args) => {
  const invoke = async () => {
    const database = await ensureCurrentDb();
    const value = database[property];

    if (typeof value !== "function") {
      return value;
    }

    return await value.apply(database, args);
  };

  const retryInvoke = async () => {
    console.warn(
      `SQLite handle recovery triggered for ${String(property)} on ${currentDbName}.`,
    );
    await reopenCurrentDatabase();
    return await invoke();
  };

  try {
    return await invoke();
  } catch (error) {
    if (!isRecoverableDatabaseError(error)) {
      throw error;
    }

    return await retryInvoke();
  }
};

const sanitizeDatabaseSegment = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "default";

const buildStoreDatabaseName = ({ userId, storeId }) => {
  const normalizedUserId = String(userId || "").trim();
  const normalizedStoreId = String(storeId || "").trim();

  if (!normalizedUserId || !normalizedStoreId) {
    return LEGACY_DB_NAME;
  }

  return `tienda-${sanitizeDatabaseSegment(normalizedUserId)}-${sanitizeDatabaseSegment(normalizedStoreId)}.db`;
};

const getNonEmptyUserTables = async (database) => {
  const rows = await database.getAllAsync(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;",
  );

  const nonEmptyTables = [];
  for (const row of rows) {
    const tableName = row?.name;
    if (!tableName) continue;

    try {
      const countRow = await database.getFirstAsync(
        `SELECT COUNT(*) AS total FROM ${tableName};`,
      );
      if (Number(countRow?.total) > 0) {
        nonEmptyTables.push(tableName);
      }
    } catch (_) {
      // Ignorar tablas que no se puedan contar por compatibilidad.
    }
  }

  return nonEmptyTables;
};

const getTableRowCount = async (database, tableName) => {
  try {
    const countRow = await database.getFirstAsync(
      `SELECT COUNT(*) AS total FROM ${tableName};`,
    );
    return Number(countRow?.total) || 0;
  } catch (_) {
    return 0;
  }
};

const targetHasOnlyGenericCustomer = async (database) => {
  try {
    const countRow = await database.getFirstAsync(
      "SELECT COUNT(*) AS total FROM customers;",
    );

    if ((Number(countRow?.total) || 0) !== 1) {
      return false;
    }

    const genericRow = await database.getFirstAsync(
      "SELECT id FROM customers WHERE active = 1 AND TRIM(COALESCE(documentNumber, '')) = '1' LIMIT 1;",
    );

    return Boolean(genericRow?.id);
  } catch (_) {
    return false;
  }
};

const copyLegacyRowsToCurrentDatabase = async (
  sourceDb,
  targetDb,
  tableName,
) => {
  const rows = await sourceDb.getAllAsync(`SELECT * FROM ${tableName};`);
  if (!rows.length) return;

  const columns = await targetDb.getAllAsync(
    `PRAGMA table_info(${tableName});`,
  );
  const validColumns = new Set((columns || []).map((column) => column?.name));

  for (const row of rows) {
    const rowEntries = Object.entries(row || {}).filter(([columnName]) =>
      validColumns.has(columnName),
    );

    if (!rowEntries.length) continue;

    const columnNames = rowEntries.map(([columnName]) => columnName);
    const placeholders = columnNames.map(() => "?").join(", ");
    const values = rowEntries.map(([, value]) => value);

    await targetDb.runAsync(
      `INSERT OR REPLACE INTO ${tableName} (${columnNames.join(", ")}) VALUES (${placeholders});`,
      values,
    );
  }
};

/**
 * Instancia única de la base de datos
 * Todos los servicios deben importar esta instancia
 * para evitar múltiples conexiones y bloqueos
 */
export const db = new Proxy(
  {},
  {
    get(_, property) {
      if (typeof property !== "string") {
        return undefined;
      }

      return (...args) => callDatabaseMethod(property, args);
    },
  },
);

export const getCurrentDatabaseName = () => currentDbName;

export const configureStoreDatabase = async ({ userId, storeId } = {}) => {
  const nextDbName = buildStoreDatabaseName({ userId, storeId });
  const hasChanged = nextDbName !== currentDbName;

  if (hasChanged) {
    await closeDatabaseQuietly(currentDbPromise);
    currentDbName = nextDbName;
    currentDbPromise = openDatabase(nextDbName);
  }

  return {
    changed: hasChanged,
    dbName: currentDbName,
  };
};

export const resetDatabaseContext = async () => {
  await closeDatabaseQuietly(currentDbPromise);
  currentDbName = LEGACY_DB_NAME;
  currentDbPromise = openDatabase(LEGACY_DB_NAME);
  return { dbName: currentDbName };
};

export const migrateLegacyDatabaseToCurrentStoreIfNeeded = async () => {
  if (currentDbName === LEGACY_DB_NAME) {
    return { migrated: false, reason: "legacy-active" };
  }

  const sourceDb = await openDatabase(LEGACY_DB_NAME);
  const sourceTables = await getNonEmptyUserTables(sourceDb);

  if (!sourceTables.length) {
    return { migrated: false, reason: "legacy-empty" };
  }

  const tableOrder = [
    ...TABLE_MIGRATION_ORDER.filter((tableName) =>
      sourceTables.includes(tableName),
    ),
    ...sourceTables.filter(
      (tableName) => !TABLE_MIGRATION_ORDER.includes(tableName),
    ),
  ];

  const targetDb = await ensureCurrentDb();
  const migratedTables = [];
  const skippedTables = [];

  await targetDb.execAsync("PRAGMA foreign_keys = OFF;");
  try {
    for (const tableName of tableOrder) {
      const [sourceCount, targetCount] = await Promise.all([
        getTableRowCount(sourceDb, tableName),
        getTableRowCount(targetDb, tableName),
      ]);

      if (sourceCount <= 0) {
        skippedTables.push({ tableName, reason: "source-empty" });
        continue;
      }

      if (targetCount > 0) {
        if (
          tableName === "customers" &&
          (await targetHasOnlyGenericCustomer(targetDb))
        ) {
          await copyLegacyRowsToCurrentDatabase(sourceDb, targetDb, tableName);
          migratedTables.push({ tableName, rows: sourceCount });
          continue;
        }

        skippedTables.push({ tableName, reason: "target-has-data" });
        continue;
      }

      await copyLegacyRowsToCurrentDatabase(sourceDb, targetDb, tableName);
      migratedTables.push({ tableName, rows: sourceCount });
    }
  } finally {
    await targetDb.execAsync("PRAGMA foreign_keys = ON;");
  }

  initializedDatabases.delete(currentDbName);
  if (!migratedTables.length) {
    return {
      migrated: false,
      reason: skippedTables.length ? "target-has-data" : "no-tables-copied",
      skippedTables,
    };
  }

  return {
    migrated: true,
    tables: migratedTables.length,
    migratedTables,
    skippedTables,
  };
};

const LOCAL_CONSECUTIVE_COLUMNS = [
  {
    tableName: "products",
    columnName: "productNumber",
    prefix: "PRD",
    digits: 6,
  },
  {
    tableName: "inventory_movements",
    columnName: "movementNumber",
    prefix: "MOV",
    digits: 6,
  },
  {
    tableName: "sales",
    columnName: "saleNumber",
    prefix: "VTA",
    digits: 6,
  },
  {
    tableName: "customers",
    columnName: "customerNumber",
    prefix: "CLI",
    digits: 6,
  },
  {
    tableName: "suppliers",
    columnName: "supplierNumber",
    prefix: "PRV",
    digits: 6,
  },
  {
    tableName: "accounts_receivable",
    columnName: "receivableNumber",
    prefix: "CXC",
    digits: 6,
  },
  {
    tableName: "accounts_payable",
    columnName: "payableNumber",
    prefix: "CXP",
    digits: 6,
  },
];

const buildLocalConsecutiveValue = (prefix, digits) => {
  return `'${prefix}-' || printf('%0${digits}d', id)`;
};

const ensureLocalConsecutiveColumn = async ({
  tableName,
  columnName,
  prefix,
  digits,
}) => {
  const table = await db.getFirstAsync(
    "SELECT name FROM sqlite_master WHERE type='table' AND name = ?;",
    [tableName],
  );

  if (!table?.name) {
    return;
  }

  const columns = await db.getAllAsync(`PRAGMA table_info(${tableName});`);
  const hasColumn = (columns || []).some(
    (column) => column?.name === columnName,
  );

  if (!hasColumn) {
    await db.execAsync(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} TEXT;`,
    );
  }

  await db.runAsync(
    `UPDATE ${tableName}
     SET ${columnName} = ${buildLocalConsecutiveValue(prefix, digits)}
     WHERE ${columnName} IS NULL OR TRIM(${columnName}) = '';`,
  );
};

/**
 * Inicializa todas las tablas de la base de datos
 * Ejecuta todas las creaciones de tablas en una sola transacción
 * para evitar bloqueos
 */
export const initAllTables = async () => {
  try {
    if (initializedDatabases.has(currentDbName)) {
      console.log("Tables already initialized, skipping table creation...");
      // Aún así, intentar ejecutar migraciones por si faltan columnas/tablas
      await runMigrations();
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
          productNumber TEXT,
          name TEXT NOT NULL,
          barcode TEXT UNIQUE,
          category TEXT,
          description TEXT,
          cost REAL DEFAULT 0,
          additionalCost REAL DEFAULT 0,
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

        -- Tabla de movimientos de inventario
        CREATE TABLE IF NOT EXISTS inventory_movements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          movementNumber TEXT,
          productId INTEGER NOT NULL,
          type TEXT NOT NULL,
          quantity REAL NOT NULL,
          previousStock INTEGER DEFAULT 0,
          newStock INTEGER DEFAULT 0,
          notes TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (productId) REFERENCES products(id)
        );

        -- Tabla de ventas (schema actual)
        CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          saleNumber TEXT,
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
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Tabla de items de venta
        CREATE TABLE IF NOT EXISTS sale_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          saleId INTEGER NOT NULL,
          productId INTEGER NOT NULL,
          productName TEXT NOT NULL,
          quantity REAL NOT NULL,
          price REAL NOT NULL,
          priceUSD REAL DEFAULT 0,
          subtotal REAL NOT NULL,
          FOREIGN KEY (saleId) REFERENCES sales(id)
        );

        -- Tabla de clientes
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customerNumber TEXT,
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
          supplierNumber TEXT,
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
          receivableNumber TEXT,
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
          payableNumber TEXT,
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

        -- Tabla de pagos móviles
        CREATE TABLE IF NOT EXISTS mobile_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reference TEXT NOT NULL,
          customerName TEXT NOT NULL,
          amount REAL NOT NULL,
          verified INTEGER DEFAULT 0,
          verifiedAt TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Tabla de notificaciones (ej. consulta diaria de tasa)
        CREATE TABLE IF NOT EXISTS rate_notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          message TEXT NOT NULL,
          rate REAL,
          source TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
    });

    // Crear índices fuera de la transacción principal
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_barcode ON products(barcode);
      CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_date ON inventory_movements(productId, createdAt);
      CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(createdAt);
      CREATE INDEX IF NOT EXISTS idx_customer_name ON customers(name);
      CREATE INDEX IF NOT EXISTS idx_supplier_name ON suppliers(name);
      -- Evita duplicados de proveedores por documento (normalizado) entre activos
      CREATE UNIQUE INDEX IF NOT EXISTS ux_suppliers_document_normalized_active
        ON suppliers(UPPER(TRIM(documentNumber)))
        WHERE active = 1 AND TRIM(documentNumber) != '';
      CREATE INDEX IF NOT EXISTS idx_accounts_receivable_status ON accounts_receivable(status, dueDate);
      CREATE INDEX IF NOT EXISTS idx_accounts_payable_status ON accounts_payable(status, dueDate);
      CREATE INDEX IF NOT EXISTS idx_active_rate ON exchange_rates(isActive, createdAt);
      CREATE INDEX IF NOT EXISTS idx_mobile_payments_verified_createdAt ON mobile_payments(verified, createdAt);
      CREATE INDEX IF NOT EXISTS idx_rate_notifications_createdAt ON rate_notifications(createdAt);
    `);

    // Crear cliente genérico si no existe
    await ensureGenericCustomer();

    // Ejecutar migraciones DESPUÉS de que exista el schema base
    await runMigrations();

    initializedDatabases.add(currentDbName);
    console.log("All tables created successfully");
  } catch (error) {
    console.error("Error creating tables:", error);
    throw error;
  }
};

/**
 * Evita ciclos (db.js <-> customers.js) creando el cliente genérico directamente aquí.
 */
const ensureGenericCustomer = async () => {
  try {
    const existing = await db.getFirstAsync(
      "SELECT id FROM customers WHERE documentNumber = ? AND active = 1 LIMIT 1;",
      ["1"],
    );

    if (existing?.id) {
      return existing.id;
    }

    const result = await db.runAsync(
      `INSERT INTO customers (name, documentNumber, documentType)
       VALUES (?, ?, ?);`,
      ["Cliente Genérico", "1", "V"],
    );
    return result.lastInsertRowId;
  } catch (error) {
    // No bloquear inicialización completa si falla esto
    console.warn("Error ensuring generic customer:", error);
    return null;
  }
};

/**
 * Ejecuta migraciones de base de datos
 * Agrega columnas faltantes a tablas existentes
 */
const runMigrations = async () => {
  try {
    console.log("Running database migrations...");

    // Asegurar columna additionalCost en products (costo adicional opcional)
    try {
      const productsTable = await db.getFirstAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='products';",
      );

      if (productsTable?.name) {
        const columns = await db.getAllAsync("PRAGMA table_info(products);");
        const hasAdditionalCost = (columns || []).some(
          (c) => c?.name === "additionalCost",
        );

        if (!hasAdditionalCost) {
          await db.execAsync(
            "ALTER TABLE products ADD COLUMN additionalCost REAL DEFAULT 0;",
          );
        }
      }
    } catch (productsMigrationError) {
      // No bloquear el arranque completo por fallos de migración heredados
      console.warn(
        "Warning running products additionalCost migration:",
        productsMigrationError,
      );
    }

    for (const definition of LOCAL_CONSECUTIVE_COLUMNS) {
      try {
        await ensureLocalConsecutiveColumn(definition);
      } catch (consecutiveMigrationError) {
        console.warn(
          `Warning running consecutive migration for ${definition.tableName}.${definition.columnName}:`,
          consecutiveMigrationError,
        );
      }
    }

    // Asegurar tabla de notificaciones
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS rate_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        rate REAL,
        source TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );`,
    );
    await db.execAsync(
      "CREATE INDEX IF NOT EXISTS idx_rate_notifications_createdAt ON rate_notifications(createdAt);",
    );

    // Limpieza + constraint de unicidad para proveedores (por documento normalizado)
    try {
      const suppliersTable = await db.getFirstAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='suppliers';",
      );

      if (suppliersTable?.name) {
        // Normalizar espacios
        await db.runAsync(
          "UPDATE suppliers SET documentNumber = TRIM(documentNumber) WHERE documentNumber IS NOT NULL;",
        );

        // Encontrar duplicados entre activos usando normalización case-insensitive + trim
        const duplicateGroups = await db.getAllAsync(
          `SELECT UPPER(TRIM(documentNumber)) AS norm, COUNT(*) AS cnt
           FROM suppliers
           WHERE active = 1 AND TRIM(COALESCE(documentNumber, '')) != ''
           GROUP BY norm
           HAVING cnt > 1;`,
        );

        for (const group of duplicateGroups) {
          const norm = group?.norm;
          if (!norm) continue;

          const ids = await db.getAllAsync(
            `SELECT id
             FROM suppliers
             WHERE active = 1 AND UPPER(TRIM(documentNumber)) = ?
             ORDER BY id DESC;`,
            [norm],
          );

          if (!ids || ids.length <= 1) continue;

          const keepId = ids[0].id;
          const removeIds = ids.slice(1).map((r) => r.id);

          const keepSupplier = await db.getFirstAsync(
            "SELECT id, name FROM suppliers WHERE id = ? LIMIT 1;",
            [keepId],
          );

          await db.withTransactionAsync(async () => {
            // Transferir cuentas por pagar hacia el proveedor que se conservará
            if (removeIds.length > 0) {
              const placeholders = removeIds.map(() => "?").join(",");
              await db.runAsync(
                `UPDATE accounts_payable
                 SET supplierId = ?,
                     supplierName = COALESCE(?, supplierName),
                     updatedAt = datetime('now')
                 WHERE supplierId IN (${placeholders});`,
                [keepId, keepSupplier?.name || null, ...removeIds],
              );

              // Desactivar duplicados
              await db.runAsync(
                `UPDATE suppliers
                 SET active = 0,
                     updatedAt = datetime('now')
                 WHERE id IN (${placeholders});`,
                removeIds,
              );
            }
          });
        }

        // Crear índice UNIQUE parcial por documento normalizado
        await db.execAsync(
          `CREATE UNIQUE INDEX IF NOT EXISTS ux_suppliers_document_normalized_active
             ON suppliers(UPPER(TRIM(documentNumber)))
             WHERE active = 1 AND TRIM(documentNumber) != '';`,
        );
      }
    } catch (suppliersMigrationError) {
      // No bloquear el arranque completo si falla por datos heredados.
      console.warn(
        "Warning running suppliers unique-index migration:",
        suppliersMigrationError,
      );
    }

    // Si por alguna razón no existe sales aún, evitar queries que dependan de esa tabla.
    const salesTable = await db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='sales';",
    );

    // Asegurar tabla sale_items y columna priceUSD
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        saleId INTEGER NOT NULL,
        productId INTEGER NOT NULL,
        productName TEXT NOT NULL,
        quantity REAL NOT NULL,
        price REAL NOT NULL,
        priceUSD REAL DEFAULT 0,
        subtotal REAL NOT NULL,
        FOREIGN KEY (saleId) REFERENCES sales(id)
      );`,
    );

    // Asegurar tabla mobile_payments (Pago movil)
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS mobile_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference TEXT NOT NULL,
        customerName TEXT NOT NULL,
        amount REAL NOT NULL,
        verified INTEGER DEFAULT 0,
        verifiedAt TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );`,
    );

    await db.execAsync(
      "CREATE INDEX IF NOT EXISTS idx_mobile_payments_verified_createdAt ON mobile_payments(verified, createdAt);",
    );

    const saleItemColumns = await db.getAllAsync(
      "PRAGMA table_info(sale_items)",
    );
    const hasSaleItemPriceUSD = saleItemColumns.some(
      (col) => col.name === "priceUSD",
    );
    if (!hasSaleItemPriceUSD) {
      console.log("Adding priceUSD column to sale_items table...");
      await db.runAsync(
        "ALTER TABLE sale_items ADD COLUMN priceUSD REAL DEFAULT 0",
      );
      console.log("priceUSD column added successfully");
    }

    // Backfill básico para ventas existentes: priceUSD = price / exchangeRate
    // (solo si priceUSD está en 0 y la venta tiene exchangeRate > 0)
    if (salesTable?.name) {
      await db.runAsync(
        `UPDATE sale_items
         SET priceUSD = ROUND(
           price / (SELECT exchangeRate FROM sales WHERE sales.id = sale_items.saleId),
           6
         )
         WHERE (priceUSD IS NULL OR priceUSD = 0)
           AND COALESCE((SELECT exchangeRate FROM sales WHERE sales.id = sale_items.saleId), 0) > 0;`,
      );
    } else {
      console.log("Skipping sale_items priceUSD backfill: sales table missing");
    }

    // Verificar y agregar columna documentNumber a accounts_receivable
    const receivableColumns = await db.getAllAsync(
      "PRAGMA table_info(accounts_receivable)",
    );
    const hasDocumentNumber = receivableColumns.some(
      (col) => col.name === "documentNumber",
    );
    const hasInvoiceNumber = receivableColumns.some(
      (col) => col.name === "invoiceNumber",
    );

    const hasPaidAtReceivable = receivableColumns.some(
      (col) => col.name === "paidAt",
    );
    const hasBaseCurrency = receivableColumns.some(
      (col) => col.name === "baseCurrency",
    );

    const hasBaseAmountUSD = receivableColumns.some(
      (col) => col.name === "baseAmountUSD",
    );
    const hasExchangeRateAtCreation = receivableColumns.some(
      (col) => col.name === "exchangeRateAtCreation",
    );

    if (!hasDocumentNumber) {
      console.log(
        "Adding documentNumber column to accounts_receivable table...",
      );
      await db.runAsync(
        "ALTER TABLE accounts_receivable ADD COLUMN documentNumber TEXT",
      );
      console.log("documentNumber column added successfully");
    } else {
      // documentNumber column already exists
    }

    if (!hasInvoiceNumber) {
      console.log(
        "Adding invoiceNumber column to accounts_receivable table...",
      );
      await db.runAsync(
        "ALTER TABLE accounts_receivable ADD COLUMN invoiceNumber TEXT",
      );
      console.log("invoiceNumber column added successfully");
    } else {
      // invoiceNumber column already exists
    }

    // Verificar y agregar columna paidAmount a accounts_receivable
    const hasPaidAmount = receivableColumns.some(
      (col) => col.name === "paidAmount",
    );
    if (!hasPaidAmount) {
      console.log("Adding paidAmount column to accounts_receivable table...");
      await db.runAsync(
        "ALTER TABLE accounts_receivable ADD COLUMN paidAmount REAL DEFAULT 0",
      );
      console.log("paidAmount column added successfully");
    } else {
      // paidAmount column already exists
    }

    if (!hasPaidAtReceivable) {
      console.log("Adding paidAt column to accounts_receivable table...");
      await db.runAsync(
        "ALTER TABLE accounts_receivable ADD COLUMN paidAt TEXT",
      );
      console.log("paidAt column added successfully");
    } else {
      // paidAt column already exists
    }

    if (!hasBaseCurrency) {
      console.log("Adding baseCurrency column to accounts_receivable table...");
      await db.runAsync(
        "ALTER TABLE accounts_receivable ADD COLUMN baseCurrency TEXT DEFAULT 'VES'",
      );
      console.log("baseCurrency column added successfully");
    } else {
      // baseCurrency column already exists
    }

    if (!hasBaseAmountUSD) {
      console.log(
        "Adding baseAmountUSD column to accounts_receivable table...",
      );
      await db.runAsync(
        "ALTER TABLE accounts_receivable ADD COLUMN baseAmountUSD REAL DEFAULT 0",
      );
      console.log("baseAmountUSD column added successfully");
    } else {
      // baseAmountUSD column already exists
    }

    if (!hasExchangeRateAtCreation) {
      console.log(
        "Adding exchangeRateAtCreation column to accounts_receivable table...",
      );
      await db.runAsync(
        "ALTER TABLE accounts_receivable ADD COLUMN exchangeRateAtCreation REAL DEFAULT 0",
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
         AND COALESCE(baseAmountUSD, 0) > 0;`,
    );

    await db.runAsync(
      `UPDATE accounts_receivable
       SET baseCurrency = COALESCE(NULLIF(baseCurrency, ''), 'VES')
       WHERE baseCurrency IS NULL OR TRIM(baseCurrency) = '';`,
    );

    // Corregir status para cuentas ya saldadas (evita que "desaparezcan" al cambiar la tasa)
    await db.runAsync(
      `UPDATE accounts_receivable
       SET status = 'paid', paidAt = COALESCE(paidAt, datetime('now')), updatedAt = datetime('now')
       WHERE status != 'paid'
         AND (COALESCE(paidAmount, 0) + 0.01) >= COALESCE(amount, 0);`,
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
         AND (baseAmountUSD IS NULL OR baseAmountUSD = 0);`,
    );

    // Backfill customerId en cuentas por cobrar originadas en ventas (invoiceNumber = saleId)
    // Esto permite obtener el teléfono del cliente vía JOIN y enviar WhatsApp.
    await db.runAsync(
      `UPDATE accounts_receivable
       SET customerId = (
         SELECT s.customerId
         FROM sales s
         WHERE CAST(s.id AS TEXT) = CAST(accounts_receivable.invoiceNumber AS TEXT)
         LIMIT 1
       )
       WHERE (customerId IS NULL OR customerId = 0)
         AND (invoiceNumber IS NOT NULL AND TRIM(invoiceNumber) != '')
         AND EXISTS (
           SELECT 1
           FROM sales s
           WHERE CAST(s.id AS TEXT) = CAST(accounts_receivable.invoiceNumber AS TEXT)
             AND s.customerId IS NOT NULL
             AND s.customerId != 0
         );`,
    );

    // Verificar y agregar columnas faltantes a accounts_payable
    const payableColumns = await db.getAllAsync(
      "PRAGMA table_info(accounts_payable)",
    );

    const hasPayableSupplierId = payableColumns.some(
      (col) => col.name === "supplierId",
    );
    const hasPayableDocumentNumber = payableColumns.some(
      (col) => col.name === "documentNumber",
    );
    const hasPayableInvoiceNumber = payableColumns.some(
      (col) => col.name === "invoiceNumber",
    );

    const hasPayablePaidAmount = payableColumns.some(
      (col) => col.name === "paidAmount",
    );
    const hasPayablePaidAt = payableColumns.some(
      (col) => col.name === "paidAt",
    );

    if (!hasPayablePaidAmount) {
      console.log("Adding paidAmount column to accounts_payable table...");
      await db.runAsync(
        "ALTER TABLE accounts_payable ADD COLUMN paidAmount REAL DEFAULT 0",
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
        "ALTER TABLE accounts_payable ADD COLUMN supplierId INTEGER REFERENCES suppliers (id)",
      );
      console.log("supplierId column added successfully to accounts_payable");
    } else {
      // supplierId column already exists in accounts_payable
    }

    if (!hasPayableDocumentNumber) {
      console.log("Adding documentNumber column to accounts_payable table...");
      await db.runAsync(
        "ALTER TABLE accounts_payable ADD COLUMN documentNumber TEXT",
      );
      console.log(
        "documentNumber column added successfully to accounts_payable",
      );
    } else {
      // documentNumber column already exists in accounts_payable
    }

    if (!hasPayableInvoiceNumber) {
      console.log("Adding invoiceNumber column to accounts_payable table...");
      await db.runAsync(
        "ALTER TABLE accounts_payable ADD COLUMN invoiceNumber TEXT",
      );
      console.log(
        "invoiceNumber column added successfully to accounts_payable",
      );
    } else {
      // invoiceNumber column already exists in accounts_payable
    }

    // Check for currency columns in accounts_payable
    const hasPayableBaseCurrency = payableColumns.some(
      (col) => col.name === "baseCurrency",
    );
    const hasPayableBaseAmountUSD = payableColumns.some(
      (col) => col.name === "baseAmountUSD",
    );
    const hasPayableExchangeRateAtCreation = payableColumns.some(
      (col) => col.name === "exchangeRateAtCreation",
    );

    if (!hasPayableBaseCurrency) {
      console.log("Adding baseCurrency column to accounts_payable table...");
      await db.runAsync(
        "ALTER TABLE accounts_payable ADD COLUMN baseCurrency TEXT DEFAULT 'VES'",
      );
      console.log("baseCurrency column added successfully to accounts_payable");
    }

    if (!hasPayableBaseAmountUSD) {
      console.log("Adding baseAmountUSD column to accounts_payable table...");
      await db.runAsync(
        "ALTER TABLE accounts_payable ADD COLUMN baseAmountUSD REAL",
      );
      console.log(
        "baseAmountUSD column added successfully to accounts_payable",
      );
    }

    if (!hasPayableExchangeRateAtCreation) {
      console.log(
        "Adding exchangeRateAtCreation column to accounts_payable table...",
      );
      await db.runAsync(
        "ALTER TABLE accounts_payable ADD COLUMN exchangeRateAtCreation REAL",
      );
      console.log(
        "exchangeRateAtCreation column added successfully to accounts_payable",
      );
    }

    // Crear tabla de movimientos de inventario si no existe
    const inventoryMovementsExists = await db.getAllAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='inventory_movements';",
    );

    if (inventoryMovementsExists.length === 0) {
      console.log("Creating inventory_movements table...");
      await db.execAsync(`
        CREATE TABLE inventory_movements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          movementNumber TEXT,
          productId INTEGER NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('entry', 'exit')),
          quantity INTEGER NOT NULL,
          previousStock INTEGER NOT NULL,
          newStock INTEGER NOT NULL,
          notes TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
        );
      `);

      // Crear índice para la tabla
      await db.execAsync(
        "CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(productId);",
      );

      console.log("inventory_movements table created successfully");
    } else {
      console.log("inventory_movements table already exists");
    }

    console.log("Database migrations completed");
  } catch (error) {
    console.error("Error running migrations:", error);
    throw error;
  }
};

export default db;
