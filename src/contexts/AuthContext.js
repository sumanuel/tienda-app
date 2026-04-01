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
import { syncCurrentUserSQLiteToFirestore } from "../services/firebase/firestoreSync";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setEmailVerified(Boolean(nextUser?.emailVerified));
      setAuthLoading(false);

      if (!nextUser) {
        setLastSyncResult(null);
        return;
      }

      try {
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
        const result = await syncCurrentUserSQLiteToFirestore({
          reason: "auth-state",
        });
        setLastSyncResult(result);
      } catch (error) {
        console.warn("Initial cloud sync failed:", error);
      } finally {
        setSyncing(false);
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
    await firebaseSignOut(auth);
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
      syncing,
      lastSyncResult,
      signIn,
      signUp,
      signOut,
      sendVerification,
      refreshVerification,
      sendPasswordReset,
      syncNow,
    }),
    [user, emailVerified, authLoading, syncing, lastSyncResult],
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
