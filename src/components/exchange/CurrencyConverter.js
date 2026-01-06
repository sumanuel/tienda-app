import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { convertCurrency } from "../../utils/exchange";
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

/**
 * Componente para convertir entre monedas
 */
export const CurrencyConverter = ({ exchangeRate, style }) => {
  const [usdAmount, setUsdAmount] = useState("");
  const [vesAmount, setVesAmount] = useState("");
  const [activeField, setActiveField] = useState("USD");

  const handleUsdChange = (value) => {
    setUsdAmount(value);
    setActiveField("USD");

    const numValue = parseFloat(value) || 0;
    const converted = convertCurrency(numValue, "USD", "VES", exchangeRate);
    setVesAmount(converted.toFixed(2));
  };

  const handleVesChange = (value) => {
    setVesAmount(value);
    setActiveField("VES");

    const numValue = parseFloat(value) || 0;
    const converted = convertCurrency(numValue, "VES", "USD", exchangeRate);
    setUsdAmount(converted.toFixed(2));
  };

  const handleSwap = () => {
    const temp = usdAmount;
    setUsdAmount(vesAmount);
    setVesAmount(temp);
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>🔄 Convertidor de Monedas</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.currencyLabel}>USD</Text>
        <TextInput
          style={[styles.input, activeField === "USD" && styles.activeInput]}
          value={usdAmount}
          onChangeText={handleUsdChange}
          keyboardType="numeric"
          placeholder="0.00"
        />
      </View>

      <TouchableOpacity style={styles.swapButton} onPress={handleSwap}>
        <Text style={styles.swapIcon}>⇅</Text>
      </TouchableOpacity>

      <View style={styles.inputContainer}>
        <Text style={styles.currencyLabel}>VES </Text>
        <TextInput
          style={[styles.input, activeField === "VES" && styles.activeInput]}
          value={vesAmount}
          onChangeText={handleVesChange}
          keyboardType="numeric"
          placeholder="0.00"
        />
      </View>

      {exchangeRate && (
        <Text style={styles.rateInfo}>
          💱 Tasa actual: 1 USD = VES. {exchangeRate.toFixed(2)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(4) },
    shadowOpacity: 0.1,
    shadowRadius: s(8),
    elevation: 6,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  title: {
    fontSize: rf(20),
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: spacing.xl,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  currencyLabel: {
    fontSize: rf(14),
    color: "#64748b",
    marginBottom: spacing.xs,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: rf(18),
    fontWeight: "600",
    color: "#1e293b",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(1) },
    shadowOpacity: 0.05,
    shadowRadius: s(2),
    elevation: 1,
  },
  activeInput: {
    borderColor: "#6366f1",
    backgroundColor: "#eef2ff",
    shadowColor: "#6366f1",
    shadowOpacity: 0.1,
  },
  swapButton: {
    alignSelf: "center",
    backgroundColor: "#6366f1",
    width: iconSize.lg,
    height: iconSize.lg,
    borderRadius: borderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.md,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: s(2) },
    shadowOpacity: 0.3,
    shadowRadius: s(4),
    elevation: 4,
  },
  swapIcon: {
    fontSize: rf(20),
    color: "#fff",
    fontWeight: "bold",
  },
  rateInfo: {
    fontSize: rf(14),
    color: "#64748b",
    textAlign: "center",
    marginTop: spacing.lg,
    fontWeight: "500",
    backgroundColor: "#f8fafc",
    padding: spacing.md,
    borderRadius: borderRadius.sm,
  },
});

export default CurrencyConverter;
