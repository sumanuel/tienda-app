import React, { useState, useCallback, useEffect, useMemo } from "react";
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
import { formatCurrency } from "../../utils/currency";

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

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const metrics = useMemo(() => {
    const totalProducts = products.length;
    const totalCategories = new Set(
      products.map((product) => product.category || "General")
    ).size;
    const lowStockThreshold = 5;
    const lowStock = products.filter(
      (product) => (product.stock || 0) <= lowStockThreshold
    ).length;
    const totalInventoryUSD = products.reduce((sum, product) => {
      const price = product.priceUSD || 0;
      const stock = product.stock || 0;
      return sum + price * stock;
    }, 0);
    const rateFromSettings = settings?.pricing?.currencies?.USD;
    const appliedRate = exchangeRate || rateFromSettings || 0;
    const totalInventoryVES = totalInventoryUSD * appliedRate;

    return {
      totalProducts,
      totalCategories,
      lowStock,
      totalInventoryUSD,
      totalInventoryVES,
      rateUsed: appliedRate,
    };
  }, [products, settings, exchangeRate]);

  const renderProduct = ({ item }) => {
    const rateFromSettings = settings?.pricing?.currencies?.USD;
    const appliedRate = exchangeRate || rateFromSettings || 0;
    const priceUSD = item.priceUSD || 0;
    const priceVES = appliedRate ? priceUSD * appliedRate : 0;
    const stock = item.stock || 0;
    const minStock = item.minStock ?? 0;
    const lowStock = minStock ? stock <= minStock : stock <= 5;

    return (
      <View style={styles.productCard}>
        <TouchableOpacity
          style={styles.productBody}
          onPress={() => handleEditProduct(item)}
          activeOpacity={0.85}
        >
          <View style={styles.productHeader}>
            <Text style={styles.productName}>{item.name}</Text>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>
                {item.category || "General"}
              </Text>
            </View>
          </View>

          <View style={styles.priceRow}>
            <View style={styles.priceTag}>
              <Text style={styles.priceTagLabel}>USD</Text>
              <Text style={styles.priceTagValue}>
                {formatCurrency(priceUSD, "USD", false)}
              </Text>
            </View>
            {appliedRate ? (
              <View style={styles.priceTagSecondary}>
                <Text style={styles.priceTagSecondaryLabel}>VES</Text>
                <Text style={styles.priceTagSecondaryValue}>
                  {formatCurrency(priceVES, "VES", false)}
                </Text>
              </View>
            ) : (
              <Text style={styles.priceSecondary}>
                Define una tasa para ver VES
              </Text>
            )}
          </View>

          <View style={styles.productFooter}>
            <View
              style={[
                styles.stockBadge,
                lowStock ? styles.stockBadgeAlert : null,
              ]}
            >
              <Text
                style={[
                  styles.stockBadgeText,
                  lowStock ? styles.stockBadgeTextAlert : null,
                ]}
              >
                Stock {stock}
              </Text>
            </View>

            {item.margin ? (
              <Text style={styles.marginText}>Margen {item.margin}%</Text>
            ) : null}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteProduct(item)}
        >
          <Text style={styles.deleteButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Text style={styles.heroIconText}>📦</Text>
        </View>
        <View style={styles.heroTextContainer}>
          <Text style={styles.heroTitle}>Catálogo de productos</Text>
          <Text style={styles.heroSubtitle}>
            Administra precios y existencias con un vistazo claro a tu
            inventario.
          </Text>
        </View>
      </View>

      <View style={styles.metricRow}>
        <View style={[styles.metricCard, styles.metricCardHighlight]}>
          <Text style={styles.metricLabel}>Inventario USD</Text>
          <Text style={styles.metricValue}>
            {formatCurrency(metrics.totalInventoryUSD, "USD", false)}
          </Text>
          <Text style={styles.metricHint}>Valor estimado en dólares</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Inventario en VES</Text>
          <Text style={styles.metricValue}>
            {formatCurrency(metrics.totalInventoryVES, "VES", false)}
          </Text>
          <Text style={styles.metricHint}>Estimado con tasa vigente</Text>
        </View>
      </View>

      <View style={styles.searchCard}>
        <View style={styles.searchHeader}>
          <Text style={styles.searchTitle}>Buscar producto</Text>
          {metrics.rateUsed ? (
            <Text style={styles.rateBadge}>
              Tasa {metrics.rateUsed.toFixed(2)}
            </Text>
          ) : null}
        </View>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Nombre, categoría o referencia"
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#9aa2b1"
          />
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aún no hay productos</Text>
            <Text style={styles.emptySubtitle}>
              Registra tu primer producto para visualizar métricas y control de
              inventario.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddProduct")}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8edf2",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },
  headerContent: {
    gap: 18,
    marginBottom: 8,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 22,
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
  metricRow: {
    flexDirection: "row",
    gap: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    gap: 4,
  },
  metricCardHighlight: {
    backgroundColor: "#f3f8ff",
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7a8796",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2633",
  },
  metricHint: {
    fontSize: 12,
    color: "#6f7c8c",
  },
  searchCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    gap: 14,
  },
  searchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  searchTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2633",
  },
  rateBadge: {
    fontSize: 12,
    color: "#2f5ae0",
    fontWeight: "600",
    backgroundColor: "#e8eeff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d9e0eb",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchIcon: {
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1f2633",
  },
  productCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    gap: 16,
    marginBottom: 12,
  },
  productBody: {
    flex: 1,
    gap: 12,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  productName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2633",
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#f3f8ff",
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2f5ae0",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  priceTag: {
    backgroundColor: "#d4edda",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 110,
    justifyContent: "center",
  },
  priceTagLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#155724",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    textAlign: "center",
  },
  priceTagValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#155724",
    textAlign: "center",
  },
  priceTagSecondary: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 110,
    flex: 1,
    justifyContent: "center",
  },
  priceTagSecondaryLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6c757d",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    textAlign: "center",
  },
  priceTagSecondaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#495057",
    textAlign: "center",
  },
  priceSecondary: {
    fontSize: 13,
    color: "#4c5767",
    flex: 1,
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  stockBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#edf8f1",
  },
  stockBadgeAlert: {
    backgroundColor: "#fff2f0",
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2fb176",
  },
  stockBadgeTextAlert: {
    color: "#ef5350",
  },
  marginText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6f7c8c",
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#d62828",
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
    fontSize: 28,
    color: "#fff",
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1f2633",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6f7c8c",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default ProductsScreen;
