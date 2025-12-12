import React, { useState, useRef, useEffect } from "react";
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

/**
 * Pantalla para agregar nuevo producto
 */
export const AddProductScreen = ({ navigation }) => {
  const { addProduct } = useProducts();
  const { rate: exchangeRate } = useExchangeRate();

  // Refs para navegación entre campos
  const nameRef = useRef(null);
  const categoryRef = useRef(null);
  const priceUSDRef = useRef(null);
  const priceVESRef = useRef(null);
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
    priceUSD: "",
    priceVES: "",
    stock: "",
    description: "",
  });

  // Actualizar precio VES automáticamente cuando cambie precio USD o tasa
  useEffect(() => {
    if (formData.priceUSD && exchangeRate) {
      const usdPrice = parseFloat(formData.priceUSD);
      if (!isNaN(usdPrice)) {
        const vesPrice = convertUSDToVES(usdPrice, exchangeRate);
        setFormData((prev) => ({
          ...prev,
          priceVES: vesPrice.toFixed(2),
        }));
      }
    }
  }, [formData.priceUSD, exchangeRate]);

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

    if (!formData.priceUSD || isNaN(parseFloat(formData.priceUSD))) {
      Alert.alert("Error", "El precio en USD debe ser un número válido");
      return;
    }

    if (!exchangeRate) {
      Alert.alert(
        "Error",
        "No hay tasa de cambio configurada. Configure la tasa en Configuración > Moneda Base"
      );
      return;
    }

    if (!formData.stock || isNaN(parseInt(formData.stock))) {
      Alert.alert("Error", "El stock debe ser un número válido");
      return;
    }

    try {
      const usdPrice = parseFloat(formData.priceUSD);
      const vesPrice = convertUSDToVES(usdPrice, exchangeRate);

      const productData = {
        name: formData.name.trim(),
        category: formData.category.trim() || "General",
        cost: usdPrice, // El costo base es en USD
        priceUSD: usdPrice,
        priceVES: vesPrice,
        margin: 0, // Margen por defecto
        stock: parseInt(formData.stock),
        minStock: 0,
        description: formData.description.trim(),
      };

      await addProduct(productData);

      Alert.alert("Éxito", "Producto agregado correctamente", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Error adding product:", error);
      Alert.alert("Error", "No se pudo agregar el producto");
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
          <Text style={styles.title}>Nuevo Producto</Text>
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
              onSubmitEditing={() => priceUSDRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Precio USD *</Text>
              <TextInput
                ref={priceUSDRef}
                style={styles.input}
                placeholder="0.00"
                keyboardType="numeric"
                value={formData.priceUSD}
                onChangeText={(value) => handleInputChange("priceUSD", value)}
                returnKeyType="next"
                onSubmitEditing={() => priceVESRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Precio VES</Text>
              <TextInput
                ref={priceVESRef}
                style={styles.input}
                placeholder="0.00"
                keyboardType="numeric"
                value={formData.priceVES}
                onChangeText={(value) => handleInputChange("priceVES", value)}
                returnKeyType="next"
                onSubmitEditing={() => stockRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Stock inicial *</Text>
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
              placeholder="Descripción opcional del producto"
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

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Guardar Producto</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>

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
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfWidth: {
    width: "48%",
  },
  submitButton: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
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
    marginTop: 10,
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

export default AddProductScreen;
