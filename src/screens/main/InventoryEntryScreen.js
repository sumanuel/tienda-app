import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  FlatList,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useProducts } from "../../hooks/useProducts";
import { UI_COLORS } from "../../components/common/AppUI";
import {
  InventoryEmptyState,
  InventoryHero,
  InventoryProductCard,
  InventorySearchCard,
} from "../../components/common/InventoryUI";
import { rf, vs, hs, spacing, iconSize } from "../../utils/responsive";

export const InventoryEntryScreen = ({ navigation }) => {
  const {
    products,
    loading: productsLoading,
    error: productsError,
    loadProducts,
  } = useProducts();

  const [searchQuery, setSearchQuery] = useState("");

  const handleSelectProduct = (selectedProduct) => {
    navigation.navigate("InventoryEntryDetail", { product: selectedProduct });
  };

  // Refrescar producto cuando se regrese de agregar entrada
  useFocusEffect(
    React.useCallback(() => {
      loadProducts();
    }, [loadProducts]),
  );

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;

    return products.filter((p) => {
      const nameMatch = (p.name || "").toLowerCase().includes(query);
      const barcodeMatch = (p.barcode || "").toLowerCase().includes(query);
      const categoryMatch = (p.category || "").toLowerCase().includes(query);
      return nameMatch || barcodeMatch || categoryMatch;
    });
  }, [products, searchQuery]);

  const renderProductOption = ({ item }) => (
    <InventoryProductCard
      item={item}
      onPress={() => handleSelectProduct(item)}
    />
  );

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
            iconName="arrow-down-circle-outline"
            iconColor={UI_COLORS.accent}
            eyebrow="Inventario"
            title="Entrada de inventario"
            subtitle="Filtra productos y revisa sus movimientos de entrada con una lectura más clara."
          />

          <InventorySearchCard
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar por nombre, categoría o código"
            error={productsError}
          />

          {productsLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={UI_COLORS.accent} />
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
    paddingBottom: vs(80), // Espacio para el FAB
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

export default InventoryEntryScreen;
