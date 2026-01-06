import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useExchangeRate } from "../../contexts/ExchangeRateContext";
import { useSales } from "../../hooks/useSales";
import { useInventory } from "../../hooks/useInventory";
import { useCustomers } from "../../hooks/useCustomers";
import { useSuppliers } from "../../hooks/useSuppliers";
import { useAccounts } from "../../hooks/useAccounts";
import { getSettings } from "../../services/database/settings";
import { formatCurrency } from "../../utils/currency";
import { s, rf, vs, hs, spacing, borderRadius, iconSize } from "../../utils/responsive";
import RateDisplay from "../../components/exchange/RateDisplay";

/**
 * Pantalla principal del Dashboard
 */
export const DashboardScreen = ({ navigation }) => {
  const {
    rate,
    loading: rateLoading,
    lastUpdate,
    updateRate,
  } = useExchangeRate({ autoUpdate: true, updateInterval: 30 });
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
            style={styles.helpButton}
            onPress={() => {
              if (global.resetOnboarding) {
                global.resetOnboarding();
              }
            }}
          >
            <Text style={styles.helpButtonText}>📖</Text>
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
            <Text style={styles.shareIcon}>📊</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>TOTAL DE VENTAS</Text>
          <Text style={styles.balanceAmount}>
            {formatCurrency(todayStats?.total || 0, "VES")}
          </Text>
          <Text style={styles.salesCount}>
            {todayStats?.count || 0}{" "}
            {todayStats?.count === 1 ? "venta realizada" : "ventas realizadas"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => navigation.navigate("Sales")}
        >
          <Text style={styles.viewDetailsButtonText}>VER TODAS LAS VENTAS</Text>
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
            <Text style={styles.statIcon}>💱</Text>
            <Text style={styles.statLabel}>Tasa de Cambio</Text>
            <Text style={styles.statValue}>
              {rate ? `${rate.toFixed(2)} VES.` : "Cargando..."}
            </Text>
          </TouchableOpacity>

          {/* Nueva Venta */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate("POS")}
          >
            <Text style={styles.statIcon}>🛒</Text>
            <Text style={styles.statLabel}>Nueva Venta</Text>
            <Text style={styles.statValue}>Iniciar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          {/* Cuentas por Cobrar */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate("AccountsReceivable")}
          >
            <Text style={styles.statIcon}>📈</Text>
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
            onPress={() => navigation.navigate("AccountsPayable")}
          >
            <Text style={styles.statIcon}>📉</Text>
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
          {/* Entrada Inventario */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate("InventoryEntry")}
          >
            <Text style={styles.statIcon}>📥</Text>
            <Text style={styles.statLabel}>Entrada Inventario</Text>
            <Text style={styles.statValue}>Registrar</Text>
          </TouchableOpacity>

          {/* Salida Inventario */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate("InventoryExit")}
          >
            <Text style={styles.statIcon}>📤</Text>
            <Text style={styles.statLabel}>Salida Inventario</Text>
            <Text style={styles.statValue}>Registrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
    marginLeft: "auto",
  },
  helpButtonText: {
    color: "#ffffff",
    fontSize: rf(16),
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
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999",
    letterSpacing: 1,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  salesCount: {
    fontSize: 13,
    color: "#666",
  },
  viewDetailsButton: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 16,
    alignItems: "center",
  },
  viewDetailsButtonText: {
    fontSize: 13,
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
  statIcon: {
    fontSize: iconSize.lg,
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
