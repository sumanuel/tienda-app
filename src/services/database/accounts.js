import { db } from "./db";
import {
  deleteDoc,
  doc,
  getDoc,
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

const cloudAccountsSeeded = new Set();

const isCloudAccountsEnabled = () =>
  Boolean(auth.currentUser?.uid) && hasActiveStoreContext();

const createCloudNumericId = () =>
  Number(
    `${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`,
  );

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const sortByCreatedAtDesc = (items = []) =>
  [...items].sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime(),
  );

const getReceivableCollectionRef = () =>
  getStoreCollectionRef("accounts_receivable");

const getPayableCollectionRef = () => getStoreCollectionRef("accounts_payable");

const getPaymentsCollectionRef = () =>
  getStoreCollectionRef("account_payments");

const getCustomersCollectionRef = () => getStoreCollectionRef("customers");

const getSuppliersCollectionRef = () => getStoreCollectionRef("suppliers");

const normalizeAccountRecord = (account = {}, accountType = "receivable") => ({
  id:
    Number(account.id) ||
    parseConsecutiveSequence(
      accountType === "payable"
        ? account.payableNumber
        : account.receivableNumber,
    ) ||
    createCloudNumericId(),
  receivableNumber:
    accountType === "receivable"
      ? String(account.receivableNumber || "").trim() ||
        formatConsecutiveNumber("receivable", account.id)
      : "",
  payableNumber:
    accountType === "payable"
      ? String(account.payableNumber || "").trim() ||
        formatConsecutiveNumber("payable", account.id)
      : "",
  customerId:
    accountType === "receivable" && account.customerId != null
      ? Number(account.customerId) || account.customerId
      : null,
  customerName:
    accountType === "receivable"
      ? String(account.customerName || "").trim()
      : "",
  customerPhone:
    accountType === "receivable"
      ? String(account.customerPhone || "").trim()
      : "",
  supplierId:
    accountType === "payable" && account.supplierId != null
      ? Number(account.supplierId) || account.supplierId
      : null,
  supplierName:
    accountType === "payable" ? String(account.supplierName || "").trim() : "",
  documentNumber: String(account.documentNumber || "").trim(),
  description: String(account.description || "").trim(),
  amount: roundMoney(account.amount),
  paidAmount: Math.max(0, roundMoney(account.paidAmount)),
  status: String(account.status || "pending"),
  invoiceNumber: String(account.invoiceNumber || "").trim(),
  dueDate: account.dueDate || null,
  baseCurrency: String(account.baseCurrency || "VES"),
  baseAmountUSD:
    account.baseAmountUSD == null || account.baseAmountUSD === ""
      ? null
      : roundMoney(account.baseAmountUSD),
  exchangeRateAtCreation:
    account.exchangeRateAtCreation == null ||
    account.exchangeRateAtCreation === ""
      ? null
      : Number(account.exchangeRateAtCreation) || null,
  paidAt: account.paidAt || null,
  createdAt: account.createdAt || new Date().toISOString(),
  updatedAt: account.updatedAt || new Date().toISOString(),
});

const normalizePaymentRecord = (payment = {}) => ({
  id: Number(payment.id) || createCloudNumericId(),
  accountId: Number(payment.accountId) || 0,
  accountType: payment.accountType === "payable" ? "payable" : "receivable",
  amount: roundMoney(payment.amount),
  paymentMethod: String(payment.paymentMethod || "").trim(),
  paymentDate: payment.paymentDate || new Date().toISOString(),
  reference: String(payment.reference || "").trim(),
  notes: String(payment.notes || "").trim(),
  createdAt: payment.createdAt || new Date().toISOString(),
});

const getCloudAccounts = async (accountType = "receivable") => {
  const snapshot = await getDocs(
    accountType === "payable"
      ? getPayableCollectionRef()
      : getReceivableCollectionRef(),
  );

  return snapshot.docs.map((item) =>
    normalizeAccountRecord(item.data(), accountType),
  );
};

const getCloudPayments = async () => {
  const snapshot = await getDocs(getPaymentsCollectionRef());
  return snapshot.docs.map((item) => normalizePaymentRecord(item.data()));
};

const buildCustomerPhoneMap = async () => {
  const snapshot = await getDocs(getCustomersCollectionRef());
  return snapshot.docs.reduce((acc, item) => {
    const customer = item.data() || {};
    if (customer.id != null) {
      acc[Number(customer.id)] = String(customer.phone || "").trim();
    }
    return acc;
  }, {});
};

const attachCustomerPhones = async (accounts = []) => {
  const phoneMap = await buildCustomerPhoneMap();
  return accounts.map((account) => ({
    ...account,
    customerPhone:
      account.customerPhone || phoneMap[Number(account.customerId)] || "",
  }));
};

