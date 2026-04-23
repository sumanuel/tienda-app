import { auth } from "../firebase/firebase";
import { getActiveStoreId } from "../store/storeSession";

export const hasResolvedSharedStore = () =>
  Boolean(
    String(auth.currentUser?.uid || "").trim() &&
    String(getActiveStoreId() || "").trim(),
  );

export const assertSharedStoreCloudWriteAvailable = () => {
  if (!hasResolvedSharedStore()) {
    throw new Error(
      "No hay una tienda activa disponible para guardar este cambio en Firestore.",
    );
  }
};
