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

  const alreadyDisabled = cloudAccessDisabled;
  disableCloudAccessForSession(`${context}:permission-denied`);

  if (!alreadyDisabled) {
    console.warn(
      `Cloud access disabled for this session after permission error in ${context}. Falling back to local database.`,
    );
  }

  return true;
};
