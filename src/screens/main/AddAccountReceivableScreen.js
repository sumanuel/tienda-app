import React, { useState } from "react";
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
import { useCustomers } from "../../hooks/useCustomers";

/**
 * Pantalla para agregar nueva cuenta por cobrar
 */
export const AddAccountReceivableScreen = ({ navigation }) => {
  const { addAccountReceivable } = useAccounts();
  const { getCustomerByDocument } = useCustomers();

  const [formData, setFormData] = useState({
    documentNumber: "",
    customerName: "",
    amount: "",
    description: "",
    dueDate: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const handleDocumentChange = async (documentNumber) => {
    updateFormData("documentNumber", documentNumber);

    if (documentNumber.trim()) {
      try {
        const customer = await getCustomerByDocument(documentNumber.trim());
        if (customer) {
          updateFormData("customerName", customer.name);
        } else {
          updateFormData("customerName", "");
        }
      } catch (error) {
        console.error("Error buscando cliente:", error);
        updateFormData("customerName", "");
      }
    } else {
      updateFormData("customerName", "");
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
    if (!formData.customerName.trim()) {
      Alert.alert("Error", "El nombre del cliente es obligatorio");
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
      const currentDate = new Date().toISOString().split("T")[0]; // Fecha actual en formato YYYY-MM-DD

      await addAccountReceivable({
        ...formData,
        amount: parseFloat(formData.amount),
        createdDate: currentDate, // Agregar fecha de creación
      });
      Alert.alert("Éxito", "Cuenta por cobrar agregada correctamente", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar la cuenta por cobrar");
    }
  };

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Nueva Cuenta por Cobrar</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Cédula *"
              value={formData.documentNumber}
              onChangeText={handleDocumentChange}
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="Nombre del Cliente *"
              value={formData.customerName}
              onChangeText={(value) => updateFormData("customerName", value)}
            />

            <TextInput
              style={styles.input}
              placeholder="Monto *"
              value={formData.amount}
              onChangeText={(value) => updateFormData("amount", value)}
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="Descripción"
              value={formData.description}
              onChangeText={(value) => updateFormData("description", value)}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={styles.dateInput}
              onPress={showDatePickerModal}
            >
              <Text
                style={
                  formData.dueDate ? styles.dateText : styles.datePlaceholder
                }
              >
                {formData.dueDate ? formData.dueDate : "Fecha de vencimiento *"}
              </Text>
            </TouchableOpacity>
          </View>

          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModal}>
                <Text style={styles.modalTitle}>
                  Seleccionar Fecha de Vencimiento
                </Text>

                <View style={styles.datePickerContainer}>
                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>Día:</Text>
                    <TextInput
                      style={styles.dateInputSmall}
                      value={selectedDate.getDate().toString()}
                      onChangeText={(text) => {
                        const day = parseInt(text) || 1;
                        const newDate = new Date(selectedDate);
                        newDate.setDate(Math.min(day, 31));
                        setSelectedDate(newDate);
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>

                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>Mes:</Text>
                    <TextInput
                      style={styles.dateInputSmall}
                      value={(selectedDate.getMonth() + 1).toString()}
                      onChangeText={(text) => {
                        const month = parseInt(text) || 1;
                        const newDate = new Date(selectedDate);
                        newDate.setMonth(Math.min(Math.max(month - 1, 0), 11));
                        setSelectedDate(newDate);
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>

                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>Año:</Text>
                    <TextInput
                      style={styles.dateInputSmall}
                      value={selectedDate.getFullYear().toString()}
                      onChangeText={(text) => {
                        const year = parseInt(text) || new Date().getFullYear();
                        const newDate = new Date(selectedDate);
                        newDate.setFullYear(year);
                        setSelectedDate(newDate);
                      }}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                  </View>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={() => handleDateSelect(selectedDate)}
                  >
                    <Text style={styles.saveButtonText}>Seleccionar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  form: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  dateText: {
    fontSize: 16,
    color: "#333",
  },
  datePlaceholder: {
    fontSize: 16,
    color: "#999",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  datePickerModal: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "80%",
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  datePickerContainer: {
    marginBottom: 20,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dateLabel: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  dateInputSmall: {
    flex: 2,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 8,
    fontSize: 16,
    textAlign: "center",
    backgroundColor: "#f9f9f9",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    padding: 20,
    paddingBottom: 40,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: "#666",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#4CAF50",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default AddAccountReceivableScreen;
