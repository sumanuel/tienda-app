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
import { useSuppliers } from "../../hooks/useSuppliers";

/**
 * Pantalla para agregar nueva cuenta por pagar
 */
export const AddAccountPayableScreen = ({ navigation }) => {
  const { addAccountPayable } = useAccounts();
  const { getSupplierByDocument, addSupplier } = useSuppliers();

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

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDocumentChange = async (documentNumber) => {
    updateFormData("documentNumber", documentNumber);

    if (documentNumber.trim()) {
      try {
        const supplier = await getSupplierByDocument(documentNumber.trim());
        updateFormData("supplierName", supplier ? supplier.name : "");
      } catch (error) {
        console.error("Error buscando proveedor:", error);
        updateFormData("supplierName", "");
      }
    } else {
      updateFormData("supplierName", "");
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    const formattedDate = date.toISOString().split("T")[0];
    updateFormData("dueDate", formattedDate);
    setShowDatePicker(false);
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

  const handleSave = async () => {
    if (!formData.documentNumber.trim()) {
      Alert.alert("Error", "El RIF o cédula es obligatorio");
      return;
    }
    if (!formData.supplierName.trim()) {
      Alert.alert("Error", "El nombre del proveedor es obligatorio");
      return;
    }

    const amountValue = parseFloat(formData.amount.replace(",", "."));
    if (Number.isNaN(amountValue) || amountValue <= 0) {
      Alert.alert("Error", "El monto debe ser un número positivo");
      return;
    }

    if (!formData.dueDate.trim()) {
      Alert.alert("Error", "La fecha de vencimiento es obligatoria");
      return;
    }

    try {
      let supplier = await getSupplierByDocument(
        formData.documentNumber.trim()
      );

      if (!supplier) {
        await addSupplier({
          documentNumber: formData.documentNumber.trim(),
          name: formData.supplierName.trim(),
        });
        supplier = await getSupplierByDocument(formData.documentNumber.trim());
      }

      await addAccountPayable({
        supplierId: supplier?.id,
        supplierName: formData.supplierName.trim(),
        amount: amountValue,
        description: formData.description.trim(),
        invoiceNumber: formData.invoiceNumber.trim(),
        dueDate: formData.dueDate,
        documentNumber: formData.documentNumber.trim(),
        createdAt: new Date().toISOString(),
      });

      Alert.alert("Éxito", "Cuenta por pagar agregada correctamente", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Error agregando cuenta por pagar:", error);
      Alert.alert("Error", "No se pudo guardar la cuenta por pagar");
    }
  };

  const DatePickerModal = () => (
    <Modal
      visible={showDatePicker}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowDatePicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>
            Selecciona la fecha de vencimiento
          </Text>

          <View style={styles.modalInputs}>
            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Día</Text>
              <TextInput
                style={styles.modalInput}
                value={selectedDate.getDate().toString()}
                onChangeText={(value) => {
                  const day = parseInt(value, 10) || 1;
                  const next = new Date(selectedDate);
                  next.setDate(Math.min(Math.max(day, 1), 31));
                  setSelectedDate(next);
                }}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Mes</Text>
              <TextInput
                style={styles.modalInput}
                value={(selectedDate.getMonth() + 1).toString()}
                onChangeText={(value) => {
                  const month = parseInt(value, 10) || 1;
                  const next = new Date(selectedDate);
                  next.setMonth(Math.min(Math.max(month - 1, 0), 11));
                  setSelectedDate(next);
                }}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Año</Text>
              <TextInput
                style={styles.modalInput}
                value={selectedDate.getFullYear().toString()}
                onChangeText={(value) => {
                  const year = parseInt(value, 10) || new Date().getFullYear();
                  const next = new Date(selectedDate);
                  next.setFullYear(year);
                  setSelectedDate(next);
                }}
                keyboardType="numeric"
                maxLength={4}
              />
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalSecondary]}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.modalSecondaryText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalPrimary]}
              onPress={() => handleDateSelect(selectedDate)}
            >
              <Text style={styles.modalPrimaryText}>Seleccionar</Text>
            </TouchableOpacity>
          </View>
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
              <Text style={styles.heroIconText}>📑</Text>
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Nueva cuenta por pagar</Text>
              <Text style={styles.heroSubtitle}>
                Registra compromisos con proveedores y mantén tu flujo de caja
                bajo control.
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Datos del proveedor</Text>
            <Text style={styles.sectionHint}>
              Usa el documento para autocompletar proveedores registrados.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>RIF/Cédula *</Text>
              <TextInput
                style={styles.input}
                placeholder="J123456789"
                placeholderTextColor="#9aa2b1"
                value={formData.documentNumber}
                onChangeText={handleDocumentChange}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nombre del proveedor *</Text>
              <TextInput
                style={styles.input}
                placeholder="Empresa o persona"
                placeholderTextColor="#9aa2b1"
                value={formData.supplierName}
                onChangeText={(value) => updateFormData("supplierName", value)}
              />
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Detalle de la obligación</Text>
            <Text style={styles.sectionHint}>
              Describe el concepto para reconocer la cuenta rápidamente.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Monto (Bs) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#9aa2b1"
                value={formData.amount}
                onChangeText={(value) => updateFormData("amount", value)}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Factura de inventario, pago de servicios, etc."
                placeholderTextColor="#9aa2b1"
                value={formData.description}
                onChangeText={(value) => updateFormData("description", value)}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Número de factura (opcional)
              </Text>
              <TextInput
                style={styles.input}
                placeholder="FAC-001"
                placeholderTextColor="#9aa2b1"
                value={formData.invoiceNumber}
                onChangeText={(value) => updateFormData("invoiceNumber", value)}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Fecha de vencimiento *</Text>
              <TouchableOpacity
                style={[styles.input, styles.dateTrigger]}
                onPress={showDatePickerModal}
                activeOpacity={0.85}
              >
                <Text
                  style={
                    formData.dueDate ? styles.dateValue : styles.datePlaceholder
                  }
                >
                  {formData.dueDate || "Selecciona la fecha"}
                </Text>
              </TouchableOpacity>
            </View>

            {formData.dueDate ? (
              <Text style={styles.helperText}>
                Anticípate a la fecha y evita recargos con recordatorios
                oportunos.
              </Text>
            ) : null}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryText}>Guardar cuenta</Text>
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
    backgroundColor: "#e8edf2",
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 60,
    gap: 24,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#fff5f3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 18,
  },
  heroIconText: {
    fontSize: 30,
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2633",
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
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
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
    minHeight: 88,
    textAlignVertical: "top",
  },
  dateTrigger: {
    justifyContent: "center",
  },
  dateValue: {
    fontSize: 15,
    color: "#1f2633",
  },
  datePlaceholder: {
    fontSize: 15,
    color: "#9aa2b1",
  },
  helperText: {
    fontSize: 12,
    color: "#5a2e2e",
    backgroundColor: "#fff4f2",
    padding: 12,
    borderRadius: 12,
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
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#c3cad5",
  },
  secondaryText: {
    color: "#4c5767",
    fontWeight: "600",
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: "#ef5350",
    shadowColor: "#ef5350",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryText: {
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
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 12,
    gap: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2633",
    textAlign: "center",
  },
  modalInputs: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalInputGroup: {
    flex: 1,
    gap: 6,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7a8796",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#d9e0eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: "center",
    fontSize: 15,
    color: "#1f2633",
    backgroundColor: "#f8f9fc",
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
  modalSecondary: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#c3cad5",
  },
  modalSecondaryText: {
    color: "#4c5767",
    fontWeight: "600",
    fontSize: 14,
  },
  modalPrimary: {
    backgroundColor: "#ef5350",
    shadowColor: "#ef5350",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  modalPrimaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});

export default AddAccountPayableScreen;
