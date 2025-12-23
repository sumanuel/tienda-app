import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { useProducts } from "../../hooks/useProducts";
import QRCode from "react-native-qrcode-svg";

/**
 * Pantalla para ver códigos QR de productos
 */
export const QRProductsScreen = ({ navigation }) => {
  const { products, loading } = useProducts();

  const sortedProducts = [...products].sort((a, b) => {
    const numA = parseInt((a.barcode || '').replace('PROD-', '')) || 0;
    const numB = parseInt((b.barcode || '').replace('PROD-', '')) || 0;
    return numA - numB;
  });

  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productBarcode}>Código: {item.barcode}</Text>
        <Text style={styles.productCategory}>{item.category}</Text>
      </View>
      <View style={styles.qrContainer}>
        <QRCode value={item.barcode} size={80} />
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Cargando productos...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Códigos QR de Productos</Text>
        <View style={{ width: 80 }} />
      </View>

      <FlatList
        data={sortedProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderProduct}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#4CAF50",
  },
  backButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  listContainer: {
    padding: 16,
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productInfo: {
    flex: 1,
    justifyContent: "center",
  },
  productName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  productBarcode: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
  qrContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
  },
});

export default QRProductsScreen;
