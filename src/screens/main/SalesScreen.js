import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useSales } from "../../hooks/useSales";

/**
 * Pantalla de ventas
 */
export const SalesScreen = () => {
  const { sales, todayStats, loading, getSaleDetails } = useSales();
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleDetails, setSaleDetails] = useState(null);

  /**
   * Muestra detalles de una venta
   */
  const showSaleDetails = async (sale) => {
    try {
      console.log("Cargando detalles de venta #", sale.id);
      const details = await getSaleDetails(sale.id);
      console.log("Detalles obtenidos:", details);
      console.log("Items de la venta:", details?.items);
      setSelectedSale(sale);
      setSaleDetails(details);
    } catch (error) {
      console.error("Error cargando detalles:", error);
      Alert.alert("Error", "No se pudieron cargar los detalles de la venta");
    }
  };

  /**
   * Cierra los detalles de venta
   */
  const closeSaleDetails = () => {
    setSelectedSale(null);
    setSaleDetails(null);
  };

  /**
   * Renderiza una venta en la lista
   */
  const renderSale = ({ item }) => (
    <TouchableOpacity
      style={styles.saleCard}
      onPress={() => showSaleDetails(item)}
    >
      <View style={styles.saleHeader}>
        <View>
          <Text style={styles.saleId}>Venta #{item.id}</Text>
          <Text style={styles.saleDate}>
            {new Date(item.createdAt).toLocaleDateString()} -{" "}
            {new Date(item.createdAt).toLocaleTimeString()}
          </Text>
        </View>
        <View style={styles.saleStatus}>
          <Text style={styles.saleMethod}>
            {getPaymentMethodText(item.paymentMethod)}
          </Text>
        </View>
      </View>

      <View style={styles.saleDetails}>
        <View style={styles.saleInfo}>
          <Text style={styles.saleCustomer}>
            Cliente:{" "}
            {item.notes ? item.notes.replace("Cliente: ", "") : "Sin nombre"}
          </Text>
          <Text style={styles.saleItems}>
            {item.itemCount || 0} producto{item.itemCount !== 1 ? "s" : ""}
          </Text>
        </View>
        <Text style={styles.saleAmount}>Bs. {item.total.toFixed(2)}</Text>
      </View>
    </TouchableOpacity>
  );

  /**
   * Renderiza un item de la venta en los detalles
   */
  const renderSaleItem = ({ item }) => (
    <View style={styles.detailItem}>
      <View style={styles.detailItemInfo}>
        <Text style={styles.detailItemName}>{item.productName}</Text>
        <Text style={styles.detailItemQuantity}>
          {item.quantity} x Bs. {item.price.toFixed(2)}
        </Text>
      </View>
      <Text style={styles.detailItemSubtotal}>
        Bs. {item.subtotal.toFixed(2)}
      </Text>
    </View>
  );

  /**
   * Obtiene el texto del método de pago
   */
  const getPaymentMethodText = (method) => {
    switch (method) {
      case "cash":
        return "Efectivo";
      case "card":
        return "Tarjeta";
      case "transfer":
        return "Transferencia";
      default:
        return method;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando ventas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial de Ventas</Text>
      </View>

      {/* Estadísticas del día */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>📊 Resumen de Hoy</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{todayStats?.count || 0}</Text>
            <Text style={styles.statLabel}>Ventas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              Bs. {(todayStats?.total || 0).toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      </View>

      {/* Lista de ventas o detalles */}
      {!selectedSale ? (
        <FlatList
          data={sales}
          renderItem={renderSale}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyText}>No hay ventas registradas</Text>
              <Text style={styles.emptySubtext}>
                Las ventas aparecerán aquí cuando completes tu primera venta
              </Text>
            </View>
          }
        />
      ) : (
        <View style={styles.detailsContainer}>
          <View style={styles.detailsHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={closeSaleDetails}
            >
              <Text style={styles.backButtonText}>← Volver</Text>
            </TouchableOpacity>
            <Text style={styles.detailsTitle}>
              Detalles de Venta #{selectedSale.id}
            </Text>
          </View>

          <View style={styles.saleSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cliente:</Text>
              <Text style={styles.summaryValue}>
                {selectedSale.notes
                  ? selectedSale.notes.replace("Cliente: ", "")
                  : "Sin nombre"}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Fecha:</Text>
              <Text style={styles.summaryValue}>
                {new Date(selectedSale.createdAt).toLocaleDateString()}{" "}
                {new Date(selectedSale.createdAt).toLocaleTimeString()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Pago:</Text>
              <Text style={styles.summaryValue}>
                {getPaymentMethodText(selectedSale.paymentMethod)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total:</Text>
              <Text style={styles.summaryTotal}>
                Bs. {selectedSale.total.toFixed(2)}
              </Text>
            </View>
          </View>

          <Text style={styles.itemsTitle}>Productos Vendidos</Text>
          <FlatList
            data={saleDetails?.items || []}
            renderItem={renderSaleItem}
            keyExtractor={(item, index) => index.toString()}
            style={styles.itemsList}
            ListEmptyComponent={
              <Text style={styles.noItemsText}>No se encontraron items</Text>
            }
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    fontSize: 18,
    color: "#666",
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
  },
  statsCard: {
    backgroundColor: "#4CAF50",
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  statsTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
  },
  statLabel: {
    color: "#fff",
    fontSize: 16,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 20,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  saleId: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  saleDate: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  saleStatus: {
    alignItems: "flex-end",
  },
  saleMethod: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "600",
    backgroundColor: "#e8f5e8",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  saleDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  saleInfo: {
    flex: 1,
  },
  saleCustomer: {
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
  },
  saleItems: {
    fontSize: 14,
    color: "#666",
  },
  saleAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
  detailsContainer: {
    flex: 1,
  },
  detailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "600",
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  saleSummary: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  summaryLabel: {
    fontSize: 16,
    color: "#666",
  },
  summaryValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  summaryTotal: {
    fontSize: 18,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  itemsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    margin: 16,
    marginBottom: 8,
  },
  itemsList: {
    flex: 1,
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  detailItemInfo: {
    flex: 1,
  },
  detailItemName: {
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
  },
  detailItemQuantity: {
    fontSize: 14,
    color: "#666",
  },
  detailItemSubtotal: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "600",
  },
  noItemsText: {
    textAlign: "center",
    color: "#999",
    marginTop: 20,
  },
});

export default SalesScreen;
