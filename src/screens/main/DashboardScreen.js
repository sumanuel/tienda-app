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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Resumen general de tu negocio</Text>

      {/* Tasa de Cambio */}
      <TouchableOpacity
        style={[styles.modernCard, { backgroundColor: "#6366f1" }]}
        onPress={() => navigation.navigate("ExchangeRate")}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>💱</Text>
          <Text style={styles.cardTitle}>Tasa de Cambio</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.mainValue}>
            {rate ? `VES. ${rate.toFixed(2)}` : "Cargando..."}
          </Text>
          <Text style={styles.cardSubtitle}>
            {lastUpdate
              ? `Actualizado: ${new Date(lastUpdate).toLocaleTimeString()}`
              : ""}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Estadísticas de Ventas Hoy */}
      <TouchableOpacity
        style={[styles.modernCard, { backgroundColor: "#ec4899" }]}
        onPress={() => navigation.navigate("Sales")}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>💰</Text>
          <Text style={styles.cardTitle}>Ventas de Hoy</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.mainValue}>
            VES. {(todayStats?.total || 0).toFixed(2)}
          </Text>
          <View style={styles.secondaryStats}>
            <Text style={styles.secondaryValue}>{todayStats?.count || 0}</Text>
            <Text style={styles.secondaryLabel}>ventas</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Estadísticas de Inventario - OCULTA */}
      {/*
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Inventario</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {inventoryStats?.totalItems || 0}
            </Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
          <View style={styles.stat}>
            <Text
              style={[
                styles.statValue,
                inventoryStats?.lowStockCount > 0 && styles.warning,
              ]}
            >
              {inventoryStats?.lowStockCount || 0}
            </Text>
            <Text style={styles.statLabel}>Stock Bajo</Text>
          </View>
        </View>
      </View>
      */}

      {/* Estadísticas de Clientes - OCULTA */}
      {/*
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Clientes</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{customers?.length || 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {customers?.filter((c) => c.active !== 0).length || 0}
            </Text>
            <Text style={styles.statLabel}>Activos</Text>
          </View>
        </View>
      </View>
      */}

      {/* Estadísticas de Cuentas por Cobrar */}
      <TouchableOpacity
        style={[styles.modernCard, { backgroundColor: "#06b6d4" }]}
        onPress={() => navigation.navigate("AccountsReceivable")}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>📈</Text>
          <Text style={styles.cardTitle}>Cuentas por Cobrar</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.mainValue}>
            VES. {(receivableStats?.pending || 0).toFixed(2)}
          </Text>
          <View style={styles.secondaryStats}>
            <Text
              style={[
                styles.secondaryValue,
                (receivableStats?.overdue || 0) > 0 && styles.warningValue,
              ]}
            >
              VES. {(receivableStats?.overdue || 0).toFixed(2)}
            </Text>
            <Text style={styles.secondaryLabel}>vencidas</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Estadísticas de Cuentas por Pagar */}
      <TouchableOpacity
        style={[styles.modernCard, { backgroundColor: "#10b981" }]}
        onPress={() => navigation.navigate("AccountsPayable")}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>📉</Text>
          <Text style={styles.cardTitle}>Cuentas por Pagar</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.mainValue}>
            VES. {(payableStats?.pending || 0).toFixed(2)}
          </Text>
          <View style={styles.secondaryStats}>
            <Text
              style={[
                styles.secondaryValue,
                (payableStats?.overdue || 0) > 0 && styles.warningValue,
              ]}
            >
              VES. {(payableStats?.overdue || 0).toFixed(2)}
            </Text>
            <Text style={styles.secondaryLabel}>vencidas</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Accesos Rápidos */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          key="pos"
          style={[styles.modernActionCard, { backgroundColor: "#c4b5fd" }]}
          onPress={() => navigation.navigate("POS")}
        >
          <Text style={styles.actionIcon}>🛒</Text>
          <Text style={styles.actionText}>Nueva Venta</Text>
        </TouchableOpacity>

        <TouchableOpacity
          key="products"
          style={[styles.modernActionCard, { backgroundColor: "#fca5a5" }]}
          onPress={() => navigation.navigate("Products")}
        >
          <Text style={styles.actionIcon}>📦</Text>
          <Text style={styles.actionText}>Productos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          key="exchange"
          style={[styles.modernActionCard, { backgroundColor: "#fdba74" }]}
          onPress={() => navigation.getParent().navigate("ExchangeRate")}
        >
          <Text style={styles.actionIcon}>💱</Text>
          <Text style={styles.actionText}>Tasa</Text>
        </TouchableOpacity>

        <TouchableOpacity
          key="sales"
          style={[styles.modernActionCard, { backgroundColor: "#86efac" }]}
          onPress={() => navigation.navigate("Sales")}
        >
          <Text style={styles.actionIcon}>📊</Text>
          <Text style={styles.actionText}>Ventas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          key="customers"
          style={[styles.modernActionCard, { backgroundColor: "#7dd3fc" }]}
          onPress={() => navigation.navigate("Customers")}
        >
          <Text style={styles.actionIcon}>👥</Text>
          <Text style={styles.actionText}>Clientes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          key="suppliers"
          style={[styles.modernActionCard, { backgroundColor: "#d2b48c" }]}
          onPress={() => navigation.navigate("Suppliers")}
        >
          <Text style={styles.actionIcon}>🏢</Text>
          <Text style={styles.actionText}>Proveedores</Text>
        </TouchableOpacity>

        <TouchableOpacity
          key="accounts-receivable"
          style={[styles.modernActionCard, { backgroundColor: "#f9a8d4" }]}
          onPress={() => navigation.navigate("AccountsReceivable")}
        >
          <Text style={styles.actionIcon}>💰</Text>
          <Text style={styles.actionText}>Cuentas por Cobrar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          key="accounts-payable"
          style={[styles.modernActionCard, { backgroundColor: "#a7f3d0" }]}
          onPress={() => navigation.navigate("AccountsPayable")}
        >
          <Text style={styles.actionIcon}>💳</Text>
          <Text style={styles.actionText}>Cuentas por Pagar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 16,
    paddingBottom: 100,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
    marginTop: 20,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 24,
    textAlign: "center",
    fontWeight: "400",
  },
  modernCard: {
    borderRadius: 20,
    marginBottom: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    padding: 24,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    opacity: 0.9,
  },
  cardContent: {
    alignItems: "center",
  },
  mainValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#ffffff",
    opacity: 0.8,
    textAlign: "center",
  },
  secondaryStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  secondaryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    opacity: 0.9,
    marginRight: 4,
  },
  secondaryLabel: {
    fontSize: 12,
    color: "#ffffff",
    opacity: 0.7,
    textTransform: "lowercase",
  },
  warningValue: {
    color: "#ffeb3b",
    opacity: 1,
  },
  // Estilos antiguos mantenidos para compatibilidad
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  warning: {
    color: "#FF9800",
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 8,
  },
  modernActionCard: {
    width: "48%",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    textAlign: "center",
  },
});

export default DashboardScreen;
