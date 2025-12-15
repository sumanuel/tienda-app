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
  if (tablesInitialized) {
    console.log("Tables already initialized, skipping...");
    return;
  }

  try {
    // Activar WAL mode ANTES de la transacción
    await db.execAsync("PRAGMA journal_mode = WAL;");

    // Crear todas las tablas en una transacción
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        -- Tabla de productos
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
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

        -- Tabla de ventas
        CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          total REAL NOT NULL,
          items TEXT NOT NULL,
          paymentMethod TEXT,
          customer TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Tabla de clientes
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
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
          amount REAL NOT NULL,
          description TEXT,
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
          description TEXT,
          dueDate TEXT,
          status TEXT DEFAULT 'pending',
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (supplierId) REFERENCES suppliers (id)
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
      CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(createdAt);
      CREATE INDEX IF NOT EXISTS idx_customer_name ON customers(name);
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

export default db;
