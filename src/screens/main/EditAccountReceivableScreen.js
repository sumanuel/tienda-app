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
import { useCustomers } from "../../hooks/useCustomers";
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
 * Pantalla para editar cuenta por cobrar existente
 */
export const EditAccountReceivableScreen = ({ navigation, route }) => {
  const { editAccountReceivable } = useAccounts();
  const { getCustomerByDocument } = useCustomers();
  const { account } = route.params;
  const { rate } = useExchangeRateContext();
  const { showAlert, CustomAlert } = useCustomAlert();

  const [formData, setFormData] = useState({
    documentNumber: "",
    customerName: "",
    amount: "",
    baseCurrency: "VES",
    description: "",
    dueDate: "",
    invoiceNumber: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formatLocalDate = (date) => {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}`;
  };

  useEffect(() => {
    if (account) {
      const baseCurrency = account.baseCurrency || "VES";
      const exchangeRateAtCreation =
        Number(account.exchangeRateAtCreation) || 0;
      const accountAmount = Number(account.amount) || 0;
      const accountBaseUSD =
        account.baseAmountUSD !== null && account.baseAmountUSD !== undefined
          ? Number(account.baseAmountUSD)
          : null;

      let baseAmountText = "";
      if (baseCurrency === "USD") {
        if (accountBaseUSD !== null && Number.isFinite(accountBaseUSD)) {
          baseAmountText = accountBaseUSD.toString();
        } else if (exchangeRateAtCreation > 0) {
          baseAmountText = (accountAmount / exchangeRateAtCreation).toFixed(2);
        } else {
          const currentRate = Number(rate) || 0;
          baseAmountText =
            currentRate > 0 ? (accountAmount / currentRate).toFixed(2) : "";
        }
      } else {
        baseAmountText = accountAmount ? accountAmount.toString() : "";
      }

      setFormData({
        documentNumber: account.documentNumber || "",
        customerName: account.customerName || "",
        amount: baseAmountText,
        baseCurrency,
        description: account.description || "",
        dueDate: account.dueDate || "",
        invoiceNumber: account.invoiceNumber || "",
      });
      if (account.dueDate) {
        const [y, m, d] = String(account.dueDate).split("-").map(Number);
        const parsed = new Date(y, (m || 1) - 1, d || 1);
        setSelectedDate(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
      }
    }
  }, [account, rate]);

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
        const customer = await getCustomerByDocument(documentNumber.trim());
        if (customer) {
          updateFormData("customerName", customer.name);
        }
      } catch (error) {
        console.error("Error buscando cliente:", error);
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
    if (!formData.customerName.trim()) {
      showAlert({
        title: "Error",
        message: "El nombre del cliente es obligatorio",
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
      await editAccountReceivable(account.id, {
        documentNumber: formData.documentNumber,
        customerName: formData.customerName,
        description: formData.description,
        dueDate: formData.dueDate,
        invoiceNumber: formData.invoiceNumber,
        amount: computedVES ?? 0,
        baseCurrency: formData.baseCurrency,
        baseAmountUSD:
          formData.baseCurrency === "USD" ? computedUSD ?? 0 : null,
        exchangeRateAtCreation:
          formData.baseCurrency === "USD" ? currentRate : null,
      });
      showAlert({
        title: "Éxito",
        message: "Cuenta por cobrar actualizada correctamente",
        type: "success",
        buttons: [{ text: "OK", onPress: () => navigation.goBack() }],
      });
    } catch (error) {
      console.error("Error actualizando cuenta por cobrar:", error);
      showAlert({
        title: "Error",
        message: "No se pudo actualizar la cuenta por cobrar",
        type: "error",
      });
    }
  };

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
                La cédula intentará autocompletar el nombre del cliente
                existente.
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
                {formData.baseCurrency === "USD"
                  ? "Monto (USD)"
                  : "Monto (VES)"}{" "}
                *
              </Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#9aa2b1"
                value={formData.amount}
                onChangeText={(value) => updateFormData("amount", value)}
                keyboardType="numeric"
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
    backgroundColor: "#e8edf2",
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: hs(spacing.lg),
    paddingTop: vs(spacing.lg),
    paddingBottom: vs(40),
    gap: vs(spacing.xl),
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: s(20),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },
  heroIcon: {
    width: iconSize.xl,
    height: iconSize.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: "#f3f8ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: hs(spacing.lg),
  },
  heroIconText: {
    fontSize: rf(28),
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTitle: {
    fontSize: rf(20),
    fontWeight: "700",
    color: "#1f2633",
    marginBottom: vs(6),
  },
  heroSubtitle: {
    fontSize: rf(14),
    color: "#5b6472",
    lineHeight: rf(20),
  },
  sectionHeader: {
    paddingHorizontal: hs(4),
    gap: vs(4),
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#1f2633",
  },
  sectionHint: {
    fontSize: rf(12),
    color: "#6f7c8c",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: s(20),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    gap: vs(spacing.md),
  },
  currencyRow: {
    flexDirection: "row",
    gap: hs(spacing.md),
    marginBottom: vs(14),
  },
  currencyChip: {
    flex: 1,
    paddingVertical: vs(spacing.md),
    paddingHorizontal: hs(spacing.md),
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    alignItems: "center",
  },
  currencyChipActive: {
    borderColor: "#4CAF50",
    backgroundColor: "#eaf6ee",
  },
  currencyChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6f7c8c",
  },
  currencyChipTextActive: {
    color: "#2e7d32",
  },
  dualAmountCard: {
    marginTop: vs(spacing.md),
    backgroundColor: "#f8fafc",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: s(spacing.md),
    gap: vs(8),
  },
  dualAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dualAmountLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6f7c8c",
    letterSpacing: 0.4,
  },
  dualAmountValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1f2633",
  },
  dualAmountHint: {
    marginTop: 4,
    fontSize: 12,
    color: "#6f7c8c",
    fontWeight: "600",
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
});

export default EditAccountReceivableScreen;
