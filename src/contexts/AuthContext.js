import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, firestore } from "../services/firebase/firebase";
import {
  isPermissionDeniedError,
  resetCloudAccessForSession,
} from "../services/firebase/cloudAccess";
import {
  configureStoreDatabase,
  initAllTables,
  migrateLegacyDatabaseToCurrentStoreIfNeeded,
  resetDatabaseContext,
} from "../services/database/db";
import {
  cancelRequestedCloudSync,
  syncCurrentUserSQLiteToFirestore,
} from "../services/firebase/firestoreSync";
import { setStoreSession } from "../services/store/storeSession";
import {
  clearActiveStoreSession,
  ensureUserStoreContext,
  switchActiveStoreForUser,
} from "../services/store/storeService";
import { migrateLegacyUserDataToStoreIfNeeded } from "../services/store/storeMigration";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [storeLoading, setStoreLoading] = useState(true);
  const [activeStoreId, setActiveStoreId] = useState(null);
  const [defaultStoreId, setDefaultStoreId] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [requiresStoreSetup, setRequiresStoreSetup] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  const activateStoreLocally = async ({ storeId, storeName, role } = {}) => {
    const uid = auth.currentUser?.uid;
    const normalizedStoreId = String(storeId || "").trim();

    if (!uid || !normalizedStoreId) {
      return null;
    }

    const session = setStoreSession({
      userId: uid,
      activeStoreId: normalizedStoreId,
      defaultStoreId: normalizedStoreId,
    });

    await configureStoreDatabase({
      userId: uid,
      storeId: normalizedStoreId,
    });
    await initAllTables();
    await migrateLegacyDatabaseToCurrentStoreIfNeeded();

    setActiveStoreId(normalizedStoreId);
    setDefaultStoreId(normalizedStoreId);
    setRequiresStoreSetup(false);
    setMemberships((current) => {
      const existing = current.find(
        (item) => item.storeId === normalizedStoreId,
      );
      const nextMembership = {
        id: normalizedStoreId,
        storeId: normalizedStoreId,
        storeName: String(
          storeName || existing?.storeName || "Mi Tienda",
        ).trim(),
        role: String(role || existing?.role || "owner").trim(),
        status: String(existing?.status || "active").trim(),
        ownerUserId: String(existing?.ownerUserId || uid).trim(),
      };

      if (existing) {
        return current.map((item) =>
          item.storeId === normalizedStoreId
            ? { ...item, ...nextMembership }
            : item,
        );
      }

      return [...current, nextMembership];
    });

    return session;
  };

  const prepareStoreDatabase = async ({ uid, userId, storeId } = {}) => {
    const normalizedUid = String(uid || userId || "").trim();
    const normalizedStoreId = String(storeId || "").trim();

    if (!normalizedUid || !normalizedStoreId) {
      return { migrated: false, reason: "missing-context" };
    }

    await configureStoreDatabase({
      userId: normalizedUid,
      storeId: normalizedStoreId,
    });

    await initAllTables();
    return await migrateLegacyDatabaseToCurrentStoreIfNeeded();
  };

  const refreshStoreContext = async (preferredStoreId) => {
    if (!auth.currentUser) {
      return null;
    }

    const refreshedContext = await ensureUserStoreContext(auth.currentUser, {
      preferredStoreId: preferredStoreId || activeStoreId,
    });

    if (refreshedContext?.activeStoreId) {
      await prepareStoreDatabase({
        userId: auth.currentUser.uid,
        storeId: refreshedContext.activeStoreId,
      });
    }

    setActiveStoreId(refreshedContext?.activeStoreId || null);
    setDefaultStoreId(refreshedContext?.defaultStoreId || null);
    setMemberships(refreshedContext?.memberships || []);
    setRequiresStoreSetup(Boolean(refreshedContext?.requiresStoreSetup));

    return refreshedContext;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      let resolvedStoreContext = null;

      setUser(nextUser);
      setEmailVerified(Boolean(nextUser?.emailVerified));

      if (!nextUser) {
        resetCloudAccessForSession();
        setLastSyncResult(null);
        setActiveStoreId(null);
        setDefaultStoreId(null);
        setMemberships([]);
        setRequiresStoreSetup(false);
        clearActiveStoreSession();
        await resetDatabaseContext();
        setStoreLoading(false);
        setAuthLoading(false);
        return;
      }

      try {
        resetCloudAccessForSession();
        setStoreLoading(true);
        setSyncing(true);
        await setDoc(
          doc(firestore, "users", nextUser.uid),
          {
            uid: nextUser.uid,
            email: nextUser.email || "",
            displayName: nextUser.displayName || "",
            lastLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );

        const storeContext = await ensureUserStoreContext(nextUser);
        resolvedStoreContext = storeContext;
        setActiveStoreId(storeContext.activeStoreId);
        setDefaultStoreId(storeContext.defaultStoreId);
        setMemberships(storeContext.memberships || []);
        setRequiresStoreSetup(Boolean(storeContext.requiresStoreSetup));

        if (!storeContext.activeStoreId) {
          setLastSyncResult({ skipped: true, reason: "no-active-store" });
          return;
        }

        await migrateLegacyUserDataToStoreIfNeeded({
          uid: nextUser.uid,
          storeId: storeContext.activeStoreId,
        });
        await prepareStoreDatabase({
          userId: nextUser.uid,
          storeId: storeContext.activeStoreId,
        });

        const result = await syncCurrentUserSQLiteToFirestore({
          reason: "auth-state",
        });
        setLastSyncResult(result);
      } catch (error) {
        if (isPermissionDeniedError(error)) {
          if (resolvedStoreContext?.activeStoreId) {
            await prepareStoreDatabase({
              userId: nextUser.uid,
              storeId: resolvedStoreContext.activeStoreId,
            });
            setStoreSession({
              userId: nextUser.uid,
              activeStoreId: resolvedStoreContext.activeStoreId,
              defaultStoreId:
                resolvedStoreContext.defaultStoreId ||
                resolvedStoreContext.activeStoreId,
            });
            setActiveStoreId(resolvedStoreContext.activeStoreId);
            setDefaultStoreId(
              resolvedStoreContext.defaultStoreId ||
                resolvedStoreContext.activeStoreId,
            );
            setMemberships(resolvedStoreContext.memberships || []);
            setRequiresStoreSetup(false);
          } else {
            clearActiveStoreSession();
            await resetDatabaseContext();
            setActiveStoreId(null);
            setDefaultStoreId(null);
            setMemberships([]);
            setRequiresStoreSetup(false);
          }

          setLastSyncResult({
            skipped: true,
            reason: "cloud-sync-permission-denied",
          });
          return;
        }
        console.warn("Initial cloud sync failed:", error);
      } finally {
        setSyncing(false);
        setStoreLoading(false);
        setAuthLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async ({ email, password }) => {
    return await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const signUp = async ({ name, email, password }) => {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    );

    if (name?.trim()) {
      await updateProfile(credential.user, {
        displayName: name.trim(),
      });
    }

    await sendEmailVerification(credential.user);

    await setDoc(
      doc(firestore, "users", credential.user.uid),
      {
        uid: credential.user.uid,
        email: credential.user.email || email.trim(),
        displayName: name?.trim() || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return credential;
  };

  const signOut = async () => {
    cancelRequestedCloudSync();
    setSyncing(false);
    setLastSyncResult(null);
    await firebaseSignOut(auth);
  };

  const switchStore = async (storeId) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error("No hay un usuario autenticado.");
    }

    setStoreLoading(true);
    try {
      const session = await switchActiveStoreForUser({ userId: uid, storeId });
      await prepareStoreDatabase({
        userId: uid,
        storeId: session.activeStoreId,
      });
      setActiveStoreId(session.activeStoreId);
      setDefaultStoreId(session.defaultStoreId);
      setRequiresStoreSetup(false);

      const refreshedContext = await ensureUserStoreContext(auth.currentUser, {
        preferredStoreId: session.activeStoreId,
      });
      setMemberships(refreshedContext.memberships || []);
      const result = await syncCurrentUserSQLiteToFirestore({
        reason: "store-switch",
      });
      setLastSyncResult(result);
      return refreshedContext;
    } finally {
      setStoreLoading(false);
    }
  };

  const sendVerification = async () => {
    if (!auth.currentUser) {
      throw new Error("No hay un usuario autenticado.");
    }

    await sendEmailVerification(auth.currentUser);
  };

  const refreshVerification = async () => {
    if (!auth.currentUser) return false;

    await reload(auth.currentUser);
    setUser(auth.currentUser);
    const verified = Boolean(auth.currentUser.emailVerified);
    setEmailVerified(verified);
    return verified;
  };

  const sendPasswordReset = async (email) => {
    await sendPasswordResetEmail(
      auth,
      String(email || "")
        .trim()
        .toLowerCase(),
    );
  };

  const syncNow = async (reason = "manual") => {
    try {
      setSyncing(true);
      const result = await syncCurrentUserSQLiteToFirestore({ reason });
      setLastSyncResult(result);
      return result;
    } finally {
      setSyncing(false);
    }
  };

  const value = useMemo(
    () => ({
      user,
      emailVerified,
      authLoading,
      storeLoading,
      activeStoreId,
      defaultStoreId,
      memberships,
      requiresStoreSetup,
      syncing,
      lastSyncResult,
      signIn,
      signUp,
      signOut,
      switchStore,
      refreshStoreContext,
      sendVerification,
      refreshVerification,
      sendPasswordReset,
      syncNow,
      activateStoreLocally,
    }),
    [
      user,
      emailVerified,
      authLoading,
      storeLoading,
      activeStoreId,
      defaultStoreId,
      memberships,
      requiresStoreSetup,
      syncing,
      lastSyncResult,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};
