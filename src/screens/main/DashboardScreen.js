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
            <Text style={styles.currencyButtonTextActive}>VES (Bs.)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.currencyButton}
            onPress={() => navigation.navigate("ExchangeRate")}
          >
            <Text style={styles.currencyButtonText}>USD ($)</Text>
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
            Bs.{" "}
            {(todayStats?.total || 0).toLocaleString("es-VE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
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
        {/* Tasa de Cambio */}
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate("ExchangeRate")}
        >
          <Text style={styles.statIcon}>💱</Text>
          <Text style={styles.statLabel}>Tasa de Cambio</Text>
          <Text style={styles.statValue}>
            {rate ? `${rate.toFixed(2)} Bs.` : "Cargando..."}
          </Text>
        </TouchableOpacity>

        {/* Cuentas por Cobrar */}
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate("AccountsReceivable")}
        >
          <Text style={styles.statIcon}>📈</Text>
          <Text style={styles.statLabel}>Por Cobrar</Text>
          <Text style={styles.statValue}>
            {(receivableStats?.pending || 0).toFixed(2)} Bs.
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
            {(payableStats?.pending || 0).toFixed(2)} Bs.
          </Text>
          {(payableStats?.overdue || 0) > 0 && (
            <Text style={styles.statWarning}>
              {(payableStats?.overdue || 0).toFixed(2)} vencidas
            </Text>
          )}
        </TouchableOpacity>

        {/* Inventario */}
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => navigation.navigate("Products")}
        >
          <Text style={styles.statIcon}>📦</Text>
          <Text style={styles.statLabel}>Productos</Text>
          <Text style={styles.statValue}>
            {inventoryStats?.totalItems || 0}
          </Text>
          {(inventoryStats?.lowStockCount || 0) > 0 && (
            <Text style={styles.statWarning}>
              {inventoryStats?.lowStockCount} stock bajo
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Accesos Rápidos */}
      <Text style={styles.sectionTitle}>Accesos Rápidos</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => navigation.navigate("POS")}
        >
          <Text style={styles.quickActionIcon}>🛒</Text>
          <Text style={styles.quickActionText}>Nueva Venta</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => navigation.navigate("Products")}
        >
          <Text style={styles.quickActionIcon}>📦</Text>
          <Text style={styles.quickActionText}>Productos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => navigation.navigate("Customers")}
        >
          <Text style={styles.quickActionIcon}>👥</Text>
          <Text style={styles.quickActionText}>Clientes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => navigation.navigate("Suppliers")}
        >
          <Text style={styles.quickActionIcon}>🏢</Text>
          <Text style={styles.quickActionText}>Proveedores</Text>
        </TouchableOpacity>
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
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    padding: 20,
    paddingTop: 50,
    paddingBottom: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  businessName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  lastSession: {
    fontSize: 12,
    color: "#ffffff",
    opacity: 0.9,
    marginTop: 4,
    marginBottom: 16,
  },
  currencyButtons: {
    flexDirection: "row",
    gap: 12,
  },
  currencyButtonActive: {
    backgroundColor: "#ffffff",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  currencyButtonTextActive: {
    color: "#4CAF50",
    fontWeight: "600",
    fontSize: 13,
  },
  currencyButton: {
    backgroundColor: "transparent",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  currencyButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 13,
  },

  // Main Card styles
  mainCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    margin: 16,
    marginTop: 20,
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  mainCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  mainCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  accountNumber: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  shareIcon: {
    fontSize: 24,
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
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 16,
    marginTop: 8,
    marginBottom: 12,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  statCard: {
    width: "47%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    margin: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    fontWeight: "500",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  statWarning: {
    fontSize: 11,
    color: "#ff9800",
    marginTop: 4,
    fontWeight: "500",
  },

  // Quick Actions
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  quickActionCard: {
    width: "47%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    margin: 8,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
});

export default DashboardScreen;
