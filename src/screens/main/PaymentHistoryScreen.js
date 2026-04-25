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

export const PaymentHistoryScreen = () => {
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
    <SurfaceCard style={styles.paymentItem}>
      <View style={styles.paymentHeader}>
        <Text style={styles.paymentAmount}>
          {formatCurrency(item.amount, account.currency || "VES")}
        </Text>
        <InfoPill
          text={getPaymentMethodLabel(item.paymentMethod)}
          tone="info"
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

  const renderEmptyState = () => (
    <EmptyStateCard
      title="Sin pagos registrados"
      subtitle="Los pagos aplicados a esta cuenta aparecerán aquí para que puedas revisar fecha, referencia y notas."
      style={styles.emptyState}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={UI_COLORS.info} />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const currency = account.currency || "VES";

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPaymentItem}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <ScreenHero
              iconName="time-outline"
              iconColor={UI_COLORS.info}
              eyebrow="Cobros"
              title="Historial de pagos"
              subtitle={`Consulta los abonos registrados para ${account.customerName} con una lectura rápida del progreso de la cuenta.`}
              pills={[
                {
                  text: `${payments.length} movimientos`,
                  tone: payments.length ? "info" : "neutral",
                },
                {
                  text: `Pagado ${formatCurrency(totalPaid, currency)}`,
                  tone: "accent",
                },
              ]}
            />

            <SurfaceCard style={styles.summaryCard}>
              <View style={styles.summaryMetric}>
                <Text style={styles.summaryLabel}>Total pagado</Text>
                <Text style={styles.summaryValueAccent}>
                  {formatCurrency(totalPaid, currency)}
                </Text>
              </View>
              <View style={styles.summaryMetric}>
                <Text style={styles.summaryLabel}>Monto original</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(account.amount, currency)}
                </Text>
              </View>
            </SurfaceCard>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_COLORS.page,
  },
  loadingContainer: {
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
  headerContent: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  listContainer: {
    paddingBottom: vs(40),
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
    fontWeight: "700",
    color: UI_COLORS.muted,
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
    color: UI_COLORS.info,
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
    paddingBottom: vs(32),
  },
});
