import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { calculateSalePrice } from "../../utils/pricing";
import { formatCurrency } from "../../utils/currency";

/**
 * Componente para calcular precios basado en costo y margen
 */
export const PriceCalculator = ({ onCalculate, style }) => {
  const [cost, setCost] = useState("");
  const [margin, setMargin] = useState("30");
  const [result, setResult] = useState(null);

  const handleCalculate = () => {
    const costNum = parseFloat(cost) || 0;
    const marginNum = parseFloat(margin) || 0;

    const price = calculateSalePrice(costNum, marginNum, true);
    const profit = price - costNum;

    const calculatedResult = {
      cost: costNum,
      margin: marginNum,
      price,
      profit,
    };

    setResult(calculatedResult);

    if (onCalculate) {
      onCalculate(calculatedResult);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Calculadora de Precios</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Costo (USD)</Text>
        <TextInput
          style={styles.input}
          value={cost}
          onChangeText={setCost}
          keyboardType="numeric"
          placeholder="0.00"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Margen (%)</Text>
        <TextInput
          style={styles.input}
          value={margin}
          onChangeText={setMargin}
          keyboardType="numeric"
          placeholder="30"
          placeholderTextColor="#999"
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleCalculate}>
        <Text style={styles.buttonText}>Calcular</Text>
      </TouchableOpacity>

      {result && (
        <View style={styles.resultContainer}>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Precio de Venta:</Text>
            <Text style={styles.resultValue}>
              {formatCurrency(result.price, "USD")}
            </Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Ganancia:</Text>
            <Text style={[styles.resultValue, styles.profit]}>
              {formatCurrency(result.profit, "USD")}
            </Text>
          </View>
        </View>
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
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  button: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resultContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 15,
    color: "#666",
  },
  resultValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  profit: {
    color: "#4CAF50",
  },
});

export default PriceCalculator;
