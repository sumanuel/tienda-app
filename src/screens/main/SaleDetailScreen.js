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

/**
 * Pantalla de detalle de venta
 */
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
      <View style={[styles.detailItem, index !== 0 && styles.detailItemSpacing]}>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  headerContent: {
    gap: 18,
    marginBottom: 8,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#f3f8ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 18,
  },
  heroIconText: {
    fontSize: 30,
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2633",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#5b6472",
    lineHeight: 20,
  },
  saleCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    gap: 16,
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
    backgroundColor: "#f3f8ff",
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
    backgroundColor: "#2f5ae0",
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
  },
  metaBlock: {
    flex: 1,
    gap: 6,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8492a6",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f2633",
  },
  metaSeparator: {
    width: 1,
    height: 32,
    backgroundColor: "#e4e9f2",
  },
  productsCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2633",
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailItemSpacing: {
    marginTop: 12,
  },
  detailItemInfo: {
    flex: 1,
    gap: 6,
  },
  detailItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2633",
  },
  detailItemQuantity: {
    fontSize: 13,
    color: "#6f7c8c",
  },
  detailItemTotal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2633",
  },
  detailDivider: {
    height: 1,
    backgroundColor: "#e4e9f2",
    marginTop: 12,
  },
  emptyProducts: {
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyProductsText: {
    fontSize: 13,
    color: "#6f7c8c",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#e8edf2",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4c5767",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#d6455d",
    textAlign: "center",
  },
});

export default SaleDetailScreen;
