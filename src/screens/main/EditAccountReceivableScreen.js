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
import { useCustomers } from "../../hooks/useCustomers";

/**
 * Pantalla para editar cuenta por cobrar existente
 */
export const EditAccountReceivableScreen = ({ navigation, route }) => {
  const { editAccountReceivable } = useAccounts();
  const { getCustomerByDocument } = useCustomers();
  const { account } = route.params;

  const [formData, setFormData] = useState({
    documentNumber: "",
    customerName: "",
    amount: "",
    description: "",
    dueDate: "",
    invoiceNumber: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (account) {
      setFormData({
        documentNumber: account.documentNumber || "",
        customerName: account.customerName || "",
        amount: account.amount?.toString() || "",
        description: account.description || "",
        dueDate: account.dueDate || "",
        invoiceNumber: account.invoiceNumber || "",
      });
      if (account.dueDate) {
        setSelectedDate(new Date(account.dueDate));
      }
    }
  }, [account]);

  const handleDocumentChange = async (documentNumber) => {
    updateFormData("documentNumber", documentNumber);

    if (documentNumber.trim()) {
      try {
        const customer = await getCustomerByDocument(documentNumber.trim());
        if (customer) {
          updateFormData("customerName", customer.name);
        }
      } catch (error) {
        console.error("Error buscando cliente:", error);
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
      await editAccountReceivable(account.id, {
        ...formData,
        amount: parseFloat(formData.amount),
      });
      Alert.alert("Éxito", "Cuenta por cobrar actualizada correctamente", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar la cuenta por cobrar");
    }
  };

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Text style={styles.heroIconText}>💳</Text>
            </View>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>Editar cuenta por cobrar</Text>
              <Text style={styles.heroSubtitle}>
                Modifica los detalles de la obligación del cliente.
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Datos del cliente</Text>
            <Text style={styles.sectionHint}>
              La cédula intentará autocompletar el nombre del cliente existente.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Cédula del cliente *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: V12345678"
              placeholderTextColor="#9aa2b1"
              value={formData.documentNumber}
              onChangeText={handleDocumentChange}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Nombre completo *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa el nombre"
              placeholderTextColor="#9aa2b1"
              value={formData.customerName}
              onChangeText={(value) => updateFormData("customerName", value)}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Detalle de la cuenta</Text>
            <Text style={styles.sectionHint}>
              Usa montos positivos. Puedes asociar la factura para un mejor
              seguimiento.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Monto *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#9aa2b1"
              value={formData.amount}
              onChangeText={(value) => updateFormData("amount", value)}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe el motivo de la cuenta"
              placeholderTextColor="#9aa2b1"
              value={formData.description}
              onChangeText={(value) => updateFormData("description", value)}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Número de factura (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa el número de factura"
              placeholderTextColor="#9aa2b1"
              value={formData.invoiceNumber}
              onChangeText={(value) => updateFormData("invoiceNumber", value)}
            />

            <Text style={styles.label}>Fecha de vencimiento *</Text>
            <TouchableOpacity
              style={[styles.input, styles.datePickerTrigger]}
              onPress={showDatePickerModal}
            >
              <Text
                style={
                  formData.dueDate ? styles.dateText : styles.datePlaceholder
                }
              >
                {formData.dueDate || "Selecciona la fecha"}
              </Text>
            </TouchableOpacity>
            {formData.dueDate ? (
              <Text style={styles.helperInfo}>
                Programar recordatorios con anticipación ayuda a reducir la
                morosidad.
              </Text>
            ) : null}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleSave}
            >
              <Text style={styles.primaryButtonText}>Actualizar cuenta</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <Text style={styles.modalTitle}>
              Selecciona la fecha de vencimiento
            </Text>

            <View style={styles.datePickerContainer}>
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>Día</Text>
                <TextInput
                  style={styles.dateInputSmall}
                  value={selectedDate.getDate().toString()}
                  onChangeText={(text) => {
                    const day = parseInt(text, 10) || 1;
                    const newDate = new Date(selectedDate);
                    newDate.setDate(Math.min(day, 31));
                    setSelectedDate(newDate);
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>

              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>Mes</Text>
                <TextInput
                  style={styles.dateInputSmall}
                  value={(selectedDate.getMonth() + 1).toString()}
                  onChangeText={(text) => {
                    const month = parseInt(text, 10) || 1;
                    const newDate = new Date(selectedDate);
                    newDate.setMonth(Math.min(Math.max(month - 1, 0), 11));
                    setSelectedDate(newDate);
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>

              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>Año</Text>
                <TextInput
                  style={styles.dateInputSmall}
                  value={selectedDate.getFullYear().toString()}
                  onChangeText={(text) => {
                    const year = parseInt(text, 10) || new Date().getFullYear();
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
                style={[styles.modalButton, styles.modalSecondaryButton]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.modalSecondaryText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalPrimaryButton]}
                onPress={() => handleDateSelect(selectedDate)}
              >
                <Text style={styles.modalPrimaryText}>Seleccionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8edf2",
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 24,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#f3f8ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  heroIconText: {
    fontSize: 28,
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2633",
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#5b6472",
    lineHeight: 20,
  },
  sectionHeader: {
    paddingHorizontal: 4,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2633",
  },
  sectionHint: {
    fontSize: 12,
    color: "#6f7c8c",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8492a6",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d9e0eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1f2633",
    backgroundColor: "#f8f9fc",
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  datePickerTrigger: {
    justifyContent: "center",
  },
  dateText: {
    fontSize: 15,
    color: "#1f2633",
  },
  datePlaceholder: {
    fontSize: 15,
    color: "#9aa2b1",
  },
  helperInfo: {
    fontSize: 12,
    color: "#4c5767",
    backgroundColor: "#f3f7ff",
    padding: 12,
    borderRadius: 10,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#c3cad5",
    backgroundColor: "#fff",
  },
  secondaryButtonText: {
    color: "#4c5767",
    fontWeight: "600",
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: "#2fb176",
    shadowColor: "#2fb176",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 19, 36, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  datePickerModal: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2633",
    textAlign: "center",
  },
  datePickerContainer: {
    gap: 14,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateLabel: {
    width: 70,
    fontSize: 14,
    color: "#4c5767",
    fontWeight: "600",
  },
  dateInputSmall: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d9e0eb",
    borderRadius: 10,
    paddingVertical: 10,
    textAlign: "center",
    backgroundColor: "#f8f9fc",
    fontSize: 15,
    color: "#1f2633",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryButton: {
    borderWidth: 1,
    borderColor: "#c3cad5",
    backgroundColor: "#fff",
  },
  modalSecondaryText: {
    color: "#4c5767",
    fontWeight: "600",
  },
  modalPrimaryButton: {
    backgroundColor: "#2fb176",
  },
  modalPrimaryText: {
    color: "#fff",
    fontWeight: "700",
  },
});

export default EditAccountReceivableScreen;
