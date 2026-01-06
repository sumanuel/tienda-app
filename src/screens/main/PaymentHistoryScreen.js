import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAccounts } from "../../hooks/useAccounts";
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

export const PaymentHistoryScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { account } = route.params;
  const { getPayments } = useAccounts();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const paymentData = await getPayments(account.id);
      setPayments(paymentData);
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodLabel = (method) => {
    const methods = {
      cash: "Efectivo",
      card: "Tarjeta",
      transfer: "Transferencia",
      pago_movil: "Pago Móvil",
    };
    return methods[method] || method;
  };

  const renderPaymentItem = ({ item }) => (
    <View style={styles.paymentItem}>
      <View style={styles.paymentHeader}>
        <Text style={styles.paymentAmount}>
          {formatCurrency(item.amount, account.currency || "VES")}
        </Text>
        <Text style={styles.paymentMethod}>
          {getPaymentMethodLabel(item.paymentMethod)}
        </Text>
      </View>

      <View style={styles.paymentDetails}>
        <Text style={styles.paymentDate}>
          {new Date(item.paymentDate).toLocaleDateString()}
        </Text>
        {item.reference && (
          <Text style={styles.paymentReference}>Ref: {item.reference}</Text>
        )}
      </View>

      {item.notes && <Text style={styles.paymentNotes}>{item.notes}</Text>}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>💳</Text>
      <Text style={styles.emptyTitle}>Sin pagos registrados</Text>
      <Text style={styles.emptyText}>
        No se han registrado pagos para esta cuenta aún.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f5ae0" />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial de Pagos</Text>
        <Text style={styles.subtitle}>{account.customerName}</Text>
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            Total pagado: {formatCurrency(totalPaid, account.currency || "VES")}
          </Text>
          <Text style={styles.summaryText}>
            De: {formatCurrency(account.amount, account.currency || "VES")}
          </Text>
        </View>
      </View>

      <FlatList
        data={payments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPaymentItem}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f7fa",
  },
  loadingText: {
    marginTop: vs(16),
    fontSize: rf(16),
    color: "#666",
  },
  header: {
    backgroundColor: "#fff",
    padding: spacing.xl,
    paddingTop: vs(16),
    borderBottomWidth: 1,
    borderBottomColor: "#e1e5e9",
  },
  title: {
    fontSize: rf(24),
    fontWeight: "bold",
    color: "#1a202c",
    marginBottom: vs(4),
  },
  subtitle: {
    fontSize: rf(16),
    color: "#718096",
    marginBottom: vs(12),
  },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: vs(8),
    borderTopWidth: 1,
    borderTopColor: "#e1e5e9",
  },
  summaryText: {
    fontSize: rf(14),
    color: "#4a5568",
    fontWeight: "500",
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: vs(32),
  },
  paymentItem: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: vs(12),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: s(4),
    elevation: 3,
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(8),
  },
  paymentAmount: {
    fontSize: rf(18),
    fontWeight: "bold",
    color: "#2f5ae0",
  },
  paymentMethod: {
    fontSize: rf(14),
    color: "#718096",
    backgroundColor: "#f7fafc",
    paddingHorizontal: hs(8),
    paddingVertical: vs(4),
    borderRadius: borderRadius.sm,
  },
  paymentDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: vs(8),
  },
  paymentDate: {
    fontSize: rf(14),
    color: "#4a5568",
  },
  paymentReference: {
    fontSize: rf(14),
    color: "#4a5568",
  },
  paymentNotes: {
    fontSize: rf(14),
    color: "#718096",
    fontStyle: "italic",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: vs(60),
    paddingHorizontal: hs(32),
  },
  emptyIcon: {
    fontSize: iconSize.xl,
    marginBottom: vs(16),
  },
  emptyTitle: {
    fontSize: rf(18),
    fontWeight: "600",
    color: "#2d3748",
    marginBottom: vs(8),
  },
  emptyText: {
    fontSize: rf(14),
    color: "#718096",
    textAlign: "center",
    lineHeight: rf(20),
  },
});
