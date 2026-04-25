import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTourGuideController } from "rn-tourguide";
import { useProducts } from "../../hooks/useProducts";
import { hasSeenTour, markTourSeen } from "../../services/tour/tourStorage";
import { UI_COLORS } from "../../components/common/AppUI";
import {
  InventoryEmptyState,
  InventoryHero,
  InventoryProductCard,
  InventorySearchCard,
} from "../../components/common/InventoryUI";
import { rf, vs, hs, spacing, borderRadius } from "../../utils/responsive";

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
      <InventoryProductCard
        item={item}
        onPress={() => handleSelectProduct(item)}
        stockTone="warning"
      />
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
        <InventoryEmptyState
          title="Busca un producto"
          subtitle="Escribe el nombre, categoría o código para mostrar resultados."
        />
      );
    }

    return (
      <InventoryEmptyState
        title="Sin resultados"
        subtitle="Intenta con otra búsqueda o limpia el filtro."
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <View style={styles.topContent}>
          <InventoryHero
            iconName="cube-outline"
            iconColor={UI_COLORS.warning}
            eyebrow="Inventario"
            title="Movimientos de inventario"
            subtitle="Filtra productos y revisa entradas y salidas desde una vista más ordenada."
          />

          <TourGuideZone
            zone={TOUR_ZONE_BASE + 1}
            text={
              "En 'Buscar por nombre, categoría o código' filtra el producto para revisar sus entradas y salidas."
            }
            borderRadius={borderRadius.lg}
          >
            <InventorySearchCard
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar por nombre, categoría o código"
              error={productsError}
            />
          </TourGuideZone>

          {productsLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={UI_COLORS.warning} />
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_COLORS.page,
  },
  topContent: {
    paddingHorizontal: hs(spacing.md),
    paddingTop: vs(spacing.md),
    gap: spacing.md,
  },
  listContent: {
    paddingHorizontal: hs(spacing.md),
    paddingTop: vs(spacing.md),
    paddingBottom: vs(24),
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: vs(spacing.lg),
  },
  loadingText: {
    marginTop: vs(spacing.md),
    fontSize: rf(15),
    color: UI_COLORS.muted,
  },
});

export default InventoryMovementsScreen;
