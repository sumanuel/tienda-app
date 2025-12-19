import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useAccounts } from "../../hooks/useAccounts";
import { formatCurrency } from "../../utils/currency";

const CapitalScreen = () => {
  const { receivableStats, payableStats } = useAccounts();

  const totalReceivable = receivableStats?.totalAmount || 0;
  const totalPayable = payableStats?.totalAmount || 0;
  const pendingReceivable = receivableStats?.pending || 0;
  const pendingPayable = payableStats?.pending || 0;
  const overdueReceivable = receivableStats?.overdue || 0;
  const overduePayable = payableStats?.overdue || 0;

  const capital = totalReceivable - totalPayable;

  const formatAmount = (value) => formatCurrency(value || 0, "VES");

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Capital Disponible</Text>
        <Text
          style={[
            styles.summaryAmount,
            capital >= 0 ? styles.positiveValue : styles.negativeValue,
          ]}
        >
          {formatAmount(capital)}
        </Text>
        <Text style={styles.summarySubtitle}>
          Diferencia entre cuentas por cobrar y pagar
        </Text>
      </View>

      <View style={styles.grid}>
        <View style={[styles.infoCard, styles.cardSpacing]}>
          <Text style={styles.cardTitle}>Cuentas por Cobrar</Text>
          <Text style={styles.cardAmount}>{formatAmount(totalReceivable)}</Text>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Pendientes</Text>
            <Text style={styles.cardValue}>{pendingReceivable}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Vencidas</Text>
            <Text style={styles.cardValue}>{overdueReceivable}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Cuentas por Pagar</Text>
          <Text style={[styles.cardAmount, styles.payableAmount]}>
            {formatAmount(totalPayable)}
          </Text>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Pendientes</Text>
            <Text style={styles.cardValue}>{pendingPayable}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Vencidas</Text>
            <Text style={styles.cardValue}>{overduePayable}</Text>
          </View>
        </View>
      </View>

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Sugerencias</Text>
        <Text style={styles.noteText}>
          Mantén tus cuentas al día para fortalecer el capital disponible y
          evitar sorpresas en tu flujo de caja.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8edf2",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2f3a4c",
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: "700",
    marginTop: 12,
  },
  positiveValue: {
    color: "#2e7d32",
  },
  negativeValue: {
    color: "#c62828",
  },
  summarySubtitle: {
    marginTop: 8,
    color: "#6c7a8a",
    fontSize: 14,
  },
  grid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardSpacing: {
    marginRight: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2f3a4c",
    marginBottom: 8,
  },
  cardAmount: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2e7d32",
    marginBottom: 12,
  },
  payableAmount: {
    color: "#c62828",
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  cardLabel: {
    fontSize: 13,
    color: "#6c7a8a",
  },
  cardValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2f3a4c",
  },
  noteCard: {
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2f3a4c",
    marginBottom: 6,
  },
  noteText: {
    fontSize: 14,
    color: "#6c7a8a",
    lineHeight: 20,
  },
});

export default CapitalScreen;
