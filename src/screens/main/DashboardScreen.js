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

      {/* Tasa de Cambio */}
      <RateDisplay
        rate={rate}
        source="BCV"
        lastUpdate={lastUpdate}
        style={styles.card}
      />

      {/* Estadísticas de Ventas Hoy */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ventas de Hoy</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{todayStats?.count || 0}</Text>
            <Text style={styles.statLabel}>Ventas</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              VES. {(todayStats?.total || 0).toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      </View>

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
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cuentas por Cobrar</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              VES. {(receivableStats?.pending || 0).toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Pendiente</Text>
          </View>
          <View style={styles.stat}>
            <Text
              style={[
                styles.statValue,
                (receivableStats?.overdue || 0) > 0 && styles.warning,
              ]}
            >
              VES. {(receivableStats?.overdue || 0).toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Vencidas</Text>
          </View>
        </View>
      </View>

      {/* Estadísticas de Cuentas por Pagar */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cuentas por Pagar</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              VES. {(payableStats?.pending || 0).toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Pendiente</Text>
          </View>
          <View style={styles.stat}>
            <Text
              style={[
                styles.statValue,
                (payableStats?.overdue || 0) > 0 && styles.warning,
              ]}
            >
              VES. {(payableStats?.overdue || 0).toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Vencidas</Text>
          </View>
        </View>
      </View>

      {/* Accesos Rápidos */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          key="pos"
          style={styles.actionButton}
          onPress={() => navigation.navigate("POS")}
        >
          <Text style={styles.actionIcon}>🛒</Text>
          <Text style={styles.actionText}>Nueva Venta</Text>
        </TouchableOpacity>

        <TouchableOpacity
          key="products"
          style={styles.actionButton}
          onPress={() => navigation.navigate("Products")}
        >
          <Text style={styles.actionIcon}>📦</Text>
          <Text style={styles.actionText}>Productos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          key="exchange"
          style={styles.actionButton}
          onPress={() => navigation.getParent().navigate("ExchangeRate")}
        >
          <Text style={styles.actionIcon}>💱</Text>
          <Text style={styles.actionText}>Tasa</Text>
        </TouchableOpacity>

        <TouchableOpacity
          key="sales"
          style={styles.actionButton}
          onPress={() => navigation.navigate("Sales")}
        >
          <Text style={styles.actionIcon}>📊</Text>
          <Text style={styles.actionText}>Ventas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          key="customers"
          style={styles.actionButton}
          onPress={() => navigation.navigate("Customers")}
        >
          <Text style={styles.actionIcon}>👥</Text>
          <Text style={styles.actionText}>Clientes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          key="suppliers"
          style={styles.actionButton}
          onPress={() => navigation.navigate("Suppliers")}
        >
          <Text style={styles.actionIcon}>🏢</Text>
          <Text style={styles.actionText}>Proveedores</Text>
        </TouchableOpacity>

        <TouchableOpacity
          key="accounts-receivable"
          style={styles.actionButton}
          onPress={() => navigation.navigate("AccountsReceivable")}
        >
          <Text style={styles.actionIcon}>💰</Text>
          <Text style={styles.actionText}>Cuentas por Cobrar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          key="accounts-payable"
          style={styles.actionButton}
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
    backgroundColor: "#f5f5f5",
    padding: 16,
    paddingBottom: 100,
  },
  scrollContent: {
    paddingBottom: 120, // Espacio adicional para el menú de pestañas
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    marginTop: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
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
  actionButton: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
});

export default DashboardScreen;
