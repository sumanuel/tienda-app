import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { UI_COLORS } from "./AppUI";
import { borderRadius, hs, rf, spacing, vs } from "../../utils/responsive";

export const FormSectionHeader = ({ title, hint, style }) => (
  <View style={[styles.sectionHeader, style]}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
  </View>
);

export const SegmentedOptions = ({
  options,
  value,
  onChange,
  style,
  compact = false,
}) => (
  <View
    style={[styles.segmentedRow, compact && styles.segmentedRowCompact, style]}
  >
    {options.map((option) => {
      const active = option.value === value;
      return (
        <Pressable
          key={option.value}
          style={({ pressed }) => [
            styles.segmentedOption,
            compact && styles.segmentedOptionCompact,
            active && styles.segmentedOptionActive,
            pressed && styles.pressed,
          ]}
          onPress={() => onChange(option.value)}
        >
          <Text
            style={[
              styles.segmentedLabel,
              compact && styles.segmentedLabelCompact,
              active && styles.segmentedLabelActive,
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

export const FormActionRow = ({
  onCancel,
  onSubmit,
  cancelLabel = "Cancelar",
  submitLabel,
  loading = false,
  disabled = false,
  submitTone = "accent",
  style,
}) => {
  const submitStyle =
    submitTone === "danger" ? styles.submitDanger : styles.submitAccent;

  return (
    <View style={[styles.actionRow, style]}>
      <Pressable
        style={({ pressed }) => [
          styles.actionButton,
          styles.cancelButton,
          (loading || disabled || pressed) && styles.pressed,
        ]}
        onPress={onCancel}
        disabled={loading || disabled}
      >
        <Text style={styles.cancelText}>{cancelLabel}</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.actionButton,
          submitStyle,
          (loading || disabled) && styles.disabled,
          pressed && styles.pressed,
        ]}
        onPress={onSubmit}
        disabled={loading || disabled}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.submitText}>{submitLabel}</Text>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: hs(4),
    gap: vs(4),
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  sectionHint: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
    lineHeight: vs(18),
  },
  segmentedRow: {
    flexDirection: "row",
    gap: hs(10),
  },
  segmentedRowCompact: {
    gap: hs(8),
    flexWrap: "wrap",
  },
  segmentedOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: vs(13),
    paddingHorizontal: hs(12),
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    backgroundColor: UI_COLORS.surfaceAlt,
  },
  segmentedOptionCompact: {
    flexGrow: 1,
    flexBasis: "45%",
  },
  segmentedOptionActive: {
    borderColor: UI_COLORS.accent,
    backgroundColor: UI_COLORS.accentSoft,
  },
  segmentedLabel: {
    fontSize: rf(13),
    fontWeight: "700",
    color: UI_COLORS.muted,
  },
  segmentedLabelCompact: {
    fontSize: rf(12),
  },
  segmentedLabelActive: {
    color: UI_COLORS.accentStrong,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingTop: vs(4),
  },
  actionButton: {
    flex: 1,
    minHeight: vs(50),
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: hs(12),
  },
  cancelButton: {
    backgroundColor: UI_COLORS.surface,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
  },
  cancelText: {
    fontSize: rf(14),
    fontWeight: "700",
    color: UI_COLORS.info,
  },
  submitAccent: {
    backgroundColor: UI_COLORS.accent,
  },
  submitDanger: {
    backgroundColor: UI_COLORS.danger,
  },
  submitText: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#ffffff",
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
