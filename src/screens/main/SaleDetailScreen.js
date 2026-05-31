import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOptionalBottomTabBarHeight } from "../../hooks/useOptionalBottomTabBarHeight";
import { useSales } from "../../hooks/useSales";
import { useExchangeRateContext } from "../../contexts/ExchangeRateContext";
import {
  formatCurrency,
  resolveSaleItemPricing,
  resolveSaleMonetaryTotals,
} from "../../utils/currency";
import { openWhatsApp, isValidWhatsAppPhone } from "../../utils/whatsapp";
import { buildSaleInvoiceWhatsAppMessage } from "../../utils/whatsappMessages";
import { getCustomerById } from "../../services/database/customers";
import { useCustomAlert } from "../../components/common/CustomAlert";
import {
  EmptyStateCard,
  FloatingActionButton,
  InfoPill,
  ScreenHero,
  SurfaceCard,
  UI_COLORS,
  SHADOWS,
} from "../../components/common/AppUI";
import {
  rf,
  vs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";
export const SaleDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { saleId } = route.params;
  const { getSaleDetails } = useSales();

  const insets = useSafeAreaInsets();
  const tabBarHeight = useOptionalBottomTabBarHeight();
  const fabBottom = Math.max(tabBarHeight, insets.bottom) + vs(16);
  const listPaddingBottom = iconSize.xl + fabBottom + vs(24);
  const { showAlert, CustomAlert } = useCustomAlert();

  const { rate, localCurrency, referenceCurrency, rateEnabled } =
    useExchangeRateContext();

  const exchangeRate = Number(rate) || 0;

  const getSaleDisplayNumber = (saleData) =>
    saleData?.saleNumber ||
    `VTA-${String(saleData?.id || saleId || 0).padStart(6, "0")}`;

  const calculateTotal = (saleData) => {
    const totals = resolveSaleMonetaryTotals(saleData, {
      exchangeRate,
      localCurrency,
      referenceCurrency,
      rateEnabled,
    });
    const persistedTotal = Number(totals.totalLocal) || 0;

    if (persistedTotal > 0) {
      return persistedTotal;
    }

    return (saleData?.items || []).reduce(
      (sum, item) =>
        sum +
        resolveSaleItemPricing(item, {
          exchangeRate,
          localCurrency,
          referenceCurrency,
          rateEnabled,
        }).subtotalLocal,
      0,
    );
  };

  const [sale, setSale] = useState(null);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);

  useEffect(() => {
    loadSaleDetails();
  }, [saleId]);

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        const customerId = sale?.customerId;
        if (!customerId) {
          setCustomer(null);
          return;
        }
        const found = await getCustomerById(customerId);
        setCustomer(found);
      } catch (error) {
        console.warn("Error loading customer for sale:", error);
        setCustomer(null);
      }
    };

    loadCustomer();
  }, [sale?.customerId]);

  const loadSaleDetails = async () => {
    try {
      setLoading(true);
      const saleData = await getSaleDetails(saleId);
      setSale(saleData);
      setDetails(saleData);
    } catch (error) {
      console.error("Error loading sale details:", error);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const buildWhatsAppInvoiceText = () => {
    const customerName =
      customer?.name ||
      (sale?.notes ? sale.notes.replace("Cliente: ", "") : "Cliente");

    const items = details?.items || [];
    const lines = items.map((it) => {
      const quantity = Number(it.quantity) || 0;
      const pricing = resolveSaleItemPricing(it, {
        exchangeRate,
        localCurrency,
        referenceCurrency,
        rateEnabled,
      });
      const displayLocalPrice = pricing.localPrice;
      return {
        productName: it.productName,
        quantity,
        subtotalVES: quantity * displayLocalPrice,
      };
    });

    const totalUSDNumber = resolveSaleMonetaryTotals(details || sale, {
      exchangeRate,
      localCurrency,
      referenceCurrency,
      rateEnabled,
    }).totalReference;

    return buildSaleInvoiceWhatsAppMessage({
      saleNumber: getSaleDisplayNumber(sale),
      createdAt: sale?.createdAt,
      customerName,
      items: lines,
      totalVES: calculateTotal(sale),
      totalUSD: totalUSDNumber,
    });
  };

  const handleSendWhatsAppInvoice = async () => {
    try {
      const phone = customer?.phone;
      const text = buildWhatsAppInvoiceText();
      await openWhatsApp({ phone, text });
    } catch (error) {
      console.error("Error sending WhatsApp invoice:", error);
      showAlert({
        title: "No se pudo enviar",
        message: error?.message || "No se pudo abrir WhatsApp",
        type: "error",
      });
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
    const pricing = resolveSaleItemPricing(item, {
      exchangeRate,
      localCurrency,
      referenceCurrency,
      rateEnabled,
    });
    const priceUSD = pricing.referencePrice;
    const displayLocalPrice = pricing.localPrice;
    const displaySubtotalLocal =
      Number(item.subtotal) ||
      pricing.subtotalLocal ||
      quantity * displayLocalPrice;

    return (
      <View
        style={[styles.detailItem, index !== 0 && styles.detailItemSpacing]}
      >
        <View style={styles.detailItemInfo}>
          <Text style={styles.detailItemName}>{item.productName}</Text>
          <Text style={styles.detailItemQuantity}>
            {quantity} × {formatCurrency(displayLocalPrice, localCurrency)}
            {rateEnabled && priceUSD > 0
              ? ` (${formatCurrency(priceUSD, referenceCurrency)})`
              : ""}
          </Text>
        </View>
        <Text style={styles.detailItemTotal}>
          {formatCurrency(displaySubtotalLocal, localCurrency)}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={UI_COLORS.info} />
        <Text style={styles.loadingText}>Cargando detalles de la venta...</Text>
      </SafeAreaView>
    );
  }

  if (!sale) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se pudo cargar la venta</Text>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Volver</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const customerName =
    customer?.name ||
    (sale.notes ? sale.notes.replace("Cliente: ", "") : "Sin nombre");
  const totalVes = calculateTotal(sale);
  const totalUsdNumber = resolveSaleMonetaryTotals(details || sale, {
    exchangeRate,
    localCurrency,
    referenceCurrency,
    rateEnabled,
  }).totalReference;

  return (
    <>
      <SafeAreaView style={styles.container}>
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={
            <View style={styles.headerContent}>
              <ScreenHero
                iconName="receipt-outline"
                iconColor={UI_COLORS.info}
                eyebrow="Ventas"
                title={`Detalle ${getSaleDisplayNumber(sale)}`}
                subtitle="Revisa productos, cliente, totales y método de pago con una jerarquía más clara."
                pills={[
                  {
                    text: getPaymentMethodText(sale.paymentMethod),
                    tone:
                      sale.paymentMethod === "por_cobrar" ? "warning" : "info",
                  },
                  {
                    text: formatCurrency(totalVes, localCurrency),
                    tone: "accent",
                  },
                ]}
              />

              <SurfaceCard style={styles.saleCard}>
                <View style={styles.saleHeader}>
                  <View style={styles.saleInfo}>
                    <Text style={styles.saleNumber}>
                      {getSaleDisplayNumber(sale)}
                    </Text>
                    <Text style={styles.saleDate}>
                      {new Date(sale.createdAt).toLocaleDateString("es-VE")} ·{" "}
                      {new Date(sale.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <InfoPill
                    text={formatCurrency(totalVes, localCurrency)}
                    tone="accent"
                  />
                </View>

                <View style={styles.saleMeta}>
                  <View style={styles.metaBlock}>
                    <Text style={styles.metaLabel}>Cliente</Text>
                    <Text style={styles.metaValue} numberOfLines={1}>
                      {customerName}
                    </Text>
                  </View>
                  <View style={styles.metaBlock}>
                    <Text style={styles.metaLabel}>Pago</Text>
                    <Text style={styles.metaValue}>
                      {getPaymentMethodText(sale.paymentMethod)}
                    </Text>
                  </View>
                </View>

                <View style={styles.totalsDivider} />

                <View style={styles.metricGrid}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Subtotal</Text>
                    <Text style={styles.metricValue}>
                      {formatCurrency(
                        Number(sale.subtotal) || 0,
                        localCurrency,
                      )}
                    </Text>
                  </View>

                  {(Number(sale.tax) || 0) > 0 ? (
                    <View style={styles.metricCard}>
                      <Text style={styles.metricLabel}>IVA</Text>
                      <Text style={styles.metricValue}>
                        {formatCurrency(Number(sale.tax) || 0, localCurrency)}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Total</Text>
                    <Text
                      style={[styles.metricValue, styles.metricValueAccent]}
                    >
                      {formatCurrency(Number(sale.total) || 0, localCurrency)}
                    </Text>
                  </View>

                  {rateEnabled && totalUsdNumber > 0 ? (
                    <View style={styles.metricCard}>
                      <Text
                        style={styles.metricLabel}
                      >{`Total ${referenceCurrency}`}</Text>
                      <Text style={styles.metricValue}>
                        {formatCurrency(totalUsdNumber, referenceCurrency)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </SurfaceCard>

              <SurfaceCard style={styles.productsCard}>
                <View style={styles.productsHeader}>
                  <Text style={styles.cardTitle}>Productos vendidos</Text>
                  <InfoPill
                    text={`${(details?.items || []).length} items`}
                    tone="neutral"
                  />
                </View>
                <FlatList
                  data={details?.items || []}
                  renderItem={renderDetailItem}
                  keyExtractor={(_, index) => `detail-${index}`}
                  ItemSeparatorComponent={() => (
                    <View style={styles.detailDivider} />
                  )}
                  ListEmptyComponent={
                    <EmptyStateCard
                      title="Sin productos"
                      subtitle="No se encontraron productos para esta venta."
                      style={styles.emptyProducts}
                    />
                  }
                  scrollEnabled={false}
                />
              </SurfaceCard>
            </View>
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: listPaddingBottom },
          ]}
        />

        {isValidWhatsAppPhone(customer?.phone) ? (
          <FloatingActionButton
            style={styles.whatsappFab}
            bottom={fabBottom}
            onPress={handleSendWhatsAppInvoice}
            iconName="logo-whatsapp"
          />
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  whatsappFab: {
    backgroundColor: "#4CAF50",
  },
  headerContent: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  saleCard: {
    gap: spacing.md,
    ...SHADOWS.soft,
  },
  saleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  saleInfo: {
    flex: 1,
    gap: vs(4),
  },
  saleNumber: {
    fontSize: rf(16),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  saleDate: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
  },
  saleMeta: {
    flexDirection: "row",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  metaBlock: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    padding: spacing.md,
    gap: vs(4),
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
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  totalsDivider: {
    height: 1,
    backgroundColor: UI_COLORS.border,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  metricCard: {
    minWidth: "47%",
    flexGrow: 1,
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    padding: spacing.md,
    gap: vs(4),
  },
  metricLabel: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  metricValue: {
    fontSize: rf(14),
    color: UI_COLORS.text,
    fontWeight: "800",
  },
  metricValueAccent: {
    color: UI_COLORS.info,
  },
  productsCard: {
    gap: spacing.md,
    ...SHADOWS.soft,
  },
  productsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  cardTitle: {
    fontSize: rf(16),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailItemSpacing: {
    marginTop: spacing.md,
  },
  detailItemInfo: {
    flex: 1,
    gap: vs(6),
  },
  detailItemName: {
    fontSize: rf(15),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  detailItemQuantity: {
    fontSize: rf(13),
    color: UI_COLORS.muted,
  },
  detailItemTotal: {
    fontSize: rf(14),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  detailDivider: {
    height: 1,
    backgroundColor: UI_COLORS.border,
    marginTop: spacing.md,
  },
  emptyProducts: {
    paddingVertical: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: UI_COLORS.page,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  loadingText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: UI_COLORS.muted,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  errorText: {
    fontSize: rf(16),
    color: UI_COLORS.danger,
    textAlign: "center",
  },
  backButton: {
    backgroundColor: UI_COLORS.surface,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: spacing.lg,
    paddingVertical: vs(12),
  },
  backButtonText: {
    color: UI_COLORS.info,
    fontSize: rf(14),
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

export default SaleDetailScreen;
