import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { useProducts } from "../../hooks/useProducts";
import { useExchangeRate } from "../../hooks/useExchangeRate";
import { getSettings } from "../../services/database/settings";
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
 * Pantalla para editar producto existente
 */
export const EditProductScreen = ({ navigation, route }) => {
  const { editProduct } = useProducts();
  const { rate: exchangeRate } = useExchangeRate();
  const { product } = route.params;
  const { showAlert, CustomAlert } = useCustomAlert();

  const [settings, setSettings] = useState({});
  const [cost, setCost] = useState("");
  const [additionalCost, setAdditionalCost] = useState("");
  const [costCurrency, setCostCurrency] = useState("USD");
  const [margin, setMargin] = useState(30);
  const [iva, setIva] = useState(0);
  const [calculatedPrices, setCalculatedPrices] = useState({
    usd: "",
    ves: "",
  });

  useEffect(() => {
    const loadSettings = async () => {
      const s = await getSettings();
      setSettings(s);
      setMargin(s?.pricing?.defaultMargin || 30);
      setIva(s?.pricing?.iva || 0);
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

        // Calculate selling price in cost currency
        const sellingPriceInCostCurrency =
          totalCostInCostCurrency * (1 + margin / 100);

        // Convert to USD and VES
        let usdPrice, vesPrice;
        if (costCurrency === "USD") {
          usdPrice = sellingPriceInCostCurrency;
          vesPrice = usdPrice * appliedRate;
        } else {
          // Bs
          vesPrice = sellingPriceInCostCurrency;
          usdPrice = vesPrice / appliedRate;
        }

        setCalculatedPrices({
          usd: usdPrice.toFixed(2),
          ves: vesPrice.toFixed(2),
        });
      }
    } else {
      setCalculatedPrices({ usd: "", ves: "" });
    }
  }, [cost, additionalCost, costCurrency, margin, settings, exchangeRate]);

  // Refs para navegación entre campos
  const nameRef = useRef(null);
  const costRef = useRef(null);
  const additionalCostRef = useRef(null);
  const marginRef = useRef(null);
  const ivaRef = useRef(null);
  const stockRef = useRef(null);
  const scrollViewRef = useRef(null);

  // Función para hacer scroll automático al campo enfocado
  const scrollToField = (ref) => {
    if (ref.current && scrollViewRef.current) {
      setTimeout(() => {
        ref.current.measureLayout(
          scrollViewRef.current,
          (x, y) => {
            scrollViewRef.current.scrollTo({ y: y - 100, animated: true });
          },
          () => {},
        );
      }, 100);
    }
  };

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    stock: "",
    description: "",
  });

  // Cargar datos del producto al montar
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        category: product.category || "",
        stock: product.stock?.toString() || "",
        description: product.description || "",
      });

      if (product.costCurrency) {
        setCostCurrency(product.costCurrency);
      }

      if (typeof product.margin === "number") {
        setMargin(product.margin);
      }

      if (typeof product.iva === "number") {
        setIva(product.iva);
      }

      if (typeof product.cost === "number") {
        setCost(product.cost.toFixed(2));
        if (typeof product.additionalCost === "number") {
          setAdditionalCost(product.additionalCost.toFixed(2));
        } else {
          setAdditionalCost("");
        }
        return;
      }

      // Calcular costo y margen basándose en el precio actual
      if (product.priceUSD) {
        const sellingPrice = product.priceUSD;
        const productMargin =
          typeof product.margin === "number"
            ? product.margin
            : settings?.pricing?.defaultMargin || 30;

        const costValue = sellingPrice / (1 + productMargin / 100);
        setCost(costValue.toFixed(2));
        setAdditionalCost("");
        setMargin(productMargin);
        setCostCurrency("USD");
      }
    }
  }, [product, settings]);

  // Actualizar precio VES automáticamente cuando cambie precio USD o tasa
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    // Validación básica
    if (!formData.name.trim()) {
      showAlert({
        title: "Error",
        message: "El nombre del producto es obligatorio",
        type: "error",
      });
      return;
    }

    if (!cost || isNaN(parseFloat(cost))) {
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

    if (!formData.stock || isNaN(parseInt(formData.stock))) {
      showAlert({
        title: "Error",
        message: "El stock debe ser un número válido",
        type: "error",
      });
      return;
    }

    if (Number.isNaN(Number(iva)) || Number(iva) < 0 || Number(iva) > 100) {
      showAlert({
        title: "Error",
        message: "El IVA debe ser un porcentaje válido entre 0 y 100",
        type: "error",
      });
      return;
    }

    try {
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
        costCurrency: costCurrency,
        priceUSD: parseFloat(calculatedPrices.usd),
        priceVES: parseFloat(calculatedPrices.ves),
        margin: margin,
        iva: Number(iva) || 0,
        stock: parseInt(formData.stock),
        minStock: 0,
        description: formData.description.trim(),
      };

      await editProduct(product.id, productData);

      showAlert({
        title: "Éxito",
        message: "Producto actualizado correctamente",
        type: "success",
        buttons: [{ text: "OK", onPress: () => navigation.goBack() }],
      });
    } catch (error) {
      console.error("Error updating product:", error);
      showAlert({
        title: "Error",
        message: "No se pudo actualizar el producto",
        type: "error",
      });
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
            <View style={styles.heroIcon}>
              <Ionicons
                name="cart-outline"
                size={iconSize.xl}
                color="#2f5ae0"
              />
            </View>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>Editar producto</Text>
              <Text style={styles.heroSubtitle}>
                Ajusta los detalles, costo y margen para recalcular el precio
                sugerido.
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
                returnKeyType="next"
                onSubmitEditing={() => costRef.current?.focus()}
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
                returnKeyType="next"
                onFocus={() => scrollToField(marginRef)}
                onSubmitEditing={() => ivaRef.current?.focus()}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>IVA (%)</Text>
              <TextInput
                ref={ivaRef}
                style={styles.input}
                placeholder="16"
                placeholderTextColor="#9aa2b1"
                value={String(iva)}
                onChangeText={(value) => setIva(Number(value) || 0)}
                keyboardType="numeric"
                returnKeyType="done"
                onFocus={() => scrollToField(ivaRef)}
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
            <Text style={styles.sectionTitle}>Inventario</Text>
            <Text style={styles.sectionHint}>
              Define el stock actual para continuar los controles.
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
                editable={false}
              />
            </View>

            <Text style={styles.helperText}>
              El stock se gestiona a través de movimientos de inventario.
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleSubmit}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Actualizar producto</Text>
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
    gap: spacing.sm,
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
    gap: spacing.small,
    paddingHorizontal: spacing.small,
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#1f2633",
  },
  sectionHint: {
    fontSize: rf(12),
    color: "#6f7c8c",
    lineHeight: vs(18),
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.06,
    shadowRadius: s(12),
    elevation: 5,
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.small,
  },
  fieldLabel: {
    fontSize: rf(13),
    fontWeight: "600",
    color: "#1f2633",
  },
  input: {
    backgroundColor: "#f8f9fc",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "#d9e0eb",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: rf(15),
    color: "#1f2633",
  },
  textArea: {
    minHeight: vs(92),
    textAlignVertical: "top",
  },
  currencySwitch: {
    flexDirection: "row",
    backgroundColor: "#f8f9fc",
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  currencyChip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  currencyChipActive: {
    backgroundColor: "#2f5ae0",
  },
  currencyChipText: {
    fontSize: rf(13),
    fontWeight: "700",
    color: "#2f3a4c",
  },
  currencyChipTextActive: {
    color: "#fff",
  },
  priceGrid: {
    flexDirection: "row",
    gap: spacing.md,
  },
  priceCard: {
    flex: 1,
    backgroundColor: "#f8f9fc",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  priceLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    color: "#7a8796",
    textTransform: "uppercase",
    letterSpacing: s(0.8),
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
    lineHeight: vs(18),
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#2f5ae0",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: rf(15),
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#f3f5f8",
  },
  secondaryButtonText: {
    color: "#2f3a4c",
    fontSize: rf(15),
    fontWeight: "700",
  },
});

export default EditProductScreen;
