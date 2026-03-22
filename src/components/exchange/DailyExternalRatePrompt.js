import React, { useCallback, useEffect, useRef } from "react";
import { Alert, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { getSettings } from "../../services/database/settings";
import { insertRateNotification } from "../../services/database/rateNotifications";
import { useExchangeRateContext } from "../../contexts/ExchangeRateContext";
import { useRateNotifications } from "../../contexts/RateNotificationsContext";

const STORAGE_KEY_LAST_FETCHED_DATE = "usdRateDailyCheck:lastFetchedDate";
const STORAGE_KEY_LAST_PROMPTED_DATE = "usdRateDailyCheck:lastPromptedDate";
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

const computeMsUntilNext = (now, hour, minute) => {
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
};

const isVenezuela = (settings) => {
  const region =
    Localization.getLocales?.()?.[0]?.regionCode || Localization.region;
  if (String(region || "").toUpperCase() === "VE") return true;

  const phone = String(settings?.business?.phone || "");
  if (phone.includes("+58")) return true;

  return false;
};

const DailyExternalRatePrompt = () => {
  const { setManualRate } = useExchangeRateContext();
  const { refreshCount } = useRateNotifications();

  const timeoutRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const runningRef = useRef(false);

  const maybeCheck = useCallback(async () => {
    if (runningRef.current) return;

    const now = new Date();
    const settings = await getSettings();

    const exchangeSettings = settings?.exchange || {};
    const enabled = exchangeSettings?.dailyPromptEnabled ?? true;
    const hour = Number(exchangeSettings?.dailyPromptHour ?? 19);
    const minute = Number(exchangeSettings?.dailyPromptMinute ?? 0);

    if (!enabled) return;

    // Solo en Venezuela.
    if (!isVenezuela(settings)) return;

    // Solo consultar si ya pasó la hora configurada.
    if (
      now.getHours() < hour ||
      (now.getHours() === hour && now.getMinutes() < minute)
    ) {
      return;
    }

    const url = String(exchangeSettings?.externalApiUrl || "").trim();
    const valuePath = String(
      exchangeSettings?.externalApiValuePath || "",
    ).trim();

    const resolvedUrl = url || DEFAULT_API_URL;
    const resolvedValuePath = valuePath || DEFAULT_VALUE_PATH;

    if (!resolvedUrl || !resolvedValuePath) return;

    const todayKey = getLocalDateKey(now);
    const lastPrompted = await AsyncStorage.getItem(
      STORAGE_KEY_LAST_PROMPTED_DATE,
    );
    if (lastPrompted === todayKey) return;

    let pending = null;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_PENDING);
      if (raw) pending = JSON.parse(raw);
    } catch {
      pending = null;
    }

    runningRef.current = true;
    try {
      let fetchedRate = null;
      let apiSource = "API";
      let apiUpdatedAt = null;

      if (pending?.dateKey === todayKey && pending?.rate) {
        fetchedRate = Number(pending.rate);
        apiSource = String(pending.source || "API");
        apiUpdatedAt = pending.apiUpdatedAt
          ? String(pending.apiUpdatedAt)
          : null;
      } else {
        const response = await fetch(resolvedUrl, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json = await response.json();
        const rawValue = getValueAtPath(json, resolvedValuePath);
        fetchedRate = parseRate(rawValue);

        apiSource = getValueAtPath(json, "fuente") || "API";
        const apiUpdatedAtRaw =
          getValueAtPath(json, "fechaActualizacion") ||
          getValueAtPath(json, "fecha");
        apiUpdatedAt = apiUpdatedAtRaw ? String(apiUpdatedAtRaw) : null;

        if (!fetchedRate || fetchedRate <= 0) {
          throw new Error("Invalid rate from API");
        }

        // Guardar como pending por si el usuario abre/cierra antes de ver el prompt
        await AsyncStorage.setItem(
          STORAGE_KEY_PENDING,
          JSON.stringify({
            dateKey: todayKey,
            rate: fetchedRate,
            source: String(apiSource),
            apiUpdatedAt,
            fetchedAt: now.toISOString(),
          }),
        );

        const lastFetched = await AsyncStorage.getItem(
          STORAGE_KEY_LAST_FETCHED_DATE,
        );
        if (lastFetched !== todayKey) {
          await AsyncStorage.setItem(STORAGE_KEY_LAST_FETCHED_DATE, todayKey);

          // Guardar el aviso SIEMPRE (aunque el usuario actualice o no)
          try {
            const storedMessage = `Consulta diaria (${pad2(hour)}:${pad2(
              minute,
            )}): ${fetchedRate.toFixed(2)} VES por USD (${String(apiSource)}).`;

            await insertRateNotification({
              type: "exchange_rate",
              message: storedMessage,
              rate: fetchedRate,
              source: String(apiSource),
            });
          } catch (error) {
            console.warn("Error storing rate notification:", error);
          } finally {
            refreshCount();
          }
        }
      }

      const messageBase = `Se detectó una tasa USD: ${fetchedRate.toFixed(
        2,
      )} VES por USD`;
      const message = `${messageBase}${
        apiUpdatedAt ? `\nActualización: ${apiUpdatedAt}` : ""
      }\n\n¿Deseas actualizar la tasa ahora?`;

      Alert.alert("Actualizar tasa", message, [
        {
          text: "Más tarde",
          style: "cancel",
          onPress: async () => {
            await AsyncStorage.setItem(
              STORAGE_KEY_LAST_PROMPTED_DATE,
              todayKey,
            );
            await AsyncStorage.removeItem(STORAGE_KEY_PENDING);
          },
        },
        {
          text: "Actualizar",
          onPress: async () => {
            try {
              await setManualRate(fetchedRate, String(apiSource) || "API");
              await AsyncStorage.removeItem(STORAGE_KEY_PENDING);
            } catch (error) {
              console.warn("Error updating rate from API:", error);
            } finally {
              await AsyncStorage.setItem(
                STORAGE_KEY_LAST_PROMPTED_DATE,
                todayKey,
              );
            }
          },
        },
      ]);
    } catch (error) {
      console.warn("Daily external rate check failed:", error);
    } finally {
      runningRef.current = false;
    }
  }, [refreshCount, setManualRate]);

  const scheduleNext = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const settings = await getSettings();
    const exchangeSettings = settings?.exchange || {};
    const enabled = exchangeSettings?.dailyPromptEnabled ?? true;
    const hour = Number(exchangeSettings?.dailyPromptHour ?? 19);
    const minute = Number(exchangeSettings?.dailyPromptMinute ?? 0);

    if (!enabled) return;

    const now = new Date();
    const ms = computeMsUntilNext(now, hour, minute);

    timeoutRef.current = setTimeout(() => {
      maybeCheck();
      // Reprogramar para el día siguiente.
      scheduleNext();
    }, ms);
  }, [maybeCheck]);

  useEffect(() => {
    scheduleNext();
    maybeCheck();

    const subscription = AppState.addEventListener("change", (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (prev.match(/inactive|background/) && nextState === "active") {
        scheduleNext();
        maybeCheck();
      }
    });

    return () => {
      subscription?.remove?.();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [maybeCheck, scheduleNext]);

  return null;
};

export default DailyExternalRatePrompt;
