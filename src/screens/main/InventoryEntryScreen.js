import React, { useMemo, useState } from "react";
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
import { useProducts } from "../../hooks/useProducts";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";

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
    <TouchableOpacity
      style={styles.productOptionCard}
      activeOpacity={0.85}
      onPress={() => handleSelectProduct(item)}
    >
      <View style={styles.productOptionRow}>
        <Text style={styles.productOptionName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.productOptionStock}>{item.stock} u.</Text>
      </View>
      <Text style={styles.productOptionCode} numberOfLines={1}>
        Código: {item.barcode || "—"}
      </Text>
      {!!item.category && (
        <Text style={styles.productOptionCategory} numberOfLines={1}>
          {item.category}
        </Text>
      )}
    </TouchableOpacity>
  );

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
    <>
      <View style={styles.container}>
        <View style={styles.topContent}>
          <View style={styles.headerContent}>
            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Text style={styles.heroIconText}>📥</Text>
              </View>
              <View style={styles.heroTextContainer}>
                <Text style={styles.heroTitle}>Entrada de Inventario</Text>
                <Text style={styles.heroSubtitle}>
                  Filtra productos y revisa sus movimientos de entrada.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.searchCard}>
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
    </>
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
    paddingBottom: vs(80), // Espacio para el FAB
  },
  header: {
    marginBottom: vs(spacing.lg),
  },
  title: {
    fontSize: rf(24),
    fontWeight: "700",
    color: "#2f3a4c",
    marginBottom: vs(spacing.xs),
  },
  subtitle: {
    fontSize: rf(16),
    color: "#6c7a8a",
    lineHeight: rf(22),
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
    marginRight: hs(spacing.md),
  },
  iconButton: {
    width: s(40),
    height: s(40),
    borderRadius: borderRadius.md,
    backgroundColor: "#ecf4ef",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: hs(spacing.xs),
  },
  iconText: {
    fontSize: rf(16),
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
    paddingVertical: vs(spacing.lg), // Reducido de 40 a 20 para menos separación
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

export default InventoryEntryScreen;
