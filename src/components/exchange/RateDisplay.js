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
        <Text style={styles.noRate}>Tasa no disponible</Text>
      </View>
    );
  }

  const formattedDate = lastUpdate
    ? new Date(lastUpdate).toLocaleString()
    : "Desconocido";

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.label}>Tasa de Cambio</Text>
        {source && <Text style={styles.source}>{source}</Text>}
      </View>

      <View style={styles.rateContainer}>
        <Text style={styles.currency}>1 USD =</Text>
        <Text style={styles.rate}>VES. {formatExchangeRate(rate)}</Text>
      </View>

      <Text style={styles.lastUpdate}>
        Última actualización: {formattedDate}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  source: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  rateContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  currency: {
    fontSize: 16,
    color: "#333",
  },
  rate: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2196F3",
  },
  lastUpdate: {
    fontSize: 11,
    color: "#999",
    marginTop: 8,
  },
  noRate: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
});

export default RateDisplay;
