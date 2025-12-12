import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useExchangeRate } from "../../hooks/useExchangeRate";

/**
 * Pantalla de ajustes
 */
export const SettingsScreen = ({ navigation }) => {
  const { rate, setManualRate } = useExchangeRate();

  const handleCurrencyBasePress = () => {
    Alert.prompt(
      "Configurar Tasa de Cambio USD → Bs",
      `Ingresa el valor equivalente de 1 USD en Bolívares.\n\nEsta tasa se usará para convertir precios de USD a Bs en toda la aplicación.\n\nTasa actual: ${
        rate ? `${rate.toFixed(2)} Bs` : "No configurada"
      }`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Guardar",
          onPress: async (value) => {
            const numericValue = parseFloat(value);
            if (isNaN(numericValue) || numericValue <= 0) {
              Alert.alert("Error", "Ingresa un valor válido mayor a 0");
              return;
            }

            // Validación adicional para valores muy bajos o muy altos
            if (numericValue < 10) {
              Alert.alert(
                "Valor muy bajo",
                "El valor parece muy bajo para una tasa de cambio. ¿Estás seguro?",
                [
                  { text: "Revisar", style: "cancel" },
                  {
                    text: "Confirmar",
                    onPress: async () => await saveManualRate(numericValue),
                  },
                ]
              );
              return;
            }

            if (numericValue > 100000) {
              Alert.alert(
                "Valor muy alto",
                "El valor parece muy alto para una tasa de cambio. ¿Estás seguro?",
                [
                  { text: "Revisar", style: "cancel" },
                  {
                    text: "Confirmar",
                    onPress: async () => await saveManualRate(numericValue),
                  },
                ]
              );
              return;
            }

            await saveManualRate(numericValue);
          },
        },
      ],
      "decimal-pad",
      rate?.toString() || ""
    );
  };

  const saveManualRate = async (numericValue) => {
    try {
      await setManualRate(numericValue);
      Alert.alert(
        "Éxito",
        `Tasa de cambio actualizada:\n1 USD = ${numericValue.toFixed(
          2
        )} Bs\n\nEsta tasa se usará en toda la aplicación.`
      );
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar la tasa de cambio");
      console.error("Error setting manual rate:", error);
    }
  };
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
        <SettingItem
          title="Moneda Base"
          subtitle={
            rate ? `1 USD = ${rate.toFixed(2)} Bs` : "Configurar tasa de cambio"
          }
          onPress={handleCurrencyBasePress}
        />
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
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    marginTop: 20,
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
