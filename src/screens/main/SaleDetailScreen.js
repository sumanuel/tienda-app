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
        <ActivityIndicator size="large" color="#2f5ae0" />
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>Venta #{sale.id}</Text>
          <Text style={styles.subtitle}>
            {new Date(sale.createdAt).toLocaleDateString()} ·{" "}
            {new Date(sale.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        <View style={styles.amountChip}>
          <Text style={styles.amountText}>
            {formatCurrency(sale.total, "VES")}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Cliente</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>
              {sale.notes ? sale.notes.replace("Cliente: ", "") : "Sin nombre"}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Pago</Text>
            <Text style={styles.summaryValue}>
              {getPaymentMethodText(sale.paymentMethod)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Productos</Text>
            <Text style={styles.summaryValue}>
              {details?.items?.length || 0}
            </Text>
          </View>
        </View>

        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>Productos</Text>
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
  },
  backButton: {
    backgroundColor: "#f0f3fa",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButtonText: {
    color: "#2f5ae0",
    fontWeight: "700",
    fontSize: 14,
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2633",
  },
  subtitle: {
    fontSize: 14,
    color: "#6f7c8c",
  },
  amountChip: {
    backgroundColor: "#2fb176",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  amountText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  summary: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 24,
  },
  summaryItem: {
    flex: 1,
    gap: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7a8796",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2633",
  },
  productsSection: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2633",
    marginBottom: 16,
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
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2633",
  },
  detailItemQuantity: {
    fontSize: 14,
    color: "#6f7c8c",
  },
  detailItemTotal: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2633",
  },
  detailDivider: {
    height: 1,
    backgroundColor: "#e4e9f2",
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
