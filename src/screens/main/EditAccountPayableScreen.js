import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Modal,
} from "react-native";
import { useAccounts } from "../../hooks/useAccounts";
import { useSuppliers } from "../../hooks/useSuppliers";

/**
 * Pantalla para editar cuenta por pagar existente
 */
export const EditAccountPayableScreen = ({ navigation, route }) => {
  const { editAccountPayable } = useAccounts();
  const { getSupplierByDocument } = useSuppliers();
  const { account } = route.params;

  const [formData, setFormData] = useState({
    documentNumber: "",
    supplierName: "",
    amount: "",
    description: "",
    dueDate: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (account) {
      setFormData({
        documentNumber: account.documentNumber || "",
        supplierName: account.supplierName || "",
        amount: account.amount?.toString() || "",
        description: account.description || "",
        dueDate: account.dueDate || "",
      });
      if (account.dueDate) {
        setSelectedDate(new Date(account.dueDate));
      }
    }
  }, [account]);

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDocumentChange = async (documentNumber) => {
    updateFormData("documentNumber", documentNumber);

    if (documentNumber.trim()) {
      try {
        const supplier = await getSupplierByDocument(documentNumber.trim());
        if (supplier) {
          updateFormData("supplierName", supplier.name);
        }
      } catch (error) {
        console.error("Error buscando proveedor:", error);
      }
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    const formattedDate = date.toISOString().split("T")[0]; // YYYY-MM-DD format
    updateFormData("dueDate", formattedDate);
    setShowDatePicker(false);
  };

  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };

  const handleSave = async () => {
    if (!formData.documentNumber.trim()) {
      Alert.alert("Error", "La cédula es obligatoria");
      return;
    }
    if (!formData.supplierName.trim()) {
      Alert.alert("Error", "El nombre del proveedor es obligatorio");
      return;
    }
    if (!formData.amount.trim()) {
      Alert.alert("Error", "El monto es obligatorio");
      return;
    }
    if (!formData.dueDate.trim()) {
      Alert.alert("Error", "La fecha de vencimiento es obligatoria");
      return;
    }

    try {
      await editAccountPayable(account.id, {
        ...formData,
        amount: parseFloat(formData.amount),
      });
      Alert.alert("Éxito", "Cuenta por pagar actualizada correctamente", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar la cuenta por pagar");
    }
  };

  const DatePickerModal = () => (
    <Modal
      visible={showDatePicker}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowDatePicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.datePickerContainer}>
          <Text style={styles.modalTitle}>
            Seleccionar Fecha de Vencimiento
          </Text>

          <View style={styles.datePicker}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => {
                const today = new Date();
                handleDateSelect(today);
              }}
            >
              <Text style={styles.dateButtonText}>Hoy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                handleDateSelect(tomorrow);
              }}
            >
              <Text style={styles.dateButtonText}>Mañana</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => {
                const week = new Date();
                week.setDate(week.getDate() + 7);
                handleDateSelect(week);
              }}
            >
              <Text style={styles.dateButtonText}>En 1 semana</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => {
                const month = new Date();
                month.setMonth(month.getMonth() + 1);
                handleDateSelect(month);
              }}
            >
              <Text style={styles.dateButtonText}>En 1 mes</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowDatePicker(false)}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Editar Cuenta por Pagar</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Cédula del Proveedor</Text>
            <TextInput
              style={styles.input}
              value={formData.documentNumber}
              onChangeText={handleDocumentChange}
              placeholder="Ingrese cédula"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Nombre del Proveedor</Text>
            <TextInput
              style={styles.input}
              value={formData.supplierName}
              onChangeText={(value) => updateFormData("supplierName", value)}
              placeholder="Nombre del proveedor"
            />

            <Text style={styles.label}>Monto (VES)</Text>
            <TextInput
              style={styles.input}
              value={formData.amount}
              onChangeText={(value) => updateFormData("amount", value)}
              placeholder="0.00"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(value) => updateFormData("description", value)}
              placeholder="Descripción de la cuenta"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Fecha de Vencimiento</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={showDatePickerModal}
            >
              <Text style={styles.dateText}>
                {formData.dueDate || "Seleccionar fecha"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <DatePickerModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#fafafa",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fafafa",
    marginBottom: 16,
  },
  dateText: {
    fontSize: 16,
    color: "#333",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    backgroundColor: "#f44336",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  datePickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    width: "80%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  datePicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  dateButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 10,
    minWidth: "45%",
    alignItems: "center",
  },
  dateButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default EditAccountPayableScreen;
