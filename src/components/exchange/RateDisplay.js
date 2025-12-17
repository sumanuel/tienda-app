import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatCurrency } from "../../utils/currency";
import { formatExchangeRate } from "../../utils/exchange";

/**
 * Componente para mostrar la tasa de cambio actual
 */
export const RateDisplay = ({ rate, source, lastUpdate, style }) => {
  if (!rate) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.header}>
          <Text style={styles.label}>💱 Tasa Actual</Text>
          <Text style={styles.source}>BCV</Text>
        </View>
        <Text style={styles.noRate}>⚠️ Tasa no disponible</Text>
      </View>
    );
  }

  const formattedDate = lastUpdate
    ? new Date(lastUpdate).toLocaleString()
    : "Desconocido";

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.label}>💱 Tasa Actual</Text>
        {source && <Text style={styles.source}>{source}</Text>}
      </View>

      <View style={styles.rateContainer}>
        <Text style={styles.currency}>1 USD equivale a</Text>
        <Text style={styles.rate}>VES. {formatExchangeRate(rate)}</Text>
      </View>

      <Text style={styles.lastUpdate}>
        📅 Última actualización: {formattedDate}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  source: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "700",
    textTransform: "uppercase",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rateContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  currency: {
    fontSize: 18,
    color: "#475569",
    fontWeight: "500",
    marginBottom: 8,
  },
  rate: {
    fontSize: 36,
    fontWeight: "700",
    color: "#6366f1",
    letterSpacing: 1,
  },
  lastUpdate: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    fontWeight: "500",
  },
  noRate: {
    fontSize: 16,
    color: "#94a3b8",
    textAlign: "center",
    fontWeight: "500",
  },
});

export default RateDisplay;
