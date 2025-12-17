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
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 24,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  inputContainer: {
    marginBottom: 16,
  },
  currencyLabel: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 8,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  swapIcon: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
  },
  rateInfo: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginTop: 20,
    fontWeight: "500",
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
  },
});

export default CurrencyConverter;
