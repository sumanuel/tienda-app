const appJson = require("../../../app.json");

const DEFAULT_TIMEOUT_MS = 7000;

function toNonEmptyString(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toSafeTimeoutMs(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.floor(parsed);
}

function parseVersionParts(version) {
  const clean = toNonEmptyString(version);
  if (!clean) return null;

  const parts = clean.split(".").map((part) => {
    const parsed = Number.parseInt(part, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });

  if (parts.length === 0) return null;
  return parts;
}

export function compareVersionStrings(currentVersion, latestVersion) {
  const currentParts = parseVersionParts(currentVersion);
  const latestParts = parseVersionParts(latestVersion);

  if (!currentParts || !latestParts) return 0;

  const maxLen = Math.max(currentParts.length, latestParts.length);
  for (let i = 0; i < maxLen; i++) {
    const a = currentParts[i] ?? 0;
    const b = latestParts[i] ?? 0;
    if (a < b) return -1;
    if (a > b) return 1;
  }

  return 0;
}

export function buildPlayStoreUrl(androidPackage) {
  const pkg = toNonEmptyString(androidPackage);
  if (!pkg) return null;
  return `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}`;
}

export function getInstalledAppVersion() {
  return toNonEmptyString(appJson?.expo?.version) ?? null;
}

export function getStoreUpdateConfig() {
  const storeUpdate = appJson?.expo?.extra?.storeUpdate;
  if (!storeUpdate || typeof storeUpdate !== "object") return null;

  const androidPackage =
    toNonEmptyString(storeUpdate.androidPackage) ??
    toNonEmptyString(appJson?.expo?.android?.package) ??
    null;

  return {
    androidPackage,
    versionCheckUrl: toNonEmptyString(storeUpdate.versionCheckUrl),
    timeoutMs: toSafeTimeoutMs(storeUpdate.timeoutMs),
    allowDevChecks: Boolean(storeUpdate.allowDevChecks),
  };
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("timeout"));
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      fetch(url, {
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      }),
      timeoutPromise,
    ]);

    if (!response?.ok) {
      throw new Error(`http_${response?.status ?? "unknown"}`);
    }

    return await response.json();
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function checkForStoreUpdate() {
  const config = getStoreUpdateConfig();
  if (!config) return null;

  if (__DEV__ && !config.allowDevChecks) return null;
  if (!config.versionCheckUrl) return null;

  const installedVersion = getInstalledAppVersion();
  if (!installedVersion) return null;

  try {
    const json = await fetchJsonWithTimeout(
      config.versionCheckUrl,
      config.timeoutMs,
    );

    const latestVersion = toNonEmptyString(json?.latestVersion);
    if (!latestVersion) return null;

    const url =
      toNonEmptyString(json?.url) ?? buildPlayStoreUrl(config.androidPackage);

    const comparison = compareVersionStrings(installedVersion, latestVersion);
    const updateAvailable = comparison === -1;

    return {
      updateAvailable,
      installedVersion,
      latestVersion,
      url,
      androidPackage: config.androidPackage,
    };
  } catch (_) {
    return null;
  }
}
