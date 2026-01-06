import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";

export const InventoryScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inventario</Text>
      <Text style={styles.subtitle}>Funcionalidad en desarrollo</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: rf(24),
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: rf(16),
    color: "#666",
    marginTop: vs(8),
  },
});

export default InventoryScreen;
