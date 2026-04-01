import { doc, runTransaction } from "firebase/firestore";
import { auth, firestore } from "../firebase/firebase";

export const CONSECUTIVE_CONFIG = {
  product: { field: "productNumber", prefix: "PRD", digits: 6 },
  customer: { field: "customerNumber", prefix: "CLI", digits: 6 },
  supplier: { field: "supplierNumber", prefix: "PRV", digits: 6 },
  sale: { field: "saleNumber", prefix: "VTA", digits: 6 },
  receivable: { field: "receivableNumber", prefix: "CXC", digits: 6 },
  payable: { field: "payableNumber", prefix: "CXP", digits: 6 },
  movement: { field: "movementNumber", prefix: "MOV", digits: 6 },
};

const getEntityConfig = (entityType) => {
  const config = CONSECUTIVE_CONFIG[entityType];
  if (!config) {
    throw new Error(`Tipo de consecutivo no soportado: ${entityType}`);
  }
  return config;
};

export const formatConsecutiveNumber = (entityType, sequence) => {
  const { prefix, digits } = getEntityConfig(entityType);
  return `${prefix}-${String(Number(sequence) || 0).padStart(digits, "0")}`;
};

export const getConsecutiveFieldName = (entityType) => {
  return getEntityConfig(entityType).field;
};

export const getDisplayConsecutive = (entityType, record = {}) => {
  const fieldName = getConsecutiveFieldName(entityType);
  return record[fieldName] || formatConsecutiveNumber(entityType, record.id);
};

export const parseConsecutiveSequence = (value) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^(?:[A-Z]+-)?(\d+)$/i);
  return match ? Number(match[1]) || 0 : 0;
};

export const getNextCloudConsecutive = async (entityType, options = {}) => {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("No hay un usuario autenticado para generar consecutivos");
  }

  const config = getEntityConfig(entityType);
  const userRef = doc(firestore, "users", uid);
  const minimum = Math.max(0, Number(options.minimum) || 0);

  return runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    const data = snapshot.exists() ? snapshot.data() || {} : {};
    const counters = data.counters || {};
    const currentValue = Number(counters[entityType]) || 0;
    const nextValue = Math.max(currentValue, minimum) + 1;

    transaction.set(
      userRef,
      {
        counters: {
          ...counters,
          [entityType]: nextValue,
        },
      },
      { merge: true },
    );

    return {
      sequence: nextValue,
      value: `${config.prefix}-${String(nextValue).padStart(config.digits, "0")}`,
      field: config.field,
    };
  });
};
