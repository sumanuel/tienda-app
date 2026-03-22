import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { getSettings } from "../database/settings";
import { insertRateNotification } from "../database/rateNotifications";
import { initAllTables } from "../database/db";

const TASK_NAME = "daily-usd-rate-check";

const STORAGE_KEY_LAST_FETCHED_DATE = "usdRateDailyCheck:lastFetchedDate";
const STORAGE_KEY_PENDING = "usdRateDailyCheck:pending";

const DEFAULT_API_URL = "https://ve.dolarapi.com/v1/dolares/oficial";
const DEFAULT_VALUE_PATH = "promedio";

const pad2 = (n) => String(n).padStart(2, "0");

const getLocalDateKey = (date) => {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
};

const getValueAtPath = (obj, path) => {
  if (!obj || !path) return undefined;
  const parts = String(path)
    .split(".")
    .map((p) => p.trim())
    .filter(Boolean);

  let cur = obj;
  for (const part of parts) {
    if (cur && Object.prototype.hasOwnProperty.call(cur, part)) {
      cur = cur[part];
    } else {
      return undefined;
    }
  }
  return cur;
};

const parseRate = (value) => {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const str = String(value).trim().replace(",", ".");
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
};

const isVenezuela = (settings) => {
  const region =
    Localization.getLocales?.()?.[0]?.regionCode || Localization.region;

  if (String(region || "").toUpperCase() === "VE") return true;

  const phone = String(settings?.business?.phone || "");
  if (phone.includes("+58")) return true;

  return false;
};

const shouldRunNow = (now, hour, minute) => {
  if (now.getHours() < hour) return false;
  if (now.getHours() === hour && now.getMinutes() < minute) return false;
  return true;
};

const fetchDailyRate = async (settings) => {
  const exchangeSettings = settings?.exchange || {};

  const url = String(exchangeSettings?.externalApiUrl || "").trim();
  const valuePath = String(exchangeSettings?.externalApiValuePath || "").trim();

  const resolvedUrl = url || DEFAULT_API_URL;
  const resolvedValuePath = valuePath || DEFAULT_VALUE_PATH;

  const response = await fetch(resolvedUrl, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const json = await response.json();
  const rawValue = getValueAtPath(json, resolvedValuePath);
  const fetchedRate = parseRate(rawValue);

  const apiSource = getValueAtPath(json, "fuente") || "API";
  const apiUpdatedAtRaw =
    getValueAtPath(json, "fechaActualizacion") || getValueAtPath(json, "fecha");
  const apiUpdatedAt = apiUpdatedAtRaw ? String(apiUpdatedAtRaw) : null;

  if (!fetchedRate || fetchedRate <= 0) {
    throw new Error("Invalid rate from API");
  }

  return {
    rate: fetchedRate,
    source: String(apiSource),
    apiUpdatedAt,
  };
};

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    // Asegurar schema para poder insertar notificaciones.
    await initAllTables();

    const now = new Date();
    const settings = await getSettings();
    const exchangeSettings = settings?.exchange || {};

    const enabled = exchangeSettings?.dailyPromptEnabled ?? true;
    const hour = Number(exchangeSettings?.dailyPromptHour ?? 19);
    const minute = Number(exchangeSettings?.dailyPromptMinute ?? 0);

    if (!enabled) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    if (!isVenezuela(settings)) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    if (!shouldRunNow(now, hour, minute)) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const todayKey = getLocalDateKey(now);
    const lastFetched = await AsyncStorage.getItem(
      STORAGE_KEY_LAST_FETCHED_DATE,
    );
    if (lastFetched === todayKey) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const fetched = await fetchDailyRate(settings);

    // Guardar pending para que el prompt salga al abrir la app.
    await AsyncStorage.setItem(
      STORAGE_KEY_PENDING,
      JSON.stringify({
        dateKey: todayKey,
        rate: fetched.rate,
        source: fetched.source,
        apiUpdatedAt: fetched.apiUpdatedAt,
        fetchedAt: now.toISOString(),
      }),
    );

    await AsyncStorage.setItem(STORAGE_KEY_LAST_FETCHED_DATE, todayKey);

    // Notificación persistente (sirve para el badge aunque la app no se abra).
    const storedMessage = `Consulta diaria (${pad2(hour)}:${pad2(minute)}): ${fetched.rate.toFixed(
      2,
    )} VES por USD (${String(fetched.source)}).`;

    await insertRateNotification({
      type: "exchange_rate",
      message: storedMessage,
      rate: fetched.rate,
      source: fetched.source,
    });

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.warn("Background daily rate task failed:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const registerDailyRateBackgroundTask = async () => {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      return false;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isRegistered) return true;

    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 15 * 60, // 15 min (el SO decide cuándo ejecuta realmente)
      stopOnTerminate: false,
      startOnBoot: true,
    });

    return true;
  } catch (error) {
    console.warn("Failed to register background task:", error);
    return false;
  }
};

export const unregisterDailyRateBackgroundTask = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (!isRegistered) return true;
    await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
    return true;
  } catch (error) {
    console.warn("Failed to unregister background task:", error);
    return false;
  }
};

export default {
  registerDailyRateBackgroundTask,
  unregisterDailyRateBackgroundTask,
};
