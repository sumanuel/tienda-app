import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useProducts } from "../../hooks/useProducts";
import QRCode from "react-native-qrcode-svg";
import { printAsync } from "expo-print";
import qrcode from "qrcode";

/**
 * Pantalla para ver códigos QR de productos
 */
export const QRProductsScreen = ({ navigation }) => {
  const { products, loading } = useProducts();
  const [startRange, setStartRange] = useState("");
  const [endRange, setEndRange] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const sortedProducts = [...products].sort((a, b) => {
    const numA = parseInt((a.barcode || "").replace("PROD-", "")) || 0;
    const numB = parseInt((b.barcode || "").replace("PROD-", "")) || 0;
    return numA - numB;
  });

  const startNum = parseInt(startRange) || 0;
  const endNum = parseInt(endRange) || Infinity;

  const filteredProducts = sortedProducts.filter((product) => {
    const num = parseInt((product.barcode || "").replace("PROD-", "")) || 0;
    return num >= startNum && num <= endNum;
  });
  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const printSelected = async () => {
    if (selectedIds.length === 0) {
      Alert.alert(
        "Sin selección",
        "Selecciona al menos un producto para imprimir."
      );
      return;
    }

    const selectedProducts = products.filter((p) => selectedIds.includes(p.id));

    // Generate QR SVGs
    const productsWithQR = await Promise.all(
      selectedProducts.map(async (product) => {
        try {
          const qrSVG = await qrcode.toString(product.barcode, { type: 'svg', width: 200 });
          return { ...product, qrSVG };
        } catch (error) {
          console.error("Error generating QR for", product.barcode, error);
          return { ...product, qrSVG: `<svg width="200" height="200"><text x="50%" y="50%" text-anchor="middle">Error</text></svg>` };
        }
      })
    );

    const html = `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .product { text-align: center; padding: 5px; }
        .qr { width: 100px; height: 100px; margin: 0 auto; }
        .qr svg { width: 100%; height: 100%; }
        .name { font-size: 10px; margin-top: 5px; }
      </style>
    </head>
    <body>
      <div class="grid">
        ${productsWithQR
          .map(
            (product) => `
          <div class="product">
            <div class="qr">${product.qrSVG}</div>
            <div class="name">${product.name}</div>
          </div>
        `
          )
          .join("")}
      </div>
    </body>
    </html>
    `;

    try {
      await printAsync({ html });
      Alert.alert("Impresión", "Los códigos QR han sido enviados a impresión.");
    } catch (error) {
      Alert.alert("Error", "No se pudo imprimir: " + error.message);
    }
  };
  const renderProduct = ({ item }) => {
    const isSelected = selectedIds.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.productCard, isSelected && styles.productCardSelected]}
        onPress={() => toggleSelection(item.id)}
      >
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productBarcode}>Código: {item.barcode}</Text>
          <Text style={styles.productCategory}>{item.category}</Text>
        </View>
        <View style={styles.qrContainer}>
          <QRCode value={item.barcode} size={80} />
        </View>
        <View style={styles.checkContainer}>
          <Text style={styles.checkMark}>{isSelected ? "✓" : ""}</Text>
        </View>
      </TouchableOpacity>
    );
  };

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

      <View style={styles.searchContainer}>
        <View style={styles.rangeContainer}>
          <TextInput
            style={styles.rangeInput}
            placeholder="Desde"
            value={startRange}
            onChangeText={setStartRange}
            keyboardType="numeric"
          />
          <Text style={styles.rangeSeparator}>a</Text>
          <TextInput
            style={styles.rangeInput}
            placeholder="Hasta"
            value={endRange}
            onChangeText={setEndRange}
            keyboardType="numeric"
          />
        </View>
        {selectedIds.length > 0 && (
          <TouchableOpacity style={styles.printButton} onPress={printSelected}>
            <Text style={styles.printButtonText}>
              Imprimir seleccionados ({selectedIds.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredProducts}
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
  productCardSelected: {
    backgroundColor: "#e8f5e8",
    borderColor: "#4CAF50",
    borderWidth: 2,
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  rangeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rangeInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  rangeSeparator: {
    marginHorizontal: 8,
    fontSize: 16,
    fontWeight: "bold",
    color: "#666",
  },
  printButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: "center",
  },
  printButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  checkContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
  },
  checkMark: {
    fontSize: 24,
    color: "#4CAF50",
    fontWeight: "bold",
  },
});

export default QRProductsScreen;
