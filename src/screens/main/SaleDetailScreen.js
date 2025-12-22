import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSales } from "../../hooks/useSales";
import { formatCurrency } from "../../utils/currency";

/**
 * Pantalla de detalle de venta
 */
export const SaleDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { saleId } = route.params;
  const { getSaleDetails } = useSales();

  const [sale, setSale] = useState(null);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSaleDetails();
  }, [saleId]);

  const loadSaleDetails = async () => {
    try {
      setLoading(true);
      const saleData = await getSaleDetails(saleId);
      setSale(saleData);
      setDetails(saleData);
    } catch (error) {
      console.error("Error loading sale details:", error);
      // Handle error, maybe navigate back
      navigation.goBack();
    } finally {
      setLoading(false);
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

  const renderDetailItem = ({ item, index }) => (
    <View style={[styles.detailItem, index !== 0 && styles.detailItemSpacing]}>
      <View style={styles.detailItemInfo}>
        <Text style={styles.detailItemName}>{item.productName}</Text>
        <Text style={styles.detailItemQuantity}>
          {item.quantity} × {formatCurrency(item.price, "VES")}
        </Text>
      </View>
      <Text style={styles.detailItemTotal}>
        {formatCurrency(item.subtotal, "VES")}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando detalles de la venta...</Text>
      </SafeAreaView>
    );
  }

  if (!sale) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se pudo cargar la venta</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.title}>Venta #{sale.id}</Text>
            <Text style={styles.subtitle}>
              {new Date(sale.createdAt).toLocaleDateString("es-VE")} ·{" "}
              {new Date(sale.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            <Text style={styles.subtitle}>
              {getPaymentMethodText(sale.paymentMethod)}
            </Text>
          </View>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalAmount}>
            {formatCurrency(sale.total, "VES")}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resumen</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Cliente</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {sale.notes ? sale.notes.replace("Cliente: ", "") : "Sin nombre"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Método de pago</Text>
            <Text style={styles.rowValue}>
              {getPaymentMethodText(sale.paymentMethod)}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Productos</Text>
            <Text style={styles.rowValue}>{details?.items?.length || 0}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Productos</Text>
          <FlatList
            data={details?.items || []}
            renderItem={renderDetailItem}
            keyExtractor={(_, index) => `detail-${index}`}
            ItemSeparatorComponent={() => <View style={styles.detailDivider} />}
            ListEmptyComponent={
              <View style={styles.emptyProducts}>
                <Text style={styles.emptyProductsText}>
                  No se encontraron productos para esta venta.
                </Text>
              </View>
            }
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8edf2",
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
  scrollContent: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 60,
  },
  header: {
    backgroundColor: "#4CAF50",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  backButton: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 12,
    color: "#fff",
    opacity: 0.9,
  },
  totalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#999",
    letterSpacing: 1,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: "#333",
    marginTop: 6,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  rowLabel: {
    fontSize: 13,
    color: "#6c7a8a",
    fontWeight: "600",
  },
  rowValue: {
    flex: 1,
    fontSize: 13,
    color: "#2f3a4c",
    fontWeight: "700",
    textAlign: "right",
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
    fontSize: 14,
    fontWeight: "700",
    color: "#2f3a4c",
  },
  detailItemQuantity: {
    fontSize: 12,
    color: "#6c7a8a",
  },
  detailItemTotal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2f3a4c",
  },
  detailDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginTop: 12,
  },
  emptyProducts: {
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyProductsText: {
    fontSize: 14,
    color: "#6f7c8c",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#d6455d",
    textAlign: "center",
  },
});

export default SaleDetailScreen;
