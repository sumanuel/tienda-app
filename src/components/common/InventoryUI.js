import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  EmptyStateCard,
  InfoPill,
  ScreenHero,
  SurfaceCard,
  UI_COLORS,
  SHADOWS,
} from "./AppUI";
import {
  borderRadius,
  hs,
  iconSize,
  rf,
  s,
  spacing,
  vs,
} from "../../utils/responsive";

export const InventoryHero = ({
  iconName,
  iconColor,
  eyebrow,
  title,
  subtitle,
  pills,
  style,
}) => (
  <ScreenHero
    iconName={iconName}
    iconColor={iconColor}
    eyebrow={eyebrow}
    title={title}
    subtitle={subtitle}
    pills={pills}
    style={style}
  />
);

export const InventorySearchCard = ({
  value,
  onChangeText,
  placeholder,
  error,
  style,
}) => (
  <SurfaceCard style={[styles.searchCard, style]}>
    <Text style={styles.fieldLabel}>Buscar producto</Text>
    <TextInput
      style={styles.searchInput}
      placeholder={placeholder}
      placeholderTextColor="#9aa6b5"
      value={value}
      onChangeText={onChangeText}
      returnKeyType="done"
      autoCapitalize="none"
    />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </SurfaceCard>
);

export const InventoryProductCard = ({
  item,
  onPress,
  stockTone = "accent",
  stockSuffix = "u.",
}) => (
  <Pressable
    style={({ pressed }) => [styles.productCard, pressed && styles.pressed]}
    onPress={onPress}
  >
    <View style={styles.productRow}>
      <Text style={styles.productName} numberOfLines={1}>
        {String(item.name || "").toUpperCase()}
      </Text>
      <InfoPill
        text={`${item.stock || 0} ${stockSuffix}`}
        tone={stockTone}
        style={styles.stockPill}
      />
    </View>
    <Text style={styles.productCode} numberOfLines={1}>
      Código: {item.productNumber || item.barcode || "—"}
    </Text>
    {item.barcode ? (
      <Text style={styles.productMeta} numberOfLines={1}>
        Barcode: {item.barcode}
      </Text>
    ) : null}
    {item.category ? (
      <Text style={styles.productMeta} numberOfLines={1}>
        {item.category}
      </Text>
    ) : null}
  </Pressable>
);

export const InventoryEmptyState = ({ title, subtitle, style }) => (
  <EmptyStateCard title={title} subtitle={subtitle} style={style} />
);

export const InventoryProductSummaryCard = ({
  product,
  stockTone = "accent",
  style,
}) => {
  if (!product) return null;

  return (
    <SurfaceCard style={[styles.summaryCard, style]}>
      <View style={styles.productRow}>
        <Text style={styles.summaryName} numberOfLines={2}>
          {product.name}
        </Text>
        <InfoPill
          text={`${product.stock || 0} unidades`}
          tone={stockTone}
          style={styles.stockPill}
        />
      </View>
      <Text style={styles.productCode}>
        Código:{" "}
        {product.productNumber ||
          `PRD-${String(product.id || 0).padStart(6, "0")}`}
      </Text>
      {product.barcode ? (
        <Text style={styles.productMeta}>Barcode: {product.barcode}</Text>
      ) : null}
    </SurfaceCard>
  );
};

export const InventoryMovementCard = ({
  movementNumber,
  dateLabel,
  typeLabel,
  typeTone,
  quantityLabel,
  quantityTone,
  stockLabel,
  notes,
  style,
}) => (
  <SurfaceCard style={[styles.movementCard, style]}>
    <View style={styles.movementHeader}>
      <View style={styles.movementMetaBlock}>
        <Text style={styles.movementNumber}>{movementNumber}</Text>
        <Text style={styles.movementDate}>{dateLabel}</Text>
      </View>
      <InfoPill text={typeLabel} tone={typeTone} />
    </View>

    <View style={styles.movementBody}>
      <Text
        style={[
          styles.movementQuantity,
          quantityTone && styles[`quantity${quantityTone}`],
        ]}
      >
        {quantityLabel}
      </Text>
      <Text style={styles.movementStock}>{stockLabel}</Text>
    </View>

    {notes ? <Text style={styles.movementNotes}>{notes}</Text> : null}
  </SurfaceCard>
);

const styles = StyleSheet.create({
  searchCard: {
    gap: spacing.sm,
    ...SHADOWS.soft,
  },
  fieldLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: hs(14),
    paddingVertical: vs(12),
    fontSize: rf(14),
    color: UI_COLORS.text,
    backgroundColor: UI_COLORS.surfaceAlt,
  },
  errorText: {
    color: UI_COLORS.danger,
    fontSize: rf(13),
  },
  productCard: {
    backgroundColor: UI_COLORS.surface,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: vs(6),
    ...SHADOWS.soft,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  productName: {
    flex: 1,
    fontSize: rf(15),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  stockPill: {
    alignSelf: "flex-start",
  },
  productCode: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
    fontWeight: "600",
  },
  productMeta: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
  },
  summaryCard: {
    gap: spacing.sm,
    ...SHADOWS.soft,
  },
  summaryName: {
    flex: 1,
    fontSize: rf(16),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  movementCard: {
    gap: spacing.sm,
    marginBottom: spacing.md,
    ...SHADOWS.soft,
  },
  movementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  movementMetaBlock: {
    flex: 1,
    gap: vs(4),
  },
  movementNumber: {
    fontSize: rf(14),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  movementDate: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
  },
  movementBody: {
    gap: vs(4),
  },
  movementQuantity: {
    fontSize: rf(14),
    fontWeight: "800",
  },
  quantityaccent: {
    color: UI_COLORS.accent,
  },
  quantitydanger: {
    color: UI_COLORS.danger,
  },
  quantitywarning: {
    color: UI_COLORS.warning,
  },
  movementStock: {
    fontSize: rf(13),
    color: UI_COLORS.muted,
  },
  movementNotes: {
    fontSize: rf(13),
    color: UI_COLORS.text,
    lineHeight: vs(18),
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    padding: spacing.sm,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
