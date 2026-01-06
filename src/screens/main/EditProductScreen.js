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
  const [costCurrency, setCostCurrency] = useState("USD");
  const [margin, setMargin] = useState(30);
  const [calculatedPrices, setCalculatedPrices] = useState({
    usd: "",
    ves: "",
  });

  useEffect(() => {
    const loadSettings = async () => {
      const s = await getSettings();
      setSettings(s);
      setMargin(s?.pricing?.defaultMargin || 30);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (cost && settings.pricing) {
      const costValue = parseFloat(cost);
      if (!isNaN(costValue)) {
        const baseCurrency = settings.pricing?.baseCurrency || "USD";
        const currencies = settings.pricing?.currencies || {
          USD: 280,
          EURO: 300,
          USD2: 350,
        };

        // Calculate selling price in cost currency
        const sellingPriceInCostCurrency = costValue * (1 + margin / 100);

        // Convert to USD and VES
        let usdPrice, vesPrice;
        if (costCurrency === "USD") {
          usdPrice = sellingPriceInCostCurrency;
          vesPrice = usdPrice * currencies.USD;
        } else {
          // Bs
          vesPrice = sellingPriceInCostCurrency;
          usdPrice = vesPrice / currencies.USD;
        }

        setCalculatedPrices({
          usd: usdPrice.toFixed(2),
          ves: vesPrice.toFixed(2),
        });
      }
    } else {
      setCalculatedPrices({ usd: "", ves: "" });
    }
  }, [cost, costCurrency, margin, settings]);

  // Refs para navegación entre campos
  const nameRef = useRef(null);
  const categoryRef = useRef(null);
  const costRef = useRef(null);
  const marginRef = useRef(null);
  const stockRef = useRef(null);
  const descriptionRef = useRef(null);
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
          () => {}
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

      if (typeof product.cost === "number") {
        setCost(product.cost.toFixed(2));
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

    if (!formData.stock || isNaN(parseInt(formData.stock))) {
      showAlert({
        title: "Error",
        message: "El stock debe ser un número válido",
        type: "error",
      });
      return;
    }

    try {
      const productData = {
        name: formData.name.trim(),
        category: formData.category.trim() || "General",
        cost: parseFloat(cost),
        costCurrency: costCurrency,
        priceUSD: parseFloat(calculatedPrices.usd),
        margin: margin,
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
              <Text style={styles.heroIconText}>🛒</Text>
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
                { code: "Bs", label: "Costo en Bs" },
              ].map((option) => {
                const active = costCurrency === option.code;
                return (
                  <TouchableOpacity
                    key={option.code}
                    style={[
                      styles.currencyChip,
                      active ? styles.currencyChipActive : null,
                    ]}
                    onPress={() => setCostCurrency(option.code)}
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
                <Text style={styles.priceLabel}>Bs</Text>
                <Text style={styles.priceValue}>
                  {calculatedPrices.ves ? `Bs ${calculatedPrices.ves}` : "—"}
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
