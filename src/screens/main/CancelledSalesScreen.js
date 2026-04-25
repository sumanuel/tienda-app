import React, { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useExchangeRateContext } from "../../contexts/ExchangeRateContext";
import { formatCurrency } from "../../utils/currency";
import { db } from "../../services/database/db";
import { s, rf, vs, spacing, borderRadius } from "../../utils/responsive";
import {
  EmptyStateCard,
  InfoPill,
  SurfaceCard,
  SHADOWS,
  UI_COLORS,
} from "../../components/common/AppUI";

/**
 * Pantalla de ventas anuladas
 */
export const CancelledSalesScreen = () => {
  const navigation = useNavigation();
  const { rate } = useExchangeRateContext();

  const [cancelledSales, setCancelledSales] = useState([]);
  const [loading, setLoading] = useState(true);

  const exchangeRate = Number(rate) || 0;

  const calculateTotal = (sale) => {
    if (sale?.paymentMethod === "por_cobrar" && exchangeRate > 0) {
      const totalUSD = Number(sale.totalUSD) || 0;
      if (totalUSD > 0) {
        return totalUSD * exchangeRate;
      }
    }
    return sale?.total || 0;
  };

  const getSaleDisplayNumber = (sale) =>
    sale?.saleNumber || `VTA-${String(sale?.id || 0).padStart(6, "0")}`;

  const loadCancelledSales = async () => {
    try {
      setLoading(true);
      const result = await db.getAllAsync(
        `SELECT s.*,
                (SELECT COUNT(*) FROM sale_items si WHERE si.saleId = s.id) as itemCount,
                (SELECT ROUND(SUM(si.quantity * COALESCE(si.priceUSD, 0)), 6) FROM sale_items si WHERE si.saleId = s.id) as totalUSD
         FROM sales s
         WHERE s.status = 'cancelled'
         ORDER BY s.createdAt DESC;`,
      );
      setCancelledSales(result);
    } catch (error) {
      console.error("Error loading cancelled sales:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCancelledSales();
  }, []);

  const getPaymentMethodText = (method) => {
    switch (method) {
      case "cash":
        return "Efectivo";
      case "card":
        return "Tarjeta";
      case "transfer":
        return "Transferencia";
      case "pago_movil":
        return "Pago Móvil";
      case "por_cobrar":
        return "Por cobrar";
      default:
        return method || "—";
    }
  };

  const renderSale = ({ item }) => (
    <Pressable
      style={({ pressed }) => [styles.saleCard, pressed && styles.cardPressed]}
      onPress={() => navigation.navigate("SaleDetail", { saleId: item.id })}
    >
      <View style={styles.saleHeader}>
        <View style={styles.saleInfo}>
          <View style={styles.salePillsRow}>
            <InfoPill text="Anulada" tone="danger" />
            <InfoPill text={`${item.itemCount || 0} items`} tone="neutral" />
          </View>
          <Text style={styles.saleNumber}>{getSaleDisplayNumber(item)}</Text>
          <Text style={styles.saleDate}>
            {new Date(item.createdAt).toLocaleDateString()} ·{" "}
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        <View style={styles.saleAmountBadge}>
          <Text style={styles.saleAmountText}>
            {formatCurrency(calculateTotal(item), "VES")}
          </Text>
        </View>
      </View>

      <View style={styles.saleMeta}>
        <View style={[styles.metaCard, styles.metaCardHalf]}>
          <Text style={styles.metaLabel}>Cliente</Text>
          <Text style={styles.metaValue} numberOfLines={1}>
            {item.notes ? item.notes.replace("Cliente: ", "") : "Sin nombre"}
          </Text>
        </View>

        <View style={[styles.metaCard, styles.metaCardHalf]}>
          <Text style={styles.metaLabel}>Pago</Text>
          <Text style={styles.metaValue}>
            {getPaymentMethodText(item.paymentMethod)}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={UI_COLORS.info} />
        <Text style={styles.loadingText}>Cargando ventas anuladas...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={cancelledSales}
        renderItem={renderSale}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <SurfaceCard style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <Ionicons
                    name="receipt-outline"
                    size={rf(22)}
                    color={UI_COLORS.danger}
                  />
                </View>
                <InfoPill
                  text={`${cancelledSales.length} anuladas`}
                  tone="danger"
                />
              </View>

              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>Historial</Text>
                <Text style={styles.heroTitle}>Ventas anuladas</Text>
                <Text style={styles.heroSubtitle}>
                  Consulta rápidamente facturas anuladas, cliente asociado y
                  método de pago.
                </Text>
              </View>
            </SurfaceCard>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <EmptyStateCard
              style={styles.emptyCard}
              title="No hay ventas anuladas"
              subtitle="Las ventas anuladas aparecerán aquí."
            />
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_COLORS.page,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: UI_COLORS.page,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: rf(16),
    color: UI_COLORS.muted,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: vs(100),
  },
  headerContent: {
    marginBottom: spacing.lg,
  },
  heroCard: {
    gap: vs(14),
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroBadge: {
    width: s(48),
    height: s(48),
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    backgroundColor: UI_COLORS.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: {
    gap: vs(6),
  },
  heroEyebrow: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
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
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: vs(60),
  },
  emptyCard: {
    width: "100%",
  },
  saleCard: {
    backgroundColor: UI_COLORS.surface,
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    padding: spacing.lg,
    marginBottom: spacing.sm,
    gap: vs(12),
    ...SHADOWS.soft,
  },
  saleHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  saleInfo: {
    flex: 1,
    gap: vs(6),
  },
  salePillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  saleNumber: {
    fontSize: rf(15),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  saleDate: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
  },
  saleAmountBadge: {
    backgroundColor: UI_COLORS.dangerSoft,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: spacing.md,
    paddingVertical: vs(10),
  },
  saleAmountText: {
    color: UI_COLORS.danger,
    fontWeight: "700",
    fontSize: rf(13),
  },
  saleMeta: {
    flexDirection: "row",
    gap: spacing.md,
  },
  metaCard: {
    flex: 1,
    gap: vs(4),
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: spacing.md,
    paddingVertical: vs(10),
  },
  metaCardHalf: {
    minWidth: 0,
  },
  metaLabel: {
    fontSize: rf(11),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  metaValue: {
    fontSize: rf(13),
    fontWeight: "600",
    color: UI_COLORS.text,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

export default CancelledSalesScreen;
