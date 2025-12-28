import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import {
  updateProductStock,
  insertInventoryMovement,
} from "../../services/database/products";
import { useCustomAlert } from "../../components/common/CustomAlert";

export const AddInventoryExitScreen = ({ navigation, route }) => {
  const { product } = route.params;
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { showAlert, CustomAlert } = useCustomAlert();

  const handleSave = async () => {
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      showAlert({
        title: "Error",
        message: "Ingresa una cantidad válida mayor a 0",
        type: "error",
      });
      return;
    }

    if (qty > product.stock) {
      showAlert({
        title: "Error",
        message: `No puedes sacar ${qty} unidades. Stock disponible: ${product.stock}`,
        type: "error",
      });
      return;
    }

    try {
      setLoading(true);
      const newStock = product.stock - qty;

      await updateProductStock(product.id, newStock);

      await insertInventoryMovement(
        product.id,
        "exit",
        qty,
        product.stock,
        notes.trim() || null
      );

      navigation.goBack();
    } catch (error) {
      console.error("Error actualizando stock:", error);
      showAlert({
        title: "Error",
        message: "No se pudo registrar la salida de inventario",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.headerContent}>
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Text style={styles.heroIconText}>📤</Text>
            </View>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>Agregar Salida de Inventario</Text>
              <Text style={styles.heroSubtitle}>{product.name}</Text>
              <Text style={styles.productCode}>Código: {product.barcode}</Text>
            </View>
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cantidad a sacar</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej: 1"
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
              placeholder="Observaciones sobre esta salida..."
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
            <Text style={styles.summaryText}>
              Stock después:{" "}
              {quantity
                ? product.stock - (parseInt(quantity, 10) || 0)
                : product.stock}{" "}
              unidades
            </Text>
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
                {loading ? "Guardando..." : "Agregar Salida"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
  },
  headerContent: {
    gap: 12,
    marginBottom: 8,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
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
    fontSize: 16,
    color: "#5b6472",
    lineHeight: 20,
  },
  productCode: {
    fontSize: 14,
    color: "#6c7a8a",
    fontWeight: "500",
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
    marginTop: 12,
  },
  inputGroup: {
    marginBottom: 18,
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
    minHeight: 90,
    paddingTop: 12,
  },
  summary: {
    backgroundColor: "#f7f9fc",
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  summaryText: {
    fontSize: 14,
    color: "#2f3a4c",
    fontWeight: "600",
    marginBottom: 6,
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
    backgroundColor: "#c62828",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});

export default AddInventoryExitScreen;
