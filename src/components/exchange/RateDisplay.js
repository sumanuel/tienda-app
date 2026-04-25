import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatExchangeRate } from "../../utils/exchange";
import { rf, spacing, borderRadius } from "../../utils/responsive";
import { SHADOWS, UI_COLORS } from "../common/AppUI";

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
    backgroundColor: UI_COLORS.surface,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    ...SHADOWS.soft,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  label: {
    fontSize: rf(14),
    color: UI_COLORS.muted,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  source: {
    fontSize: rf(12),
    color: UI_COLORS.accentStrong,
    fontWeight: "700",
    textTransform: "uppercase",
    backgroundColor: UI_COLORS.accentSoft,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  rateContainer: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  currency: {
    fontSize: rf(16),
    color: UI_COLORS.muted,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
  rate: {
    fontSize: rf(32),
    fontWeight: "800",
    color: UI_COLORS.info,
    letterSpacing: 0.8,
  },
  lastUpdate: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
    textAlign: "center",
    fontWeight: "500",
  },
  noRate: {
    fontSize: rf(16),
    color: UI_COLORS.muted,
    textAlign: "center",
    fontWeight: "500",
  },
});

export default RateDisplay;
