import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatCurrency } from "../../utils/currency";

/**
 * Componente para mostrar precio en múltiples monedas
 */
export const MultiCurrencyPrice = ({
  priceUSD,
  priceVES,
  showBoth = true,
  style,
}) => {
  if (!priceUSD && !priceVES) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {showBoth ? (
        <>
          <View style={styles.priceRow}>
            <Text style={styles.currencyLabel}>USD</Text>
            <Text style={styles.priceUSD}>
              {formatCurrency(priceUSD, "USD")}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.currencyLabel}>VES</Text>
            <Text style={styles.priceVES}>
              {formatCurrency(priceVES, "VES")}
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.priceRow}>
          <Text style={styles.singlePrice}>
            {formatCurrency(priceVES, "VES")}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  currencyLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    minWidth: 40,
  },
  priceUSD: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4CAF50",
  },
  priceVES: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2196F3",
  },
  singlePrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
});

export default MultiCurrencyPrice;
