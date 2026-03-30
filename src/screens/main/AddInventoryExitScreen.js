import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { TourGuideZone, useTourGuideController } from "rn-tourguide";
import {
  updateProductStock,
  insertInventoryMovement,
} from "../../services/database/products";
import { useCustomAlert } from "../../components/common/CustomAlert";
import { hasSeenTour, markTourSeen } from "../../services/tour/tourStorage";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";

export const AddInventoryExitScreen = ({ navigation, route }) => {
  const { product } = route.params;
  const { canStart, start } = useTourGuideController();
  const [tourBooted, setTourBooted] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { showAlert, CustomAlert } = useCustomAlert();

  useEffect(() => {
    let mounted = true;

    const maybeStartTour = async () => {
      if (tourBooted) return;
      if (!canStart) return;

      const tourId = "inventoryExit";
      const seen = await hasSeenTour(tourId);
      if (!mounted) return;

      if (!seen) {
        setTimeout(() => {
          start();
          markTourSeen(tourId);
        }, 450);
      }

      if (mounted) setTourBooted(true);
    };

    maybeStartTour();

    return () => {
      mounted = false;
    };
  }, [canStart, start, tourBooted]);

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
        notes.trim() || null,
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
            <TourGuideZone
              zone={1}
              text={
                "Indica cuántas unidades vas a sacar del inventario del producto."
              }
              borderRadius={borderRadius.lg}
            >
              <TextInput
                style={styles.textInput}
                placeholder="Ej: 1"
                placeholderTextColor="#9aa6b5"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                returnKeyType="next"
              />
            </TourGuideZone>
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

            <TourGuideZone
              zone={2}
              text={"Guarda la salida de inventario y actualiza el stock."}
              shape="rectangle"
              borderRadius={borderRadius.lg}
            >
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={loading || !quantity.trim()}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? "Guardando..." : "Agregar Salida"}
                </Text>
              </TouchableOpacity>
            </TourGuideZone>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerContent: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
  },
  heroIcon: {
    width: s(60),
    height: s(60),
    borderRadius: borderRadius.lg,
    backgroundColor: "#f3f8ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.lg,
  },
  heroIconText: {
    fontSize: rf(30),
  },
  heroTextContainer: {
    flex: 1,
    gap: s(6),
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
  formCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
    marginTop: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "#2f3a4c",
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: "#f3f5fa",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: rf(15),
    color: "#1f2633",
  },
  textArea: {
    minHeight: vs(90),
    paddingTop: spacing.md,
  },
  summary: {
    backgroundColor: "#f7f9fc",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryText: {
    fontSize: rf(14),
    color: "#2f3a4c",
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: spacing.md,
  },
  button: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
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
    backgroundColor: "#c62828",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: rf(15),
  },
});

export default AddInventoryExitScreen;
