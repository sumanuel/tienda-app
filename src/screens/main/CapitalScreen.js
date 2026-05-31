import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useAccounts } from "../../hooks/useAccounts";
import { useInventory } from "../../hooks/useInventory";
import { useExchangeRateContext } from "../../contexts/ExchangeRateContext";
import { formatCurrency } from "../../utils/currency";
import { convertCurrency } from "../../utils/exchange";
import {
  InfoPill,
  SurfaceCard,
  UI_COLORS,
  SHADOWS,
} from "../../components/common/AppUI";
import { s, rf, vs, hs, spacing, borderRadius } from "../../utils/responsive";

const CapitalScreen = () => {
  const { receivableStats, payableStats } = useAccounts();
  const { inventory } = useInventory();
  const { rate, localCurrency, referenceCurrency, rateEnabled } =
    useExchangeRateContext();

  const exchangeRate = Number(rate) || 0;

  const totalReceivable = receivableStats?.totalAmount || 0;
  const totalPayable = payableStats?.totalAmount || 0;

  const capital = totalReceivable - totalPayable;

  const formatAmount = (value) => formatCurrency(value || 0, localCurrency);
  const formatReferenceAmount = (value) =>
    formatCurrency(value || 0, referenceCurrency);
  const toReferenceAmount = (value) => {
    if (!rateEnabled) {
      return Number(value || 0);
    }

    if (exchangeRate > 0) {
      return convertCurrency(
        Number(value || 0),
        localCurrency,
        referenceCurrency,
        exchangeRate,
        {
          referenceCurrency,
          localCurrency,
          usesUsdConversion: rateEnabled,
        },
      );
    }

    return null;
  };

  const inventoryCostReference = (inventory || []).reduce((sum, product) => {
    const stock = Number(product.stock) || 0;
    const referenceCost = Number(product.cost) || 0;
    const referenceAdditionalCost = Number(product.additionalCost) || 0;
    return sum + stock * (referenceCost + referenceAdditionalCost);
  }, 0);
  const inventoryCostLocal = rateEnabled
    ? exchangeRate > 0
      ? convertCurrency(
          inventoryCostReference,
          referenceCurrency,
          localCurrency,
          exchangeRate,
          {
            referenceCurrency,
            localCurrency,
            usesUsdConversion: rateEnabled,
          },
        )
      : 0
    : inventoryCostReference;

  const inventorySellReference = (inventory || []).reduce((sum, product) => {
    const stock = Number(product.stock) || 0;
    const referencePrice = Number(product.priceUSD) || 0;
    return sum + stock * referencePrice;
  }, 0);

  const inventorySellLocal = (inventory || []).reduce((sum, product) => {
    const stock = Number(product.stock) || 0;
    const localPrice =
      Number(product.priceVES) ||
      (rateEnabled && exchangeRate
        ? convertCurrency(
            Number(product.priceUSD) || 0,
            referenceCurrency,
            localCurrency,
            exchangeRate,
            {
              referenceCurrency,
              localCurrency,
              usesUsdConversion: rateEnabled,
            },
          )
        : Number(product.priceUSD) || 0);
    return sum + Math.round(stock * localPrice * 100) / 100;
  }, 0);

  // Redondear valores finales a 2 decimales para consistencia
  const roundedInventorySellLocal = Math.round(inventorySellLocal * 100) / 100;
  const roundedCapital = Math.round(capital * 100) / 100;
  const roundedInventorySellReference =
    Math.round(inventorySellReference * 100) / 100;
  const roundedExchangeRate = Math.round(exchangeRate * 100) / 100;
  const capitalDisponibleReference =
    rateEnabled && exchangeRate > 0
      ? roundedInventorySellReference +
        convertCurrency(
          roundedCapital,
          localCurrency,
          referenceCurrency,
          roundedExchangeRate,
          {
            referenceCurrency,
            localCurrency,
            usesUsdConversion: rateEnabled,
          },
        )
      : toReferenceAmount(roundedInventorySellLocal + roundedCapital);
  const receivableReference = toReferenceAmount(totalReceivable);
  const payableReference = toReferenceAmount(totalPayable);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SurfaceCard style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>CAP</Text>
          </View>
          <InfoPill
            text={exchangeRate > 0 ? `Tasa ${roundedExchangeRate}` : "Sin tasa"}
            tone={exchangeRate > 0 ? "info" : "warning"}
          />
        </View>
        <Text style={styles.heroEyebrow}>Resumen financiero</Text>
        <Text style={styles.heroTitle}>Capital y valor de inventario</Text>
        <Text style={styles.heroSubtitle}>
          Visualiza rápidamente liquidez estimada, exposición en inventario y
          balance entre cuentas por cobrar y pagar.
        </Text>
      </SurfaceCard>

      <View style={styles.summaryGrid}>
        <SurfaceCard style={[styles.summaryCard, styles.summaryCardHalf]}>
          <Text
            style={styles.summaryTitle}
          >{`Capital disponible ${referenceCurrency}`}</Text>
          <Text
            style={[
              styles.summaryAmount,
              capitalDisponibleReference === null ||
              capitalDisponibleReference >= 0
                ? styles.positiveValue
                : styles.negativeValue,
            ]}
          >
            {capitalDisponibleReference === null
              ? "Sin tasa"
              : formatReferenceAmount(capitalDisponibleReference)}
          </Text>
          <Text style={styles.summarySubtitle}>
            Inventario + capital actual
          </Text>
        </SurfaceCard>

        <SurfaceCard style={[styles.summaryCard, styles.summaryCardHalf]}>
          <Text
            style={styles.summaryTitle}
          >{`Capital disponible ${localCurrency}`}</Text>
          <Text
            style={[
              styles.summaryAmount,
              roundedInventorySellLocal + roundedCapital >= 0
                ? styles.positiveValue
                : styles.negativeValue,
            ]}
          >
            {formatAmount(roundedInventorySellLocal + roundedCapital)}
          </Text>
          <Text style={styles.summarySubtitle}>
            Inventario + capital actual
          </Text>
        </SurfaceCard>
      </View>

      <View style={styles.summaryGrid}>
        <SurfaceCard style={[styles.summaryCard, styles.summaryCardHalf]}>
          <Text style={styles.summaryTitle}>Inventario al costo</Text>
          <Text style={styles.summaryAmountNeutral}>
            {formatReferenceAmount(inventoryCostReference)}
          </Text>
          <Text style={styles.summarySubtitle}>
            {formatAmount(inventoryCostLocal)}
            {exchangeRate
              ? ` • Tasa ${exchangeRate.toFixed(2)} ${localCurrency}`
              : ""}
          </Text>
        </SurfaceCard>

        <SurfaceCard style={[styles.summaryCard, styles.summaryCardHalf]}>
          <Text style={styles.summaryTitle}>Si vendes todo</Text>
          <Text style={styles.summaryAmountNeutral}>
            {formatReferenceAmount(inventorySellReference)}
          </Text>
          <Text style={styles.summarySubtitle}>
            {formatAmount(inventorySellLocal)}
          </Text>
        </SurfaceCard>
      </View>

      <View style={styles.grid}>
        <SurfaceCard style={[styles.infoCard, styles.cardSpacing]}>
          <Text style={styles.cardTitle}>Cuentas por cobrar</Text>
          <Text style={styles.cardAmount}>
            {receivableReference === null
              ? "Sin tasa"
              : formatReferenceAmount(receivableReference)}
          </Text>
          <Text style={styles.cardSubtitle}>
            {formatAmount(totalReceivable)}
            {exchangeRate
              ? ` • Tasa ${exchangeRate.toFixed(2)} ${localCurrency}.`
              : ""}
          </Text>
        </SurfaceCard>

        <SurfaceCard style={styles.infoCard}>
          <Text style={styles.cardTitle}>Cuentas por pagar</Text>
          <Text style={[styles.cardAmount, styles.payableAmount]}>
            {payableReference === null
              ? "Sin tasa"
              : formatReferenceAmount(payableReference)}
          </Text>
          <Text style={styles.cardSubtitle}>
            {formatAmount(totalPayable)}
            {exchangeRate
              ? ` • Tasa ${exchangeRate.toFixed(2)} ${localCurrency}.`
              : ""}
          </Text>
        </SurfaceCard>
      </View>

      <SurfaceCard style={styles.noteCard}>
        <Text style={styles.noteTitle}>Sugerencias</Text>
        <Text style={styles.noteText}>
          Mantén cuentas e inventario al día para tener una lectura más
          confiable del capital disponible y del flujo real de caja.
        </Text>
      </SurfaceCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_COLORS.page,
  },
  content: {
    padding: spacing.md,
    paddingBottom: vs(52),
    gap: spacing.md,
  },
  heroCard: {
    gap: spacing.md,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroBadge: {
    width: s(48),
    height: s(48),
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    backgroundColor: UI_COLORS.infoSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadgeText: {
    fontSize: rf(13),
    fontWeight: "800",
    color: UI_COLORS.info,
  },
  heroEyebrow: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: rf(20),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  heroSubtitle: {
    fontSize: rf(14),
    color: UI_COLORS.muted,
    lineHeight: vs(20),
  },
  summaryGrid: {
    flexDirection: "row",
    gap: hs(12),
  },
  summaryCard: {
    gap: vs(6),
    ...SHADOWS.soft,
  },
  summaryCardHalf: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  summaryAmount: {
    fontSize: rf(24),
    fontWeight: "800",
    marginTop: vs(2),
  },
  summaryAmountNeutral: {
    fontSize: rf(24),
    fontWeight: "800",
    marginTop: vs(2),
    color: UI_COLORS.text,
  },
  positiveValue: {
    color: UI_COLORS.accent,
  },
  negativeValue: {
    color: UI_COLORS.danger,
  },
  summarySubtitle: {
    marginTop: vs(4),
    color: UI_COLORS.muted,
    fontSize: rf(13),
    lineHeight: vs(18),
  },
  grid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardSpacing: {
    marginRight: hs(16),
  },
  infoCard: {
    flex: 1,
    padding: spacing.md,
    gap: vs(6),
    ...SHADOWS.soft,
  },
  cardTitle: {
    fontSize: rf(15),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  cardAmount: {
    fontSize: rf(18),
    fontWeight: "800",
    color: UI_COLORS.accent,
  },
  payableAmount: {
    color: UI_COLORS.danger,
  },
  cardSubtitle: {
    fontSize: rf(13),
    color: UI_COLORS.muted,
    lineHeight: vs(18),
  },
  noteCard: {
    backgroundColor: UI_COLORS.surface,
    ...SHADOWS.soft,
  },
  noteTitle: {
    fontSize: rf(15),
    fontWeight: "700",
    color: UI_COLORS.text,
    marginBottom: vs(6),
  },
  noteText: {
    fontSize: rf(14),
    color: UI_COLORS.muted,
    lineHeight: rf(20),
  },
});

export default CapitalScreen;
