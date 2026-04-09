import { db } from "./db";
import {
  doc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, firestore } from "../firebase/firebase";
import { handleCloudAccessError } from "../firebase/cloudAccess";
import {
  formatConsecutiveNumber,
  getNextCloudConsecutive,
  parseConsecutiveSequence,
} from "./consecutives";
import { assertSharedStoreCloudWriteAvailable } from "./cloudWriteGuard";
import {
  getActiveStoreSeedKey,
  getStoreCollectionRef,
  getStoreDocRef,
  hasActiveStoreContext,
} from "../store/storeRefs";

const cloudCustomersSeeded = new Set();

const isCloudCustomersEnabled = () =>
  Boolean(auth.currentUser?.uid) && hasActiveStoreContext();

const createCloudNumericId = () =>
  Number(
    `${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`,
  );

const getCustomersCollectionRef = () => getStoreCollectionRef("customers");

const getSalesCollectionRef = () => getStoreCollectionRef("sales");

const getReceivableCollectionRef = () =>
  getStoreCollectionRef("accounts_receivable");

const normalizeCustomerRecord = (customer = {}) => ({
  id:
    Number(customer.id) ||
    parseConsecutiveSequence(customer.customerNumber) ||
    createCloudNumericId(),
  customerNumber:
    String(customer.customerNumber || "").trim() ||
    formatConsecutiveNumber("customer", customer.id),
  name: String(customer.name || "").trim(),
  email: String(customer.email || "").trim(),
  phone: String(customer.phone || "").trim(),
  address: String(customer.address || "").trim(),
  documentType: String(customer.documentType || "").trim(),
  documentNumber: String(customer.documentNumber || "").trim(),
  totalPurchases: Number(customer.totalPurchases) || 0,
  active: Number(customer.active ?? 1),
  createdAt: customer.createdAt || new Date().toISOString(),
  updatedAt: customer.updatedAt || new Date().toISOString(),
});

const sortCustomersByName = (customers = []) =>
  [...customers].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "es", {
      sensitivity: "base",
    }),
  );

const getCloudCustomers = async () => {
  const snapshot = await getDocs(getCustomersCollectionRef());
  return snapshot.docs.map((item) => normalizeCustomerRecord(item.data()));
};

const normalizeExistingCloudCustomers = async (existingSnapshot) => {
  const collectionRef = getCustomersCollectionRef();
  const salesCollectionRef = getSalesCollectionRef();
  const receivableCollectionRef = getReceivableCollectionRef();

  const existingRows = existingSnapshot.docs
    .map((item) => normalizeCustomerRecord(item.data()))
    .sort((a, b) => {
      const createdDiff =
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime();
      if (createdDiff !== 0) return createdDiff;
      return Number(a.id) - Number(b.id);
    });

  const requiresNormalization = existingSnapshot.docs.some((item, index) => {
    const targetId = index + 1;
    const data = normalizeCustomerRecord(item.data());
    return Number(data.id) !== targetId || item.id !== String(targetId);
  });

  if (!requiresNormalization) {
    await setDoc(
      getStoreDocRef(),
      {
        counters: {
          customer: existingRows.length,
        },
      },
      { merge: true },
    );
    return;
  }

  const customerIdMap = new Map();
  existingRows.forEach((item, index) => {
    customerIdMap.set(Number(item.id), index + 1);
  });

  const [salesSnapshot, receivableSnapshot] = await Promise.all([
    getDocs(salesCollectionRef),
    getDocs(receivableCollectionRef),
  ]);

  for (let index = 0; index < existingSnapshot.docs.length; index += 300) {
    const batch = writeBatch(firestore);
    existingSnapshot.docs.slice(index, index + 300).forEach((item) => {
      batch.delete(item.ref);
    });
    await batch.commit();
  }

  for (let index = 0; index < existingRows.length; index += 300) {
    const batch = writeBatch(firestore);
    existingRows.slice(index, index + 300).forEach((item, offset) => {
      const sequence = index + offset + 1;
      batch.set(
        doc(collectionRef, String(sequence)),
        {
          ...item,
          id: sequence,
          customerNumber: formatConsecutiveNumber("customer", sequence),
        },
        { merge: false },
      );
    });
    await batch.commit();
  }

  const normalizedSales = salesSnapshot.docs.map((item) => {
    const sale = item.data() || {};
    return {
      ref: item.ref,
      sale: {
        ...sale,
        customerId:
          customerIdMap.get(Number(sale.customerId)) ??
          Number(sale.customerId) ??
          sale.customerId ??
          null,
      },
    };
  });

  for (let index = 0; index < normalizedSales.length; index += 300) {
    const batch = writeBatch(firestore);
    normalizedSales.slice(index, index + 300).forEach(({ ref, sale }) => {
      batch.set(ref, sale, { merge: true });
    });
    await batch.commit();
  }

  const normalizedReceivables = receivableSnapshot.docs.map((item) => {
    const account = item.data() || {};
    return {
      ref: item.ref,
      account: {
        ...account,
        customerId:
          customerIdMap.get(Number(account.customerId)) ??
          Number(account.customerId) ??
          account.customerId ??
          null,
      },
    };
  });

  for (let index = 0; index < normalizedReceivables.length; index += 300) {
    const batch = writeBatch(firestore);
    normalizedReceivables
      .slice(index, index + 300)
      .forEach(({ ref, account }) => {
        batch.set(ref, account, { merge: true });
      });
    await batch.commit();
  }

  await setDoc(
    getStoreDocRef(),
    {
      counters: {
        customer: existingRows.length,
      },
    },
    { merge: true },
  );
};

