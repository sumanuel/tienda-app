import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useExchangeRate } from "../../contexts/ExchangeRateContext";
import { getSettings, saveSettings } from "../../services/database/settings";
import { useCustomAlert } from "../../components/common/CustomAlert";

export const PricingSettingsScreen = () => {
  const {
    rate,
    setManualRate,
    loading: rateLoading,
    lastUpdate,
  } = useExchangeRate({ autoUpdate: false });
  const { showAlert, CustomAlert } = useCustomAlert();
  const [isLoading, setIsLoading] = useState(true);

  const [margin, setMargin] = useState(30);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [currencies, setCurrencies] = useState({
    USD: 280,
    EURO: 300,
    USD2: 350,
  });
  const [iva, setIva] = useState(16);

  const [editingSection, setEditingSection] = useState(null);
  const [savingSection, setSavingSection] = useState(null);

  const [formMargin, setFormMargin] = useState("30");
  const [formLowStock, setFormLowStock] = useState("10");
  const [formBaseCurrency, setFormBaseCurrency] = useState("USD");
  const [formCurrencies, setFormCurrencies] = useState({
    USD: "280",
    EURO: "300",
    USD2: "350",
  });
  const [formIva, setFormIva] = useState("16");
  const [manualRateInput, setManualRateInput] = useState("280");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const settings = await getSettings();

        const pricing = settings.pricing || {};
        const inventory = settings.inventory || {};

        const defaultMargin = pricing.defaultMargin ?? 30;
        const defaultLowStock = inventory.lowStockThreshold ?? 10;
        const defaultBaseCurrency = pricing.baseCurrency || "USD";
        let syncedCurrencies = pricing.currencies || {
          USD: 280,
          EURO: 300,
          USD2: 350,
        };

        if (rate && rate !== syncedCurrencies.USD) {
          syncedCurrencies = { ...syncedCurrencies, USD: rate };
          const updatedSettings = {
            ...settings,
            pricing: {
              ...pricing,
              currencies: syncedCurrencies,
            },
          };
          await saveSettings(updatedSettings);
        }

        const ivaValue = pricing.iva ?? 16;

        setMargin(defaultMargin);
        setLowStockThreshold(defaultLowStock);
        setBaseCurrency(defaultBaseCurrency);
        setCurrencies(syncedCurrencies);
        setIva(ivaValue);

        setFormMargin(defaultMargin.toString());
        setFormLowStock(defaultLowStock.toString());
        setFormBaseCurrency(defaultBaseCurrency);
        setFormCurrencies({
          USD: (syncedCurrencies.USD ?? 0).toString(),
          EURO: (syncedCurrencies.EURO ?? 0).toString(),
          USD2: (syncedCurrencies.USD2 ?? 0).toString(),
        });
        setFormIva(ivaValue.toString());
        setManualRateInput(
          rate?.toString() || (syncedCurrencies.USD ?? 0).toString()
        );
      } catch (error) {
        console.error("Error loading settings:", error);
        showAlert({
          title: "Error",
          message: "No pudimos cargar la configuración. Intenta nuevamente.",
          type: "error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [rate]);

  useEffect(() => {
    if (rate) {
      setManualRateInput(rate.toString());
    }
  }, [rate]);

  const startEditing = (section) => {
    if (section === "pricing") {
      setFormMargin(margin.toString());
      setFormBaseCurrency(baseCurrency);
      setFormCurrencies({
        USD: (currencies.USD ?? 0).toString(),
        EURO: (currencies.EURO ?? 0).toString(),
        USD2: (currencies.USD2 ?? 0).toString(),
      });
      setFormIva(iva.toString());
      setManualRateInput(rate?.toString() || (currencies.USD ?? 0).toString());
    }
    if (section === "inventory") {
      setFormLowStock(lowStockThreshold.toString());
    }
    setEditingSection(section);
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setSavingSection(null);
    setFormMargin(margin.toString());
    setFormLowStock(lowStockThreshold.toString());
    setFormBaseCurrency(baseCurrency);
    setFormCurrencies({
      USD: (currencies.USD ?? 0).toString(),
      EURO: (currencies.EURO ?? 0).toString(),
      USD2: (currencies.USD2 ?? 0).toString(),
    });
    setFormIva(iva.toString());
    setManualRateInput(rate?.toString() || (currencies.USD ?? 0).toString());
  };

  const handleSavePricing = async () => {
    const numericMargin = parseFloat(formMargin.replace(",", "."));
    const numericUsd = parseFloat(formCurrencies.USD.replace(",", "."));
    const numericEuro = parseFloat(formCurrencies.EURO.replace(",", "."));
    const numericUsd2 = parseFloat(formCurrencies.USD2.replace(",", "."));
    const numericIva = parseFloat(formIva.replace(",", "."));

    if (
      Number.isNaN(numericMargin) ||
      numericMargin < 0 ||
      numericMargin > 200
    ) {
      showAlert({
        title: "Valor inválido",
        message: "Ingresa un margen entre 0 y 200",
        type: "error",
      });
      return;
    }

    if (
      [numericUsd, numericEuro, numericUsd2].some(
        (value) => Number.isNaN(value) || value <= 0
      )
    ) {
      showAlert({
        title: "Valor inválido",
        message: "Verifica los valores de las monedas",
        type: "error",
      });
      return;
    }

    if (Number.isNaN(numericIva) || numericIva < 0 || numericIva > 100) {
      showAlert({
        title: "Valor inválido",
        message: "Ingresa un IVA entre 0 y 100",
        type: "error",
      });
      return;
    }

    try {
      setSavingSection("pricing");
      const settings = await getSettings();
      const updatedSettings = {
        ...settings,
        pricing: {
          ...(settings.pricing || {}),
          defaultMargin: numericMargin,
          baseCurrency: formBaseCurrency,
          currencies: {
            USD: numericUsd,
            EURO: numericEuro,
            USD2: numericUsd2,
          },
          iva: numericIva,
        },
      };
      await saveSettings(updatedSettings);

      setMargin(numericMargin);
      setBaseCurrency(formBaseCurrency);
      setCurrencies({
        USD: numericUsd,
        EURO: numericEuro,
        USD2: numericUsd2,
      });
      setIva(numericIva);

      setEditingSection(null);
      showAlert({
        title: "Éxito",
        message: "Configuración de márgenes actualizada",
        type: "success",
      });
    } catch (error) {
      console.error("Error saving pricing settings:", error);
      showAlert({
        title: "Error",
        message: "No pudimos actualizar los datos de márgenes",
        type: "error",
      });
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveInventory = async () => {
    const numericLowStock = parseInt(formLowStock, 10);
    if (Number.isNaN(numericLowStock) || numericLowStock < 0) {
      showAlert({
        title: "Valor inválido",
        message: "Ingresa un umbral mayor o igual a 0",
        type: "error",
      });
      return;
    }

    try {
      setSavingSection("inventory");
      const settings = await getSettings();
      const updatedSettings = {
        ...settings,
        inventory: {
          ...(settings.inventory || {}),
          lowStockThreshold: numericLowStock,
        },
      };
      await saveSettings(updatedSettings);
      setLowStockThreshold(numericLowStock);
      setEditingSection(null);
      showAlert({
        title: "Éxito",
        message: "Configuración de stock actualizada",
        type: "success",
      });
    } catch (error) {
      console.error("Error saving inventory settings:", error);
      showAlert({
        title: "Error",
        message: "No pudimos actualizar el umbral de stock",
        type: "error",
      });
    } finally {
      setSavingSection(null);
    }
  };

  const formatCurrency = (value) => {
    if (value == null) {
      return "—";
    }
    return new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: "VES",
      minimumFractionDigits: 2,
    }).format(value);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f5ae0" />
        <Text style={styles.loadingText}>Cargando configuración...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroIconText}>💰</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>Margen de ganancias</Text>
            <Text style={styles.heroSubtitle}>
              Configura márgenes y control de inventario.
            </Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardIconText}>📈</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Márgenes de ganancia</Text>
              <Text style={styles.cardSubtitle}>
                Configura porcentajes de ganancia por defecto
              </Text>
            </View>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Margen por defecto</Text>
              <Text style={styles.detailValue}>{margin}%</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>IVA</Text>
              <Text style={styles.detailValue}>{iva}%</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.cardButton}
            onPress={() => startEditing("pricing")}
            activeOpacity={0.8}
          >
            <Text style={styles.cardButtonText}>Configurar márgenes</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardIconText}>📦</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>Control de stocks</Text>
              <Text style={styles.cardSubtitle}>
                Configura alertas de stock bajo
              </Text>
            </View>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Umbral de stock bajo</Text>
              <Text style={styles.detailValue}>
                {lowStockThreshold} unidades
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.cardButton}
            onPress={() => startEditing("inventory")}
            activeOpacity={0.8}
          >
            <Text style={styles.cardButtonText}>Configurar stock</Text>
          </TouchableOpacity>
        </View>

        {/* Modal de edición de márgenes */}
        {editingSection === "pricing" && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Configurar Márgenes</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={cancelEditing}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.inputLabel}>Margen por defecto (%)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={formMargin}
                  onChangeText={setFormMargin}
                  placeholder="Ej: 30"
                />

                <Text style={styles.inputLabel}>IVA (%)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={formIva}
                  onChangeText={setFormIva}
                  placeholder="Ej: 16"
                />
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={cancelEditing}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    savingSection === "pricing" && styles.buttonDisabled,
                  ]}
                  onPress={handleSavePricing}
                  disabled={savingSection === "pricing"}
                  activeOpacity={0.85}
                >
                  {savingSection === "pricing" ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Modal de edición de inventario */}
        {editingSection === "inventory" && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Configurar Stock</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={cancelEditing}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>Umbral de stock bajo</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={formLowStock}
                  onChangeText={setFormLowStock}
                  placeholder="Ej: 10"
                />
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={cancelEditing}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    savingSection === "inventory" && styles.buttonDisabled,
                  ]}
                  onPress={handleSaveInventory}
                  disabled={savingSection === "inventory"}
                  activeOpacity={0.85}
                >
                  {savingSection === "inventory" ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
      <CustomAlert />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8edf2",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 24,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#e8edf2",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4c5767",
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
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 22,
    gap: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#f3f8ff",
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconText: {
    fontSize: 24,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2633",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6f7c8c",
  },
  cardContent: {
    gap: 12,
  },
  cardButton: {
    backgroundColor: "#f0f3fa",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  cardButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2f5ae0",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 14,
    color: "#6f7c8c",
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2633",
    textAlign: "right",
    flexShrink: 1,
    marginLeft: 12,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 22,
    width: "90%",
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 22,
    borderBottomWidth: 1,
    borderBottomColor: "#e4e9f2",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2633",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f5fa",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    fontSize: 16,
    color: "#6f7c8c",
    fontWeight: "600",
  },
  modalBody: {
    padding: 22,
    gap: 16,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 22,
    borderTopWidth: 1,
    borderTopColor: "#e4e9f2",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f3f5fa",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6f7c8c",
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#1f9254",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  input: {
    backgroundColor: "#f3f5fa",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#1f2633",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7a8796",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
});

export default PricingSettingsScreen;
