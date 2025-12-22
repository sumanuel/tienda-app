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
} from "react-native";
import { useAccounts } from "../../hooks/useAccounts";
import { useSuppliers } from "../../hooks/useSuppliers";
import DateTimePicker from "@react-native-community/datetimepicker";

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
    invoiceNumber: "",
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
        invoiceNumber: account.invoiceNumber || "",
        dueDate: account.dueDate || "",
      });
      if (account.dueDate) {
        setSelectedDate(new Date(account.dueDate));
      }
    }
  }, [account]);

  const formatLocalDate = (date) => {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}`;
  };

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

  const handleDateChange = (_event, date) => {
    if (Platform.OS !== "ios") {
      setShowDatePicker(false);
    }
    if (!date) return;
    setSelectedDate(date);
    updateFormData("dueDate", formatLocalDate(date));
  };

  const showDatePickerModal = () => {
    if (formData.dueDate) {
      const [year, month, day] = formData.dueDate.split("-").map(Number);
      if (year && month && day) {
        const parsed = new Date(year, month - 1, day);
        if (!Number.isNaN(parsed.getTime())) {
          setSelectedDate(parsed);
        }
      }
    }
    setShowDatePicker(true);
  };

  const closeDatePicker = () => setShowDatePicker(false);

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
              <Text style={styles.heroIconText}>💰</Text>
            </View>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>Editar cuenta por pagar</Text>
              <Text style={styles.heroSubtitle}>
                Modifica los detalles de la obligación al proveedor.
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Datos del proveedor</Text>
            <Text style={styles.sectionHint}>
              La cédula intentará autocompletar el nombre del proveedor
              existente.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Cédula del proveedor *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: J123456789"
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
              value={formData.supplierName}
              onChangeText={(value) => updateFormData("supplierName", value)}
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

            {showDatePicker && (
              <View style={styles.datePickerWrapper}>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleDateChange}
                />
                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    style={styles.datePickerDone}
                    onPress={closeDatePicker}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.datePickerDoneText}>Listo</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  heroIconText: {
    fontSize: 24,
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f2937",
    backgroundColor: "#ffffff",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  datePickerTrigger: {
    justifyContent: "center",
  },
  datePickerWrapper: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginTop: 10,
  },
  datePickerDone: {
    alignSelf: "flex-end",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#2f5ae0",
    marginTop: 8,
    marginRight: 8,
  },
  datePickerDoneText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  dateText: {
    fontSize: 16,
    color: "#1f2937",
  },
  datePlaceholder: {
    fontSize: 16,
    color: "#9ca3af",
  },
  helperInfo: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#3b82f6",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  secondaryButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default EditAccountPayableScreen;
