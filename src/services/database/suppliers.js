import { db } from "./db";
import {
  formatConsecutiveNumber,
  getNextCloudConsecutive,
  parseConsecutiveSequence,
} from "./consecutives";
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
  getActiveStoreSeedKey,
  getStoreCollectionRef,
  getStoreDocRef,
  hasActiveStoreContext,
} from "../store/storeRefs";
import { assertSharedStoreCloudWriteAvailable } from "./cloudWriteGuard";

const cloudSuppliersSeeded = new Set();

const isCloudSuppliersEnabled = () =>
  Boolean(auth.currentUser?.uid) && hasActiveStoreContext();

const createCloudNumericId = () =>
  Number(
    `${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`,
  );

const getSuppliersCollectionRef = () => getStoreCollectionRef("suppliers");

const getPayableCollectionRef = () => getStoreCollectionRef("accounts_payable");

const normalizeSupplierRecord = (supplier = {}) => ({
  id:
    Number(supplier.id) ||
    parseConsecutiveSequence(supplier.supplierNumber) ||
    createCloudNumericId(),
  supplierNumber:
    String(supplier.supplierNumber || "").trim() ||
    formatConsecutiveNumber("supplier", supplier.id),
  documentNumber: String(supplier.documentNumber || "")
    .trim()
    .toUpperCase(),
  name: String(supplier.name || "").trim(),
  email: String(supplier.email || "").trim(),
  phone: String(supplier.phone || "").trim(),
  address: String(supplier.address || "").trim(),
  contactPerson: String(supplier.contactPerson || "").trim(),
  paymentTerms: String(supplier.paymentTerms || "").trim(),
  active: Number(supplier.active ?? 1),
  createdAt: supplier.createdAt || new Date().toISOString(),
  updatedAt: supplier.updatedAt || new Date().toISOString(),
});

const sortSuppliersByName = (suppliers = []) =>
  [...suppliers].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "es", {
      sensitivity: "base",
    }),
  );

const getCloudSuppliers = async () => {
  const snapshot = await getDocs(getSuppliersCollectionRef());
  return snapshot.docs.map((item) => normalizeSupplierRecord(item.data()));
};

const normalizeExistingCloudSuppliers = async (existingSnapshot) => {
  const collectionRef = getSuppliersCollectionRef();
  const payableCollectionRef = getPayableCollectionRef();

  const existingRows = existingSnapshot.docs
    .map((item) => normalizeSupplierRecord(item.data()))
    .sort((a, b) => {
      const createdDiff =
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime();
      if (createdDiff !== 0) return createdDiff;
      return Number(a.id) - Number(b.id);
    });

  const requiresNormalization = existingSnapshot.docs.some((item, index) => {
    const targetId = index + 1;
    const data = normalizeSupplierRecord(item.data());
    return Number(data.id) !== targetId || item.id !== String(targetId);
  });

  if (!requiresNormalization) {
    await setDoc(
      getStoreDocRef(),
      {
        counters: {
          supplier: existingRows.length,
        },
      },
      { merge: true },
    );
    return;
  }

  const supplierIdMap = new Map();
  existingRows.forEach((item, index) => {
    supplierIdMap.set(Number(item.id), index + 1);
  });

  const payableSnapshot = await getDocs(payableCollectionRef);

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
          supplierNumber: formatConsecutiveNumber("supplier", sequence),
        },
        { merge: false },
      );
    });
    await batch.commit();
  }

  const normalizedPayables = payableSnapshot.docs.map((item) => {
    const account = item.data() || {};
    return {
      ref: item.ref,
      account: {
        ...account,
        supplierId:
          supplierIdMap.get(Number(account.supplierId)) ??
          Number(account.supplierId) ??
          account.supplierId ??
          null,
      },
    };
  });

  for (let index = 0; index < normalizedPayables.length; index += 300) {
    const batch = writeBatch(firestore);
    normalizedPayables.slice(index, index + 300).forEach(({ ref, account }) => {
      batch.set(ref, account, { merge: true });
    });
    await batch.commit();
  }

  await setDoc(
    getStoreDocRef(),
    {
      counters: {
        supplier: existingRows.length,
      },
    },
    { merge: true },
  );
};

