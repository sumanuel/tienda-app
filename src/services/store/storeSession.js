const SESSION_DEFAULTS = {
  userId: null,
  activeStoreId: null,
  defaultStoreId: null,
};

let session = { ...SESSION_DEFAULTS };
const listeners = new Set();

const normalizeValue = (value) => {
  const normalized = String(value || "").trim();
  return normalized || null;
};

const emit = () => {
  listeners.forEach((listener) => {
    try {
      listener({ ...session });
    } catch (error) {
      console.warn("Store session listener failed:", error);
    }
  });
};

export const setStoreSession = ({ userId, activeStoreId, defaultStoreId }) => {
  const nextSession = {
    userId: normalizeValue(userId),
    activeStoreId: normalizeValue(activeStoreId),
    defaultStoreId: normalizeValue(defaultStoreId),
  };

  const hasChanged =
    nextSession.userId !== session.userId ||
    nextSession.activeStoreId !== session.activeStoreId ||
    nextSession.defaultStoreId !== session.defaultStoreId;

  session = nextSession;

  if (hasChanged) {
    emit();
  }

  return { ...session };
};

export const clearStoreSession = () => {
  session = { ...SESSION_DEFAULTS };
  emit();
};

export const getStoreSession = () => ({ ...session });

export const getActiveStoreId = () => session.activeStoreId;

export const getDefaultStoreId = () => session.defaultStoreId;

export const getStoreSessionUserId = () => session.userId;

export const subscribeToStoreSession = (listener) => {
  if (typeof listener !== "function") {
    return () => {};
  }

  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
