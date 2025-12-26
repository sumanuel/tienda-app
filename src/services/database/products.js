import { db } from "./db";
import { generateUuidV4 } from "./uuid";
import { enqueueOutboxEvent } from "./outbox";

const toServerProductPayload = (row) => ({
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
  active: row.active === 1,
  createdAt: row.createdAt || null,
  updatedAt: row.updatedAt || null,
});

const getProductRowById = async (id) =>
  db.getFirstAsync("SELECT * FROM products WHERE id = ?;", [id]);

/**
 * Inicializa la base de datos y crea las tablas necesarias
 */
export const initDatabase = async () => {
  try {
    // Tabla de productos
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS products (
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
      );`
    );

    // Índice para búsqueda rápida por código de barras
    await db.execAsync(
      "CREATE INDEX IF NOT EXISTS idx_barcode ON products(barcode);"
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Verifica si la tabla products existe
 */
export const checkTableExists = async () => {
  try {
    const result = await db.getAllAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='products';"
    );
    return result.length > 0;
  } catch (error) {
    console.error("Error checking table:", error);
    return false;
  }
};

/**
 * Obtiene todos los productos activos
 */
export const getAllProducts = async () => {
  try {
    // Verificar si la tabla existe
    const tableExists = await checkTableExists();
    if (!tableExists) {
      console.log("Tabla products no existe, inicializando...");
      await initDatabase();
    }

    const result = await db.getAllAsync(
      "SELECT * FROM products WHERE active = 1 ORDER BY name;"
    );
    // console.log("Productos obtenidos de BD:", result.length);
    return result;
  } catch (error) {
    console.error("Error obteniendo productos:", error);
    throw new Error(`Error al acceder a la base de datos: ${error.message}`);
  }
};

/**
 * Busca un producto por código de barras
 */
export const getProductByBarcode = async (barcode) => {
  try {
    const result = await db.getFirstAsync(
      "SELECT * FROM products WHERE barcode = ? AND active = 1;",
      [barcode]
    );
    return result || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Busca productos por nombre o categoría
 */
export const searchProducts = async (query) => {
  try {
    const result = await db.getAllAsync(
      `SELECT * FROM products
       WHERE (name LIKE ? OR category LIKE ?) AND active = 1
       ORDER BY name;`,
      [`%${query}%`, `%${query}%`]
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Inserta un nuevo producto
 */
export const insertProduct = async (product) => {
  try {
    console.log("Insertando producto en BD:", product);
    const uuid = product.uuid || generateUuidV4();
    const nowIso = new Date().toISOString();
    const result = await db.runAsync(
      `INSERT INTO products (uuid, name, barcode, category, description, cost, priceUSD, margin, stock, minStock, image, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        uuid,
        product.name,
        product.barcode,
        product.category,
        product.description || "",
        product.cost || 0,
        product.priceUSD || 0,
        product.margin || 0,
        product.stock || 0,
        product.minStock || 0,
        product.image || "",
        1, // active
      ]
    );
    console.log("Producto insertado, lastInsertRowId:", result.lastInsertRowId);

    // Encolar evento para sync (usar UUID como id canonical)
    await enqueueOutboxEvent({
      type: "product.upserted",
      entityId: uuid,
      payload: {
        id: uuid,
        name: product.name,
        barcode: product.barcode || null,
        category: product.category || null,
        description: product.description || null,
        cost: product.cost || 0,
        priceUSD: product.priceUSD || 0,
        priceVES: product.priceVES || 0,
        margin: product.margin || 0,
        stock: product.stock || 0,
        minStock: product.minStock || 0,
        image: product.image || null,
        active: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    });

    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error insertando producto:", error);
    throw error;
  }
};

/**
 * Actualiza un producto existente
 */
export const updateProduct = async (id, product) => {
  try {
    const result = await db.runAsync(
      `UPDATE products
       SET name = ?, barcode = ?, category = ?, description = ?,
           cost = ?, priceUSD = ?, margin = ?,
           stock = ?, minStock = ?, image = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?;`,
      [
        product.name,
        product.barcode,
        product.category,
        product.description,
        product.cost,
        product.priceUSD,
        product.margin,
        product.stock,
        product.minStock,
        product.image,
        id,
      ]
    );

    const row = await getProductRowById(id);
    if (row?.uuid) {
      await enqueueOutboxEvent({
        type: "product.upserted",
        entityId: row.uuid,
        payload: toServerProductPayload(row),
      });
    }

    return result.changes;
  } catch (error) {
    throw error;
  }
};

/**
 * Actualiza el stock de un producto
 */
export const updateProductStock = async (id, newStock) => {
  try {
    const result = await db.runAsync(
      "UPDATE products SET stock = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?;",
      [newStock, id]
    );
    return result.changes;
  } catch (error) {
    throw error;
  }
};

/**
 * Elimina (desactiva) un producto
 */
