import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";

/**
 * Pantalla de ajustes
 */
export const SettingsScreen = ({ navigation }) => {
  const SettingItem = ({ title, subtitle, onPress }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Configuración</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Negocio</Text>
        <SettingItem
          title="Información del Negocio"
          subtitle="Nombre, RIF, dirección"
        />
        <SettingItem
          title="Impresora"
          subtitle="Configurar impresora de recibos"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Precios</Text>
        <SettingItem title="Moneda Base" subtitle="USD" />
        <SettingItem title="Margen por Defecto" subtitle="30%" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inventario</Text>
        <SettingItem title="Umbral de Stock Bajo" subtitle="10 unidades" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Datos</Text>
        <SettingItem title="Backup" subtitle="Exportar datos" />
        <SettingItem title="Restaurar" subtitle="Importar datos" />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  settingSubtitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  arrow: {
    fontSize: 24,
    color: "#ccc",
  },
});

export default SettingsScreen;
