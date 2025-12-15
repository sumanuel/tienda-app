import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
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
    navigation.getParent().navigate("EditProduct", { product });
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
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productCategory}>{item.category}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>$ {item.priceUSD?.toFixed(2)}</Text>
            <Text style={styles.price}>VES. {priceVES?.toFixed(2)}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.actionsContainer}>
          <View style={styles.stockBadge}>
            <Text style={styles.stockLabel}>Cant:</Text>
            <Text style={styles.stockText}>{item.stock}</Text>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleEditProduct(item)}
            >
              <Text style={styles.editButtonText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteProduct(item)}
            >
              <Text style={styles.deleteButtonText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Productos</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.getParent().navigate("AddProduct")}
        >
          <Text style={styles.addButtonText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Buscar productos..."
        value={searchQuery}
        onChangeText={handleSearch}
      />

      <FlatList
        data={products.sort((a, b) => a.name.localeCompare(b.name))}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay productos</Text>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  addButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  searchInput: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    alignItems: "center",
  },
  productInfo: {
    flex: 1,
  },
  actionsContainer: {
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  editButton: {
    backgroundColor: "#2196F3",
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: "#F44336",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: "row",
    gap: 12,
  },
  price: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
  },
  stockBadge: {
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
    padding: 8,
    minWidth: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  stockLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2196F3",
  },
  stockText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2196F3",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 40,
    marginBottom: 60,
    fontSize: 16,
  },
});

export default ProductsScreen;
