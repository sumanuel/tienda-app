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
import { countSalesByProduct } from "../../services/database/sales";
import { getSettings } from "../../services/database/settings";
import { countProductInventoryMovements } from "../../services/database/products";
import { useExchangeRate } from "../../contexts/ExchangeRateContext";
import { useCustomAlert } from "../../components/common/CustomAlert";
import { hasSeenTour, markTourSeen } from "../../services/tour/tourStorage";
import {
  EmptyStateCard,
  FloatingActionButton,
  InfoPill,
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

const ProductCard = React.memo(function ProductCard({
  item,
  appliedRate,
  onEdit,
  onDelete,
}) {
  const priceUSD = Number(item.priceUSD) || 0;
  const priceVES = appliedRate ? priceUSD * appliedRate : 0;
  const stock = Number(item.stock) || 0;
  const minStock = Number(item.minStock ?? 0);
  const lowStock = minStock ? stock <= minStock : stock <= 5;

  const handleEdit = useCallback(() => {
    onEdit(item);
  }, [item, onEdit]);

  const handleDelete = useCallback(() => {
    onDelete(item);
  }, [item, onDelete]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.productCard,
        lowStock && styles.productCardLowStock,
        pressed && styles.cardPressed,
      ]}
      onPress={handleEdit}
    >
      <View style={styles.productTopRow}>
        <View style={styles.productTopCopy}>
          <InfoPill
            text={item.category || "General"}
            tone={lowStock ? "warning" : "info"}
            style={styles.productCategoryPill}
          />
          <Text style={styles.productName} numberOfLines={2}>
            {item.name.toUpperCase()}
          </Text>
        </View>
        <View style={styles.productActionsColumn}>
          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.cardPressed,
            ]}
            onPress={handleDelete}
          >
            <Ionicons name="close" size={rf(14)} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      <View style={styles.productMetaRow}>
        <View style={styles.metaBadge}>
          <Text style={styles.metaLabel}>Código</Text>
          <Text style={styles.metaValue}>
            {item.productNumber || `PRD-${String(item.id).padStart(6, "0")}`}
          </Text>
        </View>
        {!!item.barcode && (
          <View style={styles.metaBadge}>
            <Text style={styles.metaLabel}>Barcode</Text>
            <Text style={styles.metaValue}>{item.barcode}</Text>
          </View>
        )}
      </View>

      <View style={styles.priceRow}>
        <View style={styles.priceTag}>
          <Text style={styles.priceTagLabel}>VES</Text>
          <Text style={styles.priceTagValue}>{priceVES.toFixed(2)}</Text>
        </View>
        <View style={styles.priceTagSecondary}>
          <Text style={styles.priceTagSecondaryLabel}>USD</Text>
          <Text style={styles.priceTagSecondaryValue}>
            {priceUSD.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.productFooter}>
        <Text style={styles.productFootnote}>
          {lowStock
            ? `Atención: stock bajo${minStock ? `, mínimo ${minStock}` : ""}`
            : `${stock} unidad(es) disponibles para vender`}
        </Text>
        <Text style={[styles.productStock, lowStock && styles.productStockLow]}>
          Stock: {stock}
        </Text>
      </View>
    </Pressable>
  );
});

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

  const loadSettings = useCallback(async () => {
    try {
      const nextSettings = await getSettings();
      setSettings(nextSettings);
    } catch (error) {
      console.warn("Error cargando settings de productos:", error);
    }
  }, []);

  // Cargar settings al montar
  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const nextSettings = await getSettings();
        if (mounted) {
          setSettings(nextSettings);
        }
      } catch (error) {
        console.warn("Error cargando settings de productos:", error);
      }
    };
    run();

    return () => {
      mounted = false;
    };
  }, []);

  // Recargar productos y settings cuando la pantalla se enfoque
  useFocusEffect(
    useCallback(() => {
      loadProducts();
      loadSettings();
    }, [loadProducts, loadSettings]),
  );

  useEffect(() => {
    let mounted = true;
    let timeoutId;

    const maybeStartTour = async () => {
      if (tourBooted) return;
      if (!canStart) return;

      const tourId = "products";
      const seen = await hasSeenTour(tourId);
      if (!mounted) return;

      if (!seen) {
        // Pequeño delay para asegurar layout/render
        timeoutId = setTimeout(() => {
          start();
          markTourSeen(tourId);
        }, 450);
      }

      if (mounted) setTourBooted(true);
    };

    maybeStartTour();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [canStart, start, tourBooted]);

  const handleSearch = useCallback(
    (text) => {
      setSearchQuery(text);
      if (text.length > 0) {
        search(text);
      } else {
        loadProducts();
      }
    },
    [search, loadProducts],
  );

  const handleEditProduct = useCallback(
    (product) => {
      navigation.navigate("EditProduct", { product });
    },
    [navigation],
  );

  const handleDeleteProduct = useCallback(
    async (product) => {
      try {
        const [salesCount, inventoryCount] = await Promise.all([
          countSalesByProduct(product.id),
          countProductInventoryMovements(product.id),
        ]);

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
    },
    [removeProduct, showAlert],
  );

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const numA = parseInt((a.barcode || "").replace("PROD-", "")) || 0;
      const numB = parseInt((b.barcode || "").replace("PROD-", "")) || 0;
      return numA - numB;
    });
  }, [products]);

  const appliedRate = useMemo(() => {
    const rateFromSettings = settings?.pricing?.currencies?.USD;
    return exchangeRate || rateFromSettings || 0;
  }, [exchangeRate, settings]);

  const metrics = useMemo(() => {
    const totalProducts = products.length;
    const lowStockThreshold = 5;
    const lowStock = products.filter(
      (product) => (product.stock || 0) <= lowStockThreshold,
    ).length;

    return {
      totalProducts,
      lowStock,
      rateUsed: appliedRate,
    };
  }, [appliedRate, products]);

  const renderProduct = useCallback(
    ({ item }) => (
      <ProductCard
        item={item}
        appliedRate={appliedRate}
        onEdit={handleEditProduct}
        onDelete={handleDeleteProduct}
      />
    ),
    [appliedRate, handleDeleteProduct, handleEditProduct],
  );

  const header = useMemo(
    () => (
      <View style={styles.headerContent}>
        <SurfaceCard style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={[styles.heroBadge, styles.heroBadgeWarning]}>
              <Ionicons
                name="cube-outline"
                size={rf(22)}
                color={UI_COLORS.warning}
              />
            </View>
            <InfoPill
              text={
                metrics.lowStock > 0
                  ? `${metrics.lowStock} en alerta`
                  : "Inventario estable"
              }
              tone={metrics.lowStock > 0 ? "warning" : "accent"}
            />
          </View>

          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>Inventario</Text>
            <Text style={styles.heroTitle}>Catálogo de productos</Text>
            <Text style={styles.heroSubtitle}>
              Edita precios, revisa existencias y ubica productos sin perder el
              foco del inventario.
            </Text>
          </View>

          <View style={styles.heroPillRow}>
            <InfoPill
              text={`${metrics.totalProducts} productos`}
              tone="accent"
            />
            <InfoPill
              text={
                metrics.rateUsed
                  ? `Tasa ${metrics.rateUsed.toFixed(2)}`
                  : "Sin tasa"
              }
              tone="info"
            />
          </View>
        </SurfaceCard>

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
              <View style={styles.searchTitleBlock}>
                <Text style={styles.searchTitle}>Buscar producto</Text>
                <Text style={styles.searchHint}>
                  Filtra por nombre, categoría o referencia.
                </Text>
              </View>
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
    ),
    [TOUR_ZONE_BASE, TourGuideZone, handleSearch, metrics, searchQuery],
  );

  const openAddProduct = useCallback(() => {
    navigation.navigate("AddProduct");
  }, [navigation]);

  const productKeyExtractor = useCallback((item) => item.id.toString(), []);

  const emptyProducts = useMemo(
    () => (
      <EmptyStateCard
        title="Aún no hay productos"
        subtitle="Registra tu primer producto para visualizar métricas y control de inventario."
      />
    ),
    [],
  );

  return (
    <>
      <View style={styles.container}>
        <FlatList
          data={sortedProducts}
          renderItem={renderProduct}
          keyExtractor={productKeyExtractor}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: listPaddingBottom },
          ]}
          ListHeaderComponent={header}
          ListEmptyComponent={emptyProducts}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        <TourGuideZone
          zone={TOUR_ZONE_BASE + 2}
          text={"Presiona '+' para registrar un nuevo producto."}
          shape="circle"
        >
          <FloatingActionButton
            onPress={openAddProduct}
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
    gap: vs(16),
    marginBottom: vs(8),
  },
  heroCard: {
    gap: vs(14),
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: hs(12),
  },
  heroBadge: {
    width: s(48),
    height: s(48),
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadgeWarning: {
    backgroundColor: UI_COLORS.warningSoft,
  },
  heroCopy: {
    gap: vs(6),
  },
  heroEyebrow: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: s(0.8),
  },
  heroTitle: {
    fontSize: rf(20),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  heroSubtitle: {
    fontSize: rf(14),
    color: UI_COLORS.muted,
    lineHeight: vs(20),
  },
  heroPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: hs(10),
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: hs(12),
  },
  searchTitleBlock: {
    flex: 1,
    gap: vs(4),
  },
  searchTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  searchHint: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
    lineHeight: vs(18),
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
    backgroundColor: UI_COLORS.surface,
    borderRadius: borderRadius.lg,
    ...SHADOWS.soft,
    padding: spacing.md,
    gap: vs(12),
    marginBottom: vs(12),
  },
  productCardLowStock: {
    borderWidth: 1,
    borderColor: UI_COLORS.warningSoft,
    backgroundColor: "#fffdfa",
  },
  productTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: hs(12),
  },
  productTopCopy: {
    flex: 1,
    gap: vs(12),
  },
  productActionsColumn: {
    alignItems: "flex-end",
    gap: vs(8),
  },
  productCategoryPill: {
    alignSelf: "flex-start",
  },
  productMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: hs(12),
  },
  metaBadge: {
    minWidth: s(124),
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: hs(12),
    paddingVertical: vs(10),
    gap: vs(4),
  },
  metaLabel: {
    fontSize: rf(11),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: s(0.6),
  },
  metaValue: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  productName: {
    fontSize: rf(15),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: hs(12),
  },
  priceTag: {
    backgroundColor: UI_COLORS.accentSoft,
    borderRadius: borderRadius.sm,
    paddingHorizontal: hs(14),
    paddingVertical: vs(10),
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  priceTagLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.accentStrong,
    textTransform: "uppercase",
    letterSpacing: s(0.6),
  },
  priceTagValue: {
    fontSize: rf(20),
    fontWeight: "800",
    color: UI_COLORS.accent,
  },
  priceTagSecondary: {
    backgroundColor: UI_COLORS.infoSoft,
    borderRadius: borderRadius.sm,
    paddingHorizontal: hs(14),
    paddingVertical: vs(10),
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  priceTagSecondaryLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.info,
    textTransform: "uppercase",
    letterSpacing: s(0.6),
  },
  priceTagSecondaryValue: {
    fontSize: rf(18),
    fontWeight: "800",
    color: UI_COLORS.info,
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: hs(12),
  },
  productFootnote: {
    flex: 1,
    fontSize: rf(11),
    color: UI_COLORS.muted,
    lineHeight: vs(18),
  },
  productStock: {
    fontSize: rf(11),
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
    width: s(34),
    height: s(34),
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
