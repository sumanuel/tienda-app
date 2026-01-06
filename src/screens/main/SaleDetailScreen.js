import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSales } from "../../hooks/useSales";
import { useExchangeRateContext } from "../../contexts/ExchangeRateContext";
import { formatCurrency } from "../../utils/currency";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";
export const SaleDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { saleId } = route.params;
  const { getSaleDetails } = useSales();

  const { rate } = useExchangeRateContext();

  const exchangeRate = Number(rate) || 0;

  const calculateTotal = (saleData) => {
    if (saleData?.paymentMethod === "por_cobrar" && exchangeRate > 0) {
      const items = saleData?.items || [];
      const totalUSD = items.reduce(
        (sum, item) =>
          sum + (Number(item.priceUSD) || 0) * (Number(item.quantity) || 0),
        0
      );

      if (totalUSD > 0) {
        return totalUSD * exchangeRate;
      }
    }

    return saleData?.total || 0;
  };

  const [sale, setSale] = useState(null);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSaleDetails();
  }, [saleId]);

  const loadSaleDetails = async () => {
    try {
      setLoading(true);
      const saleData = await getSaleDetails(saleId);
      setSale(saleData);
      setDetails(saleData);
    } catch (error) {
      console.error("Error loading sale details:", error);
      // Handle error, maybe navigate back
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

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
        return "Por Cobrar";
      default:
        return method || "—";
    }
  };

  const renderDetailItem = ({ item, index }) => {
    const quantity = Number(item.quantity) || 0;
    const priceUSD = Number(item.priceUSD) || 0;

    const shouldRecalc =
      sale?.paymentMethod === "por_cobrar" && exchangeRate > 0 && priceUSD > 0;

    const displayPriceVES = shouldRecalc
      ? priceUSD * exchangeRate
      : Number(item.price) || 0;

    const displaySubtotalVES = shouldRecalc
      ? quantity * displayPriceVES
      : Number(item.subtotal) || quantity * displayPriceVES;

    return (
      <View
        style={[styles.detailItem, index !== 0 && styles.detailItemSpacing]}
      >
        <View style={styles.detailItemInfo}>
          <Text style={styles.detailItemName}>{item.productName}</Text>
          <Text style={styles.detailItemQuantity}>
            {quantity} × {formatCurrency(displayPriceVES, "VES")}
            {priceUSD > 0 ? ` (${formatCurrency(priceUSD, "USD")})` : ""}
          </Text>
        </View>
        <Text style={styles.detailItemTotal}>
          {formatCurrency(displaySubtotalVES, "VES")}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando detalles de la venta...</Text>
      </SafeAreaView>
    );
  }

  if (!sale) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se pudo cargar la venta</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Text style={styles.heroIconText}>🧾</Text>
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>
                  Detalle de venta #{sale.id}
                </Text>
                <Text style={styles.heroSubtitle}>
                  Revisa los productos, cliente y método de pago de esta venta.
                </Text>
              </View>
            </View>

            <View style={styles.saleCard}>
              <View style={styles.saleHeader}>
                <View style={styles.saleIcon}>
                  <Text style={styles.saleIconText}>🧾</Text>
                </View>
                <View style={styles.saleInfo}>
                  <Text style={styles.saleNumber}>Venta #{sale.id}</Text>
                  <Text style={styles.saleDate}>
                    {new Date(sale.createdAt).toLocaleDateString("es-VE")} ·{" "}
                    {new Date(sale.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
                <View style={styles.saleAmountBadge}>
                  <Text style={styles.saleAmountText}>
                    {formatCurrency(calculateTotal(sale), "VES")}
                  </Text>
                </View>
              </View>

              <View style={styles.saleMeta}>
                <View style={styles.metaBlock}>
                  <Text style={styles.metaLabel}>Cliente</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {sale.notes
                      ? sale.notes.replace("Cliente: ", "")
                      : "Sin nombre"}
                  </Text>
                </View>
                <View style={styles.metaSeparator} />
                <View style={styles.metaBlock}>
                  <Text style={styles.metaLabel}>Pago</Text>
                  <Text style={styles.metaValue}>
                    {getPaymentMethodText(sale.paymentMethod)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.productsCard}>
              <Text style={styles.cardTitle}>Productos vendidos</Text>
              <FlatList
                data={details?.items || []}
                renderItem={renderDetailItem}
                keyExtractor={(_, index) => `detail-${index}`}
                ItemSeparatorComponent={() => (
                  <View style={styles.detailDivider} />
                )}
                ListEmptyComponent={
                  <View style={styles.emptyProducts}>
                    <Text style={styles.emptyProductsText}>
                      No se encontraron productos para esta venta.
                    </Text>
                  </View>
                }
                scrollEnabled={false}
              />
            </View>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8edf2",
  },
  listContent: {
    paddingHorizontal: s(16),
    paddingTop: s(16),
    paddingBottom: s(110),
  },
  headerContent: {
    gap: s(18),
    marginBottom: s(8),
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: s(22),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(10) },
    shadowOpacity: 0.08,
    shadowRadius: s(18),
    elevation: 8,
  },
  heroIcon: {
    width: s(60),
    height: s(60),
    borderRadius: borderRadius.lg,
    backgroundColor: "#f3f8ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: s(18),
  },
  heroIconText: {
    fontSize: rf(30),
  },
  heroCopy: {
    flex: 1,
    gap: s(6),
  },
  heroTitle: {
    fontSize: rf(20),
    fontWeight: "700",
    color: "#1f2633",
  },
  heroSubtitle: {
    fontSize: rf(14),
    color: "#5b6472",
    lineHeight: rf(20),
  },
  saleCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: s(18),
    gap: s(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.05,
    shadowRadius: s(10),
    elevation: 4,
  },
  saleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(14),
  },
  saleIcon: {
    width: s(46),
    height: s(46),
    borderRadius: s(14),
    backgroundColor: "#f3f8ff",
    alignItems: "center",
    justifyContent: "center",
  },
  saleIconText: {
    fontSize: rf(24),
  },
  saleInfo: {
    flex: 1,
    gap: s(4),
  },
  saleNumber: {
    fontSize: rf(16),
    fontWeight: "700",
    color: "#1f2633",
  },
  saleDate: {
    fontSize: rf(12),
    color: "#6f7c8c",
  },
  saleAmountBadge: {
    backgroundColor: "#2f5ae0",
    borderRadius: s(12),
    paddingHorizontal: s(14),
    paddingVertical: s(8),
  },
  saleAmountText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: rf(13),
  },
  saleMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(16),
  },
  metaBlock: {
    flex: 1,
    gap: s(6),
  },
  metaLabel: {
    fontSize: rf(11),
    fontWeight: "600",
    color: "#8492a6",
    textTransform: "uppercase",
    letterSpacing: rf(0.6),
  },
  metaValue: {
    fontSize: rf(13),
    fontWeight: "600",
    color: "#1f2633",
  },
  metaSeparator: {
    width: 1,
    height: s(32),
    backgroundColor: "#e4e9f2",
  },
  productsCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: s(22),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.05,
    shadowRadius: s(12),
    elevation: 5,
  },
  cardTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: "#1f2633",
    marginBottom: s(16),
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailItemSpacing: {
    marginTop: s(12),
  },
  detailItemInfo: {
    flex: 1,
    gap: s(6),
  },
  detailItemName: {
    fontSize: rf(15),
    fontWeight: "600",
    color: "#1f2633",
  },
  detailItemQuantity: {
    fontSize: rf(13),
    color: "#6f7c8c",
  },
  detailItemTotal: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#1f2633",
  },
  detailDivider: {
    height: 1,
    backgroundColor: "#e4e9f2",
    marginTop: s(12),
  },
  emptyProducts: {
    paddingVertical: s(30),
    alignItems: "center",
  },
  emptyProductsText: {
    fontSize: rf(13),
    color: "#6f7c8c",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#e8edf2",
    alignItems: "center",
    justifyContent: "center",
    gap: s(16),
  },
  loadingText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "#4c5767",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: s(20),
  },
  errorText: {
    fontSize: rf(16),
    color: "#d6455d",
    textAlign: "center",
  },
});

export default SaleDetailScreen;
