import React, { useEffect, useRef } from "react";
import { Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCustomAlert } from "../common/CustomAlert";
import { useRateNotifications } from "../../contexts/RateNotificationsContext";
import { insertRateNotification } from "../../services/database/rateNotifications";
import { checkForStoreUpdate } from "../../services/storeUpdate/storeUpdateService";

export const StoreUpdatePrompt = () => {
  const hasCheckedRef = useRef(false);
  const { refreshCount } = useRateNotifications();
  const { showAlert, CustomAlert } = useCustomAlert();

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (hasCheckedRef.current) return;
      hasCheckedRef.current = true;

      let updateInfo = null;
      try {
        updateInfo = await checkForStoreUpdate();
      } catch (error) {
        console.warn("Store update check failed:", error);
        return;
      }

      if (!mounted) return;

      if (!updateInfo?.updateAvailable) return;

      // 1) Registrar en campanita (una vez por versión)
      try {
        const latestVersion = String(updateInfo.latestVersion || "").trim();
        const notifiedKey = latestVersion
          ? `storeUpdateNotified:${latestVersion}`
          : "storeUpdateNotified:unknown";

        const alreadyNotified = await AsyncStorage.getItem(notifiedKey);

        if (!alreadyNotified) {
          const message = latestVersion
            ? `Nueva versión disponible (${latestVersion}). Toca para actualizar.`
            : "Nueva versión disponible. Toca para actualizar.";

          await insertRateNotification({
            type: "store_update",
            message,
            rate: null,
            source: updateInfo.url || latestVersion || null,
          });

          await AsyncStorage.setItem(notifiedKey, "true");
          if (mounted) {
            refreshCount();
          }
        }
      } catch (error) {
        console.warn("Failed to store update notification:", error);
      }

      if (!mounted) return;

      // 2) Prompt (una vez por sesión)
      showAlert({
        title: "Nueva versión en Play Store",
        message: `Hay una actualización disponible.\n\nVersión actual: ${updateInfo.installedVersion}\nNueva versión: ${updateInfo.latestVersion}`,
        type: "info",
        buttons: [
          { text: "Más tarde", style: "cancel" },
          {
            text: "Actualizar",
            onPress: async () => {
              if (!updateInfo.url) return;
              try {
                await Linking.openURL(updateInfo.url);
              } catch (error) {
                console.error("Error opening update URL:", error);
              }
            },
          },
        ],
      });
    };

    run();

    return () => {
      mounted = false;
    };
  }, [refreshCount, showAlert]);

  return <CustomAlert />;
};

export default StoreUpdatePrompt;
