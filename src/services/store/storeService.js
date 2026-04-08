import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { firestore } from "../firebase/firebase";
import { clearStoreSession, setStoreSession } from "./storeSession";

const normalizeValue = (value) => String(value || "").trim();

const buildDefaultStoreName = (user, userData = {}) => {
  const businessName = normalizeValue(userData?.businessName);
  if (businessName) return businessName;

  const displayName = normalizeValue(user?.displayName);
  if (displayName) return `Tienda de ${displayName}`;

  return "Mi Tienda";
};

const mapMembership = (snapshot) => {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    storeId: String(data.storeId || snapshot.id).trim(),
    storeName: String(data.storeName || "").trim(),
    role: String(data.role || "member").trim(),
    status: String(data.status || "active").trim(),
    ownerUserId: String(data.ownerUserId || "").trim(),
  };
};

const sortMemberships = (memberships = []) => {
  return [...memberships].sort((a, b) => {
    if (a.role === "owner" && b.role !== "owner") return -1;
    if (a.role !== "owner" && b.role === "owner") return 1;
    return String(a.storeName || "").localeCompare(
      String(b.storeName || ""),
      "es",
      {
        sensitivity: "base",
      },
    );
  });
};

export const clearActiveStoreSession = () => {
  clearStoreSession();
};

export const ensureUserStoreContext = async (user, options = {}) => {
  const uid = normalizeValue(user?.uid);
  if (!uid) {
    throw new Error("No hay un usuario válido para resolver la tienda.");
  }

  const userRef = doc(firestore, "users", uid);
  const membershipsRef = collection(firestore, "users", uid, "memberships");

  const [userSnapshot, membershipsSnapshot] = await Promise.all([
    getDoc(userRef),
    getDocs(membershipsRef),
  ]);

  const userData = userSnapshot.exists() ? userSnapshot.data() || {} : {};
  let memberships = membershipsSnapshot.docs.map(mapMembership);

  if (memberships.length === 0) {
    const storeRef = doc(collection(firestore, "stores"));
    const storeId = storeRef.id;
    const storeName = buildDefaultStoreName(user, userData);

    await setDoc(
      storeRef,
      {
        id: storeId,
        name: storeName,
        ownerUserId: uid,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    await setDoc(
      doc(firestore, "stores", storeId, "members", uid),
      {
        uid,
        storeId,
        role: "owner",
        status: "active",
        ownerUserId: uid,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    await setDoc(
      doc(firestore, "users", uid, "memberships", storeId),
      {
        storeId,
        storeName,
        role: "owner",
        status: "active",
        ownerUserId: uid,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    memberships = [
      {
        id: storeId,
        storeId,
        storeName,
        role: "owner",
        status: "active",
        ownerUserId: uid,
      },
    ];
  }

  const orderedMemberships = sortMemberships(
    memberships.filter((item) => item.status !== "inactive"),
  );

  const requestedStoreId = normalizeValue(options.preferredStoreId);
  const persistedActiveStoreId = normalizeValue(userData?.activeStoreId);
  const persistedDefaultStoreId = normalizeValue(userData?.defaultStoreId);

  const activeMembership =
    orderedMemberships.find((item) => item.storeId === requestedStoreId) ||
    orderedMemberships.find(
      (item) => item.storeId === persistedActiveStoreId,
    ) ||
    orderedMemberships[0];

  if (!activeMembership) {
    throw new Error("No se pudo resolver una tienda activa para el usuario.");
  }

  const defaultMembership =
    orderedMemberships.find(
      (item) => item.storeId === persistedDefaultStoreId,
    ) ||
    orderedMemberships.find((item) => item.role === "owner") ||
    activeMembership;

  await setDoc(
    userRef,
    {
      activeStoreId: activeMembership.storeId,
      defaultStoreId: defaultMembership.storeId,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  const session = setStoreSession({
    userId: uid,
    activeStoreId: activeMembership.storeId,
    defaultStoreId: defaultMembership.storeId,
  });

  return {
    ...session,
    memberships: orderedMemberships,
    activeStore: activeMembership,
    defaultStore: defaultMembership,
  };
};

export const switchActiveStoreForUser = async ({ userId, storeId }) => {
  const uid = normalizeValue(userId);
  const nextStoreId = normalizeValue(storeId);

  if (!uid || !nextStoreId) {
    throw new Error(
      "Usuario y tienda son requeridos para cambiar de contexto.",
    );
  }

  const membershipSnapshot = await getDoc(
    doc(firestore, "users", uid, "memberships", nextStoreId),
  );

  if (!membershipSnapshot.exists()) {
    throw new Error("El usuario no pertenece a la tienda seleccionada.");
  }

  const userRef = doc(firestore, "users", uid);
  const userSnapshot = await getDoc(userRef);
  const userData = userSnapshot.exists() ? userSnapshot.data() || {} : {};
  const defaultStoreId =
    normalizeValue(userData?.defaultStoreId) || nextStoreId;

  await setDoc(
    userRef,
    {
      activeStoreId: nextStoreId,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return setStoreSession({
    userId: uid,
    activeStoreId: nextStoreId,
    defaultStoreId,
  });
};
