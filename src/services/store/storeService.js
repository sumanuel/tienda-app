import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { firestore } from "../firebase/firebase";
import { isPermissionDeniedError } from "../firebase/cloudAccess";
import { clearStoreSession, setStoreSession } from "./storeSession";

const normalizeValue = (value) => String(value || "").trim();

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

async function ensureOwnerStoreMemberLink(uid, membership, options = {}) {
  const storeId = normalizeValue(membership?.storeId);
  const role = normalizeValue(membership?.role);

  if (!uid || !storeId || role !== "owner") {
    return false;
  }

  try {
    await setDoc(
      doc(firestore, "stores", storeId, "members", uid),
      {
        uid,
        storeId,
        role: "owner",
        status: normalizeValue(membership?.status) || "active",
        ownerUserId: normalizeValue(membership?.ownerUserId) || uid,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return true;
  } catch (error) {
    if (!options.silent) {
      console.warn("Owner membership reconciliation failed:", error);
    }
    return false;
  }
}

const mergeMembershipWithStoreData = async (uid, membership, storeSnapshot) => {
  if (!storeSnapshot.exists()) {
    return {
      ...membership,
      cloudAccessible: false,
      missingStore: true,
    };
  }

  const storeData = storeSnapshot.data() || {};
  const resolvedStoreName = normalizeValue(storeData?.name);
  const resolvedOwnerUserId =
    normalizeValue(storeData?.ownerUserId) ||
    normalizeValue(membership?.ownerUserId);

  const nextMembership = {
    ...membership,
    storeName: resolvedStoreName || normalizeValue(membership?.storeName),
    ownerUserId: resolvedOwnerUserId,
    cloudAccessible: true,
  };

  const storeNameChanged = nextMembership.storeName !== membership.storeName;
  const ownerChanged = nextMembership.ownerUserId !== membership.ownerUserId;

  if (storeNameChanged || ownerChanged) {
    await setDoc(
      doc(firestore, "users", uid, "memberships", nextMembership.storeId),
      {
        storeId: nextMembership.storeId,
        storeName: nextMembership.storeName,
        ownerUserId: nextMembership.ownerUserId,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  return nextMembership;
};

const hydrateMembershipFromStore = async (uid, membership) => {
  const storeId = normalizeValue(membership?.storeId);

  if (!uid || !storeId) {
    return {
      ...membership,
      cloudAccessible: false,
    };
  }

  try {
    const storeSnapshot = await getDoc(doc(firestore, "stores", storeId));
    return await mergeMembershipWithStoreData(uid, membership, storeSnapshot);
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      const repaired = await ensureOwnerStoreMemberLink(uid, membership, {
        silent: true,
      });

      if (repaired) {
        try {
          const retriedStoreSnapshot = await getDoc(
            doc(firestore, "stores", storeId),
          );
          return await mergeMembershipWithStoreData(
            uid,
            membership,
            retriedStoreSnapshot,
          );
        } catch (retryError) {
          console.warn(
            "Membership hydration from store failed after reconciliation:",
            retryError,
          );
        }
      }

      console.warn("Membership hydration from store failed:", error);
      return {
        ...membership,
        cloudAccessible: false,
        accessError: "permission-denied",
      };
    }

    console.warn("Membership hydration from store failed:", error);
    return {
      ...membership,
      cloudAccessible: false,
      accessError: "unknown",
    };
  }
};

const hydrateMemberships = async (uid, memberships = []) => {
  return await Promise.all(
    memberships.map((membership) =>
      hydrateMembershipFromStore(uid, membership),
    ),
  );
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
  const memberships = await hydrateMemberships(
    uid,
    membershipsSnapshot.docs.map(mapMembership),
  );

  const availableMemberships = memberships.filter(
    (item) => item.status !== "inactive" && item.cloudAccessible !== false,
  );

  if (memberships.length === 0) {
    clearStoreSession();
    await setDoc(
      userRef,
      {
        activeStoreId: null,
        defaultStoreId: null,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return {
      userId: uid,
      activeStoreId: null,
      defaultStoreId: null,
      memberships: availableMemberships,
      activeStore: null,
      defaultStore: null,
      requiresStoreSetup: true,
      userData,
    };
  }

  if (availableMemberships.length === 0) {
    const fallbackMemberships = sortMemberships(
      memberships.filter((item) => item.status !== "inactive"),
    );
    const requestedStoreId = normalizeValue(options.preferredStoreId);
    const persistedActiveStoreId = normalizeValue(userData?.activeStoreId);
    const persistedDefaultStoreId = normalizeValue(userData?.defaultStoreId);

    const fallbackActiveMembership =
      fallbackMemberships.find((item) => item.storeId === requestedStoreId) ||
      fallbackMemberships.find(
        (item) => item.storeId === persistedActiveStoreId,
      ) ||
      fallbackMemberships[0] ||
      null;

    const fallbackDefaultMembership =
      fallbackMemberships.find(
        (item) => item.storeId === persistedDefaultStoreId,
      ) ||
      fallbackMemberships.find((item) => item.role === "owner") ||
      fallbackActiveMembership;

    if (!fallbackActiveMembership) {
      clearStoreSession();
      return {
        userId: uid,
        activeStoreId: null,
        defaultStoreId: null,
        memberships: fallbackMemberships,
        activeStore: null,
        defaultStore: null,
        requiresStoreSetup: false,
        userData,
      };
    }

    const session = setStoreSession({
      userId: uid,
      activeStoreId: fallbackActiveMembership.storeId,
      defaultStoreId:
        fallbackDefaultMembership?.storeId || fallbackActiveMembership.storeId,
    });

    return {
      ...session,
      memberships: fallbackMemberships,
      activeStore: fallbackActiveMembership,
      defaultStore: fallbackDefaultMembership,
      requiresStoreSetup: false,
      userData,
    };
  }

  const orderedMemberships = sortMemberships(availableMemberships);

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

  await ensureOwnerStoreMemberLink(uid, activeMembership);

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
    requiresStoreSetup: false,
    userData,
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
