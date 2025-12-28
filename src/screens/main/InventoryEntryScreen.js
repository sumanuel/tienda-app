import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  getProductByBarcode,
  getProductEntryMovements,
} from "../../services/database/products";

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

  const renderHeader = () => (
    <>
      <View style={styles.headerContent}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroIconText}>📥</Text>
          </View>
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTitle}>Entrada de Inventario</Text>
            <Text style={styles.heroSubtitle}>
              Busca un producto por código para ver sus movimientos de entrada
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
            onChangeText={handleSearch}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.iconButton} onPress={handleSearch}>
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
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productCode}>Código: {product.barcode}</Text>
          </View>

          <View style={styles.inventoryInfo}>
            <Text style={styles.inventoryLabel}>Inventario Actual:</Text>
            <Text style={styles.inventoryValue}>{product.stock} unidades</Text>
          </View>

          <View style={styles.movementsSection}>
            <Text style={styles.sectionTitle}>Movimientos de Entrada</Text>
          </View>
        </View>
      )}
    </>
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
    <View style={styles.container}>
      <FlatList
        data={movements}
        renderItem={renderMovement}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />

      {product && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddEntry}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}
    </View>
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
    paddingBottom: 100, // Espacio para el FAB
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2f3a4c",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6c7a8a",
    lineHeight: 22,
  },
  searchCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#1f2633",
    marginRight: 12,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#ecf4ef",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  iconText: {
    fontSize: 20,
  },
  errorText: {
    color: "#c62828",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 20, // Reducido de 40 a 20 para menos separación
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6c7a8a",
  },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 10, // Reducido de 20 a 10 para pegar más la lista
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  productCardClose: {
    marginTop: -10, // Acerca la tarjeta del producto a la de búsqueda
  },
  productHeader: {
    marginBottom: 16,
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
  inventoryInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  inventoryLabel: {
    fontSize: 14,
    color: "#6c7a8a",
    fontWeight: "500",
  },
  inventoryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2e7d32",
  },
  movementsSection: {
    marginTop: 10, // Reducido de 20 a 10 para hacer la tarjeta más delgada
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2f3a4c",
    marginBottom: 8, // Reducido de 12 a 8
  },
  emptyMovements: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2f3a4c",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6c7a8a",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  movementCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
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
    backgroundColor: "#e8f5e8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  movementBadgeText: {
    fontSize: 10,
    color: "#2e7d32",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  movementDetails: {
    marginBottom: 8,
  },
  movementQuantity: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2e7d32",
    marginBottom: 4,
  },
  movementStock: {
    fontSize: 13,
    color: "#6c7a8a",
  },
  movementNotes: {
    fontSize: 13,
    color: "#4f6bed",
    fontStyle: "italic",
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
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
    fontSize: 28,
    color: "#fff",
    fontWeight: "bold",
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
    fontSize: 14,
    color: "#5b6472",
    lineHeight: 20,
  },
});

export default InventoryEntryScreen;
