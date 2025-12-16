import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useProducts } from "../../hooks/useProducts";
import { getSettings } from "../../services/database/settings";
import { useExchangeRate } from "../../contexts/ExchangeRateContext";

/**
 * Pantalla de gestión de productos
 */
export const ProductsScreen = ({ navigation }) => {
  const { products, loading, search, loadProducts, removeProduct } =
    useProducts();
  const [searchQuery, setSearchQuery] = useState("");
  const [settings, setSettings] = useState({});
  const { rate: exchangeRate } = useExchangeRate();

  // Cargar settings al montar
  useEffect(() => {
    const loadSettings = async () => {
      const s = await getSettings();
      setSettings(s);
    };
    loadSettings();
  }, []);

  // Recargar productos y settings cuando la pantalla se enfoque
  useFocusEffect(
    useCallback(() => {
      loadProducts();
      // Recargar settings también por si cambió el tipo de cambio
      const loadSettings = async () => {
        const s = await getSettings();
        setSettings(s);
      };
      loadSettings();
    }, [loadProducts])
  );

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.length > 0) {
      search(text);
    } else {
      loadProducts();
    }
  };

  const handleEditProduct = (product) => {
    navigation.navigate("EditProduct", { product });
  };

  const handleDeleteProduct = (product) => {
    Alert.alert(
      "Eliminar Producto",
      `¿Estás seguro de que quieres eliminar "${product.name}"?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await removeProduct(product.id);
              Alert.alert("Éxito", "Producto eliminado correctamente");
            } catch (error) {
              Alert.alert("Error", "No se pudo eliminar el producto");
            }
          },
        },
      ]
    );
  };

  const renderProduct = ({ item }) => {
    // Calcular precio en VES dinámicamente usando el tipo de cambio actual
    const rate = exchangeRate || 280;
    const priceVES = item.priceUSD * rate;

    console.log(
      "ProductsScreen - Rate:",
      rate,
      "PriceUSD:",
      item.priceUSD,
      "PriceVES:",
      priceVES
    );

    return (
      <View style={styles.productCard}>
        <TouchableOpacity
          style={styles.productInfo}
          onPress={() => handleEditProduct(item)}
        >
          <Text style={styles.productName}>{item.name.toUpperCase()}</Text>
          <Text style={styles.productCategory}>
            {item.category?.toUpperCase()}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>$ {item.priceUSD?.toFixed(2)}</Text>
            <Text style={styles.price}>VES. {priceVES?.toFixed(2)}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.actionsContainer}>
          <View style={styles.stockBadge}>
            <Text style={styles.stockText}>{item.stock}</Text>
            <Text style={styles.stockIcon}>📦</Text>
          </View>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteProduct(item)}
          >
            <Text style={styles.deleteButtonText}>✖</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar productos..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddProduct")}
        >
          <Text style={styles.addButtonText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products.sort((a, b) => a.name.localeCompare(b.name))}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay productos</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButton: {
    backgroundColor: "#10b981",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    backgroundColor: "#f8fafc",
    fontSize: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  list: {
    padding: 20,
    paddingBottom: 100,
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  productInfo: {
    flex: 1,
  },
  actionsContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  deleteButton: {
    backgroundColor: "#ef4444",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  productName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  productCategory: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 6,
    fontWeight: "500",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  priceRow: {
    flexDirection: "row",
    gap: 12,
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
    color: "#059669",
  },
  stockBadge: {
    backgroundColor: "transparent",
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 0,
  },
  stockIcon: {
    fontSize: 16,
    color: "#64748b",
  },
  stockText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  emptyText: {
    textAlign: "center",
    color: "#94a3b8",
    marginTop: 60,
    marginBottom: 80,
    fontSize: 18,
    fontWeight: "500",
  },
});

export default ProductsScreen;
