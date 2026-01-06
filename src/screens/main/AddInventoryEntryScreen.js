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
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";

export const AddInventoryEntryScreen = ({ navigation, route }) => {
  const { product } = route.params;
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { showAlert, CustomAlert } = useCustomAlert();

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

      navigation.goBack();
    } catch (error) {
      console.error("Error actualizando stock:", error);
      showAlert({
        title: "Error",
        message: "No se pudo actualizar el inventario",
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
              <Text style={styles.heroIconText}>📦</Text>
            </View>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>
                Agregar Entrada de Inventario
              </Text>
              <Text style={styles.heroSubtitle}>{product.name}</Text>
              <Text style={styles.productCode}>Código: {product.barcode}</Text>
            </View>
          </View>
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
                Stock después: {product.stock + parseInt(quantity || 0)}{" "}
                unidades
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
    paddingHorizontal: hs(16),
    paddingTop: vs(16),
    paddingBottom: vs(36),
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: vs(8) },
    shadowOpacity: 0.07,
    shadowRadius: s(12),
    elevation: 4,
    marginBottom: vs(20),
  },
  inputGroup: {
    marginBottom: vs(16),
  },
  label: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "#2f3a4c",
    marginBottom: vs(8),
  },
  textInput: {
    backgroundColor: "#f3f5fa",
    borderRadius: borderRadius.md,
    paddingVertical: vs(12),
    paddingHorizontal: hs(16),
    fontSize: rf(15),
    color: "#1f2633",
  },
  textArea: {
    height: vs(80),
    textAlignVertical: "top",
  },
  summary: {
    backgroundColor: "#f8f9fa",
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  summaryText: {
    fontSize: rf(14),
    color: "#6c7a8a",
    marginBottom: vs(4),
  },
  buttonContainer: {
    flexDirection: "row",
    gap: spacing.md,
  },
  button: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: vs(14),
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f5fa",
  },
  cancelButtonText: {
    color: "#6c7a8a",
    fontWeight: "600",
    fontSize: rf(15),
  },
  saveButton: {
    backgroundColor: "#4CAF50",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: rf(15),
  },
  headerContent: {
    gap: spacing.md,
    marginBottom: vs(8),
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: vs(10) },
    shadowOpacity: 0.08,
    shadowRadius: s(18),
    elevation: 8,
  },
  heroIcon: {
    width: iconSize.xl,
    height: iconSize.xl,
    borderRadius: borderRadius.xl,
    backgroundColor: "#f3f8ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: hs(18),
  },
  heroIconText: {
    fontSize: rf(30),
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
    fontSize: rf(16),
    color: "#5b6472",
    lineHeight: rf(20),
  },
  productCode: {
    fontSize: rf(14),
    color: "#6c7a8a",
    fontWeight: "500",
  },
});

export default AddInventoryEntryScreen;