const normalizeExistingCloudAccounts = async ({
  receivableSnapshot,
  payableSnapshot,
  paymentsSnapshot,
}) => {
  const receivableCollectionRef = getReceivableCollectionRef();
  const payableCollectionRef = getPayableCollectionRef();

  const receivables = receivableSnapshot.docs
    .map((item) => normalizeAccountRecord(item.data(), "receivable"))
    .sort((a, b) => {
      const createdDiff =
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime();
      if (createdDiff !== 0) return createdDiff;
      return Number(a.id) - Number(b.id);
    });

  const payables = payableSnapshot.docs
    .map((item) => normalizeAccountRecord(item.data(), "payable"))
    .sort((a, b) => {
      const createdDiff =
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime();
      if (createdDiff !== 0) return createdDiff;
      return Number(a.id) - Number(b.id);
    });

  const receivableRequiresNormalization = receivableSnapshot.docs.some(
    (item, index) => {
      const targetId = index + 1;
      const data = normalizeAccountRecord(item.data(), "receivable");
      return Number(data.id) !== targetId || item.id !== String(targetId);
    },
  );

  const payableRequiresNormalization = payableSnapshot.docs.some(
    (item, index) => {
      const targetId = index + 1;
      const data = normalizeAccountRecord(item.data(), "payable");
      return Number(data.id) !== targetId || item.id !== String(targetId);
    },
  );

  const receivableIdMap = new Map();
  receivables.forEach((item, index) => {
    receivableIdMap.set(Number(item.id), index + 1);
  });

  const payableIdMap = new Map();
  payables.forEach((item, index) => {
    payableIdMap.set(Number(item.id), index + 1);
  });

  if (receivableRequiresNormalization) {
    for (let index = 0; index < receivableSnapshot.docs.length; index += 300) {
      const batch = writeBatch(firestore);
      receivableSnapshot.docs.slice(index, index + 300).forEach((item) => {
        batch.delete(item.ref);
      });
      await batch.commit();
    }

    for (let index = 0; index < receivables.length; index += 300) {
      const batch = writeBatch(firestore);
      receivables.slice(index, index + 300).forEach((item, offset) => {
        const sequence = index + offset + 1;
        batch.set(
          doc(receivableCollectionRef, String(sequence)),
          {
            ...item,
            id: sequence,
            receivableNumber: formatConsecutiveNumber("receivable", sequence),
          },
          { merge: false },
        );
      });
      await batch.commit();
    }
  }

  if (payableRequiresNormalization) {
    for (let index = 0; index < payableSnapshot.docs.length; index += 300) {
      const batch = writeBatch(firestore);
      payableSnapshot.docs.slice(index, index + 300).forEach((item) => {
        batch.delete(item.ref);
      });
      await batch.commit();
    }

    for (let index = 0; index < payables.length; index += 300) {
      const batch = writeBatch(firestore);
      payables.slice(index, index + 300).forEach((item, offset) => {
        const sequence = index + offset + 1;
        batch.set(
          doc(payableCollectionRef, String(sequence)),
          {
            ...item,
            id: sequence,
            payableNumber: formatConsecutiveNumber("payable", sequence),
          },
          { merge: false },
        );
      });
      await batch.commit();
    }
  }

  if (receivableRequiresNormalization || payableRequiresNormalization) {
    const normalizedPayments = paymentsSnapshot.docs.map((item) => {
      const payment = normalizePaymentRecord(item.data());
      return {
        ref: item.ref,
        payment: {
          ...payment,
          accountId:
            payment.accountType === "payable"
              ? (payableIdMap.get(Number(payment.accountId)) ??
                Number(payment.accountId) ??
                0)
              : (receivableIdMap.get(Number(payment.accountId)) ??
                Number(payment.accountId) ??
                0),
        },
      };
    });

    for (let index = 0; index < normalizedPayments.length; index += 300) {
      const batch = writeBatch(firestore);
      normalizedPayments
        .slice(index, index + 300)
        .forEach(({ ref, payment }) => {
          batch.set(ref, payment, { merge: true });
        });
      await batch.commit();
    }
  }

  await setDoc(
    getStoreDocRef(),
    {
      counters: {
        receivable: receivables.length,
        payable: payables.length,
      },
    },
    { merge: true },
  );
};

const ensureCloudAccountsSeeded = async () => {
  if (!isCloudAccountsEnabled()) return;

  const seedKey = getActiveStoreSeedKey();
  if (cloudAccountsSeeded.has(seedKey)) return;

  const [receivableSnapshot, payableSnapshot, paymentsSnapshot] =
    await Promise.all([
      getDocs(getReceivableCollectionRef()),
      getDocs(getPayableCollectionRef()),
      getDocs(getPaymentsCollectionRef()),
    ]);

  if (
    !receivableSnapshot.empty ||
    !payableSnapshot.empty ||
    !paymentsSnapshot.empty
  ) {
    await normalizeExistingCloudAccounts({
      receivableSnapshot,
      payableSnapshot,
      paymentsSnapshot,
    });
  }

  const batch = writeBatch(firestore);
  let hasChanges = false;

  if (receivableSnapshot.empty) {
    const rows = await db.getAllAsync(
      "SELECT * FROM accounts_receivable ORDER BY createdAt DESC;",
    );
    rows.forEach((row) => {
      const normalized = normalizeAccountRecord(row, "receivable");
      batch.set(
        doc(getReceivableCollectionRef(), String(normalized.id)),
        normalized,
        {
          merge: true,
        },
      );
      hasChanges = true;
    });
  }

  if (payableSnapshot.empty) {
    const rows = await db.getAllAsync(
      "SELECT * FROM accounts_payable ORDER BY createdAt DESC;",
    );
    rows.forEach((row) => {
      const normalized = normalizeAccountRecord(row, "payable");
      batch.set(
        doc(getPayableCollectionRef(), String(normalized.id)),
        normalized,
        {
          merge: true,
        },
      );
      hasChanges = true;
    });
  }

  if (paymentsSnapshot.empty) {
    const rows = await db.getAllAsync(
      "SELECT * FROM account_payments ORDER BY paymentDate DESC;",
    );
    rows.forEach((row) => {
      const normalized = normalizePaymentRecord(row);
      batch.set(
        doc(getPaymentsCollectionRef(), String(normalized.id)),
        normalized,
        {
          merge: true,
        },
      );
      hasChanges = true;
    });
  }

  if (hasChanges) {
    await batch.commit();
  }

  await setDoc(
    getStoreDocRef(),
    {
      counters: {
        receivable: receivableSnapshot.empty
          ? await db
              .getFirstAsync(
                "SELECT COUNT(*) as total FROM accounts_receivable;",
              )
              .then((row) => Number(row?.total) || 0)
          : receivableSnapshot.size,
        payable: payableSnapshot.empty
          ? await db
              .getFirstAsync("SELECT COUNT(*) as total FROM accounts_payable;")
              .then((row) => Number(row?.total) || 0)
          : payableSnapshot.size,
      },
    },
    { merge: true },
  );

  cloudAccountsSeeded.add(seedKey);
};

/**
 * Obtiene todas las cuentas por cobrar
 */
