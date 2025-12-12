import React from "react";
import { View, Text, Switch, StyleSheet } from "react-native";

/**
 * Componente toggle para activar/desactivar actualización automática
 */
export const AutoUpdateToggle = ({ enabled, onToggle, interval, style }) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.textContainer}>
        <Text style={styles.label}>Actualización Automática</Text>
        <Text style={styles.description}>
          {enabled ? `Cada ${interval} minutos` : "Desactivada"}
        </Text>
      </View>

      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: "#ccc", true: "#81C784" }}
        thumbColor={enabled ? "#4CAF50" : "#f4f3f4"}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: "#666",
  },
});

export default AutoUpdateToggle;
