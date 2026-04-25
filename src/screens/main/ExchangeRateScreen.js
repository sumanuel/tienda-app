import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useTourGuideController } from "rn-tourguide";
import { useExchangeRate } from "../../contexts/ExchangeRateContext";
import RateDisplay from "../../components/exchange/RateDisplay";
import CurrencyConverter from "../../components/exchange/CurrencyConverter";
import { useCustomAlert } from "../../components/common/CustomAlert";
import { hasSeenTour, markTourSeen } from "../../services/tour/tourStorage";
import {
  InfoPill,
  ScreenHero,
  SurfaceCard,
  SHADOWS,
  UI_COLORS,
} from "../../components/common/AppUI";
import { rf, vs, hs, spacing, borderRadius } from "../../utils/responsive";

export const ExchangeRateScreen = () => {
  const { rate, lastUpdate, setManualRate } = useExchangeRate({
    autoUpdate: false,
  });
  const { canStart, start, TourGuideZone } =
    useTourGuideController("exchangeRate");
  const TOUR_ZONE_BASE = 5400;
  const [tourBooted, setTourBooted] = useState(false);
  const { showAlert, CustomAlert } = useCustomAlert();
  const [manualValue, setManualValue] = useState("0");
  const [saving, setSaving] = useState(false);

  const scrollViewRef = useRef(null);
  const manualInputRef = useRef(null);

  useEffect(() => {
    if (rate) {
      setManualValue(rate.toString());
    }
  }, [rate]);

  useEffect(() => {
    let mounted = true;

    const maybeStartTour = async () => {
      if (tourBooted) return;
      if (!canStart) return;

      const tourId = "exchangeRate";
      const seen = await hasSeenTour(tourId);
      if (!mounted) return;

      if (!seen) {
        setTimeout(() => {
          start();
          markTourSeen(tourId);
        }, 450);
      }

      if (mounted) setTourBooted(true);
    };

    maybeStartTour();

    return () => {
      mounted = false;
    };
  }, [canStart, start, tourBooted]);

  const formattedLastUpdate = useMemo(() => {
    if (!lastUpdate) {
      return "Sin sincronizar";
    }

    return `${lastUpdate.toLocaleDateString()} · ${lastUpdate.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    )}`;
  }, [lastUpdate]);

  const handleManualSave = async () => {
    const numericValue = parseFloat(manualValue.replace(",", "."));
    if (Number.isNaN(numericValue) || numericValue <= 0) {
      showAlert({
        title: "Valor inválido",
        message: "Ingresa un número mayor a cero",
        type: "error",
      });
      return;
    }

    try {
      setSaving(true);
      await setManualRate(numericValue);
      showAlert({
        title: "Tasa actualizada",
        message: `Guardamos ${numericValue.toFixed(2)} VES por USD`,
        type: "success",
      });
    } catch (error) {
      console.error("Error saving manual rate:", error);
      showAlert({
        title: "Error",
        message: "No pudimos guardar la tasa manual",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const scrollToField = (ref) => {
    if (ref?.current && scrollViewRef?.current) {
      setTimeout(() => {
        ref.current.measureLayout(
          scrollViewRef.current,
          (x, y) => {
            scrollViewRef.current.scrollTo({
              y: Math.max(y - 120, 0),
              animated: true,
            });
          },
          () => {},
        );
      }, 100);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 80}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHero
            iconName="swap-horizontal-outline"
            iconColor={UI_COLORS.info}
            eyebrow="Conversi\u00f3n"
            title="Tasa de cambio"
            subtitle="Administra la tasa oficial y tus referencias en una vista m\u00e1s clara y compacta."
            pills={[
              {
                text: rate ? `VES ${Number(rate).toFixed(2)}` : "Sin tasa",
                tone: rate ? "info" : "warning",
              },
              {
                text: formattedLastUpdate,
                tone: "neutral",
              },
            ]}
          />

          <TourGuideZone
            zone={TOUR_ZONE_BASE + 1}
            text={
              "Esta es la tasa que usará la app para convertir USD↔VES en precios, ventas y reportes."
            }
            borderRadius={borderRadius.lg}
          >
            <View>
              <RateDisplay
                rate={rate}
                source="BCV"
                lastUpdate={lastUpdate}
                style={styles.rateDisplay}
              />
            </View>
          </TourGuideZone>

          <TourGuideZone
            zone={TOUR_ZONE_BASE + 2}
            text={
              "Si necesitas una tasa distinta (por ejemplo, acordada), puedes guardarla manualmente aquí."
            }
            borderRadius={borderRadius.lg}
          >
            <SurfaceCard style={styles.manualCard}>
              <View style={styles.manualHeader}>
                <View style={styles.manualCopy}>
                  <Text style={styles.manualTitle}>Actualizar manualmente</Text>
                  <Text style={styles.manualSubtitle}>
                    Ingresa la tasa acordada para aplicarla de inmediato en toda
                    la app.
                  </Text>
                </View>
                <InfoPill text="USD → VES" tone="info" />
              </View>

              <View style={styles.manualInputRow}>
                <TextInput
                  ref={manualInputRef}
                  value={manualValue}
                  onChangeText={setManualValue}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  style={styles.manualInput}
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={() => Keyboard.dismiss()}
                  onFocus={() => scrollToField(manualInputRef)}
                />
              </View>

              <TourGuideZone
                zone={TOUR_ZONE_BASE + 3}
                text={"Presiona 'Guardar tasa manual' para guardar la tasa."}
                borderRadius={borderRadius.lg}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    saving && styles.buttonDisabled,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    handleManualSave();
                  }}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.secondaryButtonText}>
                      Guardar tasa manual
                    </Text>
                  )}
                </Pressable>
              </TourGuideZone>
            </SurfaceCard>
          </TourGuideZone>

          <TourGuideZone
            zone={TOUR_ZONE_BASE + 4}
            text={
              "Usa el conversor para comprobar equivalencias rápidas entre USD y VES."
            }
            borderRadius={borderRadius.lg}
          >
            <View>
              <CurrencyConverter exchangeRate={rate} style={styles.converter} />
            </View>
          </TourGuideZone>
        </ScrollView>
      </KeyboardAvoidingView>
      <CustomAlert />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_COLORS.page,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: vs(120),
    gap: spacing.lg,
  },
  manualCard: {
    gap: spacing.md,
    ...SHADOWS.soft,
  },
  manualHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  manualCopy: {
    flex: 1,
    gap: vs(4),
  },
  manualTitle: {
    fontSize: rf(16),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  manualSubtitle: {
    fontSize: rf(13),
    color: UI_COLORS.muted,
    lineHeight: vs(19),
  },
  manualInputRow: {
    alignItems: "center",
  },
  manualInput: {
    flex: 1,
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    paddingVertical: vs(14),
    paddingHorizontal: hs(16),
    fontSize: rf(16),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  secondaryButton: {
    backgroundColor: UI_COLORS.accent,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    minHeight: vs(50),
    paddingVertical: vs(12),
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: rf(14),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  moduleCard: {
    backgroundColor: UI_COLORS.surface,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    padding: spacing.lg,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    ...SHADOWS.soft,
  },
  moduleTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  moduleSubtitle: {
    fontSize: 13,
    color: UI_COLORS.muted,
  },
  rateDisplay: {
    marginTop: 4,
  },
  converter: {
    marginTop: 4,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

export default ExchangeRateScreen;
