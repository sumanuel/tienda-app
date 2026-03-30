import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { TourGuideZone, useTourGuideController } from "rn-tourguide";
import { useExchangeRate } from "../../contexts/ExchangeRateContext";
import RateDisplay from "../../components/exchange/RateDisplay";
import CurrencyConverter from "../../components/exchange/CurrencyConverter";
import { useCustomAlert } from "../../components/common/CustomAlert";
import { hasSeenTour, markTourSeen } from "../../services/tour/tourStorage";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";

export const ExchangeRateScreen = () => {
  const { rate, lastUpdate, setManualRate } = useExchangeRate({
    autoUpdate: false,
  });
  const { canStart, start } = useTourGuideController();
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
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Text style={styles.heroIconText}>💱</Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle}>Tasa de cambio</Text>
              <Text style={styles.heroSubtitle}>
                Administra la tasa oficial y tus referencias en un solo lugar.
              </Text>
            </View>
          </View>

          <TourGuideZone
            zone={1}
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
            zone={2}
            text={
              "Si necesitas una tasa distinta (por ejemplo, acordada), puedes guardarla manualmente aquí."
            }
            borderRadius={borderRadius.lg}
          >
            <View style={styles.manualCard}>
              <Text style={styles.manualTitle}>Actualizar manualmente</Text>
              <Text style={styles.manualSubtitle}>
                Ingresa la tasa acordada para aplicar inmediatamente en la app.
              </Text>

              <View style={styles.manualInputRow}>
                <View style={styles.manualBadge}>
                  <Text style={styles.manualBadgeText}>USD → VES</Text>
                </View>
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
                zone={3}
                text={"Toca aquí para guardar la tasa manual."}
                borderRadius={borderRadius.lg}
              >
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    saving && styles.buttonDisabled,
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    handleManualSave();
                  }}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.secondaryButtonText}>
                      Guardar tasa manual
                    </Text>
                  )}
                </TouchableOpacity>
              </TourGuideZone>
            </View>
          </TourGuideZone>

          <TourGuideZone
            zone={4}
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
    backgroundColor: "#e8edf2",
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: vs(120),
    gap: spacing.xl,
  },
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    flexDirection: "row",
    gap: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(10) },
    shadowOpacity: 0.08,
    shadowRadius: s(18),
    elevation: 8,
  },
  heroIcon: {
    width: iconSize.xl,
    height: iconSize.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: "#f3f8ff",
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconText: {
    fontSize: rf(30),
  },
  heroInfo: {
    flex: 1,
    gap: spacing.sm,
  },
  heroTitle: {
    fontSize: rf(22),
    fontWeight: "700",
    color: "#1f2633",
  },
  heroSubtitle: {
    fontSize: rf(14),
    color: "#5b6472",
    lineHeight: rf(20),
  },
  manualCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.05,
    shadowRadius: s(12),
    elevation: 5,
  },
  manualTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: "#1f2633",
  },
  manualSubtitle: {
    fontSize: rf(14),
    color: "#5b6472",
    lineHeight: rf(20),
  },
  manualInputRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  manualBadge: {
    backgroundColor: "#e8f1ff",
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  manualBadgeText: {
    color: "#2f5ae0",
    fontWeight: "700",
    fontSize: rf(13),
  },
  manualInput: {
    flex: 1,
    backgroundColor: "#f3f5fa",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: rf(16),
    fontWeight: "600",
    color: "#1f2633",
  },
  secondaryButton: {
    backgroundColor: "#1f9254",
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: rf(15),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  moduleCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.05,
    shadowRadius: s(12),
    elevation: 5,
  },
  moduleTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1f2633",
  },
  moduleSubtitle: {
    fontSize: 13,
    color: "#6f7c8c",
  },
  rateDisplay: {
    marginTop: 4,
  },
  converter: {
    marginTop: 4,
  },
});

export default ExchangeRateScreen;
