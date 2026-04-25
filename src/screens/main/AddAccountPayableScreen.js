import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
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
  ScreenHero,
  SurfaceCard,
  UI_COLORS,
  SHADOWS,
} from "../../components/common/AppUI";
import {
  FormActionRow,
  FormSectionHeader,
  SegmentedOptions,
} from "../../components/common/FormPatterns";
import { rf, vs, spacing, borderRadius } from "../../utils/responsive";

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
      date.getDate(),
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
        formData.documentNumber.trim(),
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
          formData.baseCurrency === "USD" ? (computedUSD ?? 0) : null,
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
            <ScreenHero
              iconName="receipt-outline"
              iconColor={UI_COLORS.danger}
              eyebrow="Pagos"
              title="Nueva cuenta por pagar"
              subtitle="Registra compromisos con proveedores con una vista más compacta y fácil de revisar."
              style={styles.heroCard}
            />

            <FormSectionHeader
              title="Datos del proveedor"
              hint="Usa el documento para autocompletar proveedores registrados."
            />

            <SurfaceCard style={styles.card}>
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
            </SurfaceCard>

            <FormSectionHeader
              title="Detalle de la obligación"
              hint="Describe el concepto para reconocer la cuenta rápidamente."
            />

            <SurfaceCard style={styles.card}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Moneda del monto *</Text>
                <SegmentedOptions
                  options={[
                    { value: "VES", label: "Monto en Bs" },
                    { value: "USD", label: "Monto en USD" },
                  ]}
                  value={formData.baseCurrency}
                  onChange={(code) => updateFormData("baseCurrency", code)}
                />
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
                <Pressable
                  style={({ pressed }) => [
                    styles.input,
                    styles.dateTrigger,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={showDatePickerModal}
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
                </Pressable>

                {showDatePicker && (
                  <View style={styles.datePickerWrapper}>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={handleDateChange}
                    />
                    {Platform.OS === "ios" && (
                      <Pressable
                        style={({ pressed }) => [
                          styles.datePickerDone,
                          pressed && styles.cardPressed,
                        ]}
                        onPress={closeDatePicker}
                      >
                        <Text style={styles.datePickerDoneText}>Listo</Text>
                      </Pressable>
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
            </SurfaceCard>

            <FormActionRow
              onCancel={() => navigation.goBack()}
              onSubmit={handleSave}
              submitLabel="Guardar cuenta"
              submitTone="danger"
              loading={loading}
            />
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
    backgroundColor: UI_COLORS.page,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: vs(60),
    gap: spacing.lg,
  },
  heroCard: {
    marginBottom: vs(2),
  },
  card: {
    padding: spacing.lg,
    gap: 20,
    ...SHADOWS.soft,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: spacing.md,
    paddingVertical: vs(13),
    fontSize: rf(15),
    color: UI_COLORS.text,
    backgroundColor: UI_COLORS.surfaceAlt,
  },
  textArea: {
    minHeight: vs(88),
    textAlignVertical: "top",
  },
  dateTrigger: {
    justifyContent: "center",
  },
  datePickerWrapper: {
    backgroundColor: UI_COLORS.surface,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  datePickerDone: {
    alignSelf: "flex-end",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    backgroundColor: UI_COLORS.info,
    marginTop: spacing.xs,
    marginRight: spacing.xs,
  },
  datePickerDoneText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: rf(14),
  },
  dateValue: {
    fontSize: rf(15),
    color: UI_COLORS.text,
  },
  datePlaceholder: {
    fontSize: rf(15),
    color: "#9aa2b1",
  },
  helperText: {
    fontSize: rf(12),
    color: UI_COLORS.info,
    backgroundColor: UI_COLORS.infoSoft,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    lineHeight: vs(18),
    padding: spacing.md,
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
  dualAmountCard: {
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    padding: spacing.md,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    gap: spacing.md,
  },
  dualAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dualAmountLabel: {
    fontSize: rf(14),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  dualAmountValue: {
    fontSize: rf(16),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  dualAmountHint: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
    textAlign: "center",
    fontStyle: "italic",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

export default AddAccountPayableScreen;