export const getAllAccountsReceivable = async () => {
  try {
    if (isCloudAccountsEnabled()) {
      await ensureCloudAccountsSeeded();
      const accounts = await getCloudAccounts("receivable");
      return sortByCreatedAtDesc(await attachCustomerPhones(accounts));
    }

    const result = await db.getAllAsync(
      "SELECT ar.id, ar.receivableNumber, ar.customerId, ar.customerName, ar.documentNumber, ar.description, ROUND(ar.amount, 2) as amount, MAX(0, ROUND(COALESCE(ar.paidAmount, 0), 2)) as paidAmount, ar.status, ar.invoiceNumber, ar.dueDate, ar.baseCurrency, ar.baseAmountUSD, ar.exchangeRateAtCreation, ar.createdAt, ar.updatedAt, c.phone as customerPhone FROM accounts_receivable ar LEFT JOIN customers c ON c.id = ar.customerId ORDER BY ar.createdAt DESC;",
    );
    return result;
  } catch (error) {
    if (handleCloudAccessError(error, "accounts:getReceivable")) {
      return await db.getAllAsync(
        "SELECT ar.id, ar.receivableNumber, ar.customerId, ar.customerName, ar.documentNumber, ar.description, ROUND(ar.amount, 2) as amount, MAX(0, ROUND(COALESCE(ar.paidAmount, 0), 2)) as paidAmount, ar.status, ar.invoiceNumber, ar.dueDate, ar.baseCurrency, ar.baseAmountUSD, ar.exchangeRateAtCreation, ar.createdAt, ar.updatedAt, c.phone as customerPhone FROM accounts_receivable ar LEFT JOIN customers c ON c.id = ar.customerId ORDER BY ar.createdAt DESC;",
      );
    }
    throw error;
  }
};

/**
 * Busca cuentas por cobrar por nombre de cliente, cédula o descripción
 */
export const searchAccountsReceivable = async (query) => {
  try {
    if (isCloudAccountsEnabled()) {
      await ensureCloudAccountsSeeded();
      const searchTerm = String(query || "")
        .trim()
        .toLowerCase();
      const accounts = await getAllAccountsReceivable();
      if (!searchTerm) return accounts;
      return accounts.filter((account) =>
        [
          account.customerName,
          account.documentNumber,
          account.description,
          account.invoiceNumber,
          account.receivableNumber,
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm),
      );
    }

    const searchTerm = `%${query}%`;
    const result = await db.getAllAsync(
      `SELECT ar.id, ar.receivableNumber, ar.customerId, ar.customerName, ar.documentNumber, ar.description, ROUND(ar.amount, 2) as amount, MAX(0, ROUND(COALESCE(ar.paidAmount, 0), 2)) as paidAmount, ar.status, ar.invoiceNumber, ar.dueDate, ar.baseCurrency, ar.baseAmountUSD, ar.exchangeRateAtCreation, ar.createdAt, ar.updatedAt, c.phone as customerPhone FROM accounts_receivable ar LEFT JOIN customers c ON c.id = ar.customerId
       WHERE ar.customerName LIKE ? 
       OR ar.documentNumber LIKE ? 
       OR ar.description LIKE ?
       OR ar.receivableNumber LIKE ?
       OR ar.invoiceNumber LIKE ?
       ORDER BY ar.createdAt DESC;`,
      [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm],
    );
    return result;
  } catch (error) {
    if (handleCloudAccessError(error, "accounts:getPayable")) {
      const searchTerm = `%${query}%`;
      return await db.getAllAsync(
        `SELECT ar.id, ar.receivableNumber, ar.customerId, ar.customerName, ar.documentNumber, ar.description, ROUND(ar.amount, 2) as amount, MAX(0, ROUND(COALESCE(ar.paidAmount, 0), 2)) as paidAmount, ar.status, ar.invoiceNumber, ar.dueDate, ar.baseCurrency, ar.baseAmountUSD, ar.exchangeRateAtCreation, ar.createdAt, ar.updatedAt, c.phone as customerPhone FROM accounts_receivable ar LEFT JOIN customers c ON c.id = ar.customerId
         WHERE ar.customerName LIKE ? 
         OR ar.documentNumber LIKE ? 
         OR ar.description LIKE ?
         OR ar.receivableNumber LIKE ?
         OR ar.invoiceNumber LIKE ?
         ORDER BY ar.createdAt DESC;`,
        [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm],
      );
    }
    throw error;
  }
};

/**
 * Obtiene todas las cuentas por pagar
 */
export const getAllAccountsPayable = async () => {
  try {
    if (isCloudAccountsEnabled()) {
      await ensureCloudAccountsSeeded();
      const accounts = await getCloudAccounts("payable");
      return sortByCreatedAtDesc(accounts);
    }

    const result = await db.getAllAsync(
      "SELECT id, payableNumber, supplierId, supplierName, documentNumber, description, invoiceNumber, dueDate, baseCurrency, baseAmountUSD, exchangeRateAtCreation, ROUND(amount, 2) as amount, MAX(0, ROUND(COALESCE(paidAmount, 0), 2)) as paidAmount, status, createdAt, updatedAt FROM accounts_payable ORDER BY createdAt DESC;",
    );
    return result;
  } catch (error) {
    if (handleCloudAccessError(error, "accounts:fixCorruptedData")) {
      return await db.getAllAsync(
        "SELECT id, payableNumber, supplierId, supplierName, documentNumber, description, invoiceNumber, dueDate, baseCurrency, baseAmountUSD, exchangeRateAtCreation, ROUND(amount, 2) as amount, MAX(0, ROUND(COALESCE(paidAmount, 0), 2)) as paidAmount, status, createdAt, updatedAt FROM accounts_payable ORDER BY createdAt DESC;",
      );
    }
    throw error;
  }
};

/**
 * Busca cuentas por pagar por nombre de proveedor, cédula o descripción
 */
