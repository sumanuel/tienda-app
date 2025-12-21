import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useExchangeRate } from "../../contexts/ExchangeRateContext";
import RateDisplay from "../../components/exchange/RateDisplay";
import CurrencyConverter from "../../components/exchange/CurrencyConverter";

export const ExchangeRateScreen = () => {
  const { rate, lastUpdate, setManualRate } = useExchangeRate({
    autoUpdate: false,
  });
  const [manualValue, setManualValue] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (rate) {
      setManualValue(rate.toString());
    }
  }, [rate]);

  const formattedLastUpdate = useMemo(() => {
    if (!lastUpdate) {
      return "Sin sincronizar";
    }

    return `${lastUpdate.toLocaleDateString()} · ${lastUpdate.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    )}`;
  }, [lastUpdate]);

  const handleManualSave = async () => {
    const numericValue = parseFloat(manualValue.replace(",", "."));
    if (Number.isNaN(numericValue) || numericValue <= 0) {
      Alert.alert("Valor inválido", "Ingresa un número mayor a cero");
      return;
    }

    try {
      setSaving(true);
      await setManualRate(numericValue);
      Alert.alert(
        "Tasa actualizada",
        `Guardamos ${numericValue.toFixed(2)} VES por USD`
      );
    } catch (error) {
      Alert.alert("Error", "No pudimos guardar la tasa manual");
      console.error("Error saving manual rate:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroIconText}>💱</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>Tasa de cambio</Text>
            <Text style={styles.heroSubtitle}>
              Administra la tasa oficial y tus referencias en un solo lugar.
            </Text>
          </View>
        </View>

        <RateDisplay
          rate={rate}
          source="BCV"
          lastUpdate={lastUpdate}
          style={styles.rateDisplay}
        />

        <View style={styles.manualCard}>
          <Text style={styles.manualTitle}>Actualizar manualmente</Text>
          <Text style={styles.manualSubtitle}>
            Ingresa la tasa acordada para aplicar inmediatamente en la app.
          </Text>
          <View style={styles.manualInputRow}>
            <View style={styles.manualBadge}>
              <Text style={styles.manualBadgeText}>USD → VES</Text>
            </View>
            <TextInput
              value={manualValue}
              onChangeText={setManualValue}
              keyboardType="decimal-pad"
              placeholder="0.00"
              style={styles.manualInput}
            />
          </View>
          <TouchableOpacity
            style={[styles.secondaryButton, saving && styles.buttonDisabled]}
            onPress={handleManualSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.secondaryButtonText}>
                Guardar tasa manual
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <CurrencyConverter exchangeRate={rate} style={styles.converter} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8edf2",
  },
  content: {
    padding: 24,
    paddingBottom: 120,
    gap: 22,
  },
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 22,
    flexDirection: "row",
    gap: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#f3f8ff",
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconText: {
    fontSize: 30,
  },
  heroInfo: {
    flex: 1,
    gap: 6,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2633",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#5b6472",
    lineHeight: 20,
  },
  manualCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 22,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
  },
  manualTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2633",
  },
  manualSubtitle: {
    fontSize: 14,
    color: "#5b6472",
    lineHeight: 20,
  },
  manualInputRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  manualBadge: {
    backgroundColor: "#e8f1ff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  manualBadgeText: {
    color: "#2f5ae0",
    fontWeight: "700",
    fontSize: 13,
  },
  manualInput: {
    flex: 1,
    backgroundColor: "#f3f5fa",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2633",
  },
  secondaryButton: {
    backgroundColor: "#1f9254",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  moduleCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 22,
    gap: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
  },
  moduleTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1f2633",
  },
  moduleSubtitle: {
    fontSize: 13,
    color: "#6f7c8c",
  },
  rateDisplay: {
    marginTop: 4,
  },
  converter: {
    marginTop: 4,
  },
});

export default ExchangeRateScreen;
