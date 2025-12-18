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

    return (
      <View style={styles.productCard}>
        <TouchableOpacity
          style={styles.productInfo}
          onPress={() => handleEditProduct(item)}
        >
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productDetail}>Categoría: {item.category}</Text>
          <Text style={styles.productDetail}>
            Precio: ${item.priceUSD?.toFixed(2)} • VES {priceVES?.toFixed(2)}
          </Text>
          <Text style={styles.productDetail}>Stock: {item.stock} unidades</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteIcon}
          onPress={() => handleDeleteProduct(item)}
        >
          <Text style={styles.deleteIconText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar producto"
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#999"
        />
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

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddProduct")}
      >
        <Text style={styles.fabIcon}>�</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8edf2",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    alignItems: "flex-start",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  productDetail: {
    fontSize: 13,
    color: "#666",
    marginBottom: 3,
  },
  deleteIcon: {
    padding: 8,
  },
  deleteIconText: {
    fontSize: 20,
  },
  fab: {
    position: "absolute",
    bottom: 80,
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
    fontSize: 24,
    color: "#fff",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 60,
    fontSize: 16,
  },
});

export default ProductsScreen;
