import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useAccounts } from "../../hooks/useAccounts";
import { useInventory } from "../../hooks/useInventory";
import { useExchangeRateContext } from "../../contexts/ExchangeRateContext";
import { formatCurrency } from "../../utils/currency";
import { s, rf, vs, hs, spacing, borderRadius } from "../../utils/responsive";

const CapitalScreen = () => {
  const { receivableStats, payableStats } = useAccounts();
  const { inventory } = useInventory();
  const { rate } = useExchangeRateContext();

  const exchangeRate = Number(rate) || 0;

  const totalReceivable = receivableStats?.totalAmount || 0;
  const totalPayable = payableStats?.totalAmount || 0;

  const capital = totalReceivable - totalPayable;

  const formatAmount = (value) => formatCurrency(value || 0, "VES");
  const formatUSD = (value) => formatCurrency(value || 0, "USD");

  // Inventario: asumimos que products.cost está en USD (costo USD)
  const inventoryCostUSD = (inventory || []).reduce((sum, product) => {
    const stock = Number(product.stock) || 0;
    const costUSD = Number(product.cost) || 0;
    return sum + stock * costUSD;
  }, 0);
  const inventoryCostVES = exchangeRate ? inventoryCostUSD * exchangeRate : 0;

  const inventorySellUSD = (inventory || []).reduce((sum, product) => {
    const stock = Number(product.stock) || 0;
    const priceUSD = Number(product.priceUSD) || 0;
    return sum + stock * priceUSD;
  }, 0);

  const inventorySellVES = (inventory || []).reduce((sum, product) => {
    const stock = Number(product.stock) || 0;
    const priceVES =
      Number(product.priceVES) ||
      (exchangeRate ? (Number(product.priceUSD) || 0) * exchangeRate : 0);
    return sum + Math.round(stock * priceVES * 100) / 100; // Redondear a 2 decimales
  }, 0);

  // Redondear valores finales a 2 decimales para consistencia
  const roundedInventorySellVES = Math.round(inventorySellVES * 100) / 100;
  const roundedCapital = Math.round(capital * 100) / 100;
  const roundedInventorySellUSD = Math.round(inventorySellUSD * 100) / 100;
  const roundedExchangeRate = Math.round(exchangeRate * 100) / 100;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Capital Disponible USD</Text>
        <Text
          style={[
            styles.summaryAmount,
            roundedInventorySellUSD + roundedCapital / roundedExchangeRate >= 0
              ? styles.positiveValue
              : styles.negativeValue,
          ]}
        >
          {formatUSD(
            roundedInventorySellUSD + roundedCapital / roundedExchangeRate
          )}
        </Text>
        <Text style={styles.summarySubtitle}>Inventario + Capital actual</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Capital Disponible VES</Text>
        <Text
          style={[
            styles.summaryAmount,
            roundedInventorySellVES + roundedCapital >= 0
              ? styles.positiveValue
              : styles.negativeValue,
          ]}
        >
          {formatAmount(roundedInventorySellVES + roundedCapital)}
        </Text>
        <Text style={styles.summarySubtitle}>Inventario + Capital actual</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Inventario (Costo)</Text>
        <Text style={styles.summaryAmount}>{formatUSD(inventoryCostUSD)}</Text>
        <Text style={styles.summarySubtitle}>
          {formatAmount(inventoryCostVES)}{" "}
          {exchangeRate ? `• Tasa: ${exchangeRate.toFixed(2)} VES.` : ""}
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Inventario (Si vendo todo)</Text>
        <Text style={styles.summaryAmount}>{formatUSD(inventorySellUSD)}</Text>
        <Text style={styles.summarySubtitle}>
          {formatAmount(inventorySellVES)}
        </Text>
      </View>

      <View style={styles.grid}>
        <View style={[styles.infoCard, styles.cardSpacing]}>
          <Text style={styles.cardTitle}>Cuentas por Cobrar</Text>
          <Text style={styles.cardAmount}>
            {formatUSD(totalReceivable / exchangeRate)}
          </Text>
          <Text style={styles.cardSubtitle}>
            {formatAmount(totalReceivable)}{" "}
            {exchangeRate ? `• Tasa: ${exchangeRate.toFixed(2)} VES.` : ""}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Cuentas por Pagar</Text>
          <Text style={[styles.cardAmount, styles.payableAmount]}>
            {formatUSD(totalPayable / exchangeRate)}
          </Text>
          <Text style={styles.cardSubtitle}>
            {formatAmount(totalPayable)}{" "}
            {exchangeRate ? `• Tasa: ${exchangeRate.toFixed(2)} VES.` : ""}
          </Text>
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
    padding: spacing.md,
    paddingBottom: vs(40),
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: vs(10) },
    shadowOpacity: 0.08,
    shadowRadius: s(20),
    elevation: 6,
  },
  summaryTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#2f3a4c",
  },
  summaryAmount: {
    fontSize: rf(24),
    fontWeight: "700",
    marginTop: vs(8),
  },
  positiveValue: {
    color: "#2e7d32",
  },
  negativeValue: {
    color: "#c62828",
  },
  summarySubtitle: {
    marginTop: vs(4),
    color: "#6c7a8a",
    fontSize: rf(14),
  },
  grid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardSpacing: {
    marginRight: hs(16),
  },
  infoCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: vs(6) },
    shadowOpacity: 0.08,
    shadowRadius: s(12),
    elevation: 4,
  },
  cardTitle: {
    fontSize: rf(15),
    fontWeight: "600",
    color: "#2f3a4c",
    marginBottom: vs(6),
  },
  cardAmount: {
    fontSize: rf(18),
    fontWeight: "700",
    color: "#2e7d32",
    marginBottom: vs(2),
  },
  payableAmount: {
    color: "#c62828",
  },
  cardSubtitle: {
    fontSize: rf(14),
    color: "#6c7a8a",
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: vs(6),
  },
  cardLabel: {
    fontSize: rf(13),
    color: "#6c7a8a",
  },
  cardValue: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "#2f3a4c",
  },
  noteCard: {
    marginTop: vs(20),
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: vs(6) },
    shadowOpacity: 0.08,
    shadowRadius: s(12),
    elevation: 4,
  },
  noteTitle: {
    fontSize: rf(15),
    fontWeight: "600",
    color: "#2f3a4c",
    marginBottom: vs(6),
  },
  noteText: {
    fontSize: rf(14),
    color: "#6c7a8a",
    lineHeight: rf(20),
  },
});

export default CapitalScreen;
