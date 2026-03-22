import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCustomAlert } from "../../components/common/CustomAlert";
import PhoneInput from "../../components/common/PhoneInput";
import { getSettings, saveSettings } from "../../services/database/settings";
import { setManualRate } from "../../services/exchange/rateService";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";

const { width, height } = Dimensions.get("window");

const slides = [
  {
    id: 1,
    title: "¡Bienvenido a T-Suma!",
    description:
      "Tu sistema completo de punto de venta para gestionar tu negocio de manera eficiente.",
    icon: "🏪",
  },
  {
    id: 2,
    title: "Gestión de Productos",
    description:
      "Administra tu inventario, precios y stock. Escanea códigos QR para ventas rápidas.",
    icon: "📦",
  },
  {
    id: 3,
    title: "Ventas y Clientes",
    description:
      "Registra ventas, administra clientes y controla cuentas por cobrar y pagar.",
    icon: "💰",
  },
  {
    id: 4,
    title: "Reportes y Respaldos",
    description:
      "Visualiza estadísticas de ventas, genera respaldos automáticos y mantén tus datos seguros.",
    icon: "📊",
  },
];

export const OnboardingScreen = ({ onComplete, initialStep = "slides" }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [step, setStep] = useState(initialStep); // slides | business | currency
  const { showAlert, CustomAlert } = useCustomAlert();
  const scrollViewRef = useRef(null);

  const [business, setBusiness] = useState({
    name: "",
    rif: "",
    address: "",
    phone: "",
    email: "",
  });

  const [displayCurrency, setDisplayCurrency] = useState("VES");
  const [rateInput, setRateInput] = useState("");

  const markSlidesSeen = async () => {
    try {
      await AsyncStorage.setItem("onboardingSlidesSeen", "true");
    } catch (error) {
      console.warn("Error saving onboardingSlidesSeen:", error);
    }
  };

  useEffect(() => {
    // Si el onboarding aparece en modo slides, marcar que ya se mostraron
    // para que no se repitan en próximos arranques.
    if (initialStep === "slides") {
      markSlidesSeen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Precargar datos del negocio si ya existen (para no obligar a reescribir).
    const loadExisting = async () => {
      try {
        const current = await getSettings();
        const existingBusiness = current?.business || {};
        setBusiness((prev) => ({
          ...prev,
          ...existingBusiness,
        }));
      } catch (error) {
        console.warn("Onboarding settings load failed:", error);
      }
    };

    loadExisting();
  }, []);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      const nextSlide = currentSlide + 1;
      setCurrentSlide(nextSlide);
      scrollViewRef.current?.scrollTo({
        x: nextSlide * width,
        animated: true,
      });
    } else {
      markSlidesSeen();
      setStep("business");
    }
  };

  const handleSkip = () => {
    markSlidesSeen();
    setStep("business");
  };

  const completeOnboarding = async ({ persistSettings = false } = {}) => {
    try {
      if (persistSettings) {
        // Guardar settings del onboarding (si aplica)
        try {
          const current = await getSettings();
          const nextSettings = {
            ...current,
            business: {
              ...current.business,
              ...business,
              isConfigured: true,
            },
            pricing: {
              ...current.pricing,
              displayCurrency: "VES",
              baseCurrency: "USD",
            },
          };

          await saveSettings(nextSettings);

          const rate = parseFloat(
            (rateInput || "").toString().replace(/,/g, "."),
          );
          if (rate && rate > 0) {
            await setManualRate(rate, "ONBOARDING");
          }
        } catch (error) {
          console.warn("Onboarding settings save failed:", error);
        }
      }

      await AsyncStorage.setItem("onboardingCompleted", "true");
      await markSlidesSeen();
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Error saving onboarding status:", error);
      if (onComplete) {
        onComplete();
      }
    }
  };

  const handleScroll = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentSlide(slideIndex);
  };

  const validateBusiness = () => {
    if (!business.name?.trim()) {
      showAlert({
        title: "Falta información",
        message: "El nombre del negocio es obligatorio.",
        type: "error",
      });
      return false;
    }
    return true;
  };

  const validateCurrency = () => {
    const rate = parseFloat((rateInput || "").toString().replace(/,/g, "."));
    if (!rate || rate <= 0) {
      showAlert({
        title: "Tasa requerida",
        message: "Ingresa una tasa válida (USD → VES).",
        type: "error",
      });
      return false;
    }
    return true;
  };

  return (
    <SafeAreaView style={styles.container}>
      {step === "slides" && (
        <View style={styles.skipContainer}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Saltar</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === "slides" ? (
        <>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={styles.scrollView}
          >
            {slides.map((slide) => (
              <View key={slide.id} style={styles.slide}>
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>{slide.icon}</Text>
                </View>

                <View style={styles.textContainer}>
                  <Text style={styles.title}>{slide.title}</Text>
                  {slide.id === 3 ? (
                    <Text style={styles.description}>
                      Registra ventas, administra clientes y controla cuentas
                      por cobrar y pagar.{" "}
                      <Text style={styles.boldText}>
                        La tasa de cambio actualiza automáticamente los precios
                        de productos y saldos de cuentas.
                      </Text>
                    </Text>
                  ) : (
                    <Text style={styles.description}>{slide.description}</Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.indicatorContainer}>
              {slides.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    currentSlide === index && styles.activeIndicator,
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>
                {currentSlide === slides.length - 1 ? "Comenzar" : "Siguiente"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <KeyboardAvoidingView
          style={styles.formWrapper}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {step === "business" ? "Datos del negocio" : "Moneda y tasa"}
              </Text>
              <Text style={styles.formSubtitle}>
                {step === "business"
                  ? "Configura la información básica para tus comprobantes y reportes."
                  : "La app trabaja con una tasa USD → VES para cálculos y reportes."}
              </Text>
            </View>

            {step === "business" ? (
              <View style={styles.formCard}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Nombre del negocio *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Mi Tienda C.A."
                    placeholderTextColor="#9aa2b1"
                    value={business.name}
                    onChangeText={(text) =>
                      setBusiness((prev) => ({ ...prev, name: text }))
                    }
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>RIF</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: J-12345678-9"
                    placeholderTextColor="#9aa2b1"
                    value={business.rif}
                    onChangeText={(text) =>
                      setBusiness((prev) => ({ ...prev, rif: text }))
                    }
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Dirección</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Dirección del negocio"
                    placeholderTextColor="#9aa2b1"
                    value={business.address}
                    onChangeText={(text) =>
                      setBusiness((prev) => ({ ...prev, address: text }))
                    }
                    multiline
                    numberOfLines={2}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Teléfono</Text>
                  <PhoneInput
                    value={business.phone}
                    onChangeText={(text) =>
                      setBusiness((prev) => ({ ...prev, phone: text }))
                    }
                    placeholder="Ej: 4121234567"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="contacto@mitienda.com"
                    placeholderTextColor="#9aa2b1"
                    value={business.email}
                    onChangeText={(text) =>
                      setBusiness((prev) => ({ ...prev, email: text }))
                    }
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>
            ) : (
              <View style={styles.formCard}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Moneda a usar</Text>
                  <View style={styles.currencyRow}>
                    <TouchableOpacity
                      style={[
                        styles.currencyChip,
                        displayCurrency === "VES" && styles.currencyChipActive,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => setDisplayCurrency("VES")}
                    >
                      <Text
                        style={[
                          styles.currencyChipText,
                          displayCurrency === "VES" &&
                            styles.currencyChipTextActive,
                        ]}
                      >
                        VES
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.currencyChip, styles.currencyChipDisabled]}
                      activeOpacity={0.85}
                      onPress={() => {
                        showAlert({
                          title: "Próximamente",
                          message:
                            "Actualmente la app está optimizada para VES (USD → VES). Podemos habilitar otras monedas cuando ampliemos las conversiones.",
                          type: "info",
                        });
                      }}
                    >
                      <Text style={styles.currencyChipText}>USD</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Tasa (USD → VES) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: 38.50"
                    placeholderTextColor="#9aa2b1"
                    value={rateInput}
                    onChangeText={setRateInput}
                    keyboardType="decimal-pad"
                  />
                </View>

                <Text style={styles.helperText}>
                  Podrás modificar la tasa luego en la sección “USD ($)”.
                </Text>
              </View>
            )}

            <View style={styles.formButtonsRow}>
              <TouchableOpacity
                style={[styles.formButton, styles.formButtonSecondary]}
                activeOpacity={0.85}
                onPress={() => {
                  if (step === "business") {
                    setStep("slides");
                    scrollViewRef.current?.scrollTo({
                      x: (slides.length - 1) * width,
                      animated: true,
                    });
                    setCurrentSlide(slides.length - 1);
                    return;
                  }
                  setStep("business");
                }}
              >
                <Text style={styles.formButtonSecondaryText}>Atrás</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.formButton, styles.formButtonPrimary]}
                activeOpacity={0.85}
                onPress={() => {
                  if (step === "business") {
                    if (!validateBusiness()) return;
                    setStep("currency");
                    return;
                  }

                  if (!validateCurrency()) return;
                  completeOnboarding({ persistSettings: true });
                }}
              >
                <Text style={styles.formButtonPrimaryText}>
                  {step === "business" ? "Siguiente" : "Finalizar"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
      <CustomAlert />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#4CAF50",
  },
  skipContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: hs(20),
    paddingTop: vs(50),
  },
  skipButton: {
    paddingVertical: vs(8),
    paddingHorizontal: hs(16),
  },
  skipText: {
    color: "#fff",
    fontSize: rf(16),
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: hs(40),
  },
  iconContainer: {
    width: s(120),
    height: s(120),
    borderRadius: s(60),
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: vs(40),
  },
  icon: {
    fontSize: iconSize.xxl,
  },
  textContainer: {
    alignItems: "center",
    maxWidth: s(300),
  },
  title: {
    fontSize: rf(28),
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: vs(20),
  },
  description: {
    fontSize: rf(16),
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: vs(24),
  },
  boldText: {
    fontSize: rf(16),
    color: "#fff",
    fontStyle: "italic",
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: vs(24),
  },
  footer: {
    paddingHorizontal: hs(20),
    paddingBottom: vs(40),
    paddingTop: vs(20),
  },
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: vs(30),
  },
  indicator: {
    width: s(10),
    height: s(10),
    borderRadius: s(5),
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginHorizontal: hs(5),
  },
  activeIndicator: {
    backgroundColor: "#fff",
    width: s(20),
  },
  nextButton: {
    backgroundColor: "#fff",
    paddingVertical: vs(15),
    paddingHorizontal: hs(30),
    borderRadius: borderRadius.xl,
    alignItems: "center",
  },
  nextButtonText: {
    color: "#4CAF50",
    fontSize: rf(18),
    fontWeight: "bold",
  },

  formWrapper: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: hs(20),
    paddingBottom: vs(28),
    gap: vs(16),
  },
  formHeader: {
    paddingTop: vs(12),
    gap: vs(8),
  },
  formTitle: {
    fontSize: rf(22),
    fontWeight: "800",
    color: "#fff",
  },
  formSubtitle: {
    fontSize: rf(13),
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: vs(18),
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: vs(14),
  },
  fieldGroup: {
    gap: vs(8),
  },
  fieldLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    color: "#6f7c8c",
    textTransform: "uppercase",
    letterSpacing: s(0.6),
  },
  input: {
    borderWidth: 1,
    borderColor: "#d9e0eb",
    borderRadius: borderRadius.sm,
    paddingHorizontal: hs(14),
    paddingVertical: vs(12),
    fontSize: rf(15),
    color: "#1f2633",
    backgroundColor: "#f8f9fc",
  },
  textArea: {
    minHeight: s(70),
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: rf(12),
    color: "#4c5767",
    backgroundColor: "#f3f8ff",
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    lineHeight: vs(18),
  },
  currencyRow: {
    flexDirection: "row",
    gap: hs(10),
  },
  currencyChip: {
    paddingVertical: vs(10),
    paddingHorizontal: hs(18),
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: "#d9e0eb",
    backgroundColor: "#f8f9fc",
  },
  currencyChipActive: {
    backgroundColor: "#e8f5e9",
    borderColor: "#bde5c5",
  },
  currencyChipDisabled: {
    opacity: 0.6,
  },
  currencyChipText: {
    fontSize: rf(14),
    fontWeight: "800",
    color: "#1f2633",
  },
  currencyChipTextActive: {
    color: "#2e7d32",
  },
  formButtonsRow: {
    flexDirection: "row",
    gap: hs(12),
  },
  formButton: {
    flex: 1,
    paddingVertical: vs(14),
    borderRadius: borderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  formButtonSecondary: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  formButtonSecondaryText: {
    color: "#fff",
    fontSize: rf(15),
    fontWeight: "700",
  },
  formButtonPrimary: {
    backgroundColor: "#fff",
  },
  formButtonPrimaryText: {
    color: "#4CAF50",
    fontSize: rf(15),
    fontWeight: "800",
  },
});

export default OnboardingScreen;
