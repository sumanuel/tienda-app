import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSales } from "../../hooks/useSales";
import { useExchangeRateContext } from "../../contexts/ExchangeRateContext";
import { formatCurrency } from "../../utils/currency";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useCustomAlert } from "../../components/common/CustomAlert";

/**
 * Historial de ventas con estética de dashboard
 */
export const SalesScreen = () => {
  const navigation = useNavigation();
  const {
    sales,
    todayStats,
    loading,
    getSaleDetails,
    loadSales,
    loadTodayStats,
    cancelSale,
  } = useSales();

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

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadSales();
      loadTodayStats();
    });
    return unsubscribe;
  }, [navigation, loadSales, loadTodayStats]);

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

    const total = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    return {
      count: filteredSales.length,
      total,
    };
  }, [activeTab, todayStats, filteredSales]);

  const handleShowDetails = (sale) => {
    navigation.navigate("SaleDetail", { saleId: sale.id });
  };

  const handleCancelSale = (sale) => {
    showAlert({
      title: "Anular venta",
      message: `¿Anular la venta #${sale.id}? Esta acción no se puede deshacer.`,
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
                message: "No se pudo anular la venta",
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
      999
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
    <TouchableOpacity
      style={styles.saleCard}
      onPress={() => handleShowDetails(item)}
      activeOpacity={0.85}
    >
      <View style={styles.saleHeader}>
        <View style={styles.saleIcon}>
          <Text style={styles.saleIconText}>🧾</Text>
        </View>
        <View style={styles.saleInfo}>
          <Text style={styles.saleNumber}>Venta #{item.id}</Text>
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
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => handleCancelSale(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelIcon}>🚫</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f5ae0" />
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
              <View style={styles.heroCard}>
                <View style={styles.heroIcon}>
                  <Text style={styles.heroIconText}>📈</Text>
                </View>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroTitle}>
                    Historial de ventas ({summary.count})
                  </Text>
                  <Text style={styles.heroSubtitle}>
                    Visualiza el desempeño de tus ventas y explora los detalles
                    con un toque.
                  </Text>
                </View>
              </View>

              <View style={styles.tabGroup}>
                {[
                  { key: "today", label: "Hoy" },
                  { key: "all", label: "Histórico" },
                ].map((tab) => {
                  const active = activeTab === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[styles.tabChip, active && styles.tabChipActive]}
                      onPress={() => setActiveTab(tab.key)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.tabChipText,
                          active && styles.tabChipTextActive,
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {activeTab === "all" && (
                <View style={styles.dateCard}>
                  <View style={styles.dateRow}>
                    <View style={styles.dateColumn}>
                      <Text style={styles.dateLabel}>Desde</Text>
                      <TouchableOpacity
                        style={styles.dateSelector}
                        onPress={() => setShowStartPicker(true)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.dateCalendarIcon}>📅</Text>
                        <Text style={styles.dateValue}>
                          {formatDate(startDate)}
                        </Text>
                      </TouchableOpacity>

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
                      <TouchableOpacity
                        style={styles.dateSelector}
                        onPress={() => setShowEndPicker(true)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.dateCalendarIcon}>📅</Text>
                        <Text style={styles.dateValue}>
                          {formatDate(endDate)}
                        </Text>
                      </TouchableOpacity>

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
                    <TouchableOpacity
                      style={styles.quickFilter}
                      onPress={() => handleQuickRange("currentMonth")}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.quickFilterText}>Este mes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickFilter}
                      onPress={() => handleQuickRange("lastMonth")}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.quickFilterText}>Mes anterior</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickFilter}
                      onPress={() => handleQuickRange("week")}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.quickFilterText}>Esta semana</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🧾</Text>
              <Text style={styles.emptyTitle}>
                {activeTab === "today"
                  ? "No hay ventas registradas hoy"
                  : "No encontramos ventas en este rango"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === "today"
                  ? "Registra una venta y aparecerá aquí al instante."
                  : "Ajusta el rango o sincroniza tus ventas recientes."}
              </Text>
            </View>
          }
        />
      </SafeAreaView>
      <CustomAlert />
    </>
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
  tabGroup: {
    flexDirection: "row",
    backgroundColor: "#f3f5fa",
    borderRadius: 16,
    padding: 8,
    gap: 8,
  },
  tabChip: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabChipActive: {
    backgroundColor: "#2f5ae0",
    shadowColor: "#2f5ae0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  tabChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5b6472",
  },
  tabChipTextActive: {
    color: "#fff",
  },
  dateCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
    gap: 18,
  },
  dateRow: {
    flexDirection: "row",
    gap: 16,
  },
  dateColumn: {
    flex: 1,
    gap: 10,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8492a6",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fc",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d9e0eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  dateCalendarIcon: {
    fontSize: 16,
  },
  dateValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#2f3a4c",
  },
  quickFilters: {
    flexDirection: "row",
    gap: 8,
  },
  quickFilter: {
    backgroundColor: "#f8f9fc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d9e0eb",
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    flex: 1,
  },
  quickFilterText: {
    color: "#2f5ae0",
    fontWeight: "600",
    fontSize: 13,
    flex: 1,
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
    marginBottom: 12,
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
  cancelButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelIcon: {
    fontSize: 14,
    color: "#dc2626",
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
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    backgroundColor: "#fff",
    borderRadius: 18,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyEmoji: {
    fontSize: 42,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2633",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6f7c8c",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  detailOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(13, 22, 38, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  detailCard: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 22,
    gap: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  detailBack: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#f0f3fa",
    alignItems: "center",
    justifyContent: "center",
  },
  detailBackText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2f5ae0",
  },
  detailHeaderInfo: {
    flex: 1,
    gap: 4,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2633",
  },
  detailSubtitle: {
    fontSize: 13,
    color: "#6f7c8c",
  },
  detailAmountChip: {
    backgroundColor: "#2fb176",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  detailAmountText: {
    color: "#fff",
    fontWeight: "700",
  },
  detailSummary: {
    flexDirection: "row",
    backgroundColor: "#f8f9fc",
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  detailSummaryItem: {
    flex: 1,
    gap: 6,
  },
  detailSummaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#7a8796",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  detailSummaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2633",
  },
  detailsLoader: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
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
  detailEmpty: {
    paddingVertical: 30,
    alignItems: "center",
  },
  detailEmptyText: {
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
});

export default SalesScreen;
