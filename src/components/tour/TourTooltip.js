import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

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
      <Text style={styles.text}>{currentStep?.text || ""}</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={handleStop}
          activeOpacity={0.85}
          style={styles.actionBtn}
        >
          <Text style={styles.actionText}>Skip</Text>
        </TouchableOpacity>

        <View style={styles.actionsRight}>
          {!isFirstStep ? (
            <TouchableOpacity
              onPress={handlePrev}
              activeOpacity={0.85}
              style={styles.actionBtn}
            >
              <Text style={styles.actionText}>Previous</Text>
            </TouchableOpacity>
          ) : null}

          {!isLastStep ? (
            <TouchableOpacity
              onPress={handleNext}
              activeOpacity={0.85}
              style={styles.actionBtn}
            >
              <Text style={styles.actionText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleStop}
              activeOpacity={0.85}
              style={styles.actionBtn}
            >
              <Text style={styles.actionText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minWidth: 260,
    maxWidth: 320,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 10,
  },
  text: {
    color: "#1f2633",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  actions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  actionText: {
    color: "#2f5ae0",
    fontSize: 14,
    fontWeight: "700",
  },
});

export default TourTooltip;
