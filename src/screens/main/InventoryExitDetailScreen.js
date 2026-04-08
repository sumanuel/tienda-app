import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getProductByBarcode,
  getProductExitMovements,
} from "../../services/database/products";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";

export const InventoryExitDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState(route.params?.product || null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const parseMovementDate = (createdAt) => {
    if (!createdAt) return new Date();

    if (createdAt instanceof Date) {
      return createdAt;
    }

    if (typeof createdAt === "number") {
      return new Date(createdAt);
    }

    const asString = String(createdAt);

    // ISO (con timezone) => parse directo
    if (asString.includes("T")) {
      const parsed = new Date(asString);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    // SQLite CURRENT_TIMESTAMP: "YYYY-MM-DD HH:mm:ss" (UTC)
    if (asString.includes(" ")) {
      const normalized = `${asString.replace(" ", "T")}Z`;
      const parsed = new Date(normalized);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    const fallback = new Date(asString);
    return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
  };

  const fabBottom = vs(24) + Math.max(insets.bottom, vs(24));
  const listPaddingBottom = iconSize.xl + fabBottom + vs(24);

  const loadData = async (barcode) => {
    if (!barcode) return;

    try {
      setLoading(true);
      setError(null);

      const updatedProduct = await getProductByBarcode(barcode);
      if (!updatedProduct) {
        setProduct(null);
        setMovements([]);
        setError("Producto no encontrado");
        return;
      }

      setProduct(updatedProduct);
      const productMovements = await getProductExitMovements(updatedProduct.id);
      setMovements(productMovements);
    } catch (err) {
      console.error("Error cargando detalle de salida:", err);
      setMovements([]);
      setError("Error al cargar los movimientos");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData(product?.barcode);
    }, [product?.barcode]),
  );

  const handleAddExit = () => {
    if (product) {
      navigation.navigate("AddInventoryExit", { product });
    }
  };

  const renderMovement = ({ item }) => (
    <View style={styles.movementCard}>
      <View style={styles.movementHeader}>
        <View>
          <Text style={styles.movementDate}>
            {item.movementNumber || `MOV-${String(item.id).padStart(6, "0")}`}
          </Text>
          <Text style={styles.movementDate}>
            {parseMovementDate(item.createdAt).toLocaleDateString()}{" "}
            {parseMovementDate(item.createdAt).toLocaleTimeString()}
          </Text>
        </View>
        <View style={styles.movementBadge}>
          <Text
            style={[styles.movementBadgeText, styles.movementBadgeTextExit]}
          >
            Salida
          </Text>
        </View>
      </View>

      <View style={styles.movementDetails}>
        <Text style={styles.movementQuantity}>-{item.quantity} unidades</Text>
        <Text style={styles.movementStock}>
          Stock: {item.previousStock} → {item.newStock}
        </Text>
      </View>

      {item.notes && <Text style={styles.movementNotes}>{item.notes}</Text>}
    </View>
  );

  const renderEmpty = () => {
    if (!product || loading) return null;

    return (
      <View style={styles.emptyMovements}>
        <Ionicons
          name="document-text-outline"
          size={iconSize.xxl}
          color="#8ca0b8"
        />
        <Text style={styles.emptyTitle}>Sin movimientos registrados</Text>
        <Text style={styles.emptySubtitle}>
          No hay salidas registradas para este producto.
        </Text>
      </View>
    );
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.topContent}>
          <View style={styles.headerContent}>
            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Text style={styles.heroIconText}>📤</Text>
              </View>
              <View style={styles.heroTextContainer}>
                <Text style={styles.heroTitle}>Salida de Inventario</Text>
                <Text style={styles.heroSubtitle}>
                  Movimientos de salida del producto seleccionado.
                </Text>
              </View>
            </View>
          </View>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Cargando movimientos...</Text>
            </View>
          )}

          {product && !loading && (
            <View style={styles.productCard}>
              <View style={styles.productHeader}>
                <View style={styles.productNameRow}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productStock}>
                    {product.stock} unidades
                  </Text>
                </View>
                <Text style={styles.productCode}>
                  Código:{" "}
                  {product.productNumber ||
                    `PRD-${String(product.id).padStart(6, "0")}`}
                </Text>
                {!!product.barcode && (
                  <Text style={styles.productCode}>
                    Barcode: {product.barcode}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        <FlatList
          data={movements}
          renderItem={renderMovement}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: listPaddingBottom },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </View>

      {product && (
        <TouchableOpacity
          style={[styles.fab, { bottom: fabBottom }]}
          onPress={handleAddExit}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>-</Text>
        </TouchableOpacity>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8edf2",
  },
  topContent: {
    paddingHorizontal: hs(spacing.md),
    paddingTop: vs(spacing.md),
  },
  listContent: {
    paddingHorizontal: hs(spacing.md),
    paddingTop: vs(spacing.xs),
    paddingBottom: vs(80),
  },
  headerContent: {
    gap: s(spacing.md),
    marginBottom: vs(spacing.xs),
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: s(spacing.md),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
  },
  heroIcon: {
    width: s(50),
    height: s(50),
    borderRadius: borderRadius.md,
    backgroundColor: "#f3f8ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: hs(spacing.md),
  },
  heroIconText: {
    fontSize: rf(24),
  },
  heroTextContainer: {
    flex: 1,
    gap: s(spacing.xs),
  },
  heroTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: "#1f2633",
  },
  heroSubtitle: {
    fontSize: rf(13),
    color: "#5b6472",
    lineHeight: rf(18),
  },
  errorText: {
    color: "#c62828",
    fontSize: rf(14),
    marginTop: vs(spacing.xs),
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: vs(spacing.lg),
  },
  loadingText: {
    marginTop: vs(spacing.md),
    fontSize: rf(15),
    color: "#6c7a8a",
  },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: s(spacing.md),
    marginBottom: vs(spacing.sm),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  productHeader: {
    marginBottom: vs(spacing.md),
  },
  productNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(spacing.xs),
  },
  productName: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#2f3a4c",
  },
  productStock: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "#4CAF50",
  },
  productCode: {
    fontSize: rf(13),
    color: "#6c7a8a",
  },
  movementCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: borderRadius.md,
    padding: s(spacing.md),
    marginBottom: vs(spacing.md),
    borderLeftWidth: 4,
    borderLeftColor: "#c62828",
  },
  movementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(spacing.xs),
  },
  movementDate: {
    fontSize: rf(12),
    color: "#6c7a8a",
    fontWeight: "500",
  },
  movementBadge: {
    backgroundColor: "#ffebee",
    paddingHorizontal: hs(spacing.xs),
    paddingVertical: vs(spacing.xs),
    borderRadius: borderRadius.md,
  },
  movementBadgeText: {
    fontSize: rf(10),
    fontWeight: "600",
    textTransform: "uppercase",
  },
  movementBadgeTextExit: {
    color: "#c62828",
  },
  movementDetails: {
    marginBottom: vs(spacing.xs),
  },
  movementQuantity: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#c62828",
    marginBottom: vs(spacing.xs),
  },
  movementStock: {
    fontSize: rf(13),
    color: "#6c7a8a",
  },
  movementNotes: {
    fontSize: rf(13),
    color: "#4f6bed",
    fontStyle: "italic",
    paddingTop: vs(spacing.xs),
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  emptyMovements: {
    alignItems: "center",
    paddingVertical: vs(32),
    backgroundColor: "#f8f9fa",
    borderRadius: borderRadius.md,
  },
  emptyEmoji: {
    fontSize: rf(32),
    marginBottom: vs(spacing.md),
  },
  emptyTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#2f3a4c",
    marginBottom: vs(spacing.xs),
  },
  emptySubtitle: {
    fontSize: rf(14),
    color: "#6c7a8a",
    textAlign: "center",
    lineHeight: rf(20),
    paddingHorizontal: hs(spacing.md),
  },
  fab: {
    position: "absolute",
    bottom: vs(20),
    right: hs(20),
    width: iconSize.xl,
    height: iconSize.xl,
    borderRadius: s(28),
    backgroundColor: "#c62828",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: rf(28),
    color: "#fff",
    fontWeight: "700",
  },
});

export default InventoryExitDetailScreen;
