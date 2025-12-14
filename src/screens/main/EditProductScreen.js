import React, { useState, useEffect, useRef } from "react";
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
import { convertUSDToVES } from "../../utils/currency";
import { getSettings } from "../../services/database/settings";

/**
 * Pantalla para editar producto existente
 */
export const EditProductScreen = ({ navigation, route }) => {
  const { editProduct } = useProducts();
  const { rate: exchangeRate } = useExchangeRate();
  const { product } = route.params;

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

      // Calcular costo y margen basándose en el precio actual
      if (product.priceUSD) {
        if (product.margin) {
          // Si ya tiene margen guardado, calcular costo
          const sellingPrice = product.priceUSD;
          const productMargin = product.margin;
          const costValue = sellingPrice / (1 + productMargin / 100);
          setCost(costValue.toFixed(2));
          setMargin(productMargin);
          setCostCurrency("USD");
        } else {
          // Si no tiene margen, asumir margen por defecto y calcular costo
          const sellingPrice = product.priceUSD;
          const defaultMargin = settings.pricing?.defaultMargin || 30;
          const costValue = sellingPrice / (1 + defaultMargin / 100);
          setCost(costValue.toFixed(2));
          setMargin(defaultMargin);
          setCostCurrency("USD");
        }
      }
    }
  }, [product]);

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
      Alert.alert("Error", "El nombre del producto es obligatorio");
      return;
    }

    if (!cost || isNaN(parseFloat(cost))) {
      Alert.alert("Error", "El costo del producto debe ser un número válido");
      return;
    }

    if (!formData.stock || isNaN(parseInt(formData.stock))) {
      Alert.alert("Error", "El stock debe ser un número válido");
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

      Alert.alert("Éxito", "Producto actualizado correctamente", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Error updating product:", error);
      Alert.alert("Error", "No se pudo actualizar el producto");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 80}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Editar Producto</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre del producto *</Text>
            <TextInput
              ref={nameRef}
              style={styles.input}
              placeholder="Ej: Coca Cola 350ml"
              value={formData.name}
              onChangeText={(value) => handleInputChange("name", value)}
              returnKeyType="next"
              onSubmitEditing={() => categoryRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Categoría</Text>
            <TextInput
              ref={categoryRef}
              style={styles.input}
              placeholder="Ej: Bebidas, Snacks, etc."
              value={formData.category}
              onChangeText={(value) => handleInputChange("category", value)}
              returnKeyType="next"
              onSubmitEditing={() => costRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Moneda del costo</Text>
            <TouchableOpacity
              style={styles.currencySelector}
              onPress={() => {
                Alert.alert("Seleccionar Moneda", "Elige la moneda del costo", [
                  { text: "USD", onPress: () => setCostCurrency("USD") },
                  { text: "Bs", onPress: () => setCostCurrency("Bs") },
                  { text: "Cancelar", style: "cancel" },
                ]);
              }}
            >
              <Text style={styles.currencyText}>{costCurrency}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Costo del producto *</Text>
            <TextInput
              ref={costRef}
              style={styles.input}
              placeholder="0.00"
              keyboardType="numeric"
              value={cost}
              onChangeText={setCost}
              returnKeyType="next"
              onSubmitEditing={() => marginRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Margen (%)</Text>
            <TextInput
              ref={marginRef}
              style={styles.input}
              placeholder="30"
              keyboardType="numeric"
              value={margin.toString()}
              onChangeText={(value) => setMargin(parseFloat(value) || 0)}
              returnKeyType="next"
              onSubmitEditing={() => stockRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Precio USD</Text>
              <TextInput
                style={[styles.input, styles.readOnly]}
                placeholder="0.00"
                value={calculatedPrices.usd}
                editable={false}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Precio VES</Text>
              <TextInput
                style={[styles.input, styles.readOnly]}
                placeholder="0.00"
                value={calculatedPrices.ves}
                editable={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Stock *</Text>
            <TextInput
              ref={stockRef}
              style={styles.input}
              placeholder="0"
              keyboardType="numeric"
              value={formData.stock}
              onChangeText={(value) => handleInputChange("stock", value)}
              returnKeyType="next"
              onSubmitEditing={() => descriptionRef.current?.focus()}
              onFocus={() => scrollToField(stockRef)}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              ref={descriptionRef}
              style={[styles.input, styles.textArea]}
              placeholder="Descripción del producto..."
              multiline
              numberOfLines={3}
              value={formData.description}
              onChangeText={(value) => handleInputChange("description", value)}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              onFocus={() => scrollToField(descriptionRef)}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
            >
              <Text style={styles.submitButtonText}>Actualizar</Text>
            </TouchableOpacity>
          </View>

          {/* Espacio adicional para botones del sistema */}
          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  currencySelector: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginTop: 5,
    backgroundColor: "#fff",
  },
  currencyText: {
    fontSize: 16,
    color: "#333",
  },
  readOnly: {
    backgroundColor: "#f5f5f5",
    color: "#666",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfWidth: {
    width: "48%",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 20,
  },
  submitButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
  },
  bottomSpacer: {
    height: 100,
  },
});

export default EditProductScreen;
