import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatCurrency } from "../../utils/currency";
import { getSettings } from "../../services/database/settings";

/**
 * Componente para mostrar precio en múltiples monedas
 */
export const MultiCurrencyPrice = React.memo(function MultiCurrencyPrice({
  priceUSD,
  priceVES, // Opcional, si no se proporciona se calcula
  showBoth = true,
  style,
}) {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      const s = await getSettings();
      if (mounted) {
        setSettings(s);
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const displayPriceVES = useMemo(() => {
    if (priceVES != null) {
      return priceVES;
    }

    if (priceUSD && settings.pricing?.currencies?.USD) {
      return priceUSD * settings.pricing.currencies.USD;
    }

    return null;
  }, [priceUSD, priceVES, settings]);

  if (!priceUSD && !displayPriceVES) {
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
              {formatCurrency(displayPriceVES, "VES")}
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.priceRow}>
          <Text style={styles.singlePrice}>
            {formatCurrency(displayPriceVES, "VES")}
          </Text>
        </View>
      )}
    </View>
  );
});

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
