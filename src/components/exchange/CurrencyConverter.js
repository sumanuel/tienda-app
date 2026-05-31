import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { convertCurrency, getExchangeRateLabel } from "../../utils/exchange";
import { rf, spacing, borderRadius, iconSize } from "../../utils/responsive";
import { SHADOWS, UI_COLORS } from "../common/AppUI";

/**
 * Componente para convertir entre monedas
 */
export const CurrencyConverter = ({
  exchangeRate,
  referenceCurrency = "USD",
  localCurrency = "VES",
  rateEnabled = true,
  style,
}) => {
  const [referenceAmount, setReferenceAmount] = useState("");
  const [localAmount, setLocalAmount] = useState("");
  const [activeField, setActiveField] = useState(referenceCurrency);

  const handleReferenceChange = (value) => {
    setReferenceAmount(value);
    setActiveField(referenceCurrency);

    const numValue = parseFloat(value) || 0;
    const converted = convertCurrency(
      numValue,
      referenceCurrency,
      localCurrency,
      exchangeRate,
      { referenceCurrency, localCurrency, usesUsdConversion: rateEnabled },
    );
    setLocalAmount(converted.toFixed(2));
  };

  const handleLocalChange = (value) => {
    setLocalAmount(value);
    setActiveField(localCurrency);

    const numValue = parseFloat(value) || 0;
    const converted = convertCurrency(
      numValue,
      localCurrency,
      referenceCurrency,
      exchangeRate,
      { referenceCurrency, localCurrency, usesUsdConversion: rateEnabled },
    );
    setReferenceAmount(converted.toFixed(2));
  };

  const handleSwap = () => {
    const temp = referenceAmount;
    setReferenceAmount(localAmount);
    setLocalAmount(temp);
  };

  if (!rateEnabled) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Convertidor de monedas</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.currencyLabel}>{referenceCurrency}</Text>
        <TextInput
          style={[
            styles.input,
            activeField === referenceCurrency && styles.activeInput,
          ]}
          value={referenceAmount}
          onChangeText={handleReferenceChange}
          keyboardType="numeric"
          placeholder="0.00"
        />
      </View>

      <Pressable
        style={({ pressed }) => [styles.swapButton, pressed && styles.pressed]}
        onPress={handleSwap}
      >
        <Ionicons name="swap-vertical" size={rf(20)} color="#fff" />
      </Pressable>

      <View style={styles.inputContainer}>
        <Text style={styles.currencyLabel}>{localCurrency}</Text>
        <TextInput
          style={[
            styles.input,
            activeField === localCurrency && styles.activeInput,
          ]}
          value={localAmount}
          onChangeText={handleLocalChange}
          keyboardType="numeric"
          placeholder="0.00"
        />
      </View>

      {exchangeRate && (
        <Text style={styles.rateInfo}>
          {getExchangeRateLabel(exchangeRate, {
            referenceCurrency,
            localCurrency,
            usesUsdConversion: true,
            exchangeMode: "manual",
          })}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: UI_COLORS.surface,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    ...SHADOWS.soft,
  },
  title: {
    fontSize: rf(18),
    fontWeight: "800",
    color: UI_COLORS.text,
    marginBottom: spacing.lg,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  currencyLabel: {
    fontSize: rf(14),
    color: UI_COLORS.muted,
    marginBottom: spacing.xs,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    padding: spacing.md,
    fontSize: rf(18),
    fontWeight: "600",
    color: UI_COLORS.text,
    borderWidth: 2,
    borderColor: UI_COLORS.border,
  },
  activeInput: {
    borderColor: UI_COLORS.info,
    backgroundColor: UI_COLORS.infoSoft,
  },
  swapButton: {
    alignSelf: "center",
    backgroundColor: UI_COLORS.info,
    width: iconSize.lg,
    height: iconSize.lg,
    borderRadius: borderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.md,
    ...SHADOWS.soft,
  },
  rateInfo: {
    fontSize: rf(14),
    color: UI_COLORS.muted,
    textAlign: "center",
    marginTop: spacing.lg,
    fontWeight: "500",
    backgroundColor: UI_COLORS.surfaceAlt,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderCurve: "continuous",
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

export default CurrencyConverter;
