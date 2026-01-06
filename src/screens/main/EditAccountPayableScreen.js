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
import { useExchangeRateContext } from "../../contexts/ExchangeRateContext";
import { formatCurrency } from "../../utils/currency";
import { useCustomAlert } from "../../components/common/CustomAlert";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";

/**
 * Pantalla para editar cuenta por pagar existente
 */
export const EditAccountPayableScreen = ({ navigation, route }) => {
  const { editAccountPayable } = useAccounts();
  const { getSupplierByDocument } = useSuppliers();
  const { rate } = useExchangeRateContext();
  const { showAlert, CustomAlert } = useCustomAlert();
  const { account } = route.params;

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

  useEffect(() => {
    if (account) {
      setFormData({
        documentNumber: account.documentNumber || "",
        supplierName: account.supplierName || "",
        amount: account.amount?.toString() || "",
        baseCurrency: account.baseCurrency || "VES",
        description: account.description || "",
        invoiceNumber: account.invoiceNumber || "",
        dueDate: account.dueDate || "",
      });
      if (account.dueDate) {
        const [y, m, d] = String(account.dueDate).split("-").map(Number);
        const parsed = new Date(y, (m || 1) - 1, d || 1);
        setSelectedDate(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
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
      showAlert({
        title: "Error",
        message: "La cédula es obligatoria",
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

    try {
      await editAccountPayable(account.id, {
        supplierName: formData.supplierName.trim(),
        amount: computedVES ?? 0,
        baseCurrency: formData.baseCurrency,
        baseAmountUSD:
          formData.baseCurrency === "USD" ? computedUSD ?? 0 : null,
        exchangeRateAtCreation:
          formData.baseCurrency === "USD" ? currentRate : null,
        description: formData.description.trim(),
        dueDate: formData.dueDate,
        documentNumber: formData.documentNumber.trim(),
        invoiceNumber: formData.invoiceNumber.trim(),
      });
      showAlert({
        title: "Éxito",
        message: "Cuenta por pagar actualizada correctamente",
        type: "success",
        buttons: [{ text: "OK", onPress: () => navigation.goBack() }],
      });
    } catch (error) {
      console.error("Error actualizando cuenta por pagar:", error);
      showAlert({
        title: "Error",
        message: "No se pudo actualizar la cuenta por pagar",
        type: "error",
      });
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
              <Text style={styles.label}>Moneda del monto *</Text>
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

              <Text style={styles.label}>
                {formData.baseCurrency === "USD" ? "Monto (USD)" : "Monto (Bs)"}{" "}
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
      <CustomAlert />
    </>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    marginBottom: spacing.xxl,
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
    width: iconSize.lg,
    height: iconSize.lg,
    borderRadius: s(24),
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.lg,
  },
  heroIconText: {
    fontSize: rf(24),
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTitle: {
    fontSize: rf(20),
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    fontSize: rf(14),
    color: "#64748b",
    lineHeight: rf(20),
  },
  sectionHeader: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: spacing.xs,
  },
  sectionHint: {
    fontSize: rf(14),
    color: "#64748b",
    lineHeight: rf(20),
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    marginBottom: spacing.xxl,
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
    fontSize: rf(14),
    fontWeight: "500",
    color: "#374151",
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: rf(16),
    color: "#1f2937",
    backgroundColor: "#ffffff",
  },
  textArea: {
    height: vs(80),
    textAlignVertical: "top",
  },
  datePickerTrigger: {
    justifyContent: "center",
  },
  datePickerWrapper: {
    backgroundColor: "#ffffff",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
  },
  datePickerDone: {
    alignSelf: "flex-end",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: s(10),
    backgroundColor: "#2f5ae0",
    marginTop: spacing.sm,
    marginRight: spacing.sm,
  },
  datePickerDoneText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: rf(14),
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

export default EditAccountPayableScreen;
