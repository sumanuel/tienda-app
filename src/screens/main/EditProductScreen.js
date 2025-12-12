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

/**
 * Pantalla para editar producto existente
 */
export const EditProductScreen = ({ navigation, route }) => {
  const { editProduct } = useProducts();
  const { product } = route.params;

  // Refs para navegación entre campos
  const nameRef = useRef(null);
  const categoryRef = useRef(null);
  const priceUSDRef = useRef(null);
  const priceVESRef = useRef(null);
  const stockRef = useRef(null);
  const descriptionRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    priceUSD: "",
    priceVES: "",
    stock: "",
    description: "",
  });

  // Cargar datos del producto al montar
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        category: product.category || "",
        priceUSD: product.priceUSD?.toString() || "",
        priceVES: product.priceVES?.toString() || "",
        stock: product.stock?.toString() || "",
        description: product.description || "",
      });
    }
  }, [product]);

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

    if (!formData.stock || isNaN(parseInt(formData.stock))) {
      Alert.alert("Error", "El stock debe ser un número válido");
      return;
    }

    try {
      const productData = {
        name: formData.name.trim(),
        category: formData.category.trim() || "General",
        priceUSD: parseFloat(formData.priceUSD),
        priceVES: formData.priceVES ? parseFloat(formData.priceVES) : null,
        stock: parseInt(formData.stock),
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
    >
      <ScrollView
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
              onSubmitEditing={() => priceUSDRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Precio en USD *</Text>
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Precio en VES</Text>
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
});

export default EditProductScreen;
