import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useExchangeRate } from "../../contexts/ExchangeRateContext";
import { getSettings } from "../../services/database/settings";
import RateDisplay from "../../components/exchange/RateDisplay";
import CurrencyConverter from "../../components/exchange/CurrencyConverter";

/**
 * Pantalla de gestión de tasas de cambio
 */
export const ExchangeRateScreen = () => {
  const { rate, loading, lastUpdate, updateRate } = useExchangeRate({
    autoUpdate: false,
  });

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>💱 Tasa de Cambio</Text>
          <Text style={styles.subtitle}>Gestión de divisas</Text>
        </View>

        <RateDisplay
          rate={rate}
          source="BCV"
          lastUpdate={lastUpdate}
          style={styles.rateCard}
        />

        <CurrencyConverter exchangeRate={rate} style={styles.converterCard} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "500",
  },
  rateCard: {
    marginBottom: 20,
  },
  converterCard: {
    marginBottom: 20,
  },
});

export default ExchangeRateScreen;
