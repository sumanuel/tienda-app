import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useExchangeRateContext } from "../../contexts/ExchangeRateContext";
import { formatCurrency } from "../../utils/currency";
import { db } from "../../services/database/db";

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

  const loadCancelledSales = async () => {
    try {
      setLoading(true);
      const result = await db.getAllAsync(
        `SELECT s.*,
                (SELECT COUNT(*) FROM sale_items si WHERE si.saleId = s.id) as itemCount,
                (SELECT ROUND(SUM(si.quantity * COALESCE(si.priceUSD, 0)), 6) FROM sale_items si WHERE si.saleId = s.id) as totalUSD
         FROM sales s
         WHERE s.status = 'cancelled'
         ORDER BY s.createdAt DESC;`
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
    <TouchableOpacity
      style={styles.saleCard}
      onPress={() => navigation.navigate("SaleDetail", { saleId: item.id })}
      activeOpacity={0.85}
    >
      <View style={styles.saleHeader}>
        <View style={styles.saleIcon}>
          <Text style={styles.saleIconText}>🚫</Text>
        </View>
        <View style={styles.saleInfo}>
          <Text style={styles.saleNumber}>Venta #{item.id} (Anulada)</Text>
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
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>Cliente</Text>
          <Text style={styles.metaValue} numberOfLines={1}>
            {item.notes ? item.notes.replace("Cliente: ", "") : "Sin nombre"}
          </Text>
        </View>
        <View style={styles.metaSeparator} />
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>Pago</Text>
          <Text style={styles.metaValue}>
            {getPaymentMethodText(item.paymentMethod)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f5ae0" />
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
            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Text style={styles.heroIconText}>🚫</Text>
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>
                  Ventas Anuladas ({cancelledSales.length})
                </Text>
                <Text style={styles.heroSubtitle}>
                  Historial de facturas que han sido anuladas.
                </Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyTitle}>No hay ventas anuladas</Text>
              <Text style={styles.emptySubtitle}>
                Las ventas anuladas aparecerán aquí.
              </Text>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8edf2",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#e8edf2",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6f7c8c",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerContent: {
    marginBottom: 20,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#f3f8ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  heroIconText: {
    fontSize: 28,
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2633",
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#6f7c8c",
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2633",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6f7c8c",
    textAlign: "center",
    lineHeight: 20,
  },
  saleCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  saleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  saleIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  saleIconText: {
    fontSize: 24,
  },
  saleInfo: {
    flex: 1,
    gap: 4,
  },
  saleNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2633",
  },
  saleDate: {
    fontSize: 12,
    color: "#6f7c8c",
  },
  saleAmountBadge: {
    backgroundColor: "#dc2626",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  saleAmountText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  saleMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 12,
  },
  metaBlock: {
    flex: 1,
    gap: 6,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8492a6",
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2633",
  },
  metaSeparator: {
    width: 1,
    height: 20,
    backgroundColor: "#e4e9f2",
  },
});

export default CancelledSalesScreen;
