import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useProducts } from "../../hooks/useProducts";

/**
 * Pantalla de gestión de productos
 */
export const ProductsScreen = ({ navigation }) => {
  const { products, loading, search } = useProducts();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.length > 0) {
      search(text);
    }
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity style={styles.productCard}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productCategory}>{item.category}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>$ {item.priceUSD?.toFixed(2)}</Text>
          <Text style={styles.price}>Bs. {item.priceVES?.toFixed(2)}</Text>
        </View>
      </View>
      <View style={styles.stockBadge}>
        <Text style={styles.stockText}>{item.stock}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Productos</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddProduct")}
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
        data={products}
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
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
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
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  productInfo: {
    flex: 1,
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
    minWidth: 50,
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 16,
  },
});

export default ProductsScreen;