const ensureCloudCustomersSeeded = async () => {
  if (!isCloudCustomersEnabled()) return;

  const seedKey = getActiveStoreSeedKey();
  if (cloudCustomersSeeded.has(seedKey)) return;

  const collectionRef = getCustomersCollectionRef();
  const existingSnapshot = await getDocs(collectionRef);
  if (!existingSnapshot.empty) {
    await normalizeExistingCloudCustomers(existingSnapshot);
    cloudCustomersSeeded.add(seedKey);
    return;
  }

  const rows = await db.getAllAsync(
    "SELECT * FROM customers WHERE active = 1 ORDER BY name;",
  );
  if (rows.length > 0) {
    const batch = writeBatch(firestore);
    rows.forEach((row) => {
      const normalized = normalizeCustomerRecord(row);
      batch.set(doc(collectionRef, String(normalized.id)), normalized, {
        merge: true,
      });
    });
    await batch.commit();

    await setDoc(
      getStoreDocRef(),
      {
        counters: {
          customer: rows.length,
        },
      },
      { merge: true },
    );
  }

  cloudCustomersSeeded.add(seedKey);
};

/**
 * Inicializa la tabla de clientes
 */
export const initCustomersTable = async () => {
  try {
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS customers (
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
      );`,
    );
  } catch (error) {
    if (handleCloudAccessError(error, "customers:getAll")) {
      return await getAllCustomers();
    }
    throw error;
  }
};

/**
 * Obtiene todos los clientes activos
 */
export const getAllCustomers = async () => {
  try {
    if (isCloudCustomersEnabled()) {
      await ensureCloudCustomersSeeded();
      const customers = await getCloudCustomers();
      return sortCustomersByName(customers.filter((item) => item.active === 1));
    }

    const result = await db.getAllAsync(
      "SELECT * FROM customers WHERE active = 1 ORDER BY name;",
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene un cliente activo por id
 */
export const getCustomerById = async (id) => {
  try {
    if (!id) return null;
    if (isCloudCustomersEnabled()) {
      await ensureCloudCustomersSeeded();
      const customers = await getCloudCustomers();
      return (
        customers.find(
          (item) => Number(item.id) === Number(id) && item.active === 1,
        ) || null
      );
    }

    const result = await db.getFirstAsync(
      "SELECT * FROM customers WHERE id = ? AND active = 1 LIMIT 1;",
      [id],
    );
    return result || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Busca clientes por nombre, teléfono o cédula
 */
export const searchCustomers = async (query) => {
  try {
    if (isCloudCustomersEnabled()) {
      await ensureCloudCustomersSeeded();
      const searchTerm = String(query || "")
        .trim()
        .toLowerCase();
      const customers = await getCloudCustomers();
      return sortCustomersByName(
        customers.filter((item) => {
          if (item.active !== 1) return false;
          if (!searchTerm) return true;
          return [item.name, item.phone, item.documentNumber, item.email]
            .join(" ")
            .toLowerCase()
            .includes(searchTerm);
        }),
      );
    }

    const result = await db.getAllAsync(
      `SELECT * FROM customers
       WHERE (name LIKE ? OR phone LIKE ? OR documentNumber LIKE ?) AND active = 1
       ORDER BY name;`,
      [`%${query}%`, `%${query}%`, `%${query}%`],
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Busca un cliente por número de cédula
 */
export const getCustomerByDocumentNumber = async (documentNumber) => {
  try {
    const normalized = (documentNumber || "").toString().trim();
    if (isCloudCustomersEnabled()) {
      await ensureCloudCustomersSeeded();
      const customers = await getCloudCustomers();
      return (
        customers.find(
          (item) =>
            item.active === 1 &&
            String(item.documentNumber || "").trim() === normalized,
        ) || null
      );
    }

    const result = await db.getAllAsync(
      "SELECT * FROM customers WHERE TRIM(documentNumber) = ? AND active = 1;",
      [normalized],
    );
    return result[0] || null;
  } catch (error) {
    throw error;
  }
};

/**
 * Crea el cliente genérico si no existe
 */
export const createGenericCustomer = async () => {
  try {
    if (!isCloudCustomersEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    // Verificar si ya existe el cliente genérico
    const existing = await getCustomerByDocumentNumber("1");
    if (existing) {
      return existing.id;
    }

    if (isCloudCustomersEnabled()) {
      await ensureCloudCustomersSeeded();
      const existingCustomers = await getCloudCustomers();
      const maxSequence = existingCustomers.reduce((maxValue, item) => {
        return Math.max(
          maxValue,
          Number(item.id) || 0,
          parseConsecutiveSequence(item.customerNumber),
        );
      }, 0);
      const consecutive = await getNextCloudConsecutive("customer", {
        minimum: maxSequence,
      });
      const id = consecutive.sequence;
      await setDoc(
        doc(getCustomersCollectionRef(), String(id)),
        normalizeCustomerRecord({
          id,
          customerNumber: consecutive.value,
          name: "Cliente Genérico",
          documentNumber: "1",
          documentType: "V",
        }),
      );
      return id;
    }

    // Crear cliente genérico
    const result = await db.runAsync(
      `INSERT INTO customers (name, documentNumber, documentType)
       VALUES (?, ?, ?);`,
      ["Cliente Genérico", "1", "V"],
    );
    await db.runAsync("UPDATE customers SET customerNumber = ? WHERE id = ?;", [
      formatConsecutiveNumber("customer", result.lastInsertRowId),
      result.lastInsertRowId,
    ]);
    return result.lastInsertRowId;
  } catch (error) {
    throw error;
  }
};

/**
 * Inserta un nuevo cliente
 */
export const insertCustomer = async (customer) => {
  try {
    if (!isCloudCustomersEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudCustomersEnabled()) {
      await ensureCloudCustomersSeeded();
      const now = new Date().toISOString();
      const existingCustomers = await getCloudCustomers();
      const maxSequence = existingCustomers.reduce((maxValue, item) => {
        return Math.max(
          maxValue,
          Number(item.id) || 0,
          parseConsecutiveSequence(item.customerNumber),
        );
      }, 0);
      const consecutive = await getNextCloudConsecutive("customer", {
        minimum: maxSequence,
      });
      const id = consecutive.sequence;
      await setDoc(
        doc(getCustomersCollectionRef(), String(id)),
        normalizeCustomerRecord({
          ...customer,
          id,
          customerNumber: consecutive.value,
          active: 1,
          createdAt: now,
          updatedAt: now,
        }),
      );
      return id;
    }

    const result = await db.runAsync(
      `INSERT INTO customers (name, email, phone, address, documentType, documentNumber)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        customer.name,
        customer.email || "",
        customer.phone || "",
        customer.address || "",
        customer.documentType || "",
        customer.documentNumber || "",
      ],
    );
    await db.runAsync("UPDATE customers SET customerNumber = ? WHERE id = ?;", [
      formatConsecutiveNumber("customer", result.lastInsertRowId),
      result.lastInsertRowId,
    ]);
    return result.lastInsertRowId;
  } catch (error) {
    throw error;
  }
};

