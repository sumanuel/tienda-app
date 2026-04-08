import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, firestore } from "../firebase/firebase";
import {
  getActiveStoreIdOrThrow,
  getCurrentUserIdOrThrow,
  getStoreCollectionRef,
  getStoreDocRef,
  getStoreMemberDocRef,
  getUserMembershipDocRef,
} from "./storeRefs";

const ROLES = ["owner", "admin", "seller", "inventory", "viewer"];

const normalizeText = (value) => String(value || "").trim();
const normalizeEmail = (value) => normalizeText(value).toLowerCase();

const mapStoreInvite = (snapshot) => {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    storeId: normalizeText(data.storeId),
    storeName: normalizeText(data.storeName),
    invitedEmail: normalizeText(data.invitedEmail),
    emailNormalized: normalizeEmail(data.emailNormalized || data.invitedEmail),
    role: normalizeText(data.role || "seller") || "seller",
    status: normalizeText(data.status || "pending") || "pending",
    invitedByUserId: normalizeText(data.invitedByUserId),
    invitedByEmail: normalizeText(data.invitedByEmail),
    createdAt: data.createdAt || null,
    acceptedAt: data.acceptedAt || null,
  };
};

const mapStoreMember = (snapshot) => {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    uid: normalizeText(data.uid || snapshot.id),
    role: normalizeText(data.role || "member") || "member",
    status: normalizeText(data.status || "active") || "active",
    email: normalizeText(data.email),
    displayName: normalizeText(data.displayName),
    joinedAt: data.joinedAt || null,
  };
};

export const getAvailableStoreRoles = () => [...ROLES];

export const createStoreForCurrentUser = async ({ name }) => {
  const user = auth.currentUser;
  const uid = getCurrentUserIdOrThrow(user?.uid);
  const storeName = normalizeText(name);

  if (!storeName) {
    throw new Error("El nombre de la tienda es obligatorio.");
  }

  const storeRef = doc(collection(firestore, "stores"));
  const storeId = storeRef.id;
  const email = normalizeEmail(user?.email);
  const displayName = normalizeText(user?.displayName);

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
    getStoreMemberDocRef(storeId, uid),
    {
      uid,
      role: "owner",
      status: "active",
      email,
      displayName,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await setDoc(
    getUserMembershipDocRef(uid, storeId),
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

  return {
    storeId,
    storeName,
    role: "owner",
  };
};

export const listMembersForStore = async (
  storeId = getActiveStoreIdOrThrow(),
) => {
  const snapshot = await getDocs(
    collection(firestore, "stores", storeId, "members"),
  );
  return snapshot.docs.map(mapStoreMember).sort((a, b) => {
    if (a.role === "owner" && b.role !== "owner") return -1;
    if (a.role !== "owner" && b.role === "owner") return 1;
    return String(a.displayName || a.email || "").localeCompare(
      String(b.displayName || b.email || ""),
      "es",
      { sensitivity: "base" },
    );
  });
};

export const listInvitesForStore = async (
  storeId = getActiveStoreIdOrThrow(),
) => {
  const snapshot = await getDocs(getStoreCollectionRef("invites", storeId));
  return snapshot.docs.map(mapStoreInvite).sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });
};

export const createInviteForActiveStore = async ({
  email,
  role = "seller",
}) => {
  const user = auth.currentUser;
  const uid = getCurrentUserIdOrThrow(user?.uid);
  const storeId = getActiveStoreIdOrThrow();
  const invitedEmail = normalizeText(email);
  const emailNormalized = normalizeEmail(email);
  const resolvedRole = ROLES.includes(role) ? role : "seller";

  if (!emailNormalized) {
    throw new Error("El correo del colaborador es obligatorio.");
  }

  const [storeSnapshot, existingInvitesSnapshot] = await Promise.all([
    getDoc(getStoreDocRef(storeId)),
    getDocs(
      query(
        getStoreCollectionRef("invites", storeId),
        where("emailNormalized", "==", emailNormalized),
      ),
    ),
  ]);

  const pendingInvite = existingInvitesSnapshot.docs
    .map(mapStoreInvite)
    .find((invite) => invite.status === "pending");

  if (pendingInvite) {
    throw new Error("Ya existe una invitación pendiente para ese correo.");
  }

  const storeName = normalizeText(storeSnapshot.data()?.name) || "Mi Tienda";
  const inviteRef = doc(
    getStoreCollectionRef("invites", storeId),
    emailNormalized,
  );

  await setDoc(
    inviteRef,
    {
      id: inviteRef.id,
      storeId,
      storeName,
      invitedEmail,
      emailNormalized,
      role: resolvedRole,
      status: "pending",
      invitedByUserId: uid,
      invitedByEmail: normalizeEmail(user?.email),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return {
    id: inviteRef.id,
    storeId,
    storeName,
    invitedEmail,
    role: resolvedRole,
    status: "pending",
  };
};

export const listPendingInvitesForCurrentUser = async () => {
  const user = auth.currentUser;
  const emailNormalized = normalizeEmail(user?.email);

  if (!emailNormalized) {
    return [];
  }

  const snapshot = await getDocs(
    query(
      collectionGroup(firestore, "invites"),
      where("emailNormalized", "==", emailNormalized),
    ),
  );

  return snapshot.docs
    .map(mapStoreInvite)
    .filter((invite) => invite.status === "pending")
    .sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
};

export const acceptInviteForCurrentUser = async (invite) => {
  const user = auth.currentUser;
  const uid = getCurrentUserIdOrThrow(user?.uid);
  const emailNormalized = normalizeEmail(user?.email);
  const inviteData = {
    ...invite,
    emailNormalized: normalizeEmail(
      invite?.emailNormalized || invite?.invitedEmail,
    ),
    storeId: normalizeText(invite?.storeId),
    id: normalizeText(invite?.id),
    storeName: normalizeText(invite?.storeName),
    role: normalizeText(invite?.role || "seller") || "seller",
  };

  if (!inviteData.storeId || !inviteData.id) {
    throw new Error("La invitación no es válida.");
  }

  if (inviteData.emailNormalized !== emailNormalized) {
    throw new Error("Esta invitación no corresponde al usuario actual.");
  }

  const membershipRef = getUserMembershipDocRef(uid, inviteData.storeId);
  const membershipSnapshot = await getDoc(membershipRef);

  await setDoc(
    getStoreMemberDocRef(inviteData.storeId, uid),
    {
      uid,
      role: inviteData.role,
      status: "active",
      email: emailNormalized,
      displayName: normalizeText(user?.displayName),
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await setDoc(
    membershipRef,
    {
      storeId: inviteData.storeId,
      storeName: inviteData.storeName,
      role: inviteData.role,
      status: "active",
      ownerUserId: normalizeText(invite?.ownerUserId),
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await updateDoc(
    doc(firestore, "stores", inviteData.storeId, "invites", inviteData.id),
    {
      status: "accepted",
      acceptedByUserId: uid,
      acceptedByEmail: emailNormalized,
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  );

  return {
    alreadyMember: membershipSnapshot.exists(),
    storeId: inviteData.storeId,
    storeName: inviteData.storeName,
    role: inviteData.role,
  };
};
