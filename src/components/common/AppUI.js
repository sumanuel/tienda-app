import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { borderRadius, hs, rf, s, spacing, vs } from "../../utils/responsive";

export const UI_COLORS = {
  page: "#f4f7fb",
  surface: "#ffffff",
  surfaceAlt: "#f7faf8",
  text: "#183127",
  muted: "#617368",
  border: "#d8e3db",
  accent: "#1f7a59",
  accentStrong: "#0f5a3f",
  accentSoft: "#e8f5ef",
  info: "#245fd1",
  infoSoft: "#ebf3ff",
  warning: "#c78a1b",
  warningSoft: "#fff5de",
  danger: "#cf4f43",
  dangerSoft: "#ffe9e6",
};

export const SHADOWS = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(10) },
    shadowOpacity: 0.08,
    shadowRadius: s(18),
    elevation: 8,
  },
  soft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.05,
    shadowRadius: s(10),
    elevation: 4,
  },
};

const toneMap = {
  accent: {
    backgroundColor: UI_COLORS.accentSoft,
    color: UI_COLORS.accentStrong,
  },
  info: {
    backgroundColor: UI_COLORS.infoSoft,
    color: UI_COLORS.info,
  },
  warning: {
    backgroundColor: UI_COLORS.warningSoft,
    color: UI_COLORS.warning,
  },
  danger: {
    backgroundColor: UI_COLORS.dangerSoft,
    color: UI_COLORS.danger,
  },
  neutral: {
    backgroundColor: UI_COLORS.surfaceAlt,
    color: UI_COLORS.text,
  },
};

export const SurfaceCard = ({ children, style }) => (
  <View style={[styles.surfaceCard, style]}>{children}</View>
);

export const InfoPill = ({
  text,
  tone = "neutral",
  iconName,
  style,
  textStyle,
}) => {
  const toneStyle = toneMap[tone] || toneMap.neutral;

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: toneStyle.backgroundColor },
        style,
      ]}
    >
      {iconName ? (
        <Ionicons name={iconName} size={rf(14)} color={toneStyle.color} />
      ) : null}
      <Text style={[styles.pillText, { color: toneStyle.color }, textStyle]}>
        {text}
      </Text>
    </View>
  );
};

export const ScreenHero = ({
  iconName,
  iconColor = UI_COLORS.info,
  eyebrow,
  title,
  subtitle,
  pills = [],
  style,
}) => (
  <SurfaceCard style={[styles.heroCard, style]}>
    <View style={styles.heroIcon}>
      <Ionicons name={iconName} size={rf(28)} color={iconColor} />
    </View>
    <View style={styles.heroTextBlock}>
      {eyebrow ? <Text style={styles.heroEyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>
      {pills.length > 0 ? (
        <View style={styles.heroPillsRow}>
          {pills.map((pill) => (
            <InfoPill
              key={`${pill.text}-${pill.tone || "neutral"}`}
              text={pill.text}
              tone={pill.tone}
              iconName={pill.iconName}
            />
          ))}
        </View>
      ) : null}
    </View>
  </SurfaceCard>
);

export const MetricCard = ({ label, value, hint, tone = "neutral", style }) => {
  const toneStyle = toneMap[tone] || toneMap.neutral;

  return (
    <SurfaceCard
      style={[
        styles.metricCard,
        { backgroundColor: toneStyle.backgroundColor },
        style,
      ]}
    >
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {hint ? <Text style={styles.metricHint}>{hint}</Text> : null}
    </SurfaceCard>
  );
};

export const EmptyStateCard = ({ title, subtitle, style }) => (
  <SurfaceCard style={[styles.emptyCard, style]}>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptySubtitle}>{subtitle}</Text>
  </SurfaceCard>
);

export const FloatingActionButton = ({
  onPress,
  bottom,
  iconName = "add",
  label,
  style,
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.fab,
      bottom != null && { bottom },
      pressed && styles.fabPressed,
      style,
    ]}
  >
    <Ionicons name={iconName} size={rf(24)} color="#ffffff" />
    {label ? <Text style={styles.fabLabel}>{label}</Text> : null}
  </Pressable>
);

const styles = StyleSheet.create({
  surfaceCard: {
    backgroundColor: UI_COLORS.surface,
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    padding: spacing.lg,
    ...SHADOWS.card,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  heroIcon: {
    width: s(60),
    height: s(60),
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    backgroundColor: UI_COLORS.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextBlock: {
    flex: 1,
    gap: vs(6),
  },
  heroEyebrow: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
    fontWeight: "700",
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
  heroPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: hs(10),
    marginTop: vs(6),
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: hs(6),
    borderRadius: s(999),
    borderCurve: "continuous",
    paddingHorizontal: hs(12),
    paddingVertical: vs(7),
  },
  pillText: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  metricCard: {
    flex: 1,
    gap: vs(4),
    ...SHADOWS.soft,
  },
  metricLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  metricValue: {
    fontSize: rf(18),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  metricHint: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
    lineHeight: vs(18),
  },
  emptyCard: {
    alignItems: "center",
    gap: vs(12),
    marginTop: vs(32),
  },
  emptyTitle: {
    fontSize: rf(17),
    fontWeight: "800",
    color: UI_COLORS.text,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: rf(13),
    color: UI_COLORS.muted,
    textAlign: "center",
    lineHeight: vs(20),
  },
  fab: {
    position: "absolute",
    right: hs(20),
    width: s(56),
    height: s(56),
    borderRadius: s(28),
    borderCurve: "continuous",
    backgroundColor: UI_COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.card,
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  fabLabel: {
    color: "#ffffff",
    fontSize: rf(12),
    fontWeight: "700",
  },
});
