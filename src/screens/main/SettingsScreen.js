import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Button,
} from "react-native";
import { useExchangeRate } from "../../contexts/ExchangeRateContext";
import { getSettings, saveSettings } from "../../services/database/settings";

/**
 * Pantalla de ajustes
 */
export const SettingsScreen = ({ navigation }) => {
  const { rate, setManualRate } = useExchangeRate();
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState(rate?.toString() || "");
  const [margin, setMargin] = useState(30);
  const [marginModalVisible, setMarginModalVisible] = useState(false);
  const [marginInput, setMarginInput] = useState(margin.toString());
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [lowStockModalVisible, setLowStockModalVisible] = useState(false);
  const [lowStockInput, setLowStockInput] = useState(
    lowStockThreshold.toString()
  );
  const [business, setBusiness] = useState({
    name: "",
    rif: "",
    address: "",
    phone: "",
    email: "",
  });
  const [businessModalVisible, setBusinessModalVisible] = useState(false);
  const [tempBusiness, setTempBusiness] = useState(business);
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [currencies, setCurrencies] = useState({
    USD: 280,
    EURO: 300,
    USD2: 350,
  });
  const [currenciesModalVisible, setCurrenciesModalVisible] = useState(false);
  const [tempCurrencies, setTempCurrencies] = useState(currencies);
  const [iva, setIva] = useState(16);
  const [ivaModalVisible, setIvaModalVisible] = useState(false);
  const [ivaInput, setIvaInput] = useState(iva.toString());

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getSettings();
      setMargin(settings.pricing?.defaultMargin || 30);
      setLowStockThreshold(settings.inventory?.lowStockThreshold || 10);
      setBusiness(
        settings.business || {
          name: "",
          rif: "",
          address: "",
          phone: "",
          email: "",
        }
      );
      setBaseCurrency(settings.pricing?.baseCurrency || "USD");

      // Sincronizar tasa del contexto (SQLite exchange_rates) con settings (SQLite settings)
      let syncedCurrencies = settings.pricing?.currencies || {
        USD: 280,
        EURO: 300,
        USD2: 350,
      };
      if (rate && rate !== syncedCurrencies.USD) {
        console.log(
          `Syncing rate from exchange_rates table (${rate}) to settings table`
        );
        syncedCurrencies.USD = rate;
        // Actualizar settings con la tasa de la tabla exchange_rates
        if (!settings.pricing) settings.pricing = {};
        if (!settings.pricing.currencies) settings.pricing.currencies = {};
        settings.pricing.currencies.USD = rate;
        await saveSettings(settings);
      }
      setCurrencies(syncedCurrencies);

      setIva(settings.pricing?.iva || 16);
    };
    loadSettings();
  }, [rate]);

  const handleCurrencyBasePress = () => {
    Alert.alert(
      "Seleccionar Moneda Base",
      "Elige la moneda con la que trabajará el sistema",
      [
        { text: "USD", onPress: () => saveBaseCurrency("USD") },
        { text: "EURO", onPress: () => saveBaseCurrency("EURO") },
        { text: "USD2", onPress: () => saveBaseCurrency("USD2") },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  };

  const saveBaseCurrency = async (currency) => {
    try {
      const settings = await getSettings();
      settings.pricing.baseCurrency = currency;
      await saveSettings(settings);
      setBaseCurrency(currency);
      Alert.alert("Éxito", `Moneda base cambiada a ${currency}`);
    } catch (error) {
      Alert.alert("Error", "No se pudo cambiar la moneda base");
      console.error("Error saving base currency:", error);
    }
  };

  const handleMarginPress = () => {
    setMarginInput(margin.toString());
    setMarginModalVisible(true);
  };

  const handleLowStockPress = () => {
    setLowStockInput(lowStockThreshold.toString());
    setLowStockModalVisible(true);
  };

  const handleBusinessPress = () => {
    setTempBusiness(business);
    setBusinessModalVisible(true);
  };

  const handleCurrenciesPress = () => {
    setTempCurrencies(currencies);
    setCurrenciesModalVisible(true);
  };

  const handleIvaPress = () => {
    setIvaInput(iva.toString());
    setIvaModalVisible(true);
  };

  const handleSaveRate = async () => {
    const numericValue = parseFloat(inputValue);
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
            onPress: async () => {
              try {
                await setManualRate(numericValue);
                Alert.alert(
                  "Éxito",
                  `Tasa de cambio actualizada:\n1 USD = ${numericValue.toFixed(
                    2
                  )} VES\n\nEsta tasa se usará en toda la aplicación.`
                );
                setModalVisible(false);
              } catch (error) {
                Alert.alert("Error", "No se pudo actualizar la tasa de cambio");
                console.error("Error setting manual rate:", error);
              }
            },
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
            onPress: async () => {
              try {
                await setManualRate(numericValue);
                Alert.alert(
                  "Éxito",
                  `Tasa de cambio actualizada:\n1 USD = ${numericValue.toFixed(
                    2
                  )} VES\n\nEsta tasa se usará en toda la aplicación.`
                );
                setModalVisible(false);
              } catch (error) {
                Alert.alert("Error", "No se pudo actualizar la tasa de cambio");
                console.error("Error setting manual rate:", error);
              }
            },
          },
        ]
      );
      return;
    }

    try {
      await setManualRate(numericValue);

      // También actualizar los settings para sincronizar
      const settings = await getSettings();
      if (!settings.pricing) settings.pricing = {};
      if (!settings.pricing.currencies) settings.pricing.currencies = {};
      settings.pricing.currencies.USD = numericValue;
      await saveSettings(settings);
      setCurrencies({ ...currencies, USD: numericValue });

      Alert.alert(
        "Éxito",
        `Tasa de cambio actualizada:\n1 USD = ${numericValue.toFixed(
          2
        )} VES\n\nEsta tasa se usará en toda la aplicación.`
      );
      setModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar la tasa de cambio");
      console.error("Error setting manual rate:", error);
    }
  };

  const handleSaveMargin = async () => {
    const numericValue = parseFloat(marginInput);
    if (isNaN(numericValue) || numericValue < 0 || numericValue > 200) {
      Alert.alert("Error", "Ingresa un valor válido entre 0 y 200");
      return;
    }

    try {
      const settings = await getSettings();
      settings.pricing.defaultMargin = numericValue;
      await saveSettings(settings);
      setMargin(numericValue);
      Alert.alert("Éxito", `Margen por defecto actualizado a ${numericValue}%`);
      setMarginModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el margen");
      console.error("Error saving margin:", error);
    }
  };

  const handleSaveLowStock = async () => {
    const numericValue = parseInt(lowStockInput);
    if (isNaN(numericValue) || numericValue < 0) {
      Alert.alert("Error", "Ingresa un valor válido mayor o igual a 0");
      return;
    }

    try {
      const settings = await getSettings();
      settings.inventory.lowStockThreshold = numericValue;
      await saveSettings(settings);
      setLowStockThreshold(numericValue);
      Alert.alert(
        "Éxito",
        `Umbral de stock bajo actualizado a ${numericValue} unidades`
      );
      setLowStockModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el umbral de stock");
      console.error("Error saving low stock threshold:", error);
    }
  };

  const handleSaveBusiness = async () => {
    try {
      const settings = await getSettings();
      settings.business = tempBusiness;
      await saveSettings(settings);
      setBusiness(tempBusiness);
      Alert.alert("Éxito", "Información del negocio actualizada");
      setBusinessModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar la información del negocio");
      console.error("Error saving business info:", error);
    }
  };

  const handleSaveCurrencies = async () => {
    const usdValue = parseFloat(tempCurrencies.USD);
    const euroValue = parseFloat(tempCurrencies.EURO);
    const usd2Value = parseFloat(tempCurrencies.USD2);
    if (
      isNaN(usdValue) ||
      usdValue <= 0 ||
      isNaN(euroValue) ||
      euroValue <= 0 ||
      isNaN(usd2Value) ||
      usd2Value <= 0
    ) {
      Alert.alert("Error", "Ingresa valores válidos mayores a 0");
      return;
    }

    try {
      // Primero guardar en settings
      const settings = await getSettings();
      settings.pricing.currencies = tempCurrencies;
      await saveSettings(settings);
      setCurrencies(tempCurrencies);

      // Actualizar la tasa en la BD si se cambió USD
      const newUsdValue = parseFloat(tempCurrencies.USD);
      if (!isNaN(newUsdValue) && newUsdValue !== rate) {
        await setManualRate(newUsdValue);
        console.log("Rate saved to DB:", newUsdValue);
      }

      Alert.alert("Éxito", "Valores de monedas actualizados");
      setCurrenciesModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "No se pudieron actualizar los valores de monedas");
      console.error("Error saving currencies:", error);
    }
  };

  const handleSaveIva = async () => {
    const numericValue = parseFloat(ivaInput);
    if (isNaN(numericValue) || numericValue < 0 || numericValue > 100) {
      Alert.alert("Error", "Ingresa un porcentaje válido entre 0 y 100");
      return;
    }

    try {
      const settings = await getSettings();
      settings.pricing.iva = numericValue;
      await saveSettings(settings);
      setIva(numericValue);
      Alert.alert("Éxito", `IVA actualizado a ${numericValue}%`);
      setIvaModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el IVA");
      console.error("Error saving IVA:", error);
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
    <>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Configuración</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Negocio</Text>
          <SettingItem
            title="Información del Negocio"
            subtitle="Nombre, RIF, dirección"
            onPress={handleBusinessPress}
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
            subtitle={`Moneda actual: ${baseCurrency} (${currencies[baseCurrency]} VES)`}
            onPress={handleCurrencyBasePress}
          />
          <SettingItem
            title="Margen por Defecto"
            subtitle={`${margin}%`}
            onPress={handleMarginPress}
          />
          <SettingItem
            title="Monedas"
            subtitle="Configurar monedas disponibles"
            onPress={handleCurrenciesPress}
          />
          <SettingItem
            title="IVA"
            subtitle={`${iva}%`}
            onPress={handleIvaPress}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inventario</Text>
          <SettingItem
            title="Umbral de Stock Bajo"
            subtitle={`${lowStockThreshold} unidades`}
            onPress={handleLowStockPress}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos</Text>
          <SettingItem title="Backup" subtitle="Exportar datos" />
          <SettingItem title="Restaurar" subtitle="Importar datos" />
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Configurar Tasa de Cambio USD → VES
            </Text>
            <Text style={styles.modalSubtitle}>
              Ingresa el valor equivalente de 1 USD en Bolívares.
            </Text>
            <Text style={styles.modalSubtitle}>
              Tasa actual: {rate ? `${rate.toFixed(2)} VES` : "No configurada"}
            </Text>
            <TextInput
              style={styles.textInput}
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="decimal-pad"
              placeholder="Ej: 35.50"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveRate}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={marginModalVisible}
        onRequestClose={() => setMarginModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configurar Margen por Defecto</Text>
            <Text style={styles.modalSubtitle}>
              Ingresa el porcentaje de margen por defecto para productos.
            </Text>
            <Text style={styles.modalSubtitle}>Margen actual: {margin}%</Text>
            <TextInput
              style={styles.textInput}
              value={marginInput}
              onChangeText={setMarginInput}
              keyboardType="decimal-pad"
              placeholder="Ej: 30"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setMarginModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveMargin}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={lowStockModalVisible}
        onRequestClose={() => setLowStockModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Configurar Umbral de Stock Bajo
            </Text>
            <Text style={styles.modalSubtitle}>
              Ingresa el número mínimo de unidades para considerar stock bajo.
            </Text>
            <Text style={styles.modalSubtitle}>
              Umbral actual: {lowStockThreshold} unidades
            </Text>
            <TextInput
              style={styles.textInput}
              value={lowStockInput}
              onChangeText={setLowStockInput}
              keyboardType="number-pad"
              placeholder="Ej: 10"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setLowStockModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveLowStock}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={businessModalVisible}
        onRequestClose={() => setBusinessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Información del Negocio</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Nombre del negocio"
              value={tempBusiness.name}
              onChangeText={(text) =>
                setTempBusiness({ ...tempBusiness, name: text })
              }
            />
            <TextInput
              style={styles.textInput}
              placeholder="RIF"
              value={tempBusiness.rif}
              onChangeText={(text) =>
                setTempBusiness({ ...tempBusiness, rif: text })
              }
            />
            <TextInput
              style={styles.textInput}
              placeholder="Dirección"
              value={tempBusiness.address}
              onChangeText={(text) =>
                setTempBusiness({ ...tempBusiness, address: text })
              }
            />
            <TextInput
              style={styles.textInput}
              placeholder="Teléfono"
              value={tempBusiness.phone}
              onChangeText={(text) =>
                setTempBusiness({ ...tempBusiness, phone: text })
              }
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.textInput}
              placeholder="Email"
              value={tempBusiness.email}
              onChangeText={(text) =>
                setTempBusiness({ ...tempBusiness, email: text })
              }
              keyboardType="email-address"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setBusinessModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveBusiness}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={currenciesModalVisible}
        onRequestClose={() => setCurrenciesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configurar Valores de Monedas</Text>
            <Text style={styles.inputLabel}>Valor del USD (VES):</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Valor del USD"
              value={tempCurrencies.USD.toString()}
              onChangeText={(text) =>
                setTempCurrencies({ ...tempCurrencies, USD: text })
              }
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputLabel}>Valor del EURO (VES):</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Valor del EURO"
              value={tempCurrencies.EURO.toString()}
              onChangeText={(text) =>
                setTempCurrencies({ ...tempCurrencies, EURO: text })
              }
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputLabel}>Valor del USD2 (VES):</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Valor del USD2"
              value={tempCurrencies.USD2.toString()}
              onChangeText={(text) =>
                setTempCurrencies({ ...tempCurrencies, USD2: text })
              }
              keyboardType="decimal-pad"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setCurrenciesModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveCurrencies}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={ivaModalVisible}
        onRequestClose={() => setIvaModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configurar IVA</Text>
            <Text style={styles.modalSubtitle}>
              Ingresa el porcentaje de IVA.
            </Text>
            <Text style={styles.modalSubtitle}>IVA actual: {iva}%</Text>
            <TextInput
              style={styles.textInput}
              value={ivaInput}
              onChangeText={setIvaInput}
              keyboardType="decimal-pad"
              placeholder="Ej: 16"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setIvaModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveIva}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
    textAlign: "center",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
  },
  cancelButtonText: {
    textAlign: "center",
    color: "#333",
  },
  saveButton: {
    backgroundColor: "#007bff",
  },
  saveButtonText: {
    textAlign: "center",
    color: "#fff",
  },
});

export default SettingsScreen;
