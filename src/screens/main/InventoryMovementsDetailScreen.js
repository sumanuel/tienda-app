import React, { useEffect, useState } from "react";
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
import { useTourGuideController } from "rn-tourguide";
import { useCustomAlert } from "../../components/common/CustomAlert";
import { FloatingActionButton, UI_COLORS } from "../../components/common/AppUI";
import {
  InventoryEmptyState,
  InventoryHero,
  InventoryMovementCard,
  InventoryProductSummaryCard,
} from "../../components/common/InventoryUI";
import {
  getProductByBarcode,
  getProductInventoryMovements,
} from "../../services/database/products";
import { hasSeenTour, markTourSeen } from "../../services/tour/tourStorage";
import {
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";

export const InventoryMovementsDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { canStart, start, TourGuideZone } = useTourGuideController(
    "inventoryMovementsDetail",
  );
  const TOUR_ZONE_BASE = 5100;
  const [tourBooted, setTourBooted] = useState(false);
  const { showAlert, CustomAlert } = useCustomAlert();
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
      const productMovements = await getProductInventoryMovements(
        updatedProduct.id,
      );
      setMovements(productMovements);
    } catch (err) {
      console.error("Error cargando movimientos de inventario:", err);
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

  useEffect(() => {
    let mounted = true;
    let timeoutId;

    const maybeStartTour = async () => {
      if (tourBooted) return;
      if (!canStart) return;

      const tourId = "inventoryDetail";
      const seen = await hasSeenTour(tourId);
      if (!mounted) return;

      if (!seen) {
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

  const handleFabPress = () => {
    if (!product) return;

    showAlert({
      title: "Nuevo movimiento",
      message: "¿Qué desea registrar?",
      type: "info",
      buttons: [
        {
          text: "Entrada",
          style: "success",
          onPress: () => navigation.navigate("AddInventoryEntry", { product }),
        },
        {
          text: "Salida",
          style: "destructive",
          onPress: () => navigation.navigate("AddInventoryExit", { product }),
        },
        { text: "Cancelar", style: "cancel" },
      ],
    });
  };

  const renderMovement = ({ item }) => {
    const isExit = String(item.type) === "exit";
    const movementDate = parseMovementDate(item.createdAt);

    return (
      <InventoryMovementCard
        movementNumber={
          item.movementNumber || `MOV-${String(item.id).padStart(6, "0")}`
        }
        dateLabel={`${movementDate.toLocaleDateString()} ${movementDate.toLocaleTimeString()}`}
        typeLabel={isExit ? "Salida" : "Entrada"}
        typeTone={isExit ? "danger" : "accent"}
        quantityLabel={`${isExit ? "-" : "+"}${item.quantity} unidades`}
        quantityTone={isExit ? "danger" : "accent"}
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
    <>
      <SafeAreaView style={styles.container}>
        <View style={styles.container}>
          <View style={styles.topContent}>
            <InventoryHero
              iconName="cube-outline"
              iconColor={UI_COLORS.warning}
              eyebrow="Inventario"
              title="Historial de movimientos"
              subtitle="Consulta entradas y salidas del producto seleccionado desde una sola vista más clara."
            />

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={UI_COLORS.warning} />
                <Text style={styles.loadingText}>Cargando movimientos...</Text>
              </View>
            ) : null}

            {product && !loading ? (
              <InventoryProductSummaryCard
                product={product}
                stockTone="warning"
              />
            ) : null}
          </View>

          <TourGuideZone
            zone={TOUR_ZONE_BASE + 1}
            text={
              "Aquí verás el historial de entradas y salidas, con su fecha y cómo cambió el stock."
            }
            borderRadius={borderRadius.lg}
            style={styles.listWrapper}
          >
            <FlatList
              data={movements}
              renderItem={renderMovement}
              keyExtractor={(item) => item.id.toString()}
              style={styles.list}
              ListEmptyComponent={renderEmpty}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: listPaddingBottom },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          </TourGuideZone>
        </View>

        {product ? (
          <TourGuideZone
            zone={TOUR_ZONE_BASE + 2}
            text="Registra una nueva entrada o salida de inventario."
            shape="circle"
          >
            <FloatingActionButton
              onPress={handleFabPress}
              bottom={fabBottom}
              iconName="add"
              style={styles.mixedFab}
            />
          </TourGuideZone>
        ) : null}
      </SafeAreaView>
      <CustomAlert />
    </>
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
  listWrapper: {
    flex: 1,
  },
  list: {
    flex: 1,
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
  mixedFab: {
    backgroundColor: UI_COLORS.warning,
  },
});

export default InventoryMovementsDetailScreen;
