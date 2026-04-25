import React, { useState, useEffect } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useAccounts } from "../../hooks/useAccounts";
import { useSuppliers } from "../../hooks/useSuppliers";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useExchangeRateContext } from "../../contexts/ExchangeRateContext";
import { formatCurrency } from "../../utils/currency";
import { useCustomAlert } from "../../components/common/CustomAlert";
import {
  FormActionRow,
  FormSectionHeader,
  SegmentedOptions,
} from "../../components/common/FormPatterns";
import {
  ScreenHero,
  SurfaceCard,
  UI_COLORS,
  SHADOWS,
} from "../../components/common/AppUI";
import { s, rf, vs, hs, spacing, borderRadius } from "../../utils/responsive";

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
          formData.baseCurrency === "USD" ? (computedUSD ?? 0) : null,
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
              iconName="cash-outline"
              iconColor={UI_COLORS.accent}
              eyebrow="Pagos"
              title="Editar cuenta por pagar"
              subtitle="Actualiza la obligación al proveedor con una presentación más clara y ordenada."
              style={styles.heroCard}
            />

            <FormSectionHeader
              title="Datos del proveedor"
              hint="La cédula intentará autocompletar el nombre del proveedor existente."
            />

            <SurfaceCard style={styles.card}>
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
            </SurfaceCard>

            <FormSectionHeader
              title="Detalle de la cuenta"
              hint="Usa montos positivos. Puedes asociar la factura para un mejor seguimiento."
            />

            <SurfaceCard style={styles.card}>
              <Text style={styles.label}>Moneda del monto *</Text>
              <SegmentedOptions
                options={[
                  { value: "VES", label: "Monto en Bs" },
                  { value: "USD", label: "Monto en USD" },
                ]}
                value={formData.baseCurrency}
                onChange={(code) => updateFormData("baseCurrency", code)}
              />

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
              <Pressable
                style={({ pressed }) => [
                  styles.input,
                  styles.datePickerTrigger,
                  pressed && styles.cardPressed,
                ]}
                onPress={showDatePickerModal}
              >
                <Text
                  style={
                    formData.dueDate ? styles.dateText : styles.datePlaceholder
                  }
                >
                  {formData.dueDate || "Selecciona la fecha"}
                </Text>
              </Pressable>
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
            </SurfaceCard>

            <FormActionRow
              onCancel={() => navigation.goBack()}
              onSubmit={handleSave}
              submitLabel="Actualizar cuenta"
              submitTone="danger"
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: vs(56),
    gap: spacing.lg,
  },
  heroCard: {
    marginBottom: vs(2),
  },
  sectionHeader: {
    paddingHorizontal: hs(4),
    gap: vs(4),
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  sectionHint: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
    lineHeight: vs(18),
  },
  card: {
    padding: spacing.lg,
    gap: spacing.md,
    ...SHADOWS.soft,
  },
  label: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
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
    height: vs(80),
    textAlignVertical: "top",
  },
  datePickerTrigger: {
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
    marginTop: spacing.sm,
  },
  datePickerDone: {
    alignSelf: "flex-end",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    backgroundColor: UI_COLORS.info,
    marginTop: spacing.sm,
    marginRight: spacing.sm,
  },
  datePickerDoneText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: rf(14),
  },
  dateText: {
    fontSize: rf(15),
    color: UI_COLORS.text,
  },
  datePlaceholder: {
    fontSize: rf(15),
    color: "#9ca3af",
  },
  helperInfo: {
    fontSize: rf(12),
    color: UI_COLORS.info,
    backgroundColor: UI_COLORS.infoSoft,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    marginTop: spacing.xs,
    lineHeight: rf(18),
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingTop: vs(4),
    marginBottom: spacing.xl,
  },
  actionButton: {
    flex: 1,
    paddingVertical: vs(15),
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: UI_COLORS.accent,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: rf(14),
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: UI_COLORS.surface,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
  },
  secondaryButtonText: {
    color: UI_COLORS.info,
    fontSize: rf(14),
    fontWeight: "700",
  },
  currencyRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  currencyChip: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    backgroundColor: UI_COLORS.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  currencyChipActive: {
    backgroundColor: UI_COLORS.accentSoft,
    borderColor: UI_COLORS.accent,
  },
  currencyChipText: {
    fontSize: rf(14),
    fontWeight: "700",
    color: UI_COLORS.muted,
  },
  currencyChipTextActive: {
    color: UI_COLORS.accentStrong,
  },
  dualAmountCard: {
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    padding: spacing.xl,
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
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

export default EditAccountPayableScreen;