export const deleteProduct = async (id) => {
  try {
    const result = await db.runAsync(
      "UPDATE products SET active = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?;",
      [id]
    );

    const row = await getProductRowById(id);
    if (row?.uuid) {
      await enqueueOutboxEvent({
        type: "product.upserted",
        entityId: row.uuid,
        payload: toServerProductPayload(row),
      });
    }

    return result.changes;
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene productos con stock bajo
 */
export const getLowStockProducts = async () => {
  try {
    const result = await db.getAllAsync(
      "SELECT * FROM products WHERE stock <= minStock AND active = 1 ORDER BY stock;"
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Inicializa productos de ejemplo
 */
export const initSampleProducts = async () => {
  try {
    // Verificar si ya hay productos
    const existingProducts = await db.getAllAsync(
      "SELECT COUNT(*) as count FROM products;"
    );
    if (existingProducts[0].count > 0) {
      console.log("Productos ya existen, saltando inicialización");
      return;
    }

    console.log("Inicializando productos de ejemplo...");

    const sampleProducts = [
      {
        name: "Leche Entera 1L",
        priceUSD: 2.5,
        category: "Lácteos",
        stock: 50,
      },
      { name: "Pan Francés", priceUSD: 1.2, category: "Panadería", stock: 30 },
      { name: "Arroz 1Kg", priceUSD: 1.8, category: "Granos", stock: 40 },
      {
        name: "Aceite de Oliva 500ml",
        priceUSD: 4.5,
        category: "Aceites",
        stock: 25,
      },
      { name: "Huevos Docena", priceUSD: 3.0, category: "Huevos", stock: 20 },
      {
        name: "Queso Cheddar 200g",
        priceUSD: 5.2,
        category: "Lácteos",
        stock: 15,
      },
      { name: "Manzanas 1Kg", priceUSD: 2.8, category: "Frutas", stock: 35 },
      {
        name: "Pollo Entero 1Kg",
        priceUSD: 6.5,
        category: "Carnes",
        stock: 12,
      },
      { name: "Pasta 500g", priceUSD: 1.5, category: "Pastas", stock: 28 },
      { name: "Café Molido 250g", priceUSD: 4.0, category: "Café", stock: 18 },
      { name: "Azúcar 1Kg", priceUSD: 2.2, category: "Endulzantes", stock: 45 },
      { name: "Sal 500g", priceUSD: 0.8, category: "Condimentos", stock: 60 },
      {
        name: "Jabón en Polvo 1Kg",
        priceUSD: 3.8,
        category: "Limpieza",
        stock: 22,
      },
      {
        name: "Detergente Líquido 1L",
        priceUSD: 2.9,
        category: "Limpieza",
        stock: 16,
      },
      {
        name: "Cereal de Maíz 500g",
        priceUSD: 2.1,
        category: "Cereales",
        stock: 32,
      },
      {
        name: "Yogurt Natural 150g",
        priceUSD: 1.0,
        category: "Lácteos",
        stock: 40,
      },
      {
        name: "Mantequilla 200g",
        priceUSD: 3.5,
        category: "Lácteos",
        stock: 14,
      },
      { name: "Tomates 1Kg", priceUSD: 2.0, category: "Verduras", stock: 38 },
      { name: "Cebollas 1Kg", priceUSD: 1.6, category: "Verduras", stock: 42 },
      { name: "Papas 1Kg", priceUSD: 1.4, category: "Verduras", stock: 50 },
    ];

    await db.withTransactionAsync(async () => {
      for (const product of sampleProducts) {
        const uuid = generateUuidV4();
        await db.runAsync(
          "INSERT INTO products (uuid, name, priceUSD, category, stock, active) VALUES (?, ?, ?, ?, ?, ?);",
          [uuid, product.name, product.priceUSD, product.category, product.stock, 1]
        );
      }
    });

    console.log("Productos de ejemplo inicializados correctamente");
  } catch (error) {
    console.error("Error inicializando productos:", error);
    throw error;
  }
};

/**
 * Actualiza todos los precios VES basados en la nueva tasa de cambio
 * @param {number} exchangeRate - Nueva tasa de cambio USD → VES
 */
export const updateAllPricesWithExchangeRate = async (exchangeRate) => {
  try {
    console.log(
      `Actualizando precios con nueva tasa: 1 USD = ${exchangeRate} VES`
    );

    // Actualizar todos los productos activos con precio USD > 0
    const result = await db.runAsync(
      `UPDATE products
       SET priceVES = ROUND(priceUSD * ?, 2),
           updatedAt = CURRENT_TIMESTAMP
       WHERE active = 1 AND priceUSD > 0;`,
      [exchangeRate]
    );

    console.log(`Precios actualizados: ${result.changes} productos`);
    return result.changes;
  } catch (error) {
    console.error("Error actualizando precios con tasa de cambio:", error);
    throw error;
  }
};

/**
 * Obtiene todos los productos con sus códigos QR
 */
export const getAllProductsWithQRCodes = async () => {
  try {
    const result = await db.getAllAsync(
      `SELECT id, name, barcode, category, priceUSD, stock
       FROM products
       WHERE active = 1
       ORDER BY name ASC;`
    );

    // Agregar código QR generado para cada producto
    return result.map((product) => ({
      ...product,
      qrCode: product.barcode || `PROD-${product.id}`,
    }));
  } catch (error) {
    throw error;
  }
};

export default {
  initDatabase,
  checkTableExists,
  initSampleProducts,
  getAllProducts,
  getProductByBarcode,
  searchProducts,
  insertProduct,
  updateProduct,
  updateProductStock,
  deleteProduct,
  getLowStockProducts,
  updateAllPricesWithExchangeRate,
  getAllProductsWithQRCodes,
};
