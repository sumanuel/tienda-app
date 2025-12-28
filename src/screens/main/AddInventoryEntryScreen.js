import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import {
  updateProductStock,
  insertInventoryMovement,
} from "../../services/database/products";

export const AddInventoryEntryScreen = ({ navigation, route }) => {
  const { product } = route.params;
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      Alert.alert("Error", "Ingresa una cantidad válida mayor a 0");
      return;
    }

    try {
      setLoading(true);
      const newStock = product.stock + qty;

      // Actualizar stock del producto
      await updateProductStock(product.id, newStock);

      // Registrar movimiento de entrada
      await insertInventoryMovement(
        product.id,
        "entry",
        qty,
        product.stock,
        notes.trim() || null
      );

      Alert.alert(
        "Éxito",
        `Se agregaron ${qty} unidades al inventario.\nStock anterior: ${product.stock}\nStock nuevo: ${newStock}`,
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error("Error actualizando stock:", error);
      Alert.alert("Error", "No se pudo actualizar el inventario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Agregar Entrada de Inventario</Text>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productCode}>Código: {product.barcode}</Text>
      </View>

      <View style={styles.formCard}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cantidad a agregar</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ej: 10"
            placeholderTextColor="#9aa6b5"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            returnKeyType="next"
          />
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
              Stock después: {product.stock + parseInt(quantity || 0)} unidades
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
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
          disabled={loading || !quantity.trim()}
        >
          <Text style={styles.saveButtonText}>
            {loading ? "Guardando..." : "Agregar Entrada"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8edf2",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2f3a4c",
    marginBottom: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2f3a4c",
    marginBottom: 4,
  },
  productCode: {
    fontSize: 14,
    color: "#6c7a8a",
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2f3a4c",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#f3f5fa",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#1f2633",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  summary: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 12,
  },
  summaryText: {
    fontSize: 14,
    color: "#6c7a8a",
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f5fa",
  },
  cancelButtonText: {
    color: "#6c7a8a",
    fontWeight: "600",
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: "#4CAF50",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});

export default AddInventoryEntryScreen;
