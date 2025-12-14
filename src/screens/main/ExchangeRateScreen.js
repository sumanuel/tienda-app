import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useExchangeRate } from "../../contexts/ExchangeRateContext";
import { getSettings, updateSetting } from "../../services/database/settings";
import RateDisplay from "../../components/exchange/RateDisplay";
import CurrencyConverter from "../../components/exchange/CurrencyConverter";
import AutoUpdateToggle from "../../components/exchange/AutoUpdateToggle";

/**
 * Pantalla de gestión de tasas de cambio
 */
export const ExchangeRateScreen = () => {
  const { rate, loading, lastUpdate, updateRate } = useExchangeRate({
    autoUpdate: true,
  });
  const [autoUpdate, setAutoUpdate] = React.useState(true);
  const [updateInterval, setUpdateInterval] = React.useState(30);

  const handleUpdateRate = async () => {
    try {
      await updateRate("BCV");
    } catch (error) {
      console.error("Error updating rate:", error);
    }
  };

  const handleToggleAutoUpdate = async (value) => {
    setAutoUpdate(value);
    await updateSetting("exchange.autoUpdate", value);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Tasa de Cambio</Text>

      <RateDisplay
        rate={rate}
        source="BCV"
        lastUpdate={lastUpdate}
        style={styles.section}
      />

      <TouchableOpacity
        style={styles.updateButton}
        onPress={handleUpdateRate}
        disabled={loading}
      >
        <Text style={styles.updateButtonText}>
          {loading ? "Actualizando..." : "Actualizar Ahora"}
        </Text>
      </TouchableOpacity>

      <AutoUpdateToggle
        enabled={autoUpdate}
        onToggle={handleToggleAutoUpdate}
        interval={updateInterval}
        style={styles.section}
      />

      <CurrencyConverter exchangeRate={rate} style={styles.section} />
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
    marginBottom: 16,
  },
  updateButton: {
    backgroundColor: "#2196F3",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ExchangeRateScreen;
