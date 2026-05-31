import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatCurrency, getCurrencyBehavior } from "../../utils/currency";
import { convertCurrency } from "../../utils/exchange";
import { getSettings } from "../../services/database/settings";
import { useExchangeRateContext } from "../../contexts/ExchangeRateContext";

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
  const { rate } = useExchangeRateContext();

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

  const behavior = useMemo(() => getCurrencyBehavior(settings), [settings]);

  const displayLocalPrice = useMemo(() => {
    if (priceVES != null) {
      return priceVES;
    }

    if (behavior.rateEnabled && priceUSD && rate) {
      return convertCurrency(
        priceUSD,
        behavior.referenceCurrency,
        behavior.localCurrency,
        rate,
        behavior,
      );
    }

    return null;
  }, [priceUSD, priceVES, behavior, rate]);

  if (!priceUSD && !displayLocalPrice) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {showBoth ? (
        <>
          <View style={styles.priceRow}>
            <Text style={styles.currencyLabel}>
              {behavior.referenceCurrency}
            </Text>
            <Text style={styles.priceUSD}>
              {formatCurrency(priceUSD, behavior.referenceCurrency)}
            </Text>
          </View>
          {behavior.rateEnabled ? (
            <View style={styles.priceRow}>
              <Text style={styles.currencyLabel}>{behavior.localCurrency}</Text>
              <Text style={styles.priceVES}>
                {formatCurrency(displayLocalPrice, behavior.localCurrency)}
              </Text>
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.priceRow}>
          <Text style={styles.singlePrice}>
            {formatCurrency(
              behavior.rateEnabled ? displayLocalPrice : priceUSD,
              behavior.rateEnabled
                ? behavior.localCurrency
                : behavior.displayCurrency,
            )}
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