const mergeMissingLocalSuppliersIntoCloud = async () => {
  const collectionRef = getSuppliersCollectionRef();
  const existingSnapshot = await getDocs(collectionRef);
  const existingIds = new Set(
    existingSnapshot.docs.map(
      (item) => Number(item.data()?.id) || Number(item.id) || 0,
    ),
  );

  const rows = await db.getAllAsync(
    "SELECT * FROM suppliers WHERE active = 1 ORDER BY name;",
  );

  const missingRows = rows
    .map((row) => normalizeSupplierRecord(row))
    .filter((row) => row.id > 0 && !existingIds.has(Number(row.id)));

  if (missingRows.length > 0) {
    const batch = writeBatch(firestore);
    missingRows.forEach((row) => {
      batch.set(doc(collectionRef, String(row.id)), row, { merge: true });
    });
    await batch.commit();
  }

  await setDoc(
    getStoreDocRef(),
    {
      counters: {
        supplier: existingIds.size + missingRows.length,
      },
    },
    { merge: true },
  );
};

const ensureCloudSuppliersSeeded = async () => {
  if (!isCloudSuppliersEnabled()) return;

  const seedKey = getActiveStoreSeedKey();
  if (cloudSuppliersSeeded.has(seedKey)) return;

  const collectionRef = getSuppliersCollectionRef();
  const existingSnapshot = await getDocs(collectionRef);
  if (!existingSnapshot.empty) {
    await normalizeExistingCloudSuppliers(existingSnapshot);
    await mergeMissingLocalSuppliersIntoCloud();
    cloudSuppliersSeeded.add(seedKey);
    return;
  }

  const rows = await db.getAllAsync(
    "SELECT * FROM suppliers WHERE active = 1 ORDER BY name;",
  );

  if (rows.length > 0) {
    const batch = writeBatch(firestore);
    rows.forEach((row) => {
      const normalized = normalizeSupplierRecord(row);
      batch.set(doc(collectionRef, String(normalized.id)), normalized, {
        merge: true,
      });
    });
    await batch.commit();

    await setDoc(
      getStoreDocRef(),
      {
        counters: {
          supplier: rows.length,
        },
      },
      { merge: true },
    );
  }

  cloudSuppliersSeeded.add(seedKey);
};

/**
 * Inicializa la tabla de proveedores
 */
