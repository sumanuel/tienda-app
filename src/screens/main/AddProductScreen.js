import React, { useState, useRef, useEffect, useMemo } from "react";
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

/**
 * Pantalla para agregar nuevo producto
 */
export const AddProductScreen = ({ navigation }) => {
  const { addProduct } = useProducts();
  const { rate: exchangeRate } = useExchangeRate();

  const [settings, setSettings] = useState({});
  const [cost, setCost] = useState("");
  const [costCurrency, setCostCurrency] = useState("USD");
  const [margin, setMargin] = useState(30);
  const [calculatedPrices, setCalculatedPrices] = useState({
    usd: "",
    ves: "",
  });

  const nameRef = useRef(null);
  const categoryRef = useRef(null);
  const costRef = useRef(null);
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
    const currencies = settings?.pricing?.currencies || { USD: 280 };
    const usdRate = currencies.USD || 0;

    if (cost && usdRate) {
      const costValue = parseFloat(cost);
      if (!Number.isNaN(costValue)) {
        const sellingPriceInCostCurrency = costValue * (1 + margin / 100);

        let usdPrice = 0;
        let vesPrice = 0;

        if (costCurrency === "USD") {
          usdPrice = sellingPriceInCostCurrency;
          vesPrice = usdPrice * usdRate;
        } else {
          vesPrice = sellingPriceInCostCurrency;
          usdPrice = vesPrice / usdRate;
        }

        setCalculatedPrices({
          usd: usdPrice.toFixed(2),
          ves: vesPrice.toFixed(2),
        });
        return;
      }
    }

    setCalculatedPrices({ usd: "", ves: "" });
  }, [cost, costCurrency, margin, settings]);

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
          () => {}
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
    if (!formData.name.trim()) {
      Alert.alert("Error", "El nombre del producto es obligatorio");
      return;
    }

    if (!cost || Number.isNaN(parseFloat(cost))) {
      Alert.alert("Error", "El costo del producto debe ser un número válido");
      return;
    }

    if (!calculatedPrices.usd || !calculatedPrices.ves) {
      Alert.alert(
        "Error",
        "No se pudieron calcular los precios. Revisa la configuración de tasas"
      );
      return;
    }

    if (!formData.stock || Number.isNaN(parseInt(formData.stock, 10))) {
      Alert.alert("Error", "El stock debe ser un número válido");
      return;
    }

    try {
      const productData = {
        name: formData.name.trim(),
        category: formData.category.trim() || "General",
        cost: parseFloat(cost),
        costCurrency,
        priceUSD: parseFloat(calculatedPrices.usd),
        margin,
        stock: parseInt(formData.stock, 10),
        minStock: 0,
        description: formData.description.trim(),
      };

      await addProduct(productData);

      Alert.alert("Éxito", "Producto agregado correctamente", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Error adding product:", error);
      Alert.alert("Error", "No se pudo agregar el producto");
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
            Esta información se mostrará en el catálogo y comprobantes de venta.
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
              onChangeText={(value) => handleInputChange("description", value)}
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
              <Text style={styles.priceHint}>Conversión con tasa vigente</Text>
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
            Puedes ajustar el stock y margen luego desde la pantalla de edición
            del producto.
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
            <Text style={styles.primaryButtonText}>Guardar producto</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 70,
    gap: 24,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 8,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#f3f8ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 18,
  },
  heroIconText: {
    fontSize: 30,
  },
  heroTextContainer: {
    flex: 1,
    gap: 6,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2633",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#5b6472",
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 5,
    gap: 16,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: "#f8f9fc",
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7a8796",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2633",
  },
  summaryHint: {
    fontSize: 12,
    color: "#6f7c8c",
  },
  sectionHeader: {
    gap: 4,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2633",
  },
  sectionHint: {
    fontSize: 12,
    color: "#6f7c8c",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8492a6",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d9e0eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1f2633",
    backgroundColor: "#f8f9fc",
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  currencySwitch: {
    flexDirection: "row",
    backgroundColor: "#f3f5fa",
    borderRadius: 14,
    padding: 6,
    gap: 6,
  },
  currencyChip: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  currencyChipActive: {
    backgroundColor: "#2f5ae0",
  },
  currencyChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#5b6472",
  },
  currencyChipTextActive: {
    color: "#fff",
  },
  priceGrid: {
    flexDirection: "row",
    gap: 16,
  },
  priceCard: {
    flex: 1,
    backgroundColor: "#f8f9fc",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 6,
  },
  priceLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7a8796",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2633",
  },
  priceHint: {
    fontSize: 12,
    color: "#6f7c8c",
  },
  helperText: {
    fontSize: 12,
    color: "#6f7c8c",
    backgroundColor: "#f3f8ff",
    padding: 14,
    borderRadius: 12,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#c3cad5",
  },
  secondaryButtonText: {
    color: "#4c5767",
    fontWeight: "600",
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: "#2fb176",
    shadowColor: "#2fb176",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});

export default AddProductScreen;
