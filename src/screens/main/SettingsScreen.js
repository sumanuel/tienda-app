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
import { useExchangeRate } from "../../hooks/useExchangeRate";
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
    };
    loadSettings();
  }, []);

  const handleCurrencyBasePress = () => {
    setInputValue(rate?.toString() || "");
    setModalVisible(true);
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
                  )} Bs\n\nEsta tasa se usará en toda la aplicación.`
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
                  )} Bs\n\nEsta tasa se usará en toda la aplicación.`
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
      Alert.alert(
        "Éxito",
        `Tasa de cambio actualizada:\n1 USD = ${numericValue.toFixed(
          2
        )} Bs\n\nEsta tasa se usará en toda la aplicación.`
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
            subtitle={
              rate
                ? `1 USD = ${rate.toFixed(2)} Bs`
                : "Configurar tasa de cambio"
            }
            onPress={handleCurrencyBasePress}
          />
          <SettingItem
            title="Margen por Defecto"
            subtitle={`${margin}%`}
            onPress={handleMarginPress}
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
              Configurar Tasa de Cambio USD → Bs
            </Text>
            <Text style={styles.modalSubtitle}>
              Ingresa el valor equivalente de 1 USD en Bolívares.
            </Text>
            <Text style={styles.modalSubtitle}>
              Tasa actual: {rate ? `${rate.toFixed(2)} Bs` : "No configurada"}
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
