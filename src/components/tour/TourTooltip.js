import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SHADOWS, UI_COLORS } from "../common/AppUI";
import { borderRadius, hs, rf, s, spacing, vs } from "../../utils/responsive";

const TourTooltip = ({
  isFirstStep,
  isLastStep,
  handleNext,
  handlePrev,
  handleStop,
  currentStep,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons
            name="sparkles-outline"
            size={rf(18)}
            color={UI_COLORS.info}
          />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Guía</Text>
          <Text style={styles.title}>Siguiente paso</Text>
        </View>
      </View>

      <Text style={styles.text}>{currentStep?.text || ""}</Text>

      <View style={styles.actions}>
        <Pressable
          onPress={handleStop}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.secondaryBtn,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.secondaryText}>Saltar</Text>
        </Pressable>

        <View style={styles.actionsRight}>
          {!isFirstStep ? (
            <Pressable
              onPress={handlePrev}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.secondaryBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.secondaryText}>Atrás</Text>
            </Pressable>
          ) : null}

          {!isLastStep ? (
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.primaryBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryText}>Siguiente</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleStop}
              style={({ pressed }) => [
                styles.actionBtn,
                styles.primaryBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryText}>Listo</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: UI_COLORS.surface,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    paddingVertical: vs(14),
    paddingHorizontal: hs(16),
    minWidth: s(248),
    maxWidth: s(308),
    marginBottom: vs(12),
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    ...SHADOWS.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: hs(10),
    marginBottom: vs(10),
  },
  iconWrap: {
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: UI_COLORS.infoSoft,
  },
  headerCopy: {
    flex: 1,
    gap: vs(1),
  },
  eyebrow: {
    color: UI_COLORS.muted,
    fontSize: rf(11),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  title: {
    color: UI_COLORS.text,
    fontSize: rf(15),
    fontWeight: "800",
  },
  text: {
    color: UI_COLORS.text,
    fontSize: rf(14),
    lineHeight: vs(19),
    fontWeight: "600",
  },
  actions: {
    marginTop: vs(12),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: hs(10),
  },
  actionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: hs(10),
  },
  actionBtn: {
    minHeight: vs(40),
    paddingVertical: vs(10),
    paddingHorizontal: hs(14),
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtn: {
    backgroundColor: UI_COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
  },
  primaryBtn: {
    backgroundColor: UI_COLORS.info,
  },
  secondaryText: {
    color: UI_COLORS.text,
    fontSize: rf(13),
    fontWeight: "700",
  },
  primaryText: {
    color: "#ffffff",
    fontSize: rf(13),
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

export default TourTooltip;
