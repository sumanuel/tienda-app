import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCustomAlert } from "../../components/common/CustomAlert";
import PhoneInput from "../../components/common/PhoneInput";
import { useAuth } from "../../contexts/AuthContext";
import { getSettings, saveSettings } from "../../services/database/settings";
import {
  getCurrentRate,
  setManualRate,
} from "../../services/exchange/rateService";
import {
  acceptInviteForCurrentUser,
  createStoreForCurrentUser,
  listPendingInvitesForCurrentUser,
} from "../../services/store/storeCollaborationService";
import { saveOnboardingState } from "../../services/onboarding/onboardingState";
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
    iconName: "storefront-outline",
  },
  {
    id: 2,
    title: "Gestión de Productos",
    description:
      "Administra tu inventario, precios y stock. Escanea códigos QR para ventas rápidas.",
    iconName: "cube-outline",
  },
  {
    id: 3,
    title: "Ventas y Clientes",
    description:
      "Registra ventas, administra clientes y controla cuentas por cobrar y pagar.",
    iconName: "cash-outline",
  },
  {
    id: 4,
    title: "Reportes y Respaldos",
    description:
      "Visualiza estadísticas de ventas, genera respaldos automáticos y mantén tus datos seguros.",
    iconName: "bar-chart-outline",
  },
];

const isSharedStoreCloudBlockedError = (error) =>
  String(error?.message || "")
    .trim()
    .toLowerCase()
    .includes("la tienda está en modo local para esta sesión");

