import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTourGuideController } from "rn-tourguide";
import { useSales } from "../../hooks/useSales";
import { useExchangeRateContext } from "../../contexts/ExchangeRateContext";
import { formatCurrency } from "../../utils/currency";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useCustomAlert } from "../../components/common/CustomAlert";
import {
  EmptyStateCard,
  FloatingActionButton,
  InfoPill,
  MetricCard,
  ScreenHero,
  SurfaceCard,
  UI_COLORS,
  SHADOWS,
} from "../../components/common/AppUI";
import { SegmentedOptions } from "../../components/common/FormPatterns";
import { getSaleItemsCostUSDBySaleIds } from "../../services/database/sales";
import { hasSeenTour, markTourSeen } from "../../services/tour/tourStorage";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";

/**
 * Historial de ventas con estética de dashboard
 */
export const SalesScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { canStart, start, TourGuideZone } = useTourGuideController("sales");
  const TOUR_ZONE_BASE = 4000;
  const [tourBooted, setTourBooted] = useState(false);
  const { sales, todayStats, loading, loadSales, loadTodayStats, cancelSale } =
    useSales();

  const { rate } = useExchangeRateContext();
  const { showAlert, CustomAlert } = useCustomAlert();

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

  const [activeTab, setActiveTab] = useState("today");
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0);
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [showTotalsModal, setShowTotalsModal] = useState(false);
  const [totalsLoading, setTotalsLoading] = useState(false);
  const [totals, setTotals] = useState({
    soldVES: 0,
    soldUSD: 0,
    costVES: 0,
    costUSD: 0,
    profitVES: 0,
    profitUSD: 0,
  });

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadSales();
      loadTodayStats();
    });
    return unsubscribe;
  }, [navigation, loadSales, loadTodayStats]);

  useEffect(() => {
    let mounted = true;

    const maybeStartTour = async () => {
      if (tourBooted) return;
      if (!canStart) return;

      const tourId = "sales";
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

  const filteredSales = useMemo(() => {
    if (activeTab === "today") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);
      return sales.filter((sale) => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= startOfDay && saleDate < endOfDay;
      });
    }

    return sales.filter((sale) => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= startDate && saleDate <= endDate;
    });
  }, [sales, activeTab, startDate, endDate]);

  const summary = useMemo(() => {
    if (activeTab === "today") {
      return {
        count: todayStats?.count || 0,
        total: todayStats?.total || 0,
      };
    }

    const total = filteredSales.reduce(
      (sum, sale) => sum + (Number(calculateTotal(sale)) || 0),
      0,
    );
    return {
      count: filteredSales.length,
      total,
    };
  }, [activeTab, todayStats, filteredSales]);

  useEffect(() => {
    const run = async () => {
      if (!showTotalsModal) return;

      try {
        setTotalsLoading(true);

        const saleIds = (filteredSales || []).map((sale) => sale.id);
        const costRows = await getSaleItemsCostUSDBySaleIds(saleIds);
        const costBySaleId = (costRows || []).reduce((acc, row) => {
          const saleId = Number(row.saleId);
          acc[saleId] = Number(row.costUSD) || 0;
          return acc;
        }, {});

        const soldVES = (filteredSales || []).reduce(
          (sum, sale) => sum + (Number(calculateTotal(sale)) || 0),
          0,
        );

        const soldUSD = (filteredSales || []).reduce((sum, sale) => {
          const totalUSD = Number(sale.totalUSD) || 0;
          if (totalUSD > 0) {
            return sum + totalUSD;
          }

          const totalVES = Number(calculateTotal(sale)) || 0;
          const rateAtSale = Number(sale.exchangeRate) || exchangeRate || 0;
          return sum + (rateAtSale > 0 ? totalVES / rateAtSale : 0);
        }, 0);

        const costUSD = (filteredSales || []).reduce((sum, sale) => {
          const saleId = Number(sale.id);
          return sum + (costBySaleId[saleId] || 0);
        }, 0);

        const costVES = (filteredSales || []).reduce((sum, sale) => {
          const saleId = Number(sale.id);
          const costUSD = costBySaleId[saleId] || 0;
          const rateAtSale = Number(sale.exchangeRate) || exchangeRate || 0;
          return sum + costUSD * rateAtSale;
        }, 0);

        setTotals({
          soldVES,
          soldUSD,
          costVES,
          costUSD,
          profitVES: soldVES - costVES,
          profitUSD: soldUSD - costUSD,
        });
      } catch (error) {
        console.error("Error calculando totales de ventas:", error);
        showAlert({
          title: "Error",
          message: "No se pudieron calcular los totales",
          type: "error",
        });
      } finally {
        setTotalsLoading(false);
      }
    };

    run();
  }, [showTotalsModal, filteredSales, exchangeRate, showAlert]);

  const handleShowDetails = (sale) => {
    navigation.navigate("SaleDetail", { saleId: sale.id });
  };

  const handleCancelSale = (sale) => {
    showAlert({
      title: "Anular venta",
      message: `¿Anular la venta ${getSaleDisplayNumber(sale)}? Esta acción no se puede deshacer.`,
      type: "warning",
      buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Anular",
          onPress: async () => {
            try {
              await cancelSale(sale.id);
              showAlert({
                title: "Éxito",
                message: "Venta anulada correctamente",
                type: "success",
              });
            } catch (error) {
              showAlert({
                title: "Error",
                message: error?.message || "No se pudo anular la venta",
                type: "error",
              });
            }
          },
        },
      ],
    });
  };

  const handleQuickRange = (type) => {
    const now = new Date();
    if (type === "currentMonth") {
      setStartDate(new Date(now.getFullYear(), now.getMonth(), 1));
      setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    } else if (type === "lastMonth") {
      setStartDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      setEndDate(new Date(now.getFullYear(), now.getMonth(), 0));
    } else if (type === "week") {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      setStartDate(weekStart);
      setEndDate(weekEnd);
    }
  };

  const normalizeStartDate = (date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

  const normalizeEndDate = (date) =>
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
      999,
    );

  const handleStartDateChange = (event, selected) => {
    if (Platform.OS !== "ios") {
      setShowStartPicker(false);
    }

    if (event?.type === "dismissed") {
      return;
    }

    if (selected) {
      const normalized = normalizeStartDate(selected);
      setStartDate(normalized);
      if (normalized > endDate) {
        setEndDate(normalizeEndDate(selected));
      }
    }
  };

  const handleEndDateChange = (event, selected) => {
    if (Platform.OS !== "ios") {
      setShowEndPicker(false);
    }

    if (event?.type === "dismissed") {
      return;
    }

    if (selected) {
      const normalized = normalizeEndDate(selected);
      setEndDate(normalized);
      if (normalized < startDate) {
        setStartDate(normalizeStartDate(selected));
      }
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getPaymentMethodText = (method) => {
    switch (method) {
      case "cash":
        return "Efectivo";
      case "card":
        return "Tarjeta";
      case "transfer":
        return "Transferencia";
      default:
        return method || "—";
    }
  };

  const renderSale = ({ item }) => (
    <Pressable
      style={({ pressed }) => [styles.saleCard, pressed && styles.pressed]}
      onPress={() => handleShowDetails(item)}
    >
      <View style={styles.saleHeader}>
        <View style={styles.saleIcon}>
          <Ionicons
            name="receipt-outline"
            size={iconSize.lg}
            color={UI_COLORS.info}
          />
        </View>
        <View style={styles.saleInfo}>
          <Text style={styles.saleNumber}>{getSaleDisplayNumber(item)}</Text>
          <Text style={styles.saleDate}>
            {new Date(item.createdAt).toLocaleDateString()} ·{" "}
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        <InfoPill
          text={formatCurrency(calculateTotal(item), "VES")}
          tone="info"
        />
      </View>

      <View style={styles.saleMeta}>
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>Cliente</Text>
          <Text style={styles.metaValue} numberOfLines={1}>
            {item.notes ? item.notes.replace("Cliente: ", "") : "Sin nombre"}
          </Text>
        </View>
        <View style={styles.metaBlock}>
          <Text style={styles.metaLabel}>Pago</Text>
          <Text style={styles.metaValue}>
            {getPaymentMethodText(item.paymentMethod)}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && styles.pressed,
          ]}
          onPress={() => handleCancelSale(item)}
        >
          <Ionicons name="ban-outline" size={rf(18)} color={UI_COLORS.danger} />
        </Pressable>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={UI_COLORS.info} />
        <Text style={styles.loadingText}>Sincronizando historial...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <FlatList
          data={filteredSales}
          renderItem={renderSale}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.headerContent}>
              <ScreenHero
                iconName="bar-chart-outline"
                iconColor={UI_COLORS.info}
                eyebrow="Ventas"
                title="Historial de ventas"
                subtitle="Consulta ventas del d\u00eda o por rango con tarjetas m\u00e1s claras, m\u00e9tricas compactas y acceso directo a los totales."
                pills={[
                  {
                    text: `${summary.count} registros`,
                    tone: "info",
                  },
                  {
                    text: formatCurrency(summary.total, "VES"),
                    tone: "accent",
                  },
                ]}
              />

              <View style={styles.summaryGrid}>
                <MetricCard
                  label={
                    activeTab === "today" ? "Ventas hoy" : "Ventas filtradas"
                  }
                  value={String(summary.count)}
                  hint={
                    activeTab === "today"
                      ? "Movimientos registrados en la jornada actual"
                      : "Resultados dentro del rango seleccionado"
                  }
                  tone="info"
                  style={styles.metricCard}
                />
                <MetricCard
                  label="Facturado"
                  value={formatCurrency(summary.total, "VES")}
                  hint={
                    activeTab === "today"
                      ? "Total acumulado de hoy"
                      : `${formatDate(startDate)} - ${formatDate(endDate)}`
                  }
                  tone="accent"
                  style={styles.metricCard}
                />
              </View>

              <TourGuideZone
                zone={TOUR_ZONE_BASE + 1}
                text={
                  "Cambia entre ventas de hoy y el histórico por rango de fechas."
                }
                borderRadius={borderRadius.lg}
              >
                <SurfaceCard style={styles.segmentCard}>
                  <SegmentedOptions
                    options={[
                      { value: "today", label: "Hoy" },
                      { value: "all", label: "Histórico" },
                    ]}
                    value={activeTab}
                    onChange={setActiveTab}
                  />
                </SurfaceCard>
              </TourGuideZone>

              {activeTab === "all" && (
                <SurfaceCard style={styles.dateCard}>
                  <View style={styles.dateRow}>
                    <View style={styles.dateColumn}>
                      <Text style={styles.dateLabel}>Desde</Text>
                      <Pressable
                        style={({ pressed }) => [
                          styles.dateSelector,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => setShowStartPicker(true)}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={rf(16)}
                          color={UI_COLORS.info}
                        />
                        <Text style={styles.dateValue}>
                          {formatDate(startDate)}
                        </Text>
                      </Pressable>

                      {showStartPicker ? (
                        <DateTimePicker
                          value={startDate}
                          mode="date"
                          display={
                            Platform.OS === "ios" ? "compact" : "default"
                          }
                          onChange={handleStartDateChange}
                        />
                      ) : null}
                    </View>

                    <View style={styles.dateColumn}>
                      <Text style={styles.dateLabel}>Hasta</Text>
                      <Pressable
                        style={({ pressed }) => [
                          styles.dateSelector,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => setShowEndPicker(true)}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={rf(16)}
                          color={UI_COLORS.info}
                        />
                        <Text style={styles.dateValue}>
                          {formatDate(endDate)}
                        </Text>
                      </Pressable>

                      {showEndPicker ? (
                        <DateTimePicker
                          value={endDate}
                          mode="date"
                          display={
                            Platform.OS === "ios" ? "compact" : "default"
                          }
                          onChange={handleEndDateChange}
                        />
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.quickFilters}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.quickFilter,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handleQuickRange("currentMonth")}
                    >
                      <Text style={styles.quickFilterText}>Este mes</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.quickFilter,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handleQuickRange("lastMonth")}
                    >
                      <Text style={styles.quickFilterText}>Mes anterior</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.quickFilter,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handleQuickRange("week")}
                    >
                      <Text style={styles.quickFilterText}>Esta semana</Text>
                    </Pressable>
                  </View>
                </SurfaceCard>
              )}
            </View>
          }
          ListEmptyComponent={
            <EmptyStateCard
              title={
                activeTab === "today"
                  ? "No hay ventas registradas hoy"
                  : "No encontramos ventas en este rango"
              }
              subtitle={
                activeTab === "today"
                  ? "Registra una venta y aparecerá aquí al instante."
                  : "Ajusta el rango o sincroniza tus ventas recientes."
              }
              style={styles.emptyState}
            />
          }
        />

        <TourGuideZone
          zone={TOUR_ZONE_BASE + 2}
          text={"Abre los totales del rango seleccionado presionando '$'."}
          shape="circle"
        >
          <FloatingActionButton
            style={styles.fab}
            bottom={vs(24) + Math.max(insets.bottom, vs(10))}
            onPress={() => setShowTotalsModal(true)}
            iconName="stats-chart"
          />
        </TourGuideZone>
      </SafeAreaView>

      <Modal
        visible={showTotalsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTotalsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <SurfaceCard style={styles.modalCard}>
            <Text style={styles.modalTitle}>Totales</Text>
            <Text style={styles.modalSubtitle}>
              {activeTab === "today"
                ? "Ventas de hoy"
                : `Rango: ${formatDate(startDate)} – ${formatDate(endDate)}`}
            </Text>

            {totalsLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={UI_COLORS.info} />
                <Text style={styles.modalLoadingText}>Calculando...</Text>
              </View>
            ) : (
              <View style={styles.modalGrid}>
                <View style={styles.modalMetricCard}>
                  <Text style={styles.modalLabel}>Total vendido</Text>
                  <Text style={styles.modalValue}>
                    {formatCurrency(totals.soldVES, "VES")}
                  </Text>
                  <Text style={styles.modalValueSecondary}>
                    {formatCurrency(totals.soldUSD, "USD")}
                  </Text>
                </View>
                <View style={styles.modalMetricCard}>
                  <Text style={styles.modalLabel}>Costo vendido</Text>
                  <Text style={styles.modalValue}>
                    {formatCurrency(totals.costVES, "VES")}
                  </Text>
                  <Text style={styles.modalValueSecondary}>
                    {formatCurrency(totals.costUSD, "USD")}
                  </Text>
                </View>
                <View style={styles.modalMetricCard}>
                  <Text style={styles.modalLabel}>Ganancia</Text>
                  <Text
                    style={[
                      styles.modalValue,
                      totals.profitVES >= 0
                        ? styles.positiveValue
                        : styles.negativeValue,
                    ]}
                  >
                    {formatCurrency(totals.profitVES, "VES")}
                  </Text>
                  <Text style={styles.modalValueSecondary}>
                    {formatCurrency(totals.profitUSD, "USD")}
                  </Text>
                </View>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.modalCloseButton,
                pressed && styles.pressed,
              ]}
              onPress={() => setShowTotalsModal(false)}
            >
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </Pressable>
          </SurfaceCard>
        </View>
      </Modal>
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
    paddingHorizontal: hs(16),
    paddingTop: vs(14),
    paddingBottom: vs(104),
  },
  headerContent: {
    gap: vs(14),
    marginBottom: vs(6),
  },
  summaryGrid: {
    flexDirection: "row",
    gap: hs(10),
  },
  metricCard: {
    ...SHADOWS.soft,
  },
  segmentCard: {
    ...SHADOWS.soft,
  },
  dateCard: {
    gap: vs(14),
    ...SHADOWS.soft,
  },
  dateRow: {
    flexDirection: "row",
    gap: hs(16),
  },
  dateColumn: {
    flex: 1,
    gap: vs(8),
  },
  dateLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    paddingHorizontal: hs(12),
    paddingVertical: vs(10),
    gap: hs(10),
  },
  dateValue: {
    flex: 1,
    fontSize: rf(13),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  quickFilters: {
    flexDirection: "row",
    gap: hs(8),
  },
  quickFilter: {
    backgroundColor: UI_COLORS.infoSoft,
    borderRadius: borderRadius.sm,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    paddingHorizontal: hs(16),
    paddingVertical: vs(9),
    alignItems: "center",
    flex: 1,
  },
  quickFilterText: {
    color: UI_COLORS.info,
    fontWeight: "700",
    fontSize: rf(13),
    flex: 1,
  },
  saleCard: {
    backgroundColor: UI_COLORS.surface,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    padding: spacing.md,
    gap: vs(12),
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    ...SHADOWS.soft,
    marginBottom: vs(10),
  },
  saleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: hs(12),
  },
  saleIcon: {
    width: s(42),
    height: s(42),
    borderRadius: borderRadius.md,
    backgroundColor: UI_COLORS.infoSoft,
    alignItems: "center",
    justifyContent: "center",
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
  cancelButton: {
    width: s(32),
    height: s(32),
    borderRadius: borderRadius.md,
    backgroundColor: UI_COLORS.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  saleMeta: {
    flexDirection: "row",
    gap: hs(12),
    flexWrap: "wrap",
  },
  metaBlock: {
    flex: 1,
    minWidth: "40%",
    gap: vs(4),
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    padding: spacing.sm + 2,
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
  emptyState: {
    paddingVertical: vs(52),
  },
  fab: {
    backgroundColor: UI_COLORS.info,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: hs(16),
  },
  modalCard: {
    width: "100%",
    maxWidth: s(400),
    gap: spacing.md,
    ...SHADOWS.card,
  },
  modalTitle: {
    fontSize: rf(18),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  modalSubtitle: {
    fontSize: rf(13),
    color: UI_COLORS.muted,
  },
  modalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: hs(10),
  },
  modalMetricCard: {
    minWidth: "47%",
    flexGrow: 1,
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    padding: spacing.sm + 2,
    gap: vs(6),
  },
  modalLabel: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  modalValue: {
    fontSize: rf(16),
    color: UI_COLORS.text,
    fontWeight: "800",
  },
  modalValueSecondary: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
    fontWeight: "700",
  },
  modalCloseButton: {
    marginTop: vs(4),
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    paddingVertical: vs(12),
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: rf(14),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  modalLoading: {
    paddingVertical: vs(16),
    alignItems: "center",
    gap: vs(10),
  },
  modalLoadingText: {
    fontSize: rf(13),
    color: UI_COLORS.muted,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: UI_COLORS.page,
    alignItems: "center",
    justifyContent: "center",
    gap: vs(16),
  },
  loadingText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: UI_COLORS.muted,
  },
  positiveValue: {
    color: UI_COLORS.accentStrong,
  },
  negativeValue: {
    color: UI_COLORS.danger,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

export default SalesScreen;