export const searchAccountsPayable = async (query) => {
  try {
    if (isCloudAccountsEnabled()) {
      await ensureCloudAccountsSeeded();
      const searchTerm = String(query || "")
        .trim()
        .toLowerCase();
      const accounts = await getAllAccountsPayable();
      if (!searchTerm) return accounts;
      return accounts.filter((account) =>
        [
          account.supplierName,
          account.documentNumber,
          account.description,
          account.invoiceNumber,
          account.payableNumber,
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm),
      );
    }

    const searchTerm = `%${query}%`;
    const result = await db.getAllAsync(
      `SELECT id, payableNumber, supplierId, supplierName, documentNumber, description, invoiceNumber, dueDate, baseCurrency, baseAmountUSD, exchangeRateAtCreation, ROUND(amount, 2) as amount, MAX(0, ROUND(COALESCE(paidAmount, 0), 2)) as paidAmount, status, createdAt, updatedAt FROM accounts_payable 
       WHERE supplierName LIKE ? 
       OR documentNumber LIKE ? 
       OR description LIKE ?
       OR payableNumber LIKE ?
       OR invoiceNumber LIKE ?
       ORDER BY createdAt DESC;`,
      [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm],
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene estadísticas de cuentas por cobrar
 */
export const getAccountsReceivableStats = async () => {
  try {
    if (isCloudAccountsEnabled()) {
      await ensureCloudAccountsSeeded();
      const accounts = await getCloudAccounts("receivable");
      return accounts.reduce(
        (acc, account) => {
          const pendingAmount = Math.max(
            0,
            roundMoney(account.amount) - roundMoney(account.paidAmount),
          );
          const isPending = account.status === "pending" && pendingAmount > 0;
          const isOverdue = account.status === "overdue" && pendingAmount > 0;
          return {
            total: acc.total + 1,
            pending: acc.pending + (isPending ? pendingAmount : 0),
            overdue: acc.overdue + (isOverdue ? pendingAmount : 0),
            totalAmount: acc.totalAmount + pendingAmount,
          };
        },
        { total: 0, pending: 0, overdue: 0, totalAmount: 0 },
      );
    }

    const result = await db.getAllAsync(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' AND COALESCE(paidAmount, 0) < amount THEN (amount - COALESCE(paidAmount, 0)) ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'overdue' AND COALESCE(paidAmount, 0) < amount THEN (amount - COALESCE(paidAmount, 0)) ELSE 0 END) as overdue,
        SUM(CASE WHEN status != 'paid' AND COALESCE(paidAmount, 0) < amount THEN (amount - COALESCE(paidAmount, 0)) ELSE 0 END) as totalAmount
      FROM accounts_receivable
    `);
    return result[0] || { total: 0, pending: 0, overdue: 0, totalAmount: 0 };
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene estadísticas de cuentas por pagar
 */
export const getAccountsPayableStats = async () => {
  try {
    if (isCloudAccountsEnabled()) {
      await ensureCloudAccountsSeeded();
      const accounts = await getCloudAccounts("payable");
      return accounts.reduce(
        (acc, account) => {
          const pendingAmount = Math.max(
            0,
            roundMoney(account.amount) - roundMoney(account.paidAmount),
          );
          const isPending = account.status === "pending" && pendingAmount > 0;
          const isOverdue = account.status === "overdue" && pendingAmount > 0;
          return {
            total: acc.total + 1,
            pending: acc.pending + (isPending ? pendingAmount : 0),
            overdue: acc.overdue + (isOverdue ? pendingAmount : 0),
            totalAmount: acc.totalAmount + pendingAmount,
          };
        },
        { total: 0, pending: 0, overdue: 0, totalAmount: 0 },
      );
    }

    const result = await db.getAllAsync(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' AND COALESCE(paidAmount, 0) < amount THEN (amount - COALESCE(paidAmount, 0)) ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'overdue' AND COALESCE(paidAmount, 0) < amount THEN (amount - COALESCE(paidAmount, 0)) ELSE 0 END) as overdue,
        SUM(CASE WHEN status != 'paid' AND COALESCE(paidAmount, 0) < amount THEN (amount - COALESCE(paidAmount, 0)) ELSE 0 END) as totalAmount
      FROM accounts_payable
    `);
    return result[0] || { total: 0, pending: 0, overdue: 0, totalAmount: 0 };
  } catch (error) {
    throw error;
  }
};

/**
 * Crea una nueva cuenta por cobrar
 */
export const createAccountReceivable = async (accountData) => {
  try {
    if (!isCloudAccountsEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudAccountsEnabled()) {
      await ensureCloudAccountsSeeded();
      const existingAccounts = await getCloudAccounts("receivable");
      const maxSequence = existingAccounts.reduce((maxValue, item) => {
        return Math.max(
          maxValue,
          Number(item.id) || 0,
          parseConsecutiveSequence(item.receivableNumber),
        );
      }, 0);
      const consecutive = await getNextCloudConsecutive("receivable", {
        minimum: maxSequence,
      });
      const id = consecutive.sequence;
      const payload = normalizeAccountRecord(
        {
          ...accountData,
          id,
          receivableNumber: consecutive.value,
          status: "pending",
          createdAt: accountData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        "receivable",
      );
      await setDoc(doc(getReceivableCollectionRef(), String(id)), payload);
      return id;
    }

    const {
      customerId,
      customerName,
      amount,
      baseCurrency,
      baseAmountUSD,
      exchangeRateAtCreation,
      description,
      dueDate,
      documentNumber,
      invoiceNumber,
      createdAt,
    } = accountData;
    const roundedAmount = Math.round(amount * 100) / 100;
    const result = await db.runAsync(
      `INSERT INTO accounts_receivable (customerId, customerName, amount, baseCurrency, baseAmountUSD, exchangeRateAtCreation, description, dueDate, documentNumber, invoiceNumber, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        customerId || null,
        customerName,
        roundedAmount,
        baseCurrency || "VES",
        baseAmountUSD || null,
        exchangeRateAtCreation || null,
        description || null,
        dueDate || null,
        documentNumber || null,
        invoiceNumber || null,
        createdAt || new Date().toISOString(),
      ],
    );
    await db.runAsync(
      "UPDATE accounts_receivable SET receivableNumber = ? WHERE id = ?;",
      [
        formatConsecutiveNumber("receivable", result.lastInsertRowId),
        result.lastInsertRowId,
      ],
    );
    return result.lastInsertRowId;
  } catch (error) {
    throw error;
  }
};

/**
 * Crea una nueva cuenta por pagar
 */
export const createAccountPayable = async (accountData) => {
  try {
    if (!isCloudAccountsEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudAccountsEnabled()) {
      await ensureCloudAccountsSeeded();
      const existingAccounts = await getCloudAccounts("payable");
      const maxSequence = existingAccounts.reduce((maxValue, item) => {
        return Math.max(
          maxValue,
          Number(item.id) || 0,
          parseConsecutiveSequence(item.payableNumber),
        );
      }, 0);
      const consecutive = await getNextCloudConsecutive("payable", {
        minimum: maxSequence,
      });
      const id = consecutive.sequence;
      const payload = normalizeAccountRecord(
        {
          ...accountData,
          id,
          payableNumber: consecutive.value,
          status: "pending",
          createdAt: accountData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        "payable",
      );
      await setDoc(doc(getPayableCollectionRef(), String(id)), payload);
      return id;
    }

    const {
      supplierId,
      supplierName,
      amount,
      baseCurrency,
      baseAmountUSD,
      exchangeRateAtCreation,
      description,
      dueDate,
      documentNumber,
      invoiceNumber,
      createdAt,
    } = accountData;
    const roundedAmount = Math.round(amount * 100) / 100;
    const result = await db.runAsync(
      `INSERT INTO accounts_payable (supplierId, supplierName, amount, baseCurrency, baseAmountUSD, exchangeRateAtCreation, description, dueDate, documentNumber, invoiceNumber, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        supplierId || null,
        supplierName,
        roundedAmount,
        baseCurrency || "VES",
        baseAmountUSD || null,
        exchangeRateAtCreation || null,
        description || null,
        dueDate || null,
        documentNumber || null,
        invoiceNumber || null,
        createdAt || new Date().toISOString(),
      ],
    );
    await db.runAsync(
      "UPDATE accounts_payable SET payableNumber = ? WHERE id = ?;",
      [
        formatConsecutiveNumber("payable", result.lastInsertRowId),
        result.lastInsertRowId,
      ],
    );
    return result.lastInsertRowId;
  } catch (error) {
    throw error;
  }
};

/**
 * Actualiza una cuenta por cobrar
 */
export const updateAccountReceivable = async (id, accountData) => {
  try {
    if (!isCloudAccountsEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudAccountsEnabled()) {
      await ensureCloudAccountsSeeded();
      await setDoc(
        doc(getReceivableCollectionRef(), String(id)),
        normalizeAccountRecord(
          {
            ...accountData,
            id: Number(id),
            updatedAt: new Date().toISOString(),
          },
          "receivable",
        ),
        { merge: true },
      );
      return;
    }

    const {
      customerName,
      amount,
      baseCurrency,
      baseAmountUSD,
      exchangeRateAtCreation,
      description,
      dueDate,
      documentNumber,
      invoiceNumber,
    } = accountData;
    await db.runAsync(
      `UPDATE accounts_receivable
       SET customerName = ?, amount = ?, baseCurrency = ?, baseAmountUSD = ?, exchangeRateAtCreation = ?, description = ?, dueDate = ?, documentNumber = ?, invoiceNumber = ?, updatedAt = datetime('now')
       WHERE id = ?`,
      [
        customerName,
        amount,
        baseCurrency || "VES",
        baseAmountUSD ?? null,
        exchangeRateAtCreation ?? null,
        description || null,
        dueDate || null,
        documentNumber || null,
        invoiceNumber || null,
        id,
      ],
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Actualiza una cuenta por pagar
 */
export const updateAccountPayable = async (id, accountData) => {
  try {
    if (!isCloudAccountsEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudAccountsEnabled()) {
      await ensureCloudAccountsSeeded();
      await setDoc(
        doc(getPayableCollectionRef(), String(id)),
        normalizeAccountRecord(
          {
            ...accountData,
            id: Number(id),
            updatedAt: new Date().toISOString(),
          },
          "payable",
        ),
        { merge: true },
      );
      return;
    }

    const {
      supplierName,
      amount,
      baseCurrency,
      baseAmountUSD,
      exchangeRateAtCreation,
      description,
      dueDate,
    } = accountData;
    await db.runAsync(
      `UPDATE accounts_payable
       SET supplierName = ?, amount = ?, baseCurrency = ?, baseAmountUSD = ?, exchangeRateAtCreation = ?, description = ?, dueDate = ?, updatedAt = datetime('now')
       WHERE id = ?`,
      [
        supplierName,
        amount,
        baseCurrency || "VES",
        baseAmountUSD || null,
        exchangeRateAtCreation || null,
        description || null,
        dueDate || null,
        id,
      ],
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Marca una cuenta por cobrar como pagada
 */
export const markAccountReceivableAsPaid = async (id) => {
  try {
    if (!isCloudAccountsEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudAccountsEnabled()) {
      await ensureCloudAccountsSeeded();
      const ref = doc(getReceivableCollectionRef(), String(id));
      const snapshot = await getDoc(ref);
      if (!snapshot.exists()) {
        throw new Error("Cuenta no encontrada");
      }
      const account = normalizeAccountRecord(snapshot.data(), "receivable");
      await updateDoc(ref, {
        status: "paid",
        paidAmount: roundMoney(account.amount),
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    await db.runAsync(
      `UPDATE accounts_receivable
       SET status = 'paid', paidAt = datetime('now'), updatedAt = datetime('now')
       WHERE id = ?`,
      [id],
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Marca una cuenta por pagar como pagada
 */
export const markAccountPayableAsPaid = async (id) => {
  try {
    if (!isCloudAccountsEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudAccountsEnabled()) {
      await ensureCloudAccountsSeeded();
      const ref = doc(getPayableCollectionRef(), String(id));
      const snapshot = await getDoc(ref);
      if (!snapshot.exists()) {
        throw new Error("Cuenta no encontrada");
      }
      const account = normalizeAccountRecord(snapshot.data(), "payable");
      await updateDoc(ref, {
        status: "paid",
        paidAmount: roundMoney(account.amount),
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    await db.runAsync(
      `UPDATE accounts_payable
       SET status = 'paid', paidAt = datetime('now'), updatedAt = datetime('now')
       WHERE id = ?`,
      [id],
    );
  } catch (error) {
    throw error;
  }
};

/**
 * Elimina una cuenta por cobrar
 */
export const deleteAccountReceivable = async (id) => {
  try {
    if (!isCloudAccountsEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudAccountsEnabled()) {
      await ensureCloudAccountsSeeded();
      const payments = await getCloudPayments();
      const matchingPayments = payments.filter(
        (payment) =>
          payment.accountType === "receivable" &&
          Number(payment.accountId) === Number(id),
      );

      const batch = writeBatch(firestore);
      matchingPayments.forEach((payment) => {
        batch.delete(doc(getPaymentsCollectionRef(), String(payment.id)));
      });
      batch.delete(doc(getReceivableCollectionRef(), String(id)));
      await batch.commit();
      return;
    }

    // Primero eliminar los pagos asociados
    await db.runAsync(
      "DELETE FROM account_payments WHERE accountId = ? AND accountType = 'receivable'",
      [id],
    );
    // Luego eliminar la cuenta
    await db.runAsync("DELETE FROM accounts_receivable WHERE id = ?", [id]);
  } catch (error) {
    throw error;
  }
};

/**
 * Elimina una cuenta por pagar
 */
export const deleteAccountPayable = async (id) => {
  try {
    if (!isCloudAccountsEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudAccountsEnabled()) {
      await ensureCloudAccountsSeeded();
      const payments = await getCloudPayments();
      const matchingPayments = payments.filter(
        (payment) =>
          payment.accountType === "payable" &&
          Number(payment.accountId) === Number(id),
      );

      const batch = writeBatch(firestore);
      matchingPayments.forEach((payment) => {
        batch.delete(doc(getPaymentsCollectionRef(), String(payment.id)));
      });
      batch.delete(doc(getPayableCollectionRef(), String(id)));
      await batch.commit();
      return;
    }

    // Primero eliminar los pagos asociados
    await db.runAsync(
      "DELETE FROM account_payments WHERE accountId = ? AND accountType = 'payable'",
      [id],
    );
    // Luego eliminar la cuenta
    await db.runAsync("DELETE FROM accounts_payable WHERE id = ?", [id]);
  } catch (error) {
    throw error;
  }
};

/**
 * Registra un pago parcial para una cuenta por cobrar
 */
export const recordAccountPayment = async (
  accountId,
  paymentData,
  accountType = "receivable",
) => {
  try {
    if (!isCloudAccountsEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudAccountsEnabled()) {
      await ensureCloudAccountsSeeded();

      const collectionRef =
        accountType === "payable"
          ? getPayableCollectionRef()
          : getReceivableCollectionRef();
      const accountRef = doc(collectionRef, String(accountId));
      const accountSnapshot = await getDoc(accountRef);

      if (!accountSnapshot.exists()) {
        throw new Error("Cuenta no encontrada");
      }

      const account = normalizeAccountRecord(
        accountSnapshot.data(),
        accountType,
      );
      const { amount, paymentMethod, paymentDate, reference, notes } =
        paymentData;
      const numericAmount = Number(amount);

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error("Monto de pago inválido");
      }

      const roundedAmount = roundMoney(numericAmount);
      const remaining = Math.max(
        0,
        roundMoney(account.amount) - roundMoney(account.paidAmount),
      );

      if (remaining <= 0) {
        throw new Error("La cuenta ya está pagada");
      }

      if (roundedAmount > remaining + 0.01) {
        throw new Error("El monto no puede ser mayor al saldo pendiente");
      }

      const paymentId = createCloudNumericId();
      await setDoc(
        doc(getPaymentsCollectionRef(), String(paymentId)),
        normalizePaymentRecord({
          id: paymentId,
          accountId,
          accountType,
          amount: roundedAmount,
          paymentMethod,
          paymentDate: paymentDate || new Date().toISOString(),
          reference,
          notes,
          createdAt: new Date().toISOString(),
        }),
      );

      const nextPaidAmount = roundMoney(account.paidAmount + roundedAmount);
      const isPaid = nextPaidAmount + 0.01 >= roundMoney(account.amount);

      await updateDoc(accountRef, {
        paidAmount: isPaid ? roundMoney(account.amount) : nextPaidAmount,
        status: isPaid ? "paid" : account.status,
        paidAt: isPaid ? new Date().toISOString() : account.paidAt || null,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    const { amount, paymentMethod, paymentDate, reference, notes } =
      paymentData;

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new Error("Monto de pago inválido");
    }

    const roundedAmount = Math.round(numericAmount * 100) / 100;

    const tableName =
      accountType === "payable" ? "accounts_payable" : "accounts_receivable";

    // Evitar pagar más de lo debido (validación a nivel de BD)
    const currentAccount = await db.getFirstAsync(
      `SELECT ROUND(amount, 2) as amount, MAX(0, ROUND(COALESCE(paidAmount, 0), 2)) as paidAmount FROM ${tableName} WHERE id = ?`,
      [accountId],
    );

    if (!currentAccount) {
      throw new Error("Cuenta no encontrada");
    }

    const remaining = Math.max(
      0,
      (currentAccount.amount || 0) - (currentAccount.paidAmount || 0),
    );

    if (remaining <= 0) {
      throw new Error("La cuenta ya está pagada");
    }

    if (roundedAmount > remaining + 0.01) {
      throw new Error("El monto no puede ser mayor al saldo pendiente");
    }

    // Insertar el pago
    await db.runAsync(
      `INSERT INTO account_payments (accountId, accountType, amount, paymentMethod, paymentDate, reference, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        accountId,
        accountType,
        roundedAmount,
        paymentMethod,
        paymentDate || new Date().toISOString(),
        reference || "",
        notes || "",
      ],
    );

    // Actualizar el monto pagado en la cuenta
    await db.runAsync(
      `UPDATE ${tableName}
       SET paidAmount = ROUND(CASE WHEN (COALESCE(paidAmount, 0) + ?) < 0 THEN 0 ELSE (COALESCE(paidAmount, 0) + ?) END, 2), updatedAt = datetime('now')
       WHERE id = ?`,
      [roundedAmount, roundedAmount, accountId],
    );

    // Verificar si la cuenta está completamente pagada (con tolerancia de 1 centavo)
    const account = await db.getFirstAsync(
      `SELECT ROUND(amount, 2) as amount, ROUND(paidAmount, 2) as paidAmount FROM ${tableName} WHERE id = ?`,
      [accountId],
    );

    if (account && account.paidAmount + 0.01 >= account.amount) {
      await db.runAsync(
        `UPDATE ${tableName}
         SET status = 'paid', paidAt = datetime('now'), updatedAt = datetime('now')
         WHERE id = ?`,
        [accountId],
      );
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Obtiene todos los pagos de una cuenta
 */
export const getAccountPayments = async (
  accountId,
  accountType = "receivable",
) => {
  try {
    if (isCloudAccountsEnabled()) {
      await ensureCloudAccountsSeeded();
      const payments = await getCloudPayments();
      return sortByCreatedAtDesc(
        payments.filter(
          (payment) =>
            Number(payment.accountId) === Number(accountId) &&
            payment.accountType === accountType,
        ),
      );
    }

    const result = await db.getAllAsync(
      `SELECT id, accountId, accountType, ROUND(amount, 2) as amount, paymentMethod, paymentDate, reference, notes FROM account_payments
       WHERE accountId = ? AND accountType = ?
       ORDER BY paymentDate DESC`,
      [accountId, accountType],
    );
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Calcula el saldo pendiente de una cuenta
 */
export const getAccountBalance = async (
  accountId,
  accountType = "receivable",
) => {
  try {
    if (isCloudAccountsEnabled()) {
      await ensureCloudAccountsSeeded();
      const ref = doc(
        accountType === "payable"
          ? getPayableCollectionRef()
          : getReceivableCollectionRef(),
        String(accountId),
      );
      const snapshot = await getDoc(ref);

      if (!snapshot.exists()) {
        throw new Error("Cuenta no encontrada");
      }

      const account = normalizeAccountRecord(snapshot.data(), accountType);
      const balance =
        roundMoney(account.amount) - roundMoney(account.paidAmount);
      return {
        totalAmount: roundMoney(account.amount),
        paidAmount: roundMoney(account.paidAmount),
        balance: Math.max(0, roundMoney(balance)),
        isPaid: balance <= 0,
      };
    }

    const tableName =
      accountType === "payable" ? "accounts_payable" : "accounts_receivable";

    const account = await db.getFirstAsync(
      `SELECT ROUND(amount, 2) as amount, MAX(0, ROUND(COALESCE(paidAmount, 0), 2)) as paidAmount FROM ${tableName} WHERE id = ?`,
      [accountId],
    );

    if (!account) {
      throw new Error("Cuenta no encontrada");
    }

    const balance = account.amount - account.paidAmount;
    return {
      totalAmount: account.amount,
      paidAmount: account.paidAmount,
      balance: Math.max(0, balance), // No permitir saldos negativos
      isPaid: balance <= 0,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Corrige datos corruptos en cuentas (paidAmount negativo, etc.)
 */
export const fixCorruptedAccountData = async () => {
  try {
    if (isCloudAccountsEnabled()) {
      await ensureCloudAccountsSeeded();

      const [receivableAccounts, payableAccounts, payments] = await Promise.all(
        [
          getCloudAccounts("receivable"),
          getCloudAccounts("payable"),
          getCloudPayments(),
        ],
      );

      const receivableIds = new Set(
        receivableAccounts.map((item) => Number(item.id)),
      );
      const payableIds = new Set(
        payableAccounts.map((item) => Number(item.id)),
      );
      const batch = writeBatch(firestore);
      let hasChanges = false;

      payments.forEach((payment) => {
        const isValid =
          payment.accountType === "payable"
            ? payableIds.has(Number(payment.accountId))
            : receivableIds.has(Number(payment.accountId));

        if (!isValid) {
          batch.delete(doc(getPaymentsCollectionRef(), String(payment.id)));
          hasChanges = true;
        }
      });

      const reconcileAccounts = (accounts, accountType) => {
        accounts.forEach((account) => {
          const totalPaid = payments
            .filter(
              (payment) =>
                payment.accountType === accountType &&
                Number(payment.accountId) === Number(account.id),
            )
            .reduce((sum, payment) => sum + roundMoney(payment.amount), 0);

          const paidAmount = Math.max(0, roundMoney(totalPaid));
          const amount = roundMoney(account.amount);
          const isPaid = paidAmount + 0.01 >= amount;
          const nextStatus = isPaid
            ? "paid"
            : account.status === "paid"
              ? "pending"
              : account.status;

          if (
            roundMoney(account.paidAmount) !== paidAmount ||
            String(account.status || "") !== nextStatus
          ) {
            batch.set(
              doc(
                accountType === "payable"
                  ? getPayableCollectionRef()
                  : getReceivableCollectionRef(),
                String(account.id),
              ),
              {
                paidAmount: isPaid ? amount : paidAmount,
                status: nextStatus,
                paidAt: isPaid
                  ? account.paidAt || new Date().toISOString()
                  : null,
                updatedAt: new Date().toISOString(),
              },
              { merge: true },
            );
            hasChanges = true;
          }
        });
      };

      reconcileAccounts(receivableAccounts, "receivable");
      reconcileAccounts(payableAccounts, "payable");

      if (hasChanges) {
        await batch.commit();
      }
      return;
    }

    // Verificar si hay datos corruptos antes de proceder
    const orphanedPaymentsReceivable = await db.getFirstAsync(`
      SELECT COUNT(*) as count FROM account_payments 
      WHERE accountType = 'receivable' 
      AND accountId NOT IN (SELECT id FROM accounts_receivable)
    `);

    const orphanedPaymentsPayable = await db.getFirstAsync(`
      SELECT COUNT(*) as count FROM account_payments 
      WHERE accountType = 'payable' 
      AND accountId NOT IN (SELECT id FROM accounts_payable)
    `);

    const negativePaidReceivable = await db.getFirstAsync(`
      SELECT COUNT(*) as count FROM accounts_receivable 
      WHERE COALESCE(paidAmount, 0) < 0
    `);

    const negativePaidPayable = await db.getFirstAsync(`
      SELECT COUNT(*) as count FROM accounts_payable 
      WHERE COALESCE(paidAmount, 0) < 0
    `);

    const hasCorruptedData =
      orphanedPaymentsReceivable?.count > 0 ||
      orphanedPaymentsPayable?.count > 0 ||
      negativePaidReceivable?.count > 0 ||
      negativePaidPayable?.count > 0;

    if (!hasCorruptedData) {
      return; // No hay datos corruptos, salir
    }

    console.log("Corrigiendo datos corruptos en cuentas...");

    // Eliminar pagos huérfanos (pagos sin cuenta asociada)
    await db.runAsync(`
      DELETE FROM account_payments 
      WHERE accountType = 'receivable' 
      AND accountId NOT IN (SELECT id FROM accounts_receivable)
    `);

    await db.runAsync(`
      DELETE FROM account_payments 
      WHERE accountType = 'payable' 
      AND accountId NOT IN (SELECT id FROM accounts_payable)
    `);

    // Corregir cuentas por cobrar con paidAmount negativo
    await db.runAsync(
      `UPDATE accounts_receivable 
       SET paidAmount = 0 
       WHERE COALESCE(paidAmount, 0) < 0`,
    );

    // Corregir cuentas por pagar con paidAmount negativo
    await db.runAsync(
      `UPDATE accounts_payable 
       SET paidAmount = 0 
       WHERE COALESCE(paidAmount, 0) < 0`,
    );

    // Recalcular paidAmount basado en los pagos registrados
    const recalculatePaidAmount = async (tableName) => {
      const accounts = await db.getAllAsync(`SELECT id FROM ${tableName}`);
      for (const account of accounts) {
        const totalPaid = await db.getFirstAsync(
          `SELECT SUM(amount) as total FROM account_payments 
           WHERE accountId = ? AND accountType = ?`,
          [
            account.id,
            tableName === "accounts_payable" ? "payable" : "receivable",
          ],
        );
        const correctPaidAmount = Math.max(
          0,
          Math.round((totalPaid?.total || 0) * 100) / 100,
        );
        await db.runAsync(
          `UPDATE ${tableName} SET paidAmount = ? WHERE id = ?`,
          [correctPaidAmount, account.id],
        );
      }
    };

    await recalculatePaidAmount("accounts_receivable");
    await recalculatePaidAmount("accounts_payable");

    console.log("Datos corruptos corregidos");
  } catch (error) {
    if (handleCloudAccessError(error, "accounts:fixCorruptedData")) {
      return;
    }
    console.error("Error fixing corrupted data:", error);
    throw error;
  }
};

export const updateReceivableAmountsOnRateChange = async (newRate) => {
  try {
    if (!isCloudAccountsEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudAccountsEnabled()) {
      await ensureCloudAccountsSeeded();
      const accounts = await getCloudAccounts("receivable");
      const batch = writeBatch(firestore);
      let hasChanges = false;

      accounts.forEach((account) => {
        const amount = roundMoney(account.amount);
        const paidAmount = roundMoney(account.paidAmount);

        if (paidAmount + 0.01 >= amount) {
          batch.set(
            doc(getReceivableCollectionRef(), String(account.id)),
            {
              status: "paid",
              paidAt: account.paidAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );
          hasChanges = true;
          return;
        }

        if (
          account.baseCurrency === "USD" &&
          Number(account.baseAmountUSD) > 0
        ) {
          batch.set(
            doc(getReceivableCollectionRef(), String(account.id)),
            {
              amount: roundMoney(
                Number(account.baseAmountUSD) * Number(newRate || 0),
              ),
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );
          hasChanges = true;
        }
      });

      if (hasChanges) {
        await batch.commit();
      }
      return;
    }

    // 1) Congelar las que ya están efectivamente pagadas (tolerancia 0.01) antes de tocar montos.
    // Esto evita que por redondeos queden como "pendientes" y luego cambien/disappezcan al recalcular.
    await db.runAsync(
      `UPDATE accounts_receivable
       SET status = 'paid',
           paidAt = COALESCE(paidAt, datetime('now')),
           updatedAt = datetime('now')
       WHERE status != 'paid'
         AND (ROUND(COALESCE(paidAmount, 0), 2) + 0.01) >= ROUND(amount, 2)`,
    );

    // Actualizar amounts para cuentas por cobrar USD-base (manuales y originadas en ventas)
    // Regla: NO tocar pagadas ni ya totalmente pagadas (aunque status esté inconsistente)
    await db.runAsync(
      `UPDATE accounts_receivable
       SET amount = ROUND(baseAmountUSD * ?, 2)
       WHERE status != 'paid'
         AND (ROUND(COALESCE(paidAmount, 0), 2) + 0.01) < ROUND(amount, 2)
         AND baseCurrency = 'USD'
         AND baseAmountUSD IS NOT NULL AND baseAmountUSD > 0`,
      [newRate],
    );
    console.log("Amounts de cuentas por cobrar actualizados con nueva tasa");
  } catch (error) {
    console.error("Error updating receivable amounts:", error);
    throw error;
  }
};

/**
 * Actualiza los montos de cuentas por pagar cuando cambia la tasa de cambio
 */
export const updatePayableAmountsOnRateChange = async (newRate) => {
  try {
    if (!isCloudAccountsEnabled()) {
      assertSharedStoreCloudWriteAvailable();
    }

    if (isCloudAccountsEnabled()) {
      await ensureCloudAccountsSeeded();
      const accounts = await getCloudAccounts("payable");
      const batch = writeBatch(firestore);
      let hasChanges = false;

      accounts.forEach((account) => {
        const amount = roundMoney(account.amount);
        const paidAmount = roundMoney(account.paidAmount);

        if (paidAmount + 0.01 >= amount) {
          batch.set(
            doc(getPayableCollectionRef(), String(account.id)),
            {
              status: "paid",
              paidAt: account.paidAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );
          hasChanges = true;
          return;
        }

        if (
          account.baseCurrency === "USD" &&
          Number(account.baseAmountUSD) > 0
        ) {
          batch.set(
            doc(getPayableCollectionRef(), String(account.id)),
            {
              amount: roundMoney(
                Number(account.baseAmountUSD) * Number(newRate || 0),
              ),
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );
          hasChanges = true;
        }
      });

      if (hasChanges) {
        await batch.commit();
      }
      return;
    }

    // 1) Congelar las que ya están efectivamente pagadas (tolerancia 0.01) antes de tocar montos.
    // Esto evita que por redondeos queden como "pendientes" y luego cambien/disappezcan al recalcular.
    await db.runAsync(
      `UPDATE accounts_payable
       SET status = 'paid',
           paidAt = COALESCE(paidAt, datetime('now')),
           updatedAt = datetime('now')
       WHERE status != 'paid'
         AND (ROUND(COALESCE(paidAmount, 0), 2) + 0.01) >= ROUND(amount, 2)`,
    );

    // Actualizar amounts para cuentas por pagar USD-base
    // Regla: NO tocar pagadas ni ya totalmente pagadas (aunque status esté inconsistente)
    await db.runAsync(
      `UPDATE accounts_payable
       SET amount = ROUND(baseAmountUSD * ?, 2)
       WHERE status != 'paid'
         AND (ROUND(COALESCE(paidAmount, 0), 2) + 0.01) < ROUND(amount, 2)
         AND baseCurrency = 'USD'
         AND baseAmountUSD IS NOT NULL AND baseAmountUSD > 0`,
      [newRate],
    );
    console.log("Amounts de cuentas por pagar actualizados con nueva tasa");
  } catch (error) {
    console.error("Error updating payable amounts:", error);
    throw error;
  }
};
