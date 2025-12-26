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
} from "react-native";
import { useAccounts } from "../../hooks/useAccounts";
import { useSuppliers } from "../../hooks/useSuppliers";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useExchangeRateContext } from "../../contexts/ExchangeRateContext";
import { formatCurrency } from "../../utils/currency";
import { useCustomAlert } from "../../components/common/CustomAlert";

/**
 * Pantalla para agregar nueva cuenta por pagar
 */
export const AddAccountPayableScreen = ({ navigation }) => {
  const { addAccountPayable } = useAccounts();
  const { getSupplierByDocument, addSupplier } = useSuppliers();
  const { rate } = useExchangeRateContext();
  const { showAlert, CustomAlert } = useCustomAlert();

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    documentNumber: "",
    supplierName: "",
    amount: "",
    baseCurrency: "VES",
    description: "",
    invoiceNumber: "",
    dueDate: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formatLocalDate = (date) => {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}`;
  };

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const parseAmountInput = (value) => {
    if (typeof value !== "string") return 0;
    const normalized = value.replace(/,/g, ".").replace(/\s/g, "").trim();
    const num = Number.parseFloat(normalized);
    return Number.isFinite(num) ? num : 0;
  };

  const currentRate = Number(rate) || 0;
  const baseAmountValue = parseAmountInput(formData.amount);
  const computedUSD =
    formData.baseCurrency === "USD"
      ? baseAmountValue
      : currentRate > 0
      ? baseAmountValue / currentRate
      : null;
  const computedVES =
    formData.baseCurrency === "USD"
      ? currentRate > 0
        ? baseAmountValue * currentRate
        : null
      : baseAmountValue;

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

  const safeBackToAccounts = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("Main", { screen: "AccountsPayable" });
  };

  const handleSave = async () => {
    if (loading) return;

    if (!formData.documentNumber.trim()) {
      showAlert({
        title: "Error",
        message: "El RIF o cédula es obligatorio",
        type: "error",
      });
      return;
    }
    if (!formData.supplierName.trim()) {
      showAlert({
        title: "Error",
        message: "El nombre del proveedor es obligatorio",
        type: "error",
      });
      return;
    }

    const baseAmount = parseAmountInput(formData.amount);
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      showAlert({
        title: "Error",
        message: "El monto debe ser un número positivo",
        type: "error",
      });
      return;
    }

    if (formData.baseCurrency === "USD" && currentRate <= 0) {
      showAlert({
        title: "Error",
        message:
          "Debes definir una tasa de cambio para registrar un monto en USD",
        type: "error",
      });
      return;
    }

    if (!formData.dueDate.trim()) {
      showAlert({
        title: "Error",
        message: "La fecha de vencimiento es obligatoria",
        type: "error",
      });
      return;
    }

    setLoading(true);
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
        amount: computedVES ?? 0,
        baseCurrency: formData.baseCurrency,
        baseAmountUSD:
          formData.baseCurrency === "USD" ? computedUSD ?? 0 : null,
        exchangeRateAtCreation:
          formData.baseCurrency === "USD" ? currentRate : null,
        description: formData.description.trim(),
        invoiceNumber: formData.invoiceNumber.trim(),
        dueDate: formData.dueDate,
        documentNumber: formData.documentNumber.trim(),
        createdAt: new Date().toISOString(),
      });

      showAlert({
        title: "Éxito",
        message: "Cuenta por pagar agregada correctamente",
        type: "success",
      });
      safeBackToAccounts();
    } catch (error) {
      console.error("Error agregando cuenta por pagar:", error);
      showAlert({
        title: "Error",
        message: "No se pudo guardar la cuenta por pagar",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
                  onChangeText={(value) =>
                    updateFormData("supplierName", value)
                  }
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
                <Text style={styles.fieldLabel}>Moneda del monto *</Text>
                <View style={styles.currencyRow}>
                  {["VES", "USD"].map((code) => {
                    const active = formData.baseCurrency === code;
                    return (
                      <TouchableOpacity
                        key={code}
                        style={[
                          styles.currencyChip,
                          active ? styles.currencyChipActive : null,
                        ]}
                        onPress={() => updateFormData("baseCurrency", code)}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.currencyChipText,
                            active ? styles.currencyChipTextActive : null,
                          ]}
                        >
                          {code === "USD" ? "Monto en USD" : "Monto en Bs"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  {formData.baseCurrency === "USD"
                    ? "Monto (USD)"
                    : "Monto (Bs)"}{" "}
                  *
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#9aa2b1"
                  value={formData.amount}
                  onChangeText={(value) => updateFormData("amount", value)}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.dualAmountCard}>
                <View style={styles.dualAmountRow}>
                  <Text style={styles.dualAmountLabel}>USD</Text>
                  <Text style={styles.dualAmountValue}>
                    {computedUSD === null
                      ? "—"
                      : formatCurrency(computedUSD, "USD")}
                  </Text>
                </View>
                <View style={styles.dualAmountRow}>
                  <Text style={styles.dualAmountLabel}>VES</Text>
                  <Text style={styles.dualAmountValue}>
                    {computedVES === null
                      ? "—"
                      : formatCurrency(computedVES, "VES")}
                  </Text>
                </View>
                {currentRate > 0 ? (
                  <Text style={styles.dualAmountHint}>
                    Tasa actual: 1 USD = VES. {currentRate.toFixed(2)}
                  </Text>
                ) : (
                  <Text style={styles.dualAmountHint}>
                    Define la tasa para ver equivalencias
                  </Text>
                )}
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
                  onChangeText={(value) =>
                    updateFormData("invoiceNumber", value)
                  }
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
                      formData.dueDate
                        ? styles.dateValue
                        : styles.datePlaceholder
                    }
                  >
                    {formData.dueDate || "Selecciona la fecha"}
                  </Text>
                </TouchableOpacity>

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
      </SafeAreaView>
      <CustomAlert />
    </>
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
  datePickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d9e0eb",
    paddingVertical: 10,
    paddingHorizontal: 6,
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
  dateValue: {
    fontSize: 15,
    color: "#1f2633",
  },
  datePlaceholder: {
    fontSize: 15,
    color: "#9aa2b1",
  },
  helperText: {
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
  currencyRow: {
    flexDirection: "row",
    gap: 12,
  },
  currencyChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d9e0eb",
    backgroundColor: "#f8f9fc",
    alignItems: "center",
    justifyContent: "center",
  },
  currencyChipActive: {
    backgroundColor: "#2f5ae0",
    borderColor: "#2f5ae0",
  },
  currencyChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6f7c8c",
  },
  currencyChipTextActive: {
    color: "#fff",
  },
  dualAmountCard: {
    backgroundColor: "#f8f9fc",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e8edf2",
    gap: 12,
  },
  dualAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dualAmountLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6f7c8c",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  dualAmountValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2633",
  },
  dualAmountHint: {
    fontSize: 12,
    color: "#9aa2b1",
    textAlign: "center",
    fontStyle: "italic",
  },
});

export default AddAccountPayableScreen;
