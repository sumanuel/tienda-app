import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
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
  ScreenHero,
  SurfaceCard,
  UI_COLORS,
  SHADOWS,
} from "../../components/common/AppUI";
import { s, rf, vs, hs, spacing, borderRadius } from "../../utils/responsive";

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
  const [iva, setIva] = useState(0);
  const [calculatedPrices, setCalculatedPrices] = useState({
    usd: "",
    ves: "",
  });

  const nameRef = useRef(null);
  const categoryRef = useRef(null);
  const costRef = useRef(null);
  const additionalCostRef = useRef(null);
  const marginRef = useRef(null);
  const ivaRef = useRef(null);
  const stockRef = useRef(null);
  const descriptionRef = useRef(null);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    const loadSettings = async () => {
      const data = await getSettings();
      setSettings(data);
      setMargin(data?.pricing?.defaultMargin || 30);
      setIva(data?.pricing?.iva || 0);
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

    if (Number.isNaN(Number(iva)) || Number(iva) < 0 || Number(iva) > 100) {
      showAlert({
        title: "Error",
        message: "El IVA debe ser un porcentaje válido entre 0 y 100",
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
        iva: Number(iva) || 0,
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
        message: error?.message || "No se pudo agregar el producto",
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
          <ScreenHero
            iconName="cube-outline"
            iconColor={UI_COLORS.info}
            eyebrow="Catálogo"
            title="Nuevo producto"
            subtitle="Calculamos automáticamente el precio sugerido según margen, costos y tasa vigente."
            pills={[
              { text: `Margen ${margin || 0}%`, tone: "accent" },
              {
                text: pricingSummary.rate
                  ? `Tasa ${pricingSummary.rate.toFixed(2)}`
                  : "Sin tasa",
                tone: pricingSummary.rate ? "info" : "warning",
              },
            ]}
            style={styles.heroCard}
          />

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

          <SurfaceCard style={styles.card}>
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
          </SurfaceCard>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Precio y margen</Text>
            <Text style={styles.sectionHint}>
              Ajusta el costo base y el margen para definir el precio sugerido.
            </Text>
          </View>

          <SurfaceCard style={styles.card}>
            <View style={styles.currencySwitch}>
              {[
                { code: "USD", label: "Costo en USD" },
                { code: "Bs", label: "Costo en VES" },
              ].map((option) => {
                const active = costCurrency === option.code;
                return (
                  <Pressable
                    key={option.code}
                    style={({ pressed }) => [
                      styles.currencyChip,
                      active ? styles.currencyChipActive : null,
                      pressed && styles.cardPressed,
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
                  >
                    <Text
                      style={[
                        styles.currencyChipText,
                        active ? styles.currencyChipTextActive : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
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
          </SurfaceCard>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Inventario inicial</Text>
            <Text style={styles.sectionHint}>
              Define cuántas unidades ya tienes en stock para iniciar los
              controles.
            </Text>
          </View>

          <SurfaceCard style={styles.card}>
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
              Puedes ajustar el stock, margen e IVA luego desde la pantalla de
              edición del producto.
            </Text>
          </SurfaceCard>

          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.secondaryButton,
                loading && styles.buttonDisabled,
                pressed && styles.cardPressed,
              ]}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.primaryButton,
                loading && styles.buttonDisabled,
                pressed && styles.cardPressed,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Guardar producto</Text>
              )}
            </Pressable>
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
    backgroundColor: UI_COLORS.page,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: hs(16),
    paddingTop: vs(16),
    paddingBottom: vs(76),
    gap: vs(18),
  },
  heroCard: {
    marginBottom: vs(2),
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
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  sectionHint: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
    lineHeight: vs(18),
  },
  card: {
    padding: spacing.lg,
    gap: vs(18),
    ...SHADOWS.soft,
  },
  fieldGroup: {
    gap: vs(7),
  },
  fieldLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: hs(14),
    paddingVertical: vs(13),
    fontSize: rf(15),
    color: UI_COLORS.text,
    backgroundColor: UI_COLORS.surfaceAlt,
  },
  textArea: {
    minHeight: s(96),
    textAlignVertical: "top",
  },
  currencySwitch: {
    flexDirection: "row",
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    padding: spacing.xs,
    gap: vs(6),
  },
  currencyChip: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: vs(10),
    paddingHorizontal: hs(12),
    alignItems: "center",
    justifyContent: "center",
  },
  currencyChipActive: {
    backgroundColor: UI_COLORS.info,
  },
  currencyChipText: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
  },
  currencyChipTextActive: {
    color: "#fff",
  },
  priceGrid: {
    flexDirection: "row",
    gap: hs(12),
  },
  priceCard: {
    flex: 1,
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: vs(16),
    paddingHorizontal: hs(16),
    gap: vs(6),
  },
  priceLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  priceValue: {
    fontSize: rf(18),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  priceHint: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
  },
  helperText: {
    fontSize: rf(12),
    color: UI_COLORS.info,
    backgroundColor: UI_COLORS.infoSoft,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    lineHeight: vs(18),
  },
  buttonRow: {
    flexDirection: "row",
    gap: hs(12),
    paddingTop: vs(4),
  },
  actionButton: {
    flex: 1,
    paddingVertical: vs(15),
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    backgroundColor: UI_COLORS.surface,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    color: UI_COLORS.info,
    fontWeight: "700",
    fontSize: rf(14),
  },
  primaryButton: {
    backgroundColor: UI_COLORS.accent,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: rf(14),
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

export default AddProductScreen;
