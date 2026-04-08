import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTourGuideController } from "rn-tourguide";
import { useProducts } from "../../hooks/useProducts";
import { hasSeenTour, markTourSeen } from "../../services/tour/tourStorage";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";

const parseProductOrderValue = (product) => {
  const productNumber = String(product?.productNumber || "").trim();
  const productNumberMatch = productNumber.match(/(\d+)$/);
  if (productNumberMatch) {
    return Number(productNumberMatch[1]) || 0;
  }

  const barcode = String(product?.barcode || "").trim();
  const barcodeMatch = barcode.match(/(\d+)$/);
  if (barcodeMatch) {
    return Number(barcodeMatch[1]) || 0;
  }

  return Number(product?.id) || 0;
};

export const InventoryMovementsScreen = ({ navigation }) => {
  const { canStart, start, TourGuideZone } =
    useTourGuideController("inventoryMovements");
  const TOUR_ZONE_BASE = 5000;
  const [tourBooted, setTourBooted] = useState(false);
  const {
    products,
    loading: productsLoading,
    error: productsError,
    loadProducts,
  } = useProducts();

  const [searchQuery, setSearchQuery] = useState("");

  const handleSelectProduct = (selectedProduct) => {
    navigation.navigate("InventoryMovementsDetail", {
      product: selectedProduct,
    });
  };

  useFocusEffect(
    React.useCallback(() => {
      loadProducts();
    }, [loadProducts]),
  );

  useEffect(() => {
    let mounted = true;

    const maybeStartTour = async () => {
      if (tourBooted) return;
      if (!canStart) return;

      const tourId = "inventory";
      const seen = await hasSeenTour(tourId);
      if (!mounted) return;

      if (!seen) {
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

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = !query
      ? products
      : products.filter((p) => {
          const nameMatch = (p.name || "").toLowerCase().includes(query);
          const barcodeMatch = (p.barcode || "").toLowerCase().includes(query);
          const productNumberMatch = (p.productNumber || "")
            .toLowerCase()
            .includes(query);
          const categoryMatch = (p.category || "")
            .toLowerCase()
            .includes(query);
          return (
            nameMatch || barcodeMatch || productNumberMatch || categoryMatch
          );
        });

    return [...filtered].sort((a, b) => {
      const codeDiff = parseProductOrderValue(a) - parseProductOrderValue(b);
      if (codeDiff !== 0) return codeDiff;
      return String(a.name || "").localeCompare(String(b.name || ""), "es", {
        sensitivity: "base",
      });
    });
  }, [products, searchQuery]);

  const renderProductOption = ({ item, index }) => {
    const card = (
      <TouchableOpacity
        style={styles.productOptionCard}
        activeOpacity={0.85}
        onPress={() => handleSelectProduct(item)}
      >
        <View style={styles.productOptionRow}>
          <Text style={styles.productOptionName} numberOfLines={1}>
            {String(item.name || "").toUpperCase()}
          </Text>
          <Text style={styles.productOptionStock}>{item.stock} u.</Text>
        </View>
        <Text style={styles.productOptionCode} numberOfLines={1}>
          Código:{" "}
          {item.productNumber || `PRD-${String(item.id).padStart(6, "0")}`}
        </Text>
        {!!item.barcode && (
          <Text style={styles.productOptionCategory} numberOfLines={1}>
            Barcode: {item.barcode}
          </Text>
        )}
        {!!item.category && (
          <Text style={styles.productOptionCategory} numberOfLines={1}>
            {item.category}
          </Text>
        )}
      </TouchableOpacity>
    );

    if (index !== 0) return card;

    return (
      <TourGuideZone
        zone={TOUR_ZONE_BASE + 2}
        text={"Presiona un producto para ver su historial de movimientos."}
        borderRadius={borderRadius.lg}
      >
        {card}
      </TourGuideZone>
    );
  };

  const renderEmptyProducts = () => {
    if (productsLoading) return null;

    if (!searchQuery.trim()) {
      return (
        <View style={styles.emptyMovements}>
          <Ionicons name="search-outline" size={iconSize.xxl} color="#8ca0b8" />
          <Text style={styles.emptyTitle}>Busca un producto</Text>
          <Text style={styles.emptySubtitle}>
            Escribe el nombre, categoría o código para mostrar resultados.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyMovements}>
        <Ionicons name="cube-outline" size={iconSize.xxl} color="#8ca0b8" />
        <Text style={styles.emptyTitle}>Sin resultados</Text>
        <Text style={styles.emptySubtitle}>
          Intenta con otra búsqueda o limpia el filtro.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topContent}>
        <View style={styles.headerContent}>
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="cube-outline"
                size={iconSize.xl}
                color="#c9861a"
              />
            </View>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>Movimientos de inventario</Text>
              <Text style={styles.heroSubtitle}>
                Filtra productos y revisa entradas y salidas.
              </Text>
            </View>
          </View>
        </View>

        <TourGuideZone
          zone={TOUR_ZONE_BASE + 1}
          text={
            "En 'Buscar por nombre, categoría o código' filtra el producto para revisar sus entradas y salidas."
          }
          borderRadius={borderRadius.lg}
          style={styles.searchCard}
        >
          <View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Buscar por nombre, categoría o código"
                placeholderTextColor="#9aa6b5"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="done"
                autoCapitalize="none"
              />
            </View>
            {!!productsError && (
              <Text style={styles.errorText}>{productsError}</Text>
            )}
          </View>
        </TourGuideZone>

        {productsLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Cargando productos...</Text>
          </View>
        )}
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProductOption}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={renderEmptyProducts}
        contentContainerStyle={[styles.listContent]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8edf2",
  },
  topContent: {
    paddingHorizontal: hs(spacing.md),
    paddingTop: vs(spacing.md),
  },
  listContent: {
    paddingHorizontal: hs(spacing.md),
    paddingTop: vs(spacing.xs),
    paddingBottom: vs(24),
  },
  searchCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: s(spacing.md),
    marginBottom: vs(spacing.sm),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#f3f5fa",
    borderRadius: borderRadius.md,
    paddingVertical: vs(spacing.sm),
    paddingHorizontal: hs(spacing.md),
    fontSize: rf(13),
    color: "#1f2633",
  },
  productOptionCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.md,
    padding: s(spacing.md),
    marginBottom: vs(spacing.md),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  productOptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: hs(spacing.sm),
    marginBottom: vs(spacing.xs),
  },
  productOptionName: {
    flex: 1,
    fontSize: rf(14),
    fontWeight: "600",
    color: "#2f3a4c",
  },
  productOptionStock: {
    fontSize: rf(13),
    fontWeight: "700",
    color: "#4CAF50",
  },
  productOptionCode: {
    fontSize: rf(12),
    color: "#6c7a8a",
  },
  productOptionCategory: {
    fontSize: rf(12),
    color: "#5b6472",
    marginTop: vs(spacing.xs),
  },
  errorText: {
    color: "#c62828",
    fontSize: rf(14),
    marginTop: vs(spacing.xs),
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: vs(spacing.lg),
  },
  loadingText: {
    marginTop: vs(spacing.md),
    fontSize: rf(15),
    color: "#6c7a8a",
  },
  emptyMovements: {
    alignItems: "center",
    paddingVertical: vs(32),
    backgroundColor: "#f8f9fa",
    borderRadius: borderRadius.md,
  },
  emptyEmoji: {
    fontSize: rf(32),
    marginBottom: vs(spacing.md),
  },
  emptyTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#2f3a4c",
    marginBottom: vs(spacing.xs),
  },
  emptySubtitle: {
    fontSize: rf(14),
    color: "#6c7a8a",
    textAlign: "center",
    lineHeight: rf(20),
    paddingHorizontal: hs(spacing.md),
  },
  headerContent: {
    gap: s(spacing.md),
    marginBottom: vs(spacing.xs),
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: s(spacing.md),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
  },
  heroIcon: {
    width: s(50),
    height: s(50),
    borderRadius: borderRadius.md,
    backgroundColor: "#f3f8ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: hs(spacing.md),
  },
  heroIconText: {
    fontSize: rf(24),
  },
  heroTextContainer: {
    flex: 1,
    gap: s(spacing.xs),
  },
  heroTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: "#1f2633",
  },
  heroSubtitle: {
    fontSize: rf(13),
    color: "#5b6472",
    lineHeight: rf(18),
  },
});

export default InventoryMovementsScreen;
