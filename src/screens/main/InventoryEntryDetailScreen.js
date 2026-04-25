import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FloatingActionButton, UI_COLORS } from "../../components/common/AppUI";
import {
  InventoryEmptyState,
  InventoryHero,
  InventoryMovementCard,
  InventoryProductSummaryCard,
} from "../../components/common/InventoryUI";
import {
  getProductByBarcode,
  getProductEntryMovements,
} from "../../services/database/products";
import { rf, vs, hs, spacing, iconSize } from "../../utils/responsive";

export const InventoryEntryDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState(route.params?.product || null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const parseMovementDate = (createdAt) => {
    if (!createdAt) return new Date();

    if (createdAt instanceof Date) {
      return createdAt;
    }

    if (typeof createdAt === "number") {
      return new Date(createdAt);
    }

    const asString = String(createdAt);

    if (asString.includes("T")) {
      const parsed = new Date(asString);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    if (asString.includes(" ")) {
      const normalized = `${asString.replace(" ", "T")}Z`;
      const parsed = new Date(normalized);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }

    const fallback = new Date(asString);
    return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
  };

  const fabBottom = vs(24) + Math.max(insets.bottom, vs(24));
  const listPaddingBottom = iconSize.xl + fabBottom + vs(24);

  const loadData = async (barcode) => {
    if (!barcode) return;

    try {
      setLoading(true);
      setError(null);

      const updatedProduct = await getProductByBarcode(barcode);
      if (!updatedProduct) {
        setProduct(null);
        setMovements([]);
        setError("Producto no encontrado");
        return;
      }

      setProduct(updatedProduct);
      const productMovements = await getProductEntryMovements(
        updatedProduct.id,
      );
      setMovements(productMovements);
    } catch (err) {
      console.error("Error cargando detalle de entrada:", err);
      setMovements([]);
      setError("Error al cargar los movimientos");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData(product?.barcode);
    }, [product?.barcode]),
  );

  const handleAddEntry = () => {
    if (product) {
      navigation.navigate("AddInventoryEntry", { product });
    }
  };

  const renderMovement = ({ item }) => {
    const movementDate = parseMovementDate(item.createdAt);

    return (
      <InventoryMovementCard
        movementNumber={
          item.movementNumber || `MOV-${String(item.id).padStart(6, "0")}`
        }
        dateLabel={`${movementDate.toLocaleDateString()} ${movementDate.toLocaleTimeString()}`}
        typeLabel="Entrada"
        typeTone="accent"
        quantityLabel={`+${item.quantity} unidades`}
        quantityTone="accent"
        stockLabel={`Stock: ${item.previousStock} → ${item.newStock}`}
        notes={item.notes}
      />
    );
  };

  const renderEmpty = () => {
    if (!product || loading) return null;

    return (
      <InventoryEmptyState
        title="Sin movimientos registrados"
        subtitle={`El inventario actual (${product.stock} unidades) se considera como registro inicial.`}
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
            title="Detalle de entradas"
            subtitle="Revisa los movimientos de entrada del producto seleccionado sin perder el contexto del stock actual."
          />

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={UI_COLORS.accent} />
              <Text style={styles.loadingText}>Cargando movimientos...</Text>
            </View>
          ) : null}

          {product && !loading ? (
            <InventoryProductSummaryCard product={product} stockTone="accent" />
          ) : null}
        </View>

        <FlatList
          data={movements}
          renderItem={renderMovement}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: listPaddingBottom },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </View>

      {product ? (
        <FloatingActionButton
          onPress={handleAddEntry}
          bottom={fabBottom}
          iconName="add"
        />
      ) : null}
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
    paddingBottom: vs(80),
  },
  errorText: {
    color: UI_COLORS.danger,
    fontSize: rf(14),
    textAlign: "center",
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

export default InventoryEntryDetailScreen;
