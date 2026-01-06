import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  getProductByBarcode,
  getProductEntryMovements,
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

export const InventoryEntryScreen = ({ navigation }) => {
  const [productCode, setProductCode] = useState("");
  const [product, setProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!productCode.trim()) {
      setError("Ingresa un código de producto");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const foundProduct = await getProductByBarcode(productCode.trim());
      if (foundProduct) {
        setProduct(foundProduct);

        // Cargar movimientos de entrada del producto
        const productMovements = await getProductEntryMovements(
          foundProduct.id
        );
        setMovements(productMovements);
      } else {
        setProduct(null);
        setMovements([]);
        setError("Producto no encontrado");
      }
    } catch (err) {
      console.error("Error buscando producto:", err);
      setError("Error al buscar el producto");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setProductCode("");
    setProduct(null);
    setMovements([]);
    setError(null);
  };

  const handleAddEntry = () => {
    if (product) {
      navigation.navigate("AddInventoryEntry", { product });
    }
  };

  // Refrescar producto cuando se regrese de agregar entrada
  useFocusEffect(
    React.useCallback(() => {
      if (product && productCode) {
        // Refrescar el producto para obtener stock actualizado
        const refreshProduct = async () => {
          try {
            const updatedProduct = await getProductByBarcode(productCode);
            if (updatedProduct) {
              setProduct(updatedProduct);

              // Recargar movimientos también
              const productMovements = await getProductEntryMovements(
                updatedProduct.id
              );
              setMovements(productMovements);
            }
          } catch (error) {
            console.error("Error refrescando producto:", error);
          }
        };
        refreshProduct();
      }
    }, [productCode, product])
  );

  const renderMovement = ({ item }) => (
    <View style={styles.movementCard}>
      <View style={styles.movementHeader}>
        <Text style={styles.movementDate}>
          {new Date(item.createdAt).toLocaleDateString()}{" "}
          {new Date(item.createdAt).toLocaleTimeString()}
        </Text>
        <View style={styles.movementBadge}>
          <Text style={styles.movementBadgeText}>Entrada</Text>
        </View>
      </View>

      <View style={styles.movementDetails}>
        <Text style={styles.movementQuantity}>+{item.quantity} unidades</Text>
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
        <Text style={styles.emptyEmoji}>📋</Text>
        <Text style={styles.emptyTitle}>Sin movimientos registrados</Text>
        <Text style={styles.emptySubtitle}>
          El inventario actual ({product.stock} unidades) se considera como
          registro inicial.
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
                <Text style={styles.heroIconText}>📥</Text>
              </View>
              <View style={styles.heroTextContainer}>
                <Text style={styles.heroTitle}>Entrada de Inventario</Text>
                <Text style={styles.heroSubtitle}>
                  Busca un producto por código para ver sus movimientos de
                  entrada
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.searchCard}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Código del producto"
                placeholderTextColor="#9aa6b5"
                value={productCode}
                onChangeText={setProductCode}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleSearch}
              >
                <Text style={styles.iconText}>🔍</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={handleReset}>
                <Text style={styles.iconText}>🗑️</Text>
              </TouchableOpacity>
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Buscando producto...</Text>
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
                  Código: {product.barcode}
                </Text>
              </View>
            </View>
          )}
        </View>

        <FlatList
          data={movements}
          renderItem={renderMovement}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </View>

      {product && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddEntry}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>+</Text>
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
    paddingBottom: vs(80), // Espacio para el FAB
  },
  header: {
    marginBottom: vs(spacing.lg),
  },
  title: {
    fontSize: rf(24),
    fontWeight: "700",
    color: "#2f3a4c",
    marginBottom: vs(spacing.xs),
  },
  subtitle: {
    fontSize: rf(16),
    color: "#6c7a8a",
    lineHeight: rf(22),
  },
  searchCard: {
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#f3f5fa",
    borderRadius: borderRadius.md,
    paddingVertical: vs(spacing.sm),
    paddingHorizontal: hs(spacing.md),
    fontSize: rf(13),
    color: "#1f2633",
    marginRight: hs(spacing.md),
  },
  iconButton: {
    width: s(40),
    height: s(40),
    borderRadius: borderRadius.md,
    backgroundColor: "#ecf4ef",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: hs(spacing.xs),
  },
  iconText: {
    fontSize: rf(16),
  },
  errorText: {
    color: "#c62828",
    fontSize: rf(14),
    marginTop: vs(spacing.xs),
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: vs(spacing.lg), // Reducido de 40 a 20 para menos separación
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
  productCardClose: {
    marginTop: vs(-10),
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
  inventoryInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: s(spacing.md),
    borderRadius: borderRadius.md,
    marginBottom: vs(spacing.lg),
  },
  inventoryLabel: {
    fontSize: rf(14),
    color: "#6c7a8a",
    fontWeight: "500",
  },
  inventoryValue: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#2e7d32",
  },
  movementsSection: {
    marginTop: vs(spacing.sm), // Reducido de 20 a 10 para hacer la tarjeta más delgada
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#2f3a4c",
    marginBottom: vs(spacing.xs), // Reducido de 12 a 8
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
  movementCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: borderRadius.md,
    padding: s(spacing.md),
    marginBottom: vs(spacing.md),
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
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
    backgroundColor: "#e8f5e8",
    paddingHorizontal: hs(spacing.xs),
    paddingVertical: vs(spacing.xs),
    borderRadius: borderRadius.md,
  },
  movementBadgeText: {
    fontSize: rf(10),
    color: "#2e7d32",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  movementDetails: {
    marginBottom: vs(spacing.xs),
  },
  movementQuantity: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#2e7d32",
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
  fab: {
    position: "absolute",
    bottom: vs(20),
    right: hs(20),
    width: iconSize.xl,
    height: iconSize.xl,
    borderRadius: s(28),
    backgroundColor: "#4CAF50",
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
    fontWeight: "bold",
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
});

export default InventoryEntryScreen;
