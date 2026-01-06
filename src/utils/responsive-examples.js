// Ejemplo de uso del sistema responsive en tienda-app
// Este archivo muestra cómo implementar el sistema responsive en diferentes componentes

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
  logScalingInfo,
} from "../utils/responsive";

/**
 * EJEMPLOS DE USO DEL SISTEMA RESPONSIVE
 *
 * Funciones principales:
 * - s(size)     : Escala general proporcional
 * - rf(size)    : Escala específica para fuentes
 * - vs(size)    : Escala vertical (margins, paddings)
 * - hs(size)    : Escala horizontal (margins, paddings)
 *
 * Constantes predefinidas:
 * - spacing     : { xs, sm, md, lg, xl, xxl }
 * - borderRadius: { sm, md, lg, xl, xxl }
 * - iconSize    : { sm, md, lg, xl, xxl }
 */

// Ejemplo de componente responsive
const ResponsiveExample = () => {
  // Para debugging - muestra información de escalado en consola
  React.useEffect(() => {
    logScalingInfo();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Componente Responsive</Text>
      <Text style={styles.subtitle}>Este texto se escala automáticamente</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ejemplo de Card</Text>
        <Text style={styles.cardText}>
          Este contenido se adapta a diferentes tamaños de pantalla
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: "#f5f5f5",
  },

  title: {
    fontSize: rf(24), // Fuente responsive
    fontWeight: "bold",
    color: "#333",
    marginBottom: vs(8), // Margin vertical responsive
  },

  subtitle: {
    fontSize: rf(16),
    color: "#666",
    marginBottom: vs(20),
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg, // Radio de borde responsive
    padding: spacing.lg,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(2) }, // Sombra responsive
    shadowOpacity: 0.1,
    shadowRadius: s(4),
  },

  cardTitle: {
    fontSize: rf(18),
    fontWeight: "600",
    color: "#333",
    marginBottom: vs(8),
  },

  cardText: {
    fontSize: rf(14),
    color: "#666",
    lineHeight: vs(20), // Line height responsive
  },
});

/**
 * GUÍA DE MIGRACIÓN A RESPONSIVE
 *
 * 1. Importar las funciones necesarias:
 *    import { s, rf, vs, hs, spacing, borderRadius, iconSize } from '../utils/responsive';
 *
 * 2. Reemplazar valores fijos:
 *    ANTES: fontSize: 16
 *    DESPUÉS: fontSize: rf(16)
 *
 *    ANTES: padding: 20
 *    DESPUÉS: padding: spacing.lg
 *
 *    ANTES: marginVertical: 10
 *    DESPUÉS: marginVertical: vs(10)
 *
 *    ANTES: borderRadius: 12
 *    DESPUÉS: borderRadius: borderRadius.md
 *
 *    ANTES: width: 100, height: 100
 *    DESPUÉS: width: s(100), height: s(100)
 *
 * 3. Para debugging, llamar logScalingInfo() para ver los factores de escala actuales
 */

export default ResponsiveExample;
