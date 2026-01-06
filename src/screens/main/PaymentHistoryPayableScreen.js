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

export const PaymentHistoryPayableScreen = () => {
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
      const paymentData = await getPayments(account.id, "payable");
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
          {formatCurrency(item.amount, "VES")}
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

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>💳</Text>
      <Text style={styles.emptyTitle}>Sin pagos registrados</Text>
      <Text style={styles.emptySubtitle}>
        Los pagos realizados aparecerán aquí
      </Text>
    </View>
  );

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial de Pagos</Text>
        <Text style={styles.subtitle}>
          {account.supplierName} - {formatCurrency(account.amount || 0, "VES")}
        </Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Pagado</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(totalPaid, "VES")}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Pagos Registrados</Text>
          <Text style={styles.summaryValue}>{payments.length}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#2e7d32" />
          <Text style={styles.loadingText}>Cargando pagos...</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          renderItem={renderPaymentItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    padding: spacing.xl,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: {
    fontSize: rf(24),
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: rf(16),
    color: "#64748b",
  },
  summary: {
    flexDirection: "row",
    padding: spacing.lg,
    backgroundColor: "#fff",
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: borderRadius.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: rf(12),
    color: "#64748b",
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: rf(18),
    fontWeight: "bold",
    color: "#1e293b",
  },
  list: {
    padding: spacing.lg,
  },
  paymentItem: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  paymentAmount: {
    fontSize: rf(18),
    fontWeight: "bold",
    color: "#2e7d32",
  },
  paymentMethod: {
    fontSize: rf(14),
    color: "#64748b",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  paymentDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  paymentDate: {
    fontSize: rf(14),
    color: "#64748b",
  },
  paymentReference: {
    fontSize: rf(14),
    color: "#64748b",
  },
  paymentNotes: {
    fontSize: rf(14),
    color: "#64748b",
    fontStyle: "italic",
  },
  emptyState: {
    paddingTop: vs(40),
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: iconSize.xl,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: rf(18),
    fontWeight: "600",
    color: "#374151",
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: rf(14),
    color: "#6b7280",
    textAlign: "center",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748b",
  },
});

export default PaymentHistoryPayableScreen;
