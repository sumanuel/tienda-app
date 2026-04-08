import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTourGuideController } from "rn-tourguide";
import {
  updateProduct,
  updateProductStock,
  insertInventoryMovement,
} from "../../services/database/products";
import { useExchangeRate } from "../../hooks/useExchangeRate";
import { getSettings } from "../../services/database/settings";
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

export const AddInventoryEntryScreen = ({ navigation, route }) => {
  const { product } = route.params;
  const { canStart, start, TourGuideZone } =
    useTourGuideController("inventoryEntry");
  const TOUR_ZONE_BASE = 5200;
  const [tourBooted, setTourBooted] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { showAlert, CustomAlert } = useCustomAlert();

  const { rate: exchangeRate } = useExchangeRate();
  const [settings, setSettings] = useState({});

  const [cost, setCost] = useState("");
  const [additionalCost, setAdditionalCost] = useState("");
  const [costCurrency, setCostCurrency] = useState("USD");
  const [margin, setMargin] = useState(30);
  const [calculatedPrices, setCalculatedPrices] = useState({
    usd: "",
    ves: "",
  });

  const [pricingDirty, setPricingDirty] = useState(false);
  const pricingDirtyRef = useRef(false);

  useEffect(() => {
    pricingDirtyRef.current = pricingDirty;
  }, [pricingDirty]);

  useEffect(() => {
    const loadSettings = async () => {
      const data = await getSettings();
      setSettings(data);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    let mounted = true;

    const maybeStartTour = async () => {
      if (tourBooted) return;
      if (!canStart) return;

      const tourId = "inventoryEntry";
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

  const appliedRate = useMemo(() => {
    const rateFromSettings = Number(settings?.pricing?.currencies?.USD) || 0;
    return Number(exchangeRate) || rateFromSettings || 0;
  }, [exchangeRate, settings]);

  // Precargar datos actuales del producto (para no forzar recalculo)
  useEffect(() => {
    const productCost = typeof product?.cost === "number" ? product.cost : 0;
    const productAdditional =
      typeof product?.additionalCost === "number" ? product.additionalCost : 0;

    const fallbackMargin = Number(settings?.pricing?.defaultMargin) || 30;
    const productMargin =
      typeof product?.margin === "number" ? product.margin : fallbackMargin;

    setCost(productCost.toFixed(2));
    setAdditionalCost(productAdditional.toFixed(2));
    setCostCurrency("USD");
    setMargin(productMargin);

    const priceUSD =
      typeof product?.priceUSD === "number" ? product.priceUSD : 0;
    const priceVES =
      typeof product?.priceVES === "number" ? product.priceVES : 0;

    setCalculatedPrices({
      usd: priceUSD ? priceUSD.toFixed(2) : "",
      ves: priceVES ? priceVES.toFixed(2) : "",
    });

    setPricingDirty(false);
  }, [product, settings]);

  // Si no hay priceVES persistido, precargarlo por conversión (sin marcar dirty)
  useEffect(() => {
    if (pricingDirtyRef.current) return;
    if (!appliedRate) return;

    const usd = calculatedPrices.usd ? parseFloat(calculatedPrices.usd) : 0;
    const ves = calculatedPrices.ves ? parseFloat(calculatedPrices.ves) : 0;

    if (usd > 0 && (!ves || Number.isNaN(ves))) {
      const computedVES = usd * appliedRate;
      setCalculatedPrices((prev) => ({
        ...prev,
        ves: computedVES.toFixed(2),
      }));
    }
  }, [appliedRate, calculatedPrices.usd, calculatedPrices.ves]);

  // Recalcular precios solo si el usuario toca costo/margen
  useEffect(() => {
    if (!pricingDirtyRef.current) return;
    if (!appliedRate) return;

    const costValue = parseFloat(cost);
    const additionalCostValue = additionalCost ? parseFloat(additionalCost) : 0;

    const canUseAdditionalCost =
      additionalCost === "" || !Number.isNaN(additionalCostValue);

    if (Number.isNaN(costValue) || !canUseAdditionalCost) {
      setCalculatedPrices({ usd: "", ves: "" });
      return;
    }

    const totalCostInCostCurrency =
      costValue + (Number.isNaN(additionalCostValue) ? 0 : additionalCostValue);

    const sellingPriceInCostCurrency =
      totalCostInCostCurrency * (1 + (Number(margin) || 0) / 100);

    let usdPrice = 0;
    let vesPrice = 0;

    if (costCurrency === "USD") {
      usdPrice = sellingPriceInCostCurrency;
      vesPrice = usdPrice * appliedRate;
    } else {
      vesPrice = sellingPriceInCostCurrency;
      usdPrice = vesPrice / appliedRate;
    }

    setCalculatedPrices({
      usd: usdPrice.toFixed(2),
      ves: vesPrice.toFixed(2),
    });
  }, [cost, additionalCost, costCurrency, margin, appliedRate]);

  const handleSave = async () => {
    if (loading) return;

    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      Alert.alert("Error", "Ingresa una cantidad válida mayor a 0");
      return;
    }

    if (!cost || Number.isNaN(parseFloat(cost))) {
      showAlert({
        title: "Error",
        message: "El costo del producto debe ser un número válido",
        type: "error",
      });
      return;
    }

    if (
      additionalCost !== "" &&
      (Number.isNaN(parseFloat(additionalCost)) ||
        parseFloat(additionalCost) < 0)
    ) {
      showAlert({
        title: "Error",
        message: "El costo adicional debe ser un número válido",
        type: "error",
      });
      return;
    }

    try {
      setLoading(true);
      const newStock = product.stock + qty;

      // Por defecto, solo actualizamos stock.
      // Si el usuario modificó costo/margen, persistimos también costo/costo adicional/margen/precios.
      if (pricingDirtyRef.current) {
        if (costCurrency !== "USD" && !appliedRate) {
          showAlert({
            title: "Error",
            message:
              "No hay tasa disponible para calcular desde VES. Revisa tu tasa USD→VES.",
            type: "error",
          });
          return;
        }

        const costInput = parseFloat(cost) || 0;
        const additionalCostInput = additionalCost
          ? parseFloat(additionalCost)
          : 0;

        const costUSD =
          costCurrency === "USD" ? costInput : costInput / appliedRate;
        const additionalCostUSD =
          costCurrency === "USD"
            ? additionalCostInput
            : additionalCostInput / appliedRate;

        const updatedProduct = {
          name: product.name,
          barcode: product.barcode,
          category: product.category,
          description: product.description || "",
          cost: costUSD,
          additionalCost: additionalCostUSD,
          priceUSD:
            calculatedPrices.usd !== "" &&
            !Number.isNaN(parseFloat(calculatedPrices.usd))
              ? parseFloat(calculatedPrices.usd)
              : Number(product.priceUSD) || 0,
          priceVES:
            calculatedPrices.ves !== "" &&
            !Number.isNaN(parseFloat(calculatedPrices.ves))
              ? parseFloat(calculatedPrices.ves)
              : Number(product.priceVES) || 0,
          margin: Number(margin) || 0,
          stock: newStock,
          minStock: typeof product.minStock === "number" ? product.minStock : 0,
          image: product.image || "",
        };

        await updateProduct(product.id, updatedProduct);
      } else {
        await updateProductStock(product.id, newStock);
      }

      // Registrar movimiento de entrada
      await insertInventoryMovement(
        product.id,
        "entry",
        qty,
        product.stock,
        notes.trim() || null,
      );

      navigation.goBack();
    } catch (error) {
      console.error("Error actualizando stock:", error);
      showAlert({
        title: "Error",
        message: "No se pudo actualizar el inventario",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 80}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContent}>
            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Ionicons
                  name="cube-outline"
                  size={iconSize.xl}
                  color="#c9861a"
                />
              </View>
              <View style={styles.heroTextContainer}>
                <Text style={styles.heroTitle}>
                  Agregar Entrada de Inventario
                </Text>
                <Text style={styles.heroSubtitle}>{product.name}</Text>
                <Text style={styles.productCode}>
                  Código: {product.barcode}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.formCard}>
            <TourGuideZone
              zone={TOUR_ZONE_BASE + 1}
              text={
                "En 'Cantidad a agregar' indica cuántas unidades vas a sumar al inventario."
              }
              borderRadius={borderRadius.lg}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Cantidad a agregar</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej: 10"
                  placeholderTextColor="#9aa6b5"
                  value={quantity}
                  onChangeText={(v) => {
                    setQuantity(v);
                  }}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
              </View>
            </TourGuideZone>

            <TourGuideZone
              zone={TOUR_ZONE_BASE + 2}
              text={
                "Aquí eliges la moneda del costo y puedes ajustar costo, costo adicional y margen."
              }
              borderRadius={borderRadius.lg}
            >
              <View style={styles.currencySwitch}>
                {[
                  { code: "USD", label: "Costo en USD" },
                  { code: "Bs", label: "Costo en VES" },
                ].map((option) => {
                  const active = costCurrency === option.code;
                  return (
                    <TouchableOpacity
                      key={option.code}
                      style={[
                        styles.currencyChip,
                        active ? styles.currencyChipActive : null,
                      ]}
                      onPress={() => {
                        if (option.code === costCurrency) return;

                        if (option.code === "Bs" && !appliedRate) {
                          showAlert({
                            title: "Tasa requerida",
                            message:
                              "Configura la tasa USD→VES para ingresar costos en VES.",
                            type: "error",
                          });
                          return;
                        }

                        const parsedCost = parseFloat(cost);
                        const parsedAdditional = parseFloat(additionalCost);

                        const canConvert =
                          appliedRate &&
                          !Number.isNaN(parsedCost) &&
                          (!additionalCost || !Number.isNaN(parsedAdditional));

                        if (canConvert) {
                          const factor =
                            option.code === "Bs"
                              ? appliedRate
                              : 1 / appliedRate;
                          setCost((parsedCost * factor).toFixed(2));
                          setAdditionalCost(
                            (Number.isNaN(parsedAdditional)
                              ? 0
                              : parsedAdditional * factor
                            ).toFixed(2),
                          );
                        }

                        setCostCurrency(option.code);
                        setPricingDirty(true);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.currencyChipText,
                          active ? styles.currencyChipTextActive : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              (loading || !quantity.trim()) && styles.buttonDisabled,
            </TourGuideZone>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Costo</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0.00"
                placeholderTextColor="#9aa6b5"
                value={cost}
                onChangeText={(v) => {
                  setCost(v);
                  setPricingDirty(true);
                }}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Costo adicional (opcional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0.00"
                placeholderTextColor="#9aa6b5"
                value={additionalCost}
                onChangeText={(v) => {
                  setAdditionalCost(v);
                  setPricingDirty(true);
                }}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Margen (%)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="30"
                placeholderTextColor="#9aa6b5"
                value={String(margin)}
                onChangeText={(v) => {
                  setMargin(Number(v) || 0);
                  setPricingDirty(true);
                }}
                keyboardType="numeric"
                returnKeyType="next"
              />
            </View>

            <View style={styles.priceGrid}>
              <View style={styles.priceCard}>
                <Text style={styles.priceLabel}>USD</Text>
                <Text style={styles.priceValue}>
                  {calculatedPrices.usd ? `$${calculatedPrices.usd}` : "—"}
                </Text>
                <Text style={styles.priceHint}>
                  {pricingDirty ? "Recalculado" : "Precio actual"}
                </Text>
              </View>
              <View style={styles.priceCard}>
                <Text style={styles.priceLabel}>VES</Text>
                <Text style={styles.priceValue}>
                  {calculatedPrices.ves ? `VES ${calculatedPrices.ves}` : "—"}
                </Text>
                <Text style={styles.priceHint}>
                  {pricingDirty ? "Recalculado" : "Precio actual"}
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notas (opcional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Observaciones sobre esta entrada..."
                placeholderTextColor="#9aa6b5"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                Stock actual: {product.stock} unidades
              </Text>
              {quantity && (
                <Text style={styles.summaryText}>
                  Stock después: {product.stock + parseInt(quantity || 0)}{" "}
                  unidades
                </Text>
              )}
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TourGuideZone
              zone={TOUR_ZONE_BASE + 3}
              text={"Guarda la entrada de inventario y actualiza el stock."}
              shape="rectangle"
              borderRadius={borderRadius.lg}
            >
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  (loading || !quantity.trim()) && styles.buttonDisabled,
                ]}
                onPress={handleSave}
                disabled={loading || !quantity.trim()}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? "Guardando..." : "Agregar Entrada"}
                </Text>
              </TouchableOpacity>
            </TourGuideZone>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <CustomAlert />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8edf2",
  },
  content: {
    paddingHorizontal: hs(16),
    paddingTop: vs(16),
    paddingBottom: vs(36),
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: vs(8) },
    shadowOpacity: 0.07,
    shadowRadius: s(12),
    elevation: 4,
    marginBottom: vs(20),
  },
  inputGroup: {
    marginBottom: vs(16),
  },
  label: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "#2f3a4c",
    marginBottom: vs(8),
  },
  textInput: {
    backgroundColor: "#f3f5fa",
    borderRadius: borderRadius.md,
    paddingVertical: vs(12),
    paddingHorizontal: hs(16),
    fontSize: rf(15),
    color: "#1f2633",
  },
  textArea: {
    height: vs(80),
    textAlignVertical: "top",
  },
  currencySwitch: {
    flexDirection: "row",
    backgroundColor: "#f3f5fa",
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: vs(6),
    marginBottom: vs(16),
  },
  currencyChip: {
    flex: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: vs(10),
    paddingHorizontal: hs(12),
    alignItems: "center",
    justifyContent: "center",
  },
  currencyChipActive: {
    backgroundColor: "#2f5ae0",
  },
  currencyChipText: {
    fontSize: rf(12),
    fontWeight: "600",
    color: "#5b6472",
  },
  currencyChipTextActive: {
    color: "#fff",
  },
  summary: {
    backgroundColor: "#f8f9fa",
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  summaryText: {
    fontSize: rf(14),
    color: "#6c7a8a",
    marginBottom: vs(4),
  },
  buttonContainer: {
    flexDirection: "row",
    gap: spacing.md,
  },
  button: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: vs(14),
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f5fa",
  },
  cancelButtonText: {
    color: "#6c7a8a",
    fontWeight: "600",
    fontSize: rf(15),
  },
  saveButton: {
    backgroundColor: "#4CAF50",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: rf(15),
  },
  headerContent: {
    gap: spacing.md,
    marginBottom: vs(8),
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: vs(10) },
    shadowOpacity: 0.08,
    shadowRadius: s(18),
    elevation: 8,
  },
  heroIcon: {
    width: iconSize.xl,
    height: iconSize.xl,
    borderRadius: borderRadius.xl,
    backgroundColor: "#f3f8ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: hs(18),
  },
  heroIconText: {
    fontSize: rf(30),
  },
  heroTextContainer: {
    flex: 1,
    gap: vs(6),
  },
  priceGrid: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: vs(16),
  },
  priceCard: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  priceLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    color: "#6c7a8a",
    marginBottom: vs(6),
  },
  priceValue: {
    fontSize: rf(16),
    fontWeight: "800",
    color: "#1f2633",
  },
  priceHint: {
    marginTop: vs(6),
    fontSize: rf(12),
    color: "#6c7a8a",
  },
  heroTitle: {
    fontSize: rf(20),
    fontWeight: "700",
    color: "#1f2633",
  },
  heroSubtitle: {
    fontSize: rf(16),
    color: "#5b6472",
    lineHeight: rf(20),
  },
  productCode: {
    fontSize: rf(14),
    color: "#6c7a8a",
    fontWeight: "500",
  },
});

export default AddInventoryEntryScreen;
