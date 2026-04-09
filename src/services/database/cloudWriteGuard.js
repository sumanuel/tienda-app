import { auth } from "../firebase/firebase";
import { getActiveStoreId } from "../store/storeSession";

export const hasResolvedSharedStore = () =>
  Boolean(
    String(auth.currentUser?.uid || "").trim() &&
    String(getActiveStoreId() || "").trim(),
  );

export const assertSharedStoreCloudWriteAvailable = () => {
  if (hasResolvedSharedStore()) {
    throw new Error(
      "La tienda está en modo local para esta sesión. Este cambio no se guardaría en Firestore ni se vería en otros usuarios. Reintenta la conexión cloud antes de continuar.",
    );
  }
};
