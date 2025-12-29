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
  getProductExitMovements,
} from "../../services/database/products";

export const InventoryExitScreen = ({ navigation }) => {
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
        const productMovements = await getProductExitMovements(foundProduct.id);
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

  const handleAddExit = () => {
    if (product) {
      navigation.navigate("AddInventoryExit", { product });
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (product && productCode) {
        const refreshProduct = async () => {
          try {
            const updatedProduct = await getProductByBarcode(productCode);
            if (updatedProduct) {
              setProduct(updatedProduct);
              const productMovements = await getProductExitMovements(
                updatedProduct.id
              );
              setMovements(productMovements);
            }
          } catch (refreshError) {
            console.error("Error refrescando producto:", refreshError);
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
        <View style={[styles.movementBadge, styles.movementBadgeExit]}>
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
        <Text style={styles.emptyEmoji}>📋</Text>
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
                  Busca un producto por código para ver sus movimientos de
                  salida (incluye ventas).
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
            <View style={[styles.productCard, styles.productCardClose]}>
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
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 80,
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
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: "#f3f8ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  heroIconText: {
    fontSize: 24,
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
  searchCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 12,
    marginBottom: 20,
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
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 13,
    color: "#1f2633",
    marginRight: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ecf4ef",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  iconText: {
    fontSize: 16,
  },
  errorText: {
    color: "#c62828",
    fontSize: 14,
    marginTop: 12,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 12,
    color: "#6c7a8a",
    fontSize: 14,
  },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  productCardClose: {
    marginTop: -15,
  },
  productHeader: {
    marginBottom: 12,
  },
  productNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2f3a4c",
  },
  productStock: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
  },
  productCode: {
    fontSize: 13,
    color: "#6c7a8a",
  },
  movementsSection: {
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2f3a4c",
    marginTop: 12,
  },
  movementCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  movementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  movementDate: {
    fontSize: 12,
    color: "#6c7a8a",
    fontWeight: "500",
  },
  movementBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  movementBadgeExit: {
    backgroundColor: "#ffebee",
  },
  movementBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  movementBadgeTextExit: {
    color: "#c62828",
  },
  movementDetails: {
    marginTop: 6,
  },
  movementQuantity: {
    fontSize: 16,
    fontWeight: "700",
    color: "#c62828",
    marginBottom: 4,
  },
  movementStock: {
    fontSize: 13,
    color: "#5b6472",
  },
  movementNotes: {
    marginTop: 10,
    fontSize: 13,
    color: "#2f3a4c",
    fontStyle: "italic",
  },
  emptyMovements: {
    alignItems: "center",
    paddingVertical: 30,
  },
  emptyEmoji: {
    fontSize: 34,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2f3a4c",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6c7a8a",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
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
    fontSize: 28,
    color: "#fff",
    fontWeight: "700",
  },
});

export default InventoryExitScreen;
