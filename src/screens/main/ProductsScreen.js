import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTourGuideController } from "rn-tourguide";
import { useProducts } from "../../hooks/useProducts";
import { getAllSales } from "../../services/database/sales";
import { getSettings } from "../../services/database/settings";
import { countProductInventoryMovements } from "../../services/database/products";
import { useExchangeRate } from "../../contexts/ExchangeRateContext";
import { formatCurrency } from "../../utils/currency";
import { useCustomAlert } from "../../components/common/CustomAlert";
import { hasSeenTour, markTourSeen } from "../../services/tour/tourStorage";
import {
  EmptyStateCard,
  FloatingActionButton,
  InfoPill,
  MetricCard,
  ScreenHero,
  SurfaceCard,
  SHADOWS,
  UI_COLORS,
} from "../../components/common/AppUI";
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
  const insets = useSafeAreaInsets();
  const { products, loading, search, loadProducts, removeProduct } =
    useProducts();
  const { showAlert, CustomAlert } = useCustomAlert();
  const [searchQuery, setSearchQuery] = useState("");
  const [settings, setSettings] = useState({});
  const { rate: exchangeRate } = useExchangeRate();
  const { canStart, start, TourGuideZone } = useTourGuideController("products");
  const TOUR_ZONE_BASE = 1000;
  const [tourBooted, setTourBooted] = useState(false);

  const fabBottom = vs(24) + Math.max(insets.bottom, vs(24));
  const listPaddingBottom = iconSize.xl + fabBottom + vs(24);

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
    }, [loadProducts]),
  );

  useEffect(() => {
    let mounted = true;

    const maybeStartTour = async () => {
      if (tourBooted) return;
      if (!canStart) return;

      const tourId = "products";
      const seen = await hasSeenTour(tourId);
      if (!mounted) return;

      if (!seen) {
        // Pequeño delay para asegurar layout/render
        setTimeout(() => {
          start();
          markTourSeen(tourId);
        }, 450);
      }

      if (mounted) setTourBooted(true);
    };

    maybeStartTour();

    return () => {
      mounted = false;
    };
  }, [canStart, start, tourBooted]);

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
      const allSales = await getAllSales(100000);
      const salesCount = allSales.filter((sale) =>
        Array.isArray(sale.items)
          ? sale.items.some(
              (item) => Number(item.productId) === Number(product.id),
            )
          : false,
      ).length;

      const inventoryCount = await countProductInventoryMovements(product.id);

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
      products.map((product) => product.category || "General"),
    ).size;
    const lowStockThreshold = 5;
    const lowStock = products.filter(
      (product) => (product.stock || 0) <= lowStockThreshold,
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
      <Pressable
        style={({ pressed }) => [
          styles.productCard,
          lowStock && styles.productCardDisabled,
          pressed && styles.cardPressed,
        ]}
        onPress={() => handleEditProduct(item)}
      >
        <View style={styles.productHeader}>
          <View style={styles.productLeft}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name.toUpperCase()}
            </Text>
            <Text style={styles.productCode}>
              Código:{" "}
              {item.productNumber || `PRD-${String(item.id).padStart(6, "0")}`}
            </Text>
            {!!item.barcode && (
              <Text style={styles.productCode}>Barcode: {item.barcode}</Text>
            )}
          </View>
          <View style={styles.productRight}>
            <InfoPill
              text={item.category || "General"}
              tone={lowStock ? "warning" : "info"}
            />
            <Pressable
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.cardPressed,
              ]}
              onPress={() => handleDeleteProduct(item)}
            >
              <Ionicons name="close" size={rf(14)} color="#ffffff" />
            </Pressable>
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
      </Pressable>
    );
  };

  const header = (
    <View style={styles.headerContent}>
      <ScreenHero
        iconName="cube-outline"
        iconColor={UI_COLORS.warning}
        eyebrow="Inventario"
        title="Catálogo de productos"
        subtitle="Administra precios y existencias con un vistazo claro a tu inventario."
        pills={[
          { text: `${metrics.totalProducts} productos`, tone: "accent" },
          { text: `${metrics.lowStock} con bajo stock`, tone: "warning" },
        ]}
      />

      <View style={styles.metricRow}>
        <MetricCard
          label="Inventario USD"
          value={formatCurrency(metrics.totalInventoryUSD, "USD", false)}
          hint="Valor estimado en dólares"
          tone="info"
        />

        <MetricCard
          label="Inventario en VES"
          value={formatCurrency(metrics.totalInventoryVES, "VES", false)}
          hint="Estimado con tasa vigente"
          tone="accent"
        />
      </View>

      <TourGuideZone
        zone={TOUR_ZONE_BASE + 1}
        text={
          "Usa 'Buscar producto' (Nombre, categoría o referencia) para encontrar un producto rápidamente."
        }
        borderRadius={borderRadius.lg}
        style={styles.searchCard}
      >
        <SurfaceCard style={styles.searchSurface}>
          <View style={styles.searchHeader}>
            <Text style={styles.searchTitle}>Buscar producto</Text>
            {metrics.rateUsed ? (
              <InfoPill
                text={`Tasa ${metrics.rateUsed.toFixed(2)}`}
                tone="info"
              />
            ) : null}
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Nombre, categoría o referencia"
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#9aa2b1"
          />
        </SurfaceCard>
      </TourGuideZone>
    </View>
  );

  return (
    <>
      <View style={styles.container}>
        <FlatList
          data={sortedProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: listPaddingBottom },
          ]}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <EmptyStateCard
              title="Aún no hay productos"
              subtitle="Registra tu primer producto para visualizar métricas y control de inventario."
            />
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        <TourGuideZone
          zone={TOUR_ZONE_BASE + 2}
          text={"Presiona '+' para registrar un nuevo producto."}
          shape="circle"
        >
          <FloatingActionButton
            onPress={() => navigation.navigate("AddProduct")}
            bottom={fabBottom}
            iconName="add"
          />
        </TourGuideZone>
      </View>
      <CustomAlert />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_COLORS.page,
  },
  list: {
    paddingHorizontal: hs(16),
    paddingTop: vs(16),
    paddingBottom: vs(120),
  },
  headerContent: {
    gap: vs(18),
    marginBottom: vs(8),
  },
  metricRow: {
    flexDirection: "row",
    gap: hs(16),
  },
  searchCard: {
    gap: vs(14),
  },
  searchSurface: {
    gap: vs(14),
    ...SHADOWS.soft,
  },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: hs(12),
  },
  searchTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  searchInput: {
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: vs(12),
    paddingHorizontal: hs(16),
    fontSize: rf(15),
    color: UI_COLORS.text,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
  },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    ...SHADOWS.soft,
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
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  productCode: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
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
    fontWeight: "800",
    color: UI_COLORS.accent,
  },
  productStock: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.info,
    backgroundColor: UI_COLORS.infoSoft,
    paddingHorizontal: hs(10),
    paddingVertical: vs(5),
    borderRadius: borderRadius.sm,
    borderCurve: "continuous",
  },
  productStockLow: {
    backgroundColor: UI_COLORS.dangerSoft,
    color: UI_COLORS.danger,
  },
  deleteButton: {
    width: s(28),
    height: s(28),
    borderRadius: borderRadius.sm,
    borderCurve: "continuous",
    backgroundColor: UI_COLORS.danger,
    justifyContent: "center",
    alignItems: "center",
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

export default ProductsScreen;