/**
 * Actualiza un cliente
 */
export const updateCustomer = async (id, customer) => {
  try {
    if (!isCloudCustomersEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudCustomersEnabled()) {
      await ensureCloudCustomersSeeded();
      await setDoc(
        doc(getCustomersCollectionRef(), String(id)),
        normalizeCustomerRecord({
          ...customer,
          id: Number(id),
          updatedAt: new Date().toISOString(),
        }),
        { merge: true },
      );
      return 1;
    }

    const result = await db.runAsync(
      `UPDATE customers
       SET name = ?, email = ?, phone = ?, address = ?,
           documentType = ?, documentNumber = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?;`,
      [
        customer.name,
        customer.email,
        customer.phone,
        customer.address,
        customer.documentType,
        customer.documentNumber,
        id,
      ],
    );
    return result.changes;
  } catch (error) {
    throw error;
  }
};

/**
 * Elimina (desactiva) un cliente
 */
export const deleteCustomer = async (id) => {
  try {
    if (!isCloudCustomersEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    // Verificar si el cliente tiene cuentas por cobrar pendientes
    const accountsResult = await db.getAllAsync(
      "SELECT COUNT(*) as count FROM accounts_receivable WHERE customerId = ? AND status != 'paid' AND COALESCE(paidAmount, 0) < amount;",
      [id],
    );
    if (accountsResult[0].count > 0) {
      throw new Error(
        "No se puede eliminar el cliente porque tiene cuentas por cobrar pendientes",
      );
    }

    if (isCloudCustomersEnabled()) {
      await ensureCloudCustomersSeeded();
      await updateDoc(doc(getCustomersCollectionRef(), String(id)), {
        active: 0,
        updatedAt: new Date().toISOString(),
      });
      return 1;
    }

    const result = await db.runAsync(
      "UPDATE customers SET active = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?;",
      [id],
    );
    return result.changes;
  } catch (error) {
    throw error;
  }
};

/**
 * Limpia clientes duplicados por cédula, manteniendo el más reciente
 */
export const cleanDuplicateCustomers = async () => {
  try {
    if (!isCloudCustomersEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudCustomersEnabled()) {
      await ensureCloudCustomersSeeded();
      const customers = (await getCloudCustomers()).filter(
        (item) => item.active === 1 && String(item.documentNumber || "").trim(),
      );

      const groups = customers.reduce((acc, customer) => {
        const key = String(customer.documentNumber || "").trim();
        acc[key] = acc[key] || [];
        acc[key].push(customer);
        return acc;
      }, {});

      let cleanedCount = 0;
      const [salesSnapshot, receivableSnapshot] = await Promise.all([
        getDocs(getSalesCollectionRef()),
        getDocs(getReceivableCollectionRef()),
      ]);
      const sales = salesSnapshot.docs.map((item) => item.data());
      const receivables = receivableSnapshot.docs.map((item) => ({
        ref: item.ref,
        data: item.data() || {},
      }));

      for (const group of Object.values(groups)) {
        if (group.length <= 1) continue;

        const sorted = [...group].sort((a, b) => Number(a.id) - Number(b.id));
        const keep = sorted[sorted.length - 1];
        const duplicates = sorted.slice(0, -1);

        for (const duplicate of duplicates) {
          const batch = writeBatch(firestore);
          batch.set(
            doc(getCustomersCollectionRef(), String(duplicate.id)),
            {
              active: 0,
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );

          receivables
            .filter(
              ({ data }) => Number(data.customerId) === Number(duplicate.id),
            )
            .forEach(({ ref }) => {
              batch.set(
                ref,
                {
                  customerId: keep.id,
                  updatedAt: new Date().toISOString(),
                },
                { merge: true },
              );
            });

          sales
            .filter((sale) => Number(sale.customerId) === Number(duplicate.id))
            .forEach((sale) => {
              batch.set(
                doc(getSalesCollectionRef(), String(sale.id)),
                {
                  customerId: keep.id,
                  updatedAt: new Date().toISOString(),
                },
                { merge: true },
              );
            });

          await batch.commit();
          cleanedCount += 1;
        }
      }

      return { cleanedCount, skippedCount: 0 };
    }

    // Obtener grupos de clientes con la misma cédula (trim para evitar diferencias por espacios)
    const duplicates = await db.getAllAsync(`
      SELECT TRIM(documentNumber) as trimmedDoc, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM customers
      WHERE documentNumber IS NOT NULL AND TRIM(documentNumber) != ''
      GROUP BY TRIM(documentNumber)
      HAVING count > 1
    `);

    let cleanedCount = 0;
    let skippedCount = 0;

    for (const dup of duplicates) {
      const ids = dup.ids.split(",");
      // Mantener el último (más reciente por ID, asumiendo autoincrement)
      const keepId = Math.max(...ids.map((id) => parseInt(id)));
      const removeIds = ids.filter((id) => parseInt(id) !== keepId);

      // Transferir cuentas por cobrar de los duplicados al cliente que se mantiene
      for (const removeId of removeIds) {
        await db.runAsync(
          "UPDATE accounts_receivable SET customerId = ?, updatedAt = CURRENT_TIMESTAMP WHERE customerId = ?;",
          [keepId, removeId],
        );
        await db.runAsync(
          "UPDATE sales SET customerId = ?, updatedAt = CURRENT_TIMESTAMP WHERE customerId = ?;",
          [keepId, removeId],
        );
      }

      // Desactivar los duplicados (ahora que no tienen cuentas asociadas)
      for (const removeId of removeIds) {
        await db.runAsync(
          "UPDATE customers SET active = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?;",
          [removeId],
        );
        cleanedCount++;
      }
    }

    return { cleanedCount, skippedCount };
  } catch (error) {
    throw error;
  }
};

/**
 * Recupera clientes eliminados (marcados como inactivos)
 */
export const recoverDeletedCustomers = async () => {
  try {
    if (!isCloudCustomersEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudCustomersEnabled()) {
      await ensureCloudCustomersSeeded();
      const customers = await getCloudCustomers();
      const inactive = customers.filter((item) => item.active === 0);

      if (inactive.length === 0) return 0;

      const batch = writeBatch(firestore);
      inactive.forEach((customer) => {
        batch.set(
          doc(getCustomersCollectionRef(), String(customer.id)),
          {
            active: 1,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      });
      await batch.commit();
      return inactive.length;
    }

    const result = await db.runAsync(
      "UPDATE customers SET active = 1, updatedAt = CURRENT_TIMESTAMP WHERE active = 0;",
    );
    return result.changes;
  } catch (error) {
    throw error;
  }
};

export default {
  initCustomersTable,
  getAllCustomers,
  getCustomerById,
  searchCustomers,
  getCustomerByDocumentNumber,
  createGenericCustomer,
  insertCustomer,
  updateCustomer,
  deleteCustomer,
  cleanDuplicateCustomers,
  recoverDeletedCustomers,
};
