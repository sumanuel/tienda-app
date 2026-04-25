import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { useAccounts } from "../../hooks/useAccounts";
import { formatCurrency } from "../../utils/currency";
import {
  EmptyStateCard,
  InfoPill,
  ScreenHero,
  SurfaceCard,
  UI_COLORS,
  SHADOWS,
} from "../../components/common/AppUI";
import { rf, vs, spacing, borderRadius } from "../../utils/responsive";

export const PaymentHistoryPayableScreen = () => {
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
    <SurfaceCard style={styles.paymentItem}>
      <View style={styles.paymentHeader}>
        <Text style={styles.paymentAmount}>
          {formatCurrency(item.amount, "VES")}
        </Text>
        <InfoPill
          text={getPaymentMethodLabel(item.paymentMethod)}
          tone="warning"
        />
      </View>

      <View style={styles.paymentDetails}>
        <Text style={styles.paymentDate}>
          {new Date(item.paymentDate).toLocaleDateString()}
        </Text>
        {item.reference && (
          <Text style={styles.paymentReference}>Ref: {item.reference}</Text>
        )}
      </View>

      {item.notes ? (
        <Text style={styles.paymentNotes}>{item.notes}</Text>
      ) : null}
    </SurfaceCard>
  );

  const renderEmpty = () => (
    <EmptyStateCard
      title="Sin pagos registrados"
      subtitle="Los pagos al proveedor aparecerán aquí con fecha, referencia y notas para revisión rápida."
      style={styles.emptyState}
    />
  );

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={UI_COLORS.accent} />
          <Text style={styles.loadingText}>Cargando pagos...</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          renderItem={renderPaymentItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmpty}
          ListHeaderComponent={
            <View style={styles.headerContent}>
              <ScreenHero
                iconName="time-outline"
                iconColor={UI_COLORS.danger}
                eyebrow="Pagos"
                title="Historial de pagos"
                subtitle={`Consulta los pagos aplicados a ${account.supplierName} y el avance total de la obligación.`}
                pills={[
                  {
                    text: `${payments.length} movimientos`,
                    tone: payments.length ? "warning" : "neutral",
                  },
                  {
                    text: `Pagado ${formatCurrency(totalPaid, "VES")}`,
                    tone: "accent",
                  },
                ]}
              />

              <SurfaceCard style={styles.summaryCard}>
                <View style={styles.summaryMetric}>
                  <Text style={styles.summaryLabel}>Total pagado</Text>
                  <Text style={styles.summaryValueAccent}>
                    {formatCurrency(totalPaid, "VES")}
                  </Text>
                </View>
                <View style={styles.summaryMetric}>
                  <Text style={styles.summaryLabel}>Monto original</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(account.amount || 0, "VES")}
                  </Text>
                </View>
              </SurfaceCard>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_COLORS.page,
  },
  headerContent: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  summaryCard: {
    flexDirection: "row",
    gap: spacing.md,
    ...SHADOWS.soft,
  },
  summaryMetric: {
    flex: 1,
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    padding: spacing.md,
    gap: vs(4),
  },
  summaryLabel: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  summaryValue: {
    fontSize: rf(16),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  summaryValueAccent: {
    fontSize: rf(16),
    fontWeight: "800",
    color: UI_COLORS.accent,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  paymentItem: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: vs(8),
    ...SHADOWS.soft,
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  paymentAmount: {
    fontSize: rf(18),
    fontWeight: "800",
    color: UI_COLORS.danger,
  },
  paymentDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  paymentDate: {
    fontSize: rf(13),
    color: UI_COLORS.muted,
  },
  paymentReference: {
    fontSize: rf(13),
    color: UI_COLORS.muted,
  },
  paymentNotes: {
    fontSize: rf(13),
    color: UI_COLORS.text,
    lineHeight: vs(18),
  },
  emptyState: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: UI_COLORS.page,
  },
  loadingText: {
    marginTop: vs(16),
    fontSize: rf(16),
    color: UI_COLORS.muted,
  },
});

export default PaymentHistoryPayableScreen;
