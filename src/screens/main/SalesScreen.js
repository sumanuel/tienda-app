import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { useSales } from "../../hooks/useSales";

/**
 * Pantalla de ventas
 */
export const SalesScreen = () => {
  const { sales, todayStats, loading } = useSales();

  const renderSale = ({ item }) => (
    <View style={styles.saleCard}>
      <View style={styles.saleHeader}>
        <Text style={styles.saleId}>#{item.id}</Text>
        <Text style={styles.saleDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.saleDetails}>
        <Text style={styles.saleAmount}>Bs. {item.total.toFixed(2)}</Text>
        <Text style={styles.saleMethod}>{item.paymentMethod}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ventas</Text>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Hoy</Text>
        <Text style={styles.statsValue}>{todayStats?.count || 0} ventas</Text>
        <Text style={styles.statsTotal}>
          Bs. {(todayStats?.total || 0).toFixed(2)}
        </Text>
      </View>

      <FlatList
        data={sales}
        renderItem={renderSale}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No hay ventas registradas</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 16,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    paddingTop: 20,
  },
  statsCard: {
    backgroundColor: "#4CAF50",
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  statsTitle: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 8,
  },
  statsValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  statsTotal: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 8,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  saleCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  saleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  saleId: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  saleDate: {
    fontSize: 14,
    color: "#666",
  },
  saleDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  saleAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  saleMethod: {
    fontSize: 14,
    color: "#666",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 40,
    fontSize: 16,
  },
});

export default SalesScreen;