export const initSuppliersTable = async () => {
  try {
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplierNumber TEXT,
        documentNumber TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        contactPerson TEXT,
        paymentTerms TEXT,
        active INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );`,
    );
  } catch (error) {
    if (handleCloudAccessError(error, "suppliers:getAll")) {
      return;
    }
    throw error;
  }
};

/**
 * Obtiene todos los proveedores activos
 */
export const getAllSuppliers = async () => {
  try {
    if (isCloudSuppliersEnabled()) {
      await ensureCloudSuppliersSeeded();
      const suppliers = await getCloudSuppliers();
      return sortSuppliersByName(suppliers.filter((item) => item.active === 1));
    }

    const result = await db.getAllAsync(
      "SELECT * FROM suppliers WHERE active = 1 ORDER BY name;",
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Busca proveedores por nombre, teléfono o cédula/RIF
 */
export const searchSuppliers = async (query) => {
  try {
    if (isCloudSuppliersEnabled()) {
      await ensureCloudSuppliersSeeded();
      const searchTerm = String(query || "")
        .trim()
        .toLowerCase();
      const suppliers = await getCloudSuppliers();
      return sortSuppliersByName(
        suppliers.filter((item) => {
          if (item.active !== 1) return false;
          if (!searchTerm) return true;
          return [
            item.name,
            item.phone,
            item.documentNumber,
            item.contactPerson,
            item.email,
            item.supplierNumber,
          ]
            .join(" ")
            .toLowerCase()
            .includes(searchTerm);
        }),
      );
    }

    const result = await db.getAllAsync(
      `SELECT * FROM suppliers
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
 * Inserta un nuevo proveedor
 */
export const insertSupplier = async (supplier) => {
  try {
    if (!isCloudSuppliersEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudSuppliersEnabled()) {
      await ensureCloudSuppliersSeeded();
      const now = new Date().toISOString();
      const existingSuppliers = await getCloudSuppliers();
      const maxSequence = existingSuppliers.reduce((maxValue, item) => {
        return Math.max(
          maxValue,
          Number(item.id) || 0,
          parseConsecutiveSequence(item.supplierNumber),
        );
      }, 0);
      const consecutive = await getNextCloudConsecutive("supplier", {
        minimum: maxSequence,
      });
      const id = consecutive.sequence;
      const payload = normalizeSupplierRecord({
        ...supplier,
        id,
        supplierNumber: consecutive.value,
        active: 1,
        createdAt: now,
        updatedAt: now,
      });
      await setDoc(doc(getSuppliersCollectionRef(), String(id)), payload);
      return id;
    }

    const result = await db.runAsync(
      `INSERT INTO suppliers (documentNumber, name, email, phone, address, contactPerson, paymentTerms)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        supplier.documentNumber,
        supplier.name,
        supplier.email || "",
        supplier.phone || "",
        supplier.address || "",
        supplier.contactPerson || "",
        supplier.paymentTerms || "",
      ],
    );
    await db.runAsync("UPDATE suppliers SET supplierNumber = ? WHERE id = ?;", [
      formatConsecutiveNumber("supplier", result.lastInsertRowId),
      result.lastInsertRowId,
    ]);
    return result.lastInsertRowId;
  } catch (error) {
    throw error;
  }
};

/**
 * Actualiza un proveedor
 */
export const updateSupplier = async (id, supplier) => {
  try {
    if (!isCloudSuppliersEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudSuppliersEnabled()) {
      await ensureCloudSuppliersSeeded();
      await setDoc(
        doc(getSuppliersCollectionRef(), String(id)),
        normalizeSupplierRecord({
          ...supplier,
          id: Number(id),
          updatedAt: new Date().toISOString(),
        }),
        { merge: true },
      );
      return 1;
    }

    const result = await db.runAsync(
      `UPDATE suppliers
       SET documentNumber = ?, name = ?, email = ?, phone = ?, address = ?,
           contactPerson = ?, paymentTerms = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?;`,
      [
        supplier.documentNumber,
        supplier.name,
        supplier.email,
        supplier.phone,
        supplier.address,
        supplier.contactPerson,
        supplier.paymentTerms,
        id,
      ],
    );
    return result.changes;
  } catch (error) {
    throw error;
  }
};

/**
 * Elimina (desactiva) un proveedor
 */
export const deleteSupplier = async (id) => {
  try {
    if (!isCloudSuppliersEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudSuppliersEnabled()) {
      await ensureCloudSuppliersSeeded();
      await updateDoc(doc(getSuppliersCollectionRef(), String(id)), {
        active: 0,
        updatedAt: new Date().toISOString(),
      });
      return 1;
    }

    const result = await db.runAsync(
      "UPDATE suppliers SET active = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?;",
      [id],
    );
    return result.changes;
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene un proveedor por su número de documento
 */
export const getSupplierByDocumentNumber = async (documentNumber) => {
  try {
    const normalized = (documentNumber || "").toString().trim().toUpperCase();

    if (isCloudSuppliersEnabled()) {
      await ensureCloudSuppliersSeeded();
      const suppliers = await getCloudSuppliers();
      return (
        suppliers.find(
          (item) =>
            item.active === 1 &&
            String(item.documentNumber || "")
              .trim()
              .toUpperCase() === normalized,
        ) || null
      );
    }

    const result = await db.getFirstAsync(
      "SELECT * FROM suppliers WHERE TRIM(documentNumber) = ? COLLATE NOCASE AND active = 1;",
      [normalized],
    );
    return result;
  } catch (error) {
    throw error;
  }
};

export default {
  initSuppliersTable,
  getAllSuppliers,
  searchSuppliers,
  getSupplierByDocumentNumber,
  insertSupplier,
  updateSupplier,
  deleteSupplier,
};
