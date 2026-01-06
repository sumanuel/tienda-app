import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useProducts } from "../../hooks/useProducts";
import { getAllSales } from "../../services/database/sales";
import { getSettings } from "../../services/database/settings";
import { useExchangeRate } from "../../contexts/ExchangeRateContext";
import { formatCurrency } from "../../utils/currency";
import { useCustomAlert } from "../../components/common/CustomAlert";
import { db } from "../../services/database/db";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";

/**
 * Pantalla de gestión de productos
 */
export const ProductsScreen = ({ navigation }) => {
  const { products, loading, search, loadProducts, removeProduct } =
    useProducts();
  const { showAlert, CustomAlert } = useCustomAlert();
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

  const handleDeleteProduct = async (product) => {
    try {
      // Verificar si el producto tiene movimientos asociados
      const saleItemsResult = await db.getAllAsync(
        `SELECT COUNT(*) as count FROM sale_items WHERE productId = ?`,
        [product.id]
      );
      const salesCount = saleItemsResult[0]?.count || 0;

      // Verificar movimientos de inventario (si existe la tabla)
      let inventoryCount = 0;
      try {
        const inventoryResult = await db.getAllAsync(
          `SELECT COUNT(*) as count FROM inventory_movements WHERE productId = ?`,
          [product.id]
        );
        inventoryCount = inventoryResult[0]?.count || 0;
      } catch (error) {
        // Si no existe la tabla inventory_movements, continuar
        console.log(
          "Tabla inventory_movements no existe, omitiendo verificación"
        );
      }

      if (salesCount > 0 || inventoryCount > 0) {
        showAlert({
          title: "No se puede eliminar",
          message: `No se puede eliminar "${product.name}" porque tiene ${salesCount} venta(s) y ${inventoryCount} movimiento(s) de inventario asociado(s).`,
          type: "error",
        });
        return;
      }

      // Si no tiene movimientos, mostrar confirmación de eliminación
      showAlert({
        title: "Eliminar Producto",
        message: `¿Estás seguro de que quieres eliminar "${product.name}"?`,
        type: "warning",
        buttons: [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: async () => {
              try {
                await removeProduct(product.id);
                showAlert({
                  title: "Éxito",
                  message: "Producto eliminado correctamente",
                  type: "success",
                });
              } catch (error) {
                console.error("Error eliminando producto:", error);
                showAlert({
                  title: "Error",
                  message: "No se pudo eliminar el producto",
                  type: "error",
                });
              }
            },
          },
        ],
      });
    } catch (error) {
      console.error("Error verificando movimientos del producto:", error);
      showAlert({
        title: "Error",
        message: "No se pudo verificar los movimientos del producto",
        type: "error",
      });
    }
  };

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const numA = parseInt((a.barcode || "").replace("PROD-", "")) || 0;
      const numB = parseInt((b.barcode || "").replace("PROD-", "")) || 0;
      return numA - numB;
    });
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
      <TouchableOpacity
        style={[styles.productCard, lowStock && styles.productCardDisabled]}
        onPress={() => handleEditProduct(item)}
        activeOpacity={0.85}
      >
        <View style={styles.productHeader}>
          <View style={styles.productLeft}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name.toUpperCase()}
            </Text>
            <Text style={styles.productCode}>
              Código: {item.barcode || `PROD-${item.id}`}
            </Text>
          </View>
          <View style={styles.productRight}>
            <Text style={styles.productCategory}>
              {item.category || "General"}
            </Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteProduct(item)}
            >
              <Text style={styles.deleteButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>
            VES. {priceVES.toFixed(2)} / USD. {priceUSD.toFixed(2)}
          </Text>
          <Text
            style={[styles.productStock, lowStock && styles.productStockLow]}
          >
            Stock: {stock}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const header = (
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
        <TextInput
          style={styles.searchInput}
          placeholder="Nombre, categoría o referencia"
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#9aa2b1"
        />
      </View>
    </View>
  );

  return (
    <>
      <View style={styles.container}>
        <FlatList
          data={sortedProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Aún no hay productos</Text>
              <Text style={styles.emptySubtitle}>
                Registra tu primer producto para visualizar métricas y control
                de inventario.
              </Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
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
      <CustomAlert />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8edf2",
  },
  list: {
    paddingHorizontal: hs(16),
    paddingTop: vs(16),
    paddingBottom: vs(120),
  },
  headerContent: {
    gap: vs(12),
    marginBottom: vs(8),
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(10) },
    shadowOpacity: 0.08,
    shadowRadius: s(18),
    elevation: 8,
  },
  heroIcon: {
    width: s(60),
    height: s(60),
    borderRadius: borderRadius.lg,
    backgroundColor: "#f3f8ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: hs(18),
  },
  heroIconText: {
    fontSize: iconSize.xl,
  },
  heroTextContainer: {
    flex: 1,
    gap: vs(6),
  },
  heroTitle: {
    fontSize: rf(20),
    fontWeight: "700",
    color: "#1f2633",
  },
  heroSubtitle: {
    fontSize: rf(14),
    color: "#5b6472",
    lineHeight: vs(20),
  },
  metricRow: {
    flexDirection: "row",
    gap: hs(16),
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: borderRadius.md,
    paddingVertical: vs(18),
    paddingHorizontal: hs(20),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.05,
    shadowRadius: s(10),
    elevation: 4,
    gap: vs(4),
  },
  metricCardHighlight: {
    backgroundColor: "#f3f8ff",
  },
  metricLabel: {
    fontSize: rf(12),
    fontWeight: "600",
    color: "#7a8796",
    textTransform: "uppercase",
    letterSpacing: s(0.8),
  },
  metricValue: {
    fontSize: rf(16),
    fontWeight: "700",
    color: "#1f2633",
  },
  metricHint: {
    fontSize: rf(12),
    color: "#6f7c8c",
  },
  searchCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.05,
    shadowRadius: s(8),
    elevation: 4,
    gap: vs(14),
  },
  searchHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  searchTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#1f2633",
  },
  rateBadge: {
    fontSize: rf(12),
    color: "#2f5ae0",
    fontWeight: "600",
    backgroundColor: "#e8eeff",
    paddingHorizontal: hs(12),
    paddingVertical: vs(6),
    borderRadius: borderRadius.sm,
  },
  searchInput: {
    backgroundColor: "#f3f5fa",
    borderRadius: borderRadius.sm,
    paddingVertical: vs(12),
    paddingHorizontal: hs(16),
    fontSize: rf(15),
    color: "#1f2633",
  },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: vs(8),
    flex: 1,
    marginBottom: vs(8),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.05,
    shadowRadius: s(12),
    elevation: 5,
  },
  productCardDisabled: {
    opacity: 0.45,
  },
  productBody: {
    flex: 1,
    gap: vs(12),
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: hs(12),
  },
  productLeft: {
    flex: 1,
    gap: vs(4),
  },
  productRight: {
    alignItems: "flex-end",
    gap: vs(4),
  },
  productName: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#1f2633",
  },
  productCode: {
    fontSize: rf(12),
    color: "#6f7c8c",
    fontStyle: "italic",
  },
  productCategory: {
    fontSize: rf(12),
    color: "#6f7c8c",
    fontStyle: "italic",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: hs(12),
  },
  priceTag: {
    backgroundColor: "#d4edda",
    borderRadius: borderRadius.sm,
    paddingHorizontal: hs(14),
    paddingVertical: vs(10),
    minWidth: s(110),
    justifyContent: "center",
  },
  priceTagLabel: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#155724",
    textTransform: "uppercase",
    letterSpacing: s(0.6),
    textAlign: "center",
  },
  priceTagValue: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#155724",
    textAlign: "center",
  },
  priceTagSecondary: {
    backgroundColor: "#f8f9fa",
    borderRadius: borderRadius.sm,
    paddingHorizontal: hs(14),
    paddingVertical: vs(10),
    minWidth: s(110),
    flex: 1,
    justifyContent: "center",
  },
  priceTagSecondaryLabel: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#6c757d",
    textTransform: "uppercase",
    letterSpacing: s(0.6),
    textAlign: "center",
  },
  priceTagSecondaryValue: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#495057",
    textAlign: "center",
  },
  priceSecondary: {
    fontSize: rf(13),
    color: "#4c5767",
    flex: 1,
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productPrice: {
    fontSize: rf(15),
    fontWeight: "700",
    color: "#1f9254",
  },
  productStock: {
    fontSize: rf(12),
    fontWeight: "600",
    color: "#2f5ae0",
    backgroundColor: "#e8f1ff",
    paddingHorizontal: hs(10),
    paddingVertical: vs(5),
    borderRadius: borderRadius.sm,
  },
  productStockLow: {
    backgroundColor: "#ffe8ec",
    color: "#d6455d",
  },
  stockBadge: {
    paddingHorizontal: hs(14),
    paddingVertical: vs(6),
    borderRadius: borderRadius.sm,
    backgroundColor: "#edf8f1",
  },
  stockBadgeAlert: {
    backgroundColor: "#fff2f0",
  },
  stockBadgeText: {
    fontSize: rf(12),
    fontWeight: "600",
    color: "#2fb176",
  },
  stockBadgeTextAlert: {
    color: "#ef5350",
  },
  marginText: {
    fontSize: rf(12),
    fontWeight: "600",
    color: "#6f7c8c",
  },
  deleteButton: {
    width: s(24),
    height: s(24),
    borderRadius: borderRadius.sm,
    backgroundColor: "#f66570",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#fff",
  },
  fab: {
    position: "absolute",
    bottom: vs(20),
    right: hs(20),
    width: s(56),
    height: s(56),
    borderRadius: borderRadius.xl,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(4) },
    shadowOpacity: 0.3,
    shadowRadius: s(8),
    elevation: 8,
  },
  fabIcon: {
    fontSize: iconSize.xl,
    color: "#fff",
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    marginTop: vs(40),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.05,
    shadowRadius: s(10),
    elevation: 4,
    gap: vs(12),
  },
  emptyTitle: {
    fontSize: rf(17),
    fontWeight: "700",
    color: "#1f2633",
  },
  emptySubtitle: {
    fontSize: rf(13),
    color: "#6f7c8c",
    textAlign: "center",
    lineHeight: vs(20),
  },
});

export default ProductsScreen;
