let cloudAccessDisabled = false;
let disableReason = null;

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

export const isPermissionDeniedError = (error) => {
  const code = normalizeText(error?.code);
  const message = normalizeText(error?.message);

  return (
    code === "permission-denied" ||
    code.endsWith("/permission-denied") ||
    message.includes("missing or insufficient permissions")
  );
};

export const isMissingIndexError = (error) => {
  const code = normalizeText(error?.code);
  const message = normalizeText(error?.message);

  return (
    code === "failed-precondition" ||
    code.endsWith("/failed-precondition") ||
    message.includes("requires a collection_group_asc index") ||
    message.includes("requires an index")
  );
};

export const disableCloudAccessForSession = (reason = "permission-denied") => {
  cloudAccessDisabled = true;
  disableReason = reason;
  return { disabled: cloudAccessDisabled, reason: disableReason };
};

export const resetCloudAccessForSession = () => {
  cloudAccessDisabled = false;
  disableReason = null;
  return { disabled: cloudAccessDisabled, reason: disableReason };
};

export const isCloudAccessAllowed = () => !cloudAccessDisabled;

export const getCloudAccessState = () => ({
  disabled: cloudAccessDisabled,
  reason: disableReason,
});

export const handleCloudAccessError = (error, context = "cloud") => {
  if (!isPermissionDeniedError(error)) {
    return false;
  }

  console.warn(
    `Cloud access error detected in ${context}. The operation will resolve its own fallback without disabling Firestore for the whole session.`,
  );

  return true;
};
