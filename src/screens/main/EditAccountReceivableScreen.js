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
import { useCustomers } from "../../hooks/useCustomers";
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
import { rf, vs, hs, spacing, borderRadius } from "../../utils/responsive";

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
      date.getDate(),
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
          formData.baseCurrency === "USD" ? (computedUSD ?? 0) : null,
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
            <ScreenHero
              iconName="card-outline"
              iconColor={UI_COLORS.info}
              eyebrow="Cobros"
              title="Editar cuenta por cobrar"
              subtitle="Modifica los datos de la obligación del cliente con una lectura más clara."
              style={styles.heroCard}
            />

            <FormSectionHeader
              title="Datos del cliente"
              hint="La cédula intentará autocompletar el nombre del cliente existente."
            />

            <SurfaceCard style={styles.card}>
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
    paddingHorizontal: hs(spacing.lg),
    paddingTop: vs(spacing.lg),
    paddingBottom: vs(56),
    gap: vs(spacing.lg),
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
    gap: vs(spacing.md),
    ...SHADOWS.soft,
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
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    backgroundColor: UI_COLORS.surfaceAlt,
    alignItems: "center",
  },
  currencyChipActive: {
    borderColor: UI_COLORS.accent,
    backgroundColor: UI_COLORS.accentSoft,
  },
  currencyChipText: {
    fontSize: rf(13),
    fontWeight: "700",
    color: UI_COLORS.muted,
  },
  currencyChipTextActive: {
    color: UI_COLORS.accentStrong,
  },
  dualAmountCard: {
    marginTop: spacing.md,
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  dualAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dualAmountLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
    letterSpacing: 0.4,
  },
  dualAmountValue: {
    fontSize: rf(14),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  dualAmountHint: {
    marginTop: spacing.xs,
    fontSize: rf(12),
    color: UI_COLORS.muted,
    fontWeight: "600",
  },
  label: {
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
    paddingHorizontal: spacing.lg,
    paddingVertical: vs(13),
    fontSize: rf(15),
    color: UI_COLORS.text,
    backgroundColor: UI_COLORS.surfaceAlt,
  },
  textArea: {
    minHeight: vs(90),
    textAlignVertical: "top",
  },
  datePickerTrigger: {
    justifyContent: "center",
  },
  dateText: {
    fontSize: rf(15),
    color: UI_COLORS.text,
  },
  datePlaceholder: {
    fontSize: rf(15),
    color: "#9aa2b1",
  },
  helperInfo: {
    fontSize: rf(12),
    color: UI_COLORS.info,
    backgroundColor: UI_COLORS.infoSoft,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    lineHeight: rf(18),
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: vs(15),
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    backgroundColor: UI_COLORS.surface,
  },
  secondaryButtonText: {
    color: UI_COLORS.info,
    fontWeight: "700",
    fontSize: rf(14),
  },
  primaryButton: {
    backgroundColor: UI_COLORS.accent,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: rf(14),
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
    paddingHorizontal: spacing.lg,
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
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

export default EditAccountReceivableScreen;
