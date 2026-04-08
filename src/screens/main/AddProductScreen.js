import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useProducts } from "../../hooks/useProducts";
import { useExchangeRate } from "../../hooks/useExchangeRate";
import { getSettings } from "../../services/database/settings";
import { insertInventoryMovement } from "../../services/database/products";
import { useCustomAlert } from "../../components/common/CustomAlert";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";

/**
 * Pantalla para agregar nuevo producto
 */
export const AddProductScreen = ({ navigation }) => {
  const { addProduct } = useProducts();
  const { rate: exchangeRate } = useExchangeRate();
  const { showAlert, CustomAlert } = useCustomAlert();
  const [loading, setLoading] = useState(false);

  const [settings, setSettings] = useState({});
  const [cost, setCost] = useState("");
  const [additionalCost, setAdditionalCost] = useState("");
  const [costCurrency, setCostCurrency] = useState("USD");
  const [margin, setMargin] = useState(30);
  const [calculatedPrices, setCalculatedPrices] = useState({
    usd: "",
    ves: "",
  });

  const nameRef = useRef(null);
  const categoryRef = useRef(null);
  const costRef = useRef(null);
  const additionalCostRef = useRef(null);
  const marginRef = useRef(null);
  const stockRef = useRef(null);
  const descriptionRef = useRef(null);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    const loadSettings = async () => {
      const data = await getSettings();
      setSettings(data);
      setMargin(data?.pricing?.defaultMargin || 30);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const rateFromSettings = Number(settings?.pricing?.currencies?.USD) || 0;
    const appliedRate = Number(exchangeRate) || rateFromSettings || 0;

    if (cost && appliedRate) {
      const costValue = parseFloat(cost);
      const additionalCostValue = additionalCost
        ? parseFloat(additionalCost)
        : 0;

      const canUseAdditionalCost =
        additionalCost === "" || !Number.isNaN(additionalCostValue);

      if (!Number.isNaN(costValue) && canUseAdditionalCost) {
        const totalCostInCostCurrency =
          costValue +
          (Number.isNaN(additionalCostValue) ? 0 : additionalCostValue);

        const sellingPriceInCostCurrency =
          totalCostInCostCurrency * (1 + margin / 100);

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
        return;
      }
    }

    setCalculatedPrices({ usd: "", ves: "" });
  }, [cost, additionalCost, costCurrency, margin, settings, exchangeRate]);

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

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    priceUSD: calculatedPrices.usd,
    stock: "",
    description: "",
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      priceUSD: calculatedPrices.usd,
    }));
  }, [calculatedPrices]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (loading) return;

    if (!formData.name.trim()) {
      showAlert({
        title: "Error",
        message: "El nombre del producto es obligatorio",
        type: "error",
      });
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

    if (!calculatedPrices.usd || !calculatedPrices.ves) {
      showAlert({
        title: "Error",
        message:
          "No se pudieron calcular los precios. Revisa la configuración de tasas",
        type: "error",
      });
      return;
    }

    if (!formData.stock || Number.isNaN(parseInt(formData.stock, 10))) {
      showAlert({
        title: "Error",
        message: "El stock debe ser un número válido",
        type: "error",
      });
      return;
    }

    try {
      setLoading(true);
      const rateFromSettings = Number(settings?.pricing?.currencies?.USD) || 0;
      const appliedRate = Number(exchangeRate) || rateFromSettings || 0;

      const costInput = parseFloat(cost);
      const additionalCostInput = additionalCost
        ? parseFloat(additionalCost)
        : 0;

      const costUSD =
        costCurrency === "USD"
          ? costInput
          : appliedRate
            ? costInput / appliedRate
            : 0;

      const additionalCostUSD =
        costCurrency === "USD"
          ? additionalCostInput
          : appliedRate
            ? additionalCostInput / appliedRate
            : 0;

      const productData = {
        name: formData.name.trim(),
        category: formData.category.trim() || "General",
        cost: costUSD,
        additionalCost: additionalCostUSD,
        costCurrency,
        priceUSD: parseFloat(calculatedPrices.usd),
        priceVES: parseFloat(calculatedPrices.ves),
        margin,
        stock: parseInt(formData.stock, 10),
        minStock: 0,
        description: formData.description.trim(),
      };

      const productId = await addProduct(productData);

      // Si hay stock inicial, registrar como movimiento de entrada
      if (productData.stock > 0) {
        await insertInventoryMovement(
          productId,
          "entry",
          productData.stock,
          0, // Stock anterior era 0
          "Inventario Inicial",
        );
      }

      showAlert({
        title: "Éxito",
        message: "Producto agregado correctamente",
        type: "success",
        buttons: [{ text: "OK", onPress: () => navigation.goBack() }],
      });
    } catch (error) {
      console.error("Error adding product:", error);
      showAlert({
        title: "Error",
        message: "No se pudo agregar el producto",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const pricingSummary = useMemo(() => {
    const usd = calculatedPrices.usd ? parseFloat(calculatedPrices.usd) : 0;
    const ves = calculatedPrices.ves ? parseFloat(calculatedPrices.ves) : 0;
    const inferredRate = usd ? ves / usd : exchangeRate || 0;

    return {
      usd,
      ves,
      rate: inferredRate,
    };
  }, [calculatedPrices, exchangeRate]);

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 80}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>Nuevo producto</Text>
              <Text style={styles.heroSubtitle}>
                Calculamos automáticamente el precio sugerido según el margen
                configurado.
              </Text>
            </View>
          </View>

          {/* <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Precio sugerido (USD)</Text>
              <Text style={styles.summaryValue}>
                {pricingSummary.usd ? `$${pricingSummary.usd.toFixed(2)}` : "—"}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Precio sugerido (Bs)</Text>
              <Text style={styles.summaryValue}>
                {pricingSummary.ves
                  ? `Bs ${pricingSummary.ves.toFixed(2)}`
                  : "—"}
              </Text>
            </View>
          </View>
          <Text style={styles.summaryHint}>
            Margen aplicado {margin || 0}%
            {pricingSummary.rate
              ? ` • Tasa ${pricingSummary.rate.toFixed(2)}`
              : ""}
          </Text>
        </View> */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Detalles del producto</Text>
            <Text style={styles.sectionHint}>
              Esta información se mostrará en el catálogo y comprobantes de
              venta.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nombre *</Text>
              <TextInput
                ref={nameRef}
                style={styles.input}
                placeholder="Ingresa el nombre del producto"
                placeholderTextColor="#9aa2b1"
                value={formData.name}
                onChangeText={(value) => handleInputChange("name", value)}
                returnKeyType="next"
                onFocus={() => scrollToField(nameRef)}
                onSubmitEditing={() => categoryRef.current?.focus()}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Categoría</Text>
              <TextInput
                ref={categoryRef}
                style={styles.input}
                placeholder="Ej: Bebidas, Hogar, Limpieza"
                placeholderTextColor="#9aa2b1"
                value={formData.category}
                onChangeText={(value) => handleInputChange("category", value)}
                returnKeyType="next"
                onFocus={() => scrollToField(categoryRef)}
                onSubmitEditing={() => descriptionRef.current?.focus()}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Descripción</Text>
              <TextInput
                ref={descriptionRef}
                style={[styles.input, styles.textArea]}
                placeholder="Características, presentación o notas internas"
                placeholderTextColor="#9aa2b1"
                value={formData.description}
                onChangeText={(value) =>
                  handleInputChange("description", value)
                }
                multiline
                numberOfLines={4}
                onFocus={() => scrollToField(descriptionRef)}
              />
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Precio y margen</Text>
            <Text style={styles.sectionHint}>
              Ajusta el costo base y el margen para definir el precio sugerido.
            </Text>
          </View>

          <View style={styles.card}>
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

                      const rateFromSettings =
                        Number(settings?.pricing?.currencies?.USD) || 0;
                      const appliedRate =
                        Number(exchangeRate) || rateFromSettings || 0;

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

                      if (appliedRate && !Number.isNaN(parsedCost)) {
                        const factor =
                          option.code === "Bs" ? appliedRate : 1 / appliedRate;
                        setCost((parsedCost * factor).toFixed(2));

                        // Mantener opcionalidad: si está vacío, no lo forzamos a 0.00
                        if (additionalCost !== "") {
                          setAdditionalCost(
                            (Number.isNaN(parsedAdditional)
                              ? 0
                              : parsedAdditional * factor
                            ).toFixed(2),
                          );
                        }
                      }

                      setCostCurrency(option.code);
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

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Costo *</Text>
              <TextInput
                ref={costRef}
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#9aa2b1"
                value={cost}
                onChangeText={setCost}
                keyboardType="decimal-pad"
                returnKeyType="next"
                onFocus={() => scrollToField(costRef)}
                onSubmitEditing={() => additionalCostRef.current?.focus()}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Costo adicional (opcional)</Text>
              <TextInput
                ref={additionalCostRef}
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#9aa2b1"
                value={additionalCost}
                onChangeText={setAdditionalCost}
                keyboardType="decimal-pad"
                returnKeyType="next"
                onFocus={() => scrollToField(additionalCostRef)}
                onSubmitEditing={() => marginRef.current?.focus()}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Margen (%)</Text>
              <TextInput
                ref={marginRef}
                style={styles.input}
                placeholder="30"
                placeholderTextColor="#9aa2b1"
                value={String(margin)}
                onChangeText={(value) => setMargin(Number(value) || 0)}
                keyboardType="numeric"
                returnKeyType="done"
                onFocus={() => scrollToField(marginRef)}
                onSubmitEditing={() => stockRef.current?.focus()}
              />
            </View>

            <View style={styles.priceGrid}>
              <View style={styles.priceCard}>
                <Text style={styles.priceLabel}>USD</Text>
                <Text style={styles.priceValue}>
                  {calculatedPrices.usd ? `$${calculatedPrices.usd}` : "—"}
                </Text>
                <Text style={styles.priceHint}>Incluye margen aplicado</Text>
              </View>
              <View style={styles.priceCard}>
                <Text style={styles.priceLabel}>VES</Text>
                <Text style={styles.priceValue}>
                  {calculatedPrices.ves ? `VES ${calculatedPrices.ves}` : "—"}
                </Text>
                <Text style={styles.priceHint}>
                  Conversión con tasa vigente
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Inventario inicial</Text>
            <Text style={styles.sectionHint}>
              Define cuántas unidades ya tienes en stock para iniciar los
              controles.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Cantidad *</Text>
              <TextInput
                ref={stockRef}
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#9aa2b1"
                value={formData.stock}
                onChangeText={(value) => handleInputChange("stock", value)}
                keyboardType="numeric"
                returnKeyType="done"
                onFocus={() => scrollToField(stockRef)}
                onSubmitEditing={handleSubmit}
              />
            </View>

            <Text style={styles.helperText}>
              Puedes ajustar el stock y margen luego desde la pantalla de
              edición del producto.
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.secondaryButton,
                loading && styles.buttonDisabled,
              ]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.primaryButton,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Guardar producto</Text>
              )}
            </TouchableOpacity>
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
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: hs(16),
    paddingTop: vs(16),
    paddingBottom: vs(70),
    gap: vs(24),
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(10) },
    shadowOpacity: 0.1,
    shadowRadius: s(18),
    elevation: 8,
  },
  heroIcon: {
    width: s(60),
    height: s(60),
    borderRadius: borderRadius.lg,
    backgroundColor: "#f3f8ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: hs(18),
  },
  heroIconText: {
    fontSize: iconSize.xl,
  },
  heroTextContainer: {
    flex: 1,
    gap: vs(6),
  },
  heroTitle: {
    fontSize: rf(20),
    fontWeight: "700",
    color: "#1f2633",
  },
  heroSubtitle: {
    fontSize: rf(14),
    color: "#5b6472",
    lineHeight: vs(20),
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.06,
    shadowRadius: s(12),
    elevation: 5,
    gap: vs(16),
  },
  summaryRow: {
    flexDirection: "row",
    gap: hs(16),
  },
  summaryItem: {
    flex: 1,
    backgroundColor: "#f8f9fc",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: vs(6),
  },
  summaryLabel: {
    fontSize: rf(12),
    fontWeight: "600",
    color: "#7a8796",
    textTransform: "uppercase",
    letterSpacing: s(0.6),
  },
  summaryValue: {
    fontSize: rf(18),
    fontWeight: "700",
    color: "#1f2633",
  },
  summaryHint: {
    fontSize: rf(12),
    color: "#6f7c8c",
  },
  sectionHeader: {
    gap: vs(4),
    paddingHorizontal: hs(4),
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#1f2633",
  },
  sectionHint: {
    fontSize: rf(12),
    color: "#6f7c8c",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.05,
    shadowRadius: s(10),
    elevation: 4,
    gap: vs(20),
  },
  fieldGroup: {
    gap: vs(8),
  },
  fieldLabel: {
    fontSize: rf(12),
    fontWeight: "600",
    color: "#8492a6",
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
    minHeight: s(96),
    textAlignVertical: "top",
  },
  currencySwitch: {
    flexDirection: "row",
    backgroundColor: "#f3f5fa",
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: vs(6),
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
  priceGrid: {
    flexDirection: "row",
    gap: hs(16),
  },
  priceCard: {
    flex: 1,
    backgroundColor: "#f8f9fc",
    borderRadius: borderRadius.md,
    paddingVertical: vs(18),
    paddingHorizontal: hs(16),
    gap: vs(6),
  },
  priceLabel: {
    fontSize: rf(12),
    fontWeight: "600",
    color: "#7a8796",
    textTransform: "uppercase",
    letterSpacing: s(0.6),
  },
  priceValue: {
    fontSize: rf(18),
    fontWeight: "700",
    color: "#1f2633",
  },
  priceHint: {
    fontSize: rf(12),
    color: "#6f7c8c",
  },
  helperText: {
    fontSize: rf(12),
    color: "#6f7c8c",
    backgroundColor: "#f3f8ff",
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    lineHeight: vs(18),
  },
  buttonRow: {
    flexDirection: "row",
    gap: hs(12),
  },
  actionButton: {
    flex: 1,
    paddingVertical: vs(16),
    borderRadius: borderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#c3cad5",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    color: "#4c5767",
    fontWeight: "600",
    fontSize: rf(15),
  },
  primaryButton: {
    backgroundColor: "#2fb176",
    shadowColor: "#2fb176",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.22,
    shadowRadius: s(8),
    elevation: 6,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: rf(15),
  },
});

export default AddProductScreen;
