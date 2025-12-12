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
      <Text style={styles.title}>Convertidor de Monedas</Text>

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
        <Text style={styles.currencyLabel}>VES (Bs.)</Text>
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
          1 USD = Bs. {exchangeRate.toFixed(2)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 12,
  },
  currencyLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 16,
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    borderWidth: 2,
    borderColor: "transparent",
  },
  activeInput: {
    borderColor: "#2196F3",
    backgroundColor: "#E3F2FD",
  },
  swapButton: {
    alignSelf: "center",
    padding: 8,
    marginVertical: 8,
  },
  swapIcon: {
    fontSize: 24,
    color: "#2196F3",
  },
  rateInfo: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginTop: 16,
  },
});

export default CurrencyConverter;
