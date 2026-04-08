import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useExchangeRate } from "../../contexts/ExchangeRateContext";
import { useCustomAlert } from "../../components/common/CustomAlert";
import { useSales } from "../../hooks/useSales";
import { useInventory } from "../../hooks/useInventory";
import { useCustomers } from "../../hooks/useCustomers";
import { useSuppliers } from "../../hooks/useSuppliers";
import { useAccounts } from "../../hooks/useAccounts";
import { getSettings } from "../../services/database/settings";
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
import RateDisplay from "../../components/exchange/RateDisplay";
import { useRateNotifications } from "../../contexts/RateNotificationsContext";

/**
 * Pantalla principal del Dashboard
 */
const DashboardStatIcon = ({ name, backgroundColor, color }) => (
  <View style={[styles.statIconContainer, { backgroundColor }]}>
    <Ionicons name={name} size={rf(26)} color={color} />
  </View>
);

export const DashboardScreen = ({ navigation }) => {
  const { showAlert, CustomAlert } = useCustomAlert();
  const {
    rate,
    loading: rateLoading,
    lastUpdate,
    updateRate,
  } = useExchangeRate({ autoUpdate: false });
  const { todayStats, loading: salesLoading, loadTodayStats } = useSales();
  const {
    stats: inventoryStats,
    loading: inventoryLoading,
    refresh: refreshInventory,
  } = useInventory();
  const { customers, loading: customersLoading } = useCustomers();
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const {
    receivableStats,
    payableStats,
    loading: accountsLoading,
    refresh: refreshAccounts,
  } = useAccounts();
  const [refreshing, setRefreshing] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const { count: notificationCount, refreshCount: refreshNotificationsCount } =
    useRateNotifications();

  const requireExchangeRate = (contextMessage) => {
    if (!rate || rate <= 0) {
      showAlert({
        title: "Tasa de cambio requerida",
        message: `Debe configurar una tasa de cambio válida antes de ${contextMessage}. Ve a la sección de Tasa de Cambio.`,
        type: "error",
        buttons: [
          {
            text: "OK",
            onPress: () => navigation.navigate("ExchangeRate"),
          },
        ],
      });
      return false;
    }
    return true;
  };

  // Cargar nombre del negocio
  useEffect(() => {
    const loadBusinessInfo = async () => {
      const settings = await getSettings();
      setBusinessName(settings.business?.name || "Mi Negocio");
    };
    loadBusinessInfo();
  }, []);

  // Recargar estadísticas cuando cambie el tipo de cambio
  useEffect(() => {
    if (rate) {
      loadTodayStats();
    }
  }, [rate, loadTodayStats]);

  // Listener para cuando se vuelve a la pantalla (recargar inventario y cuentas)
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      refreshInventory();
      refreshAccounts();
      refreshNotificationsCount();
    });

    return unsubscribe;
  }, [navigation, refreshInventory, refreshAccounts]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await updateRate("BCV");
      await refreshInventory();
      await loadTodayStats();
      await refreshAccounts();
    } catch (error) {
      console.error("Error refreshing:", error);
    }
    setRefreshing(false);
  };

  const formatDate = () => {
    const now = new Date();
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };
    return now.toLocaleString("es-VE", options);
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header con información del negocio */}
        <View style={styles.header}>
          <Text style={styles.businessName}>{businessName.toUpperCase()}</Text>
          <Text style={styles.lastSession}>Última Sesión: {formatDate()}</Text>
          <View style={styles.currencyButtons}>
            <TouchableOpacity style={styles.currencyButtonActive}>
              <Text style={styles.currencyButtonTextActive}>VES</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.currencyButton}
              onPress={() => navigation.navigate("ExchangeRate")}
            >
              <Text style={styles.currencyButtonText}>USD ($)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate("RateNotifications")}
            >
              <Ionicons
                name="notifications-outline"
                size={rf(18)}
                color="#ffffff"
              />
              {(notificationCount || 0) > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {(notificationCount || 0) > 99 ? "99+" : notificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => {
                if (global.resetOnboarding) {
                  global.resetOnboarding();
                }
              }}
            >
              <Ionicons
                name="help-circle-outline"
                size={rf(18)}
                color="#ffffff"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tarjeta Principal - Balance del Día */}
        <View style={styles.mainCard}>
          <View style={styles.mainCardHeader}>
            <View>
              <Text style={styles.mainCardTitle}>Balance del Día</Text>
              <Text style={styles.accountNumber}>
                Ventas •{" "}
                {new Date().toLocaleDateString("es-VE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate("Sales")}>
              <Ionicons
                name="bar-chart-outline"
                size={iconSize.lg}
                color="#2f5ae0"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>TOTAL DE VENTAS</Text>
            <Text style={styles.balanceAmount}>
              {formatCurrency(todayStats?.total || 0, "VES")}
            </Text>
            <Text style={styles.salesCount}>
              {todayStats?.count || 0}{" "}
              {todayStats?.count === 1
                ? "venta realizada"
                : "ventas realizadas"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => navigation.navigate("Sales")}
          >
            <Text style={styles.viewDetailsButtonText}>
              VER TODAS LAS VENTAS
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sección de Estadísticas */}
        <Text style={styles.sectionTitle}>Resumen General</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            {/* Tasa de Cambio */}
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate("ExchangeRate")}
            >
              <DashboardStatIcon
                name="swap-horizontal-outline"
                backgroundColor="#eef6ff"
                color="#2f80ed"
              />
              <Text style={styles.statLabel}>Tasa de Cambio</Text>
              <Text style={styles.statValue}>
                {rate ? `${rate.toFixed(2)} VES.` : "Cargando..."}
              </Text>
            </TouchableOpacity>

            {/* Nueva Venta */}
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => {
                if (!requireExchangeRate("realizar ventas")) return;
                navigation.navigate("POS");
              }}
            >
              <DashboardStatIcon
                name="cart-outline"
                backgroundColor="#edf9ee"
                color="#34a853"
              />
              <Text style={styles.statLabel}>Nueva Venta</Text>
              <Text style={styles.statValue}>Iniciar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            {/* Cuentas por Cobrar */}
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => {
                if (!requireExchangeRate("gestionar cuentas por cobrar"))
                  return;
                navigation.navigate("AccountsReceivable");
              }}
            >
              <DashboardStatIcon
                name="cash-outline"
                backgroundColor="#eaf7f0"
                color="#169c5a"
              />
              <Text style={styles.statLabel}>Por Cobrar</Text>
              <Text style={styles.statValue}>
                {formatCurrency(receivableStats?.pending || 0, "VES")}
              </Text>
              {(receivableStats?.overdue || 0) > 0 && (
                <Text style={styles.statWarning}>
                  {(receivableStats?.overdue || 0).toFixed(2)} vencidas
                </Text>
              )}
            </TouchableOpacity>

            {/* Cuentas por Pagar */}
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => {
                if (!requireExchangeRate("gestionar cuentas por pagar")) return;
                navigation.navigate("AccountsPayable");
              }}
            >
              <DashboardStatIcon
                name="card-outline"
                backgroundColor="#fff1f1"
                color="#d64545"
              />
              <Text style={styles.statLabel}>Por Pagar</Text>
              <Text style={styles.statValue}>
                {formatCurrency(payableStats?.pending || 0, "VES")}
              </Text>
              {(payableStats?.overdue || 0) > 0 && (
                <Text style={styles.statWarning}>
                  {(payableStats?.overdue || 0).toFixed(2)} vencidas
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            {/* Movimientos de inventario */}
            <TouchableOpacity
              style={[styles.statCard, styles.statCardHalf]}
              onPress={() => {
                if (
                  !requireExchangeRate("consultar movimientos de inventario")
                ) {
                  return;
                }
                navigation.navigate("InventoryMovements");
              }}
            >
              <DashboardStatIcon
                name="cube-outline"
                backgroundColor="#fff6e8"
                color="#c9861a"
              />
              <Text style={styles.statLabel}>Movimientos de inventario</Text>
              <Text style={styles.statValue}>Ver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <CustomAlert />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8edf2",
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Header styles
  header: {
    backgroundColor: "#4CAF50",
    borderBottomLeftRadius: s(24),
    borderBottomRightRadius: s(24),
    padding: spacing.lg,
    paddingTop: vs(50),
    paddingBottom: vs(24),
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: s(8),
  },
  businessName: {
    fontSize: rf(18),
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  lastSession: {
    fontSize: rf(12),
    color: "#ffffff",
    opacity: 0.9,
    marginTop: vs(4),
    marginBottom: vs(16),
  },
  currencyButtons: {
    flexDirection: "row",
    gap: hs(12),
    alignItems: "center",
  },
  currencyButtonActive: {
    backgroundColor: "#ffffff",
    paddingVertical: vs(8),
    paddingHorizontal: hs(20),
    borderRadius: borderRadius.xl,
  },
  currencyButtonTextActive: {
    color: "#4CAF50",
    fontWeight: "600",
    fontSize: rf(13),
  },
  currencyButton: {
    backgroundColor: "transparent",
    paddingVertical: vs(8),
    paddingHorizontal: hs(20),
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  currencyButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: rf(13),
  },
  helpButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: vs(8),
    paddingHorizontal: hs(12),
    borderRadius: borderRadius.xl,
  },
  helpButtonText: {
    color: "#ffffff",
    fontSize: rf(16),
  },

  notificationButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: vs(8),
    paddingHorizontal: hs(12),
    borderRadius: borderRadius.xl,
    marginLeft: "auto",
    position: "relative",
  },
  notificationButtonText: {
    color: "#ffffff",
    fontSize: rf(16),
  },
  badge: {
    position: "absolute",
    top: vs(-6),
    right: hs(-6),
    minWidth: hs(18),
    height: vs(18),
    borderRadius: borderRadius.xl,
    paddingHorizontal: hs(5),
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#4CAF50",
    fontSize: rf(10),
    fontWeight: "800",
  },

  // Main Card styles
  mainCard: {
    backgroundColor: "#ffffff",
    borderRadius: borderRadius.lg,
    margin: spacing.lg,
    marginTop: vs(20),
    padding: spacing.lg,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: s(8),
  },
  mainCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: vs(20),
  },
  mainCardTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#333",
  },
  accountNumber: {
    fontSize: rf(12),
    color: "#666",
    marginTop: vs(4),
  },
  shareIcon: {
    fontSize: iconSize.lg,
  },
  balanceSection: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
  },
  balanceLabel: {
    fontSize: rf(11),
    fontWeight: "600",
    color: "#999",
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    fontSize: rf(36),
    fontWeight: "700",
    color: "#333",
    marginBottom: spacing.xs,
  },
  salesCount: {
    fontSize: rf(13),
    color: "#666",
  },
  viewDetailsButton: {
    backgroundColor: "#f5f5f5",
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xl,
    alignItems: "center",
  },
  viewDetailsButtonText: {
    fontSize: rf(13),
    fontWeight: "600",
    color: "#4CAF50",
    letterSpacing: 0.5,
  },

  // Section Title
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#333",
    marginLeft: hs(16),
    marginTop: vs(8),
    marginBottom: vs(12),
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "column",
    gap: vs(16),
    paddingHorizontal: hs(16),
    marginBottom: vs(8),
  },
  statsRow: {
    flexDirection: "row",
    gap: hs(16),
  },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: s(4),
  },
  statCardHalf: {
    flex: undefined,
    width: "47%",
  },
  statIconContainer: {
    width: s(54),
    height: s(54),
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: vs(8),
  },
  statLabel: {
    fontSize: rf(12),
    color: "#666",
    marginBottom: vs(4),
    fontWeight: "500",
  },
  statValue: {
    fontSize: rf(16),
    fontWeight: "700",
    color: "#333",
  },
  statWarning: {
    fontSize: rf(11),
    color: "#ff9800",
    marginTop: vs(4),
    fontWeight: "500",
  },

  // Quick Actions
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: hs(8),
    marginBottom: vs(20),
  },
  quickActionCard: {
    width: "47%",
    backgroundColor: "#ffffff",
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    margin: s(8),
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: s(4),
  },
  quickActionIcon: {
    fontSize: iconSize.xl,
    marginBottom: vs(8),
  },
  quickActionText: {
    fontSize: rf(13),
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
});

export default DashboardScreen;