export const OnboardingScreen = ({
  onComplete,
  initialStep = "slides",
  requireInitialStoreSetup = false,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [step, setStep] = useState(initialStep); // slides | business | currency
  const {
    user,
    activeStoreId,
    memberships,
    refreshStoreContext,
    syncNow,
    activateStoreLocally,
  } = useAuth();
  const { showAlert, CustomAlert } = useCustomAlert();
  const scrollViewRef = useRef(null);
  const rateDirtyRef = useRef(false);
  const existingBusinessLoadedRef = useRef(false);
  const existingRateLoadedRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);

  const [business, setBusiness] = useState({
    name: "",
    rif: "",
    address: "",
    phone: "",
    email: "",
  });

  const [displayCurrency, setDisplayCurrency] = useState("VES");
  const [rateInput, setRateInput] = useState("");
  const [ivaInput, setIvaInput] = useState("16");
  const [applyIvaOnSales, setApplyIvaOnSales] = useState(false);

  const activeMembership = memberships.find(
    (item) => item.storeId === activeStoreId,
  );
  const canManageStoreSettings = ["owner", "admin"].includes(
    String(activeMembership?.role || "")
      .trim()
      .toLowerCase(),
  );

  const markSlidesSeen = async () => {
    try {
      await saveOnboardingState(user?.uid, {
        completed: false,
        slidesSeen: true,
      });
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
        const hasExistingBusiness = [
          existingBusiness?.name,
          existingBusiness?.rif,
          existingBusiness?.address,
          existingBusiness?.phone,
          existingBusiness?.email,
        ].some((value) => String(value || "").trim().length > 0);

        existingBusinessLoadedRef.current = hasExistingBusiness;
        setBusiness((prev) => ({
          ...prev,
          ...existingBusiness,
        }));

        // Si ya existe una tasa guardada, precargarla.
        // Esto aplica especialmente cuando el usuario reabre el onboarding desde el librito.
        const currentRate = await getCurrentRate();
        const savedRate = currentRate?.rate;
        const pricing = current?.pricing || {};
        if (!rateDirtyRef.current && savedRate && savedRate > 0) {
          existingRateLoadedRef.current = true;
          setRateInput(String(savedRate));
        }
        setIvaInput(String(pricing.iva ?? 16));
        setApplyIvaOnSales(pricing.applyIvaOnSales ?? false);
      } catch (error) {
        console.warn("Onboarding settings load failed:", error);
      }
    };

    loadExisting();
  }, []);

  useEffect(() => {
    const loadPendingInvites = async () => {
      if (!requireInitialStoreSetup || activeStoreId) {
        setPendingInvites([]);
        return;
      }

      try {
        const invites = await listPendingInvitesForCurrentUser();
        setPendingInvites(invites);
      } catch (error) {
        console.warn("Onboarding invites load failed:", error);
      }
    };

    loadPendingInvites();
  }, [requireInitialStoreSetup, activeStoreId]);

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
      setSaving(true);
      const shouldReuseExistingConfiguration =
        !requireInitialStoreSetup &&
        Boolean(activeStoreId) &&
        (existingBusinessLoadedRef.current || existingRateLoadedRef.current);

      if (persistSettings && !shouldReuseExistingConfiguration) {
        // Guardar settings del onboarding (si aplica)
        try {
          let createdStore = null;
          const shouldPersistStoreSettings =
            requireInitialStoreSetup || canManageStoreSettings;

          if (requireInitialStoreSetup && !activeStoreId) {
            createdStore = await createStoreForCurrentUser(
              {
                name: business.name,
                rif: business.rif,
                address: business.address,
                phone: business.phone,
                email: business.email,
              },
              { reuseExistingOwnerStore: true },
            );

            const refreshedContext = await refreshStoreContext(
              createdStore.storeId,
            );

            if (!refreshedContext?.activeStoreId) {
              await activateStoreLocally(createdStore);
            }
          }

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
              iva:
                parseFloat((ivaInput || "").toString().replace(/,/g, ".")) || 0,
              applyIvaOnSales,
            },
          };

          if (shouldPersistStoreSettings) {
            await saveSettings(nextSettings);
          }
          if (createdStore?.storeId) {
            await syncNow("stores:create-initial");
          }

          const rate = parseFloat(
            (rateInput || "").toString().replace(/,/g, "."),
          );
          if (rate && rate > 0) {
            await setManualRate(rate, "ONBOARDING");
          }
        } catch (error) {
          if (
            isSharedStoreCloudBlockedError(error) &&
            !requireInitialStoreSetup &&
            activeStoreId
          ) {
            console.warn(
              "Onboarding settings skipped because the existing store is temporarily in local-only mode:",
              error,
            );
          } else {
            console.warn("Onboarding settings save failed:", error);
            throw error;
          }
        }
      }

      await saveOnboardingState(user?.uid, {
        completed: true,
        slidesSeen: true,
      });
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Error saving onboarding status:", error);
      showAlert({
        title: "Error",
        message:
          error?.message ||
          "No se pudo completar la configuración inicial de la tienda.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptInvite = async (invite) => {
    try {
      setSaving(true);
      const accepted = await acceptInviteForCurrentUser(invite);
      const refreshedContext = await refreshStoreContext(accepted.storeId);
      if (!refreshedContext?.activeStoreId) {
        await activateStoreLocally(accepted);
      }
      await syncNow("stores:accept-invite-onboarding");
      await saveOnboardingState(user?.uid, {
        completed: true,
        slidesSeen: true,
      });
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Error accepting invite during onboarding:", error);
      showAlert({
        title: "Error",
        message:
          error?.message || "No se pudo aceptar la invitación a la tienda.",
        type: "error",
      });
    } finally {
      setSaving(false);
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

    if (requireInitialStoreSetup && !business.rif?.trim()) {
      showAlert({
        title: "Falta información",
        message: "El RIF de la tienda es obligatorio.",
        type: "error",
      });
      return false;
    }

    if (requireInitialStoreSetup && !business.address?.trim()) {
      showAlert({
        title: "Falta información",
        message: "La dirección de la tienda es obligatoria.",
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

    const iva = parseFloat((ivaInput || "").toString().replace(/,/g, "."));
    if (Number.isNaN(iva) || iva < 0 || iva > 100) {
      showAlert({
        title: "IVA inválido",
        message: "Ingresa un porcentaje de IVA entre 0 y 100.",
        type: "error",
      });
      return false;
    }

    return true;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
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
                  <Ionicons
                    name={slide.iconName}
                    size={iconSize.xxl}
                    color="#ffffff"
                  />
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
                {step === "business"
                  ? requireInitialStoreSetup
                    ? "Crea tu tienda inicial"
                    : "Datos del negocio"
                  : "Moneda y tasa"}
              </Text>
              <Text style={styles.formSubtitle}>
                {step === "business"
                  ? requireInitialStoreSetup
                    ? "Usaremos estos datos para crear tu primera tienda en Firebase y dejarla activa."
                    : "Configura la información básica para tus comprobantes y reportes."
                  : "La app trabaja con una tasa USD → VES para cálculos y reportes."}
              </Text>
            </View>

            {step === "business" ? (
              <View style={styles.formCard}>
                {requireInitialStoreSetup && pendingInvites.length > 0 && (
                  <View style={styles.invitesCard}>
                    <Text style={styles.invitesTitle}>
                      Ya tienes invitaciones pendientes
                    </Text>
                    <Text style={styles.invitesSubtitle}>
                      Si solo vas a trabajar en una tienda existente, puedes
                      aceptarla ahora sin crear una nueva.
                    </Text>
                    {pendingInvites.map((invite) => (
                      <View key={invite.id} style={styles.inviteRow}>
                        <View style={styles.inviteInfo}>
                          <Text style={styles.inviteName}>
                            {invite.storeName}
                          </Text>
                          <Text style={styles.inviteRole}>{invite.role}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.inviteButton}
                          activeOpacity={0.85}
                          disabled={saving}
                          onPress={() => handleAcceptInvite(invite)}
                        >
                          <Text style={styles.inviteButtonText}>Aceptar</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    {requireInitialStoreSetup
                      ? "Nombre de la tienda *"
                      : "Nombre del negocio *"}
                  </Text>
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
                    onChangeText={(text) => {
                      rateDirtyRef.current = true;
                      setRateInput(text);
                    }}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>IVA por defecto (%)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: 16"
                    placeholderTextColor="#9aa2b1"
                    value={ivaInput}
                    onChangeText={setIvaInput}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.toggleRow}>
                  <View style={styles.toggleCopy}>
                    <Text style={styles.toggleTitle}>
                      Aplicar IVA al cobrar
                    </Text>
                    <Text style={styles.toggleDescription}>
                      Cuando esté activo, el punto de venta sumará IVA a las
                      ventas.
                    </Text>
                  </View>
                  <Switch
                    value={applyIvaOnSales}
                    onValueChange={setApplyIvaOnSales}
                    trackColor={{ false: "#d5dbe7", true: "#81C784" }}
                    thumbColor={applyIvaOnSales ? "#1f9254" : "#f4f3f4"}
                  />
                </View>

                <Text style={styles.helperText}>
                  Podrás modificar la tasa y el IVA luego en “Margen de
                  ganancias”.
                </Text>
              </View>
            )}

            <View style={styles.formButtonsRow}>
              <TouchableOpacity
                style={[styles.formButton, styles.formButtonSecondary]}
                activeOpacity={0.85}
                disabled={saving}
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
                style={[
                  styles.formButton,
                  styles.formButtonPrimary,
                  saving && styles.buttonDisabled,
                ]}
                activeOpacity={0.85}
                disabled={saving}
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
                {saving ? (
                  <Text style={styles.formButtonPrimaryText}>
                    Procesando...
                  </Text>
                ) : (
                  <Text style={styles.formButtonPrimaryText}>
                    {step === "business"
                      ? "Siguiente"
                      : requireInitialStoreSetup && !activeStoreId
                        ? "Crear tienda"
                        : "Finalizar"}
                  </Text>
                )}
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
    paddingTop: vs(10),
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
  invitesCard: {
    backgroundColor: "#f6f9ff",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: vs(10),
    borderWidth: 1,
    borderColor: "#d9e6ff",
  },
  invitesTitle: {
    fontSize: rf(14),
    fontWeight: "800",
    color: "#1f2633",
  },
  invitesSubtitle: {
    fontSize: rf(12),
    color: "#4c5767",
    lineHeight: vs(18),
  },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: hs(10),
    paddingVertical: vs(6),
  },
  inviteInfo: {
    flex: 1,
    gap: vs(2),
  },
  inviteName: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#1f2633",
  },
  inviteRole: {
    fontSize: rf(12),
    color: "#6f7c8c",
    textTransform: "capitalize",
  },
  inviteButton: {
    backgroundColor: "#2f5ae0",
    borderRadius: borderRadius.lg,
    paddingHorizontal: hs(14),
    paddingVertical: vs(10),
  },
  inviteButtonText: {
    color: "#fff",
    fontSize: rf(12),
    fontWeight: "800",
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
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.lg,
    },
    toggleCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    toggleTitle: {
      fontSize: rf(15),
      fontWeight: "600",
      color: "#1f2633",
    },
    toggleDescription: {
      fontSize: rf(13),
      color: "#6f7c8c",
      lineHeight: vs(18),
    },
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
