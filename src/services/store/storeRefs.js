import { collection, doc } from "firebase/firestore";
import { auth, firestore } from "../firebase/firebase";
import { getActiveStoreId } from "./storeSession";

const normalizeValue = (value) => String(value || "").trim();

export const getCurrentUserIdOrThrow = (uid = auth.currentUser?.uid) => {
  const resolvedUid = normalizeValue(uid);
  if (!resolvedUid) {
    throw new Error("No hay un usuario autenticado.");
  }
  return resolvedUid;
};

export const getActiveStoreIdOrThrow = (storeId = getActiveStoreId()) => {
  const resolvedStoreId = normalizeValue(storeId);
  if (!resolvedStoreId) {
    throw new Error("No hay una tienda activa en la sesión.");
  }
  return resolvedStoreId;
};

export const hasActiveStoreContext = (storeId = getActiveStoreId()) =>
  Boolean(normalizeValue(auth.currentUser?.uid) && normalizeValue(storeId));

export const getUserDocRef = (uid = auth.currentUser?.uid) =>
  doc(firestore, "users", getCurrentUserIdOrThrow(uid));

export const getUserMembershipDocRef = (
  uid = auth.currentUser?.uid,
  storeId = getActiveStoreId(),
) =>
  doc(
    firestore,
    "users",
    getCurrentUserIdOrThrow(uid),
    "memberships",
    getActiveStoreIdOrThrow(storeId),
  );

export const getUserMembershipsCollectionRef = (uid = auth.currentUser?.uid) =>
  collection(firestore, "users", getCurrentUserIdOrThrow(uid), "memberships");

export const getStoreDocRef = (storeId = getActiveStoreId()) =>
  doc(firestore, "stores", getActiveStoreIdOrThrow(storeId));

export const getStoreMemberDocRef = (
  storeId = getActiveStoreId(),
  uid = auth.currentUser?.uid,
) =>
  doc(
    firestore,
    "stores",
    getActiveStoreIdOrThrow(storeId),
    "members",
    getCurrentUserIdOrThrow(uid),
  );

export const getStoreCollectionRef = (
  collectionName,
  storeId = getActiveStoreId(),
) =>
  collection(
    firestore,
    "stores",
    getActiveStoreIdOrThrow(storeId),
    collectionName,
  );

export const getStoreNestedDocRef = (
  segments,
  storeId = getActiveStoreId(),
) => {
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error("Los segmentos del documento son requeridos.");
  }

  return doc(
    firestore,
    "stores",
    getActiveStoreIdOrThrow(storeId),
    ...segments,
  );
};

export const getActiveStoreSeedKey = (
  uid = auth.currentUser?.uid,
  storeId = getActiveStoreId(),
) => `${getCurrentUserIdOrThrow(uid)}:${getActiveStoreIdOrThrow(storeId)}`;
