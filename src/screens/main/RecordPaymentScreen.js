import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAccounts } from "../../hooks/useAccounts";
import { formatCurrency } from "../../utils/currency";
import { useCustomAlert } from "../../components/common/CustomAlert";
import {
  InfoPill,
  ScreenHero,
  SurfaceCard,
  UI_COLORS,
  SHADOWS,
} from "../../components/common/AppUI";
import {
  FormActionRow,
  SegmentedOptions,
} from "../../components/common/FormPatterns";
import DateTimePicker from "@react-native-community/datetimepicker";
import { rf, vs, spacing, borderRadius } from "../../utils/responsive";

export const RecordPaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { account } = route.params;
  const { recordPayment, getBalance } = useAccounts();
  const { showAlert, CustomAlert } = useCustomAlert();

  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      const balanceData = await getBalance(account.id, "receivable");
      setBalance(balanceData);
      setPaymentAmount(balanceData.balance.toString());
    } catch (error) {
      showAlert({
        title: "Error",
        message: "No se pudo cargar el saldo de la cuenta",
        type: "error",
      });
    }
  };

  const handleDateChange = (_event, selectedDate) => {
    if (Platform.OS !== "ios") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setPaymentDate(selectedDate);
    }
  };

  const closeDatePicker = () => {
    setShowDatePicker(false);
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const formatLocalDate = (date) => {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )}`;
  };

  const paymentDateLabel = formatLocalDate(paymentDate);

  const safeBackToAccounts = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("Main", { screen: "AccountsReceivable" });
  };

  const handleRecordPayment = async () => {
    if (loading) return;

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      showAlert({
        title: "Error",
        message: "Ingresa un monto válido",
        type: "error",
      });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount > balance.balance) {
      showAlert({
        title: "Error",
        message: "El monto no puede ser mayor al saldo pendiente",
        type: "error",
      });
      return;
    }

    try {
      setLoading(true);
      await recordPayment(account.id, {
        amount,
        paymentMethod,
        paymentDate: paymentDate.toISOString(),
        reference: reference.trim() || null,
        notes: notes.trim() || null,
      });

      showAlert({
        title: "Éxito",
        message: "Pago registrado correctamente",
        type: "success",
      });
      safeBackToAccounts();
    } catch (error) {
      showAlert({
        title: "Error",
        message: "No se pudo registrar el pago",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!balance) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={UI_COLORS.info} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  const totalPaid = balance.paidAmount || 0;
  const paymentOptions = [
    { value: "cash", label: "Efectivo" },
    { value: "card", label: "Tarjeta" },
    { value: "transfer", label: "Transferencia" },
    { value: "pago_movil", label: "Pago móvil" },
  ];

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
              iconName="wallet-outline"
              iconColor={UI_COLORS.info}
              eyebrow="Cobros"
              title="Registrar pago"
              subtitle={`Aplica un abono a ${account.customerName} manteniendo visible el saldo antes de confirmar.`}
              pills={[
                {
                  text: `Pendiente ${formatCurrency(balance.balance, "VES")}`,
                  tone: balance.balance > 0 ? "warning" : "accent",
                },
                {
                  text: `Pagado ${formatCurrency(totalPaid, "VES")}`,
                  tone: "info",
                },
              ]}
            />

            <SurfaceCard style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.metricBlock}>
                  <Text style={styles.metricLabel}>Saldo pendiente</Text>
                  <Text style={[styles.metricValue, styles.pendingValue]}>
                    {formatCurrency(balance.balance, "VES")}
                  </Text>
                </View>
                <InfoPill text={paymentDateLabel} tone="info" />
              </View>
              <View style={styles.metricInlineRow}>
                <View style={styles.metricInlineCard}>
                  <Text style={styles.metricInlineLabel}>Total</Text>
                  <Text style={styles.metricInlineValue}>
                    {formatCurrency(balance.totalAmount, "VES")}
                  </Text>
                </View>
                <View style={styles.metricInlineCard}>
                  <Text style={styles.metricInlineLabel}>Pagado</Text>
                  <Text style={styles.metricInlineValue}>
                    {formatCurrency(totalPaid, "VES")}
                  </Text>
                </View>
              </View>
            </SurfaceCard>

            <SurfaceCard style={styles.formCard}>
              <Text style={styles.label}>Monto del pago *</Text>
              <TextInput
                style={styles.amountInput}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder="0.00"
                placeholderTextColor="#9aa2b1"
                keyboardType="numeric"
                selectTextOnFocus
              />
              <Text style={styles.helperText}>
                El monto no puede ser mayor al saldo pendiente actual.
              </Text>

              <Text style={styles.label}>Método de pago *</Text>
              <SegmentedOptions
                options={paymentOptions}
                value={paymentMethod}
                onChange={setPaymentMethod}
                compact
              />

              {(paymentMethod === "transfer" ||
                paymentMethod === "pago_movil") && (
                <>
                  <Text style={styles.label}>Referencia</Text>
                  <TextInput
                    style={styles.input}
                    value={reference}
                    onChangeText={setReference}
                    placeholder="Número de referencia"
                    placeholderTextColor="#9aa2b1"
                    autoCapitalize="none"
                  />
                </>
              )}

              <Text style={styles.label}>Fecha del pago *</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.input,
                  pressed && styles.pressed,
                ]}
                onPress={openDatePicker}
                disabled={loading}
              >
                <Text style={styles.dateText}>{paymentDateLabel}</Text>
              </Pressable>

              {showDatePicker && (
                <View style={styles.datePickerWrapper}>
                  <DateTimePicker
                    value={paymentDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                  {Platform.OS === "ios" && (
                    <Pressable
                      style={({ pressed }) => [
                        styles.datePickerDone,
                        pressed && styles.pressed,
                      ]}
                      onPress={closeDatePicker}
                    >
                      <Text style={styles.datePickerDoneText}>Listo</Text>
                    </Pressable>
                  )}
                </View>
              )}

              <Text style={styles.label}>Notas</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Notas adicionales..."
                placeholderTextColor="#9aa2b1"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </SurfaceCard>

            <FormActionRow
              onCancel={safeBackToAccounts}
              onSubmit={handleRecordPayment}
              submitLabel="Registrar pago"
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
    padding: spacing.lg,
    paddingBottom: vs(56),
    gap: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: UI_COLORS.page,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: rf(16),
    color: UI_COLORS.muted,
  },
  summaryCard: {
    gap: spacing.md,
    ...SHADOWS.soft,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  metricBlock: {
    flex: 1,
    gap: vs(4),
  },
  metricLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  metricValue: {
    fontSize: rf(24),
    fontWeight: "800",
  },
  pendingValue: {
    color: UI_COLORS.danger,
  },
  metricInlineRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  metricInlineCard: {
    flex: 1,
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    padding: spacing.md,
    gap: vs(4),
  },
  metricInlineLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
  },
  metricInlineValue: {
    fontSize: rf(15),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  formCard: {
    gap: spacing.md,
    ...SHADOWS.soft,
  },
  label: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: spacing.md,
    paddingVertical: vs(14),
    fontSize: rf(20),
    fontWeight: "800",
    textAlign: "center",
    backgroundColor: UI_COLORS.surfaceAlt,
    color: UI_COLORS.text,
  },
  input: {
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    padding: spacing.md,
    fontSize: rf(15),
    backgroundColor: UI_COLORS.surfaceAlt,
    color: UI_COLORS.text,
  },
  dateText: {
    fontSize: rf(15),
    color: UI_COLORS.text,
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
  notesInput: {
    minHeight: vs(88),
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: rf(12),
    color: UI_COLORS.info,
    backgroundColor: UI_COLORS.infoSoft,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    padding: spacing.md,
    lineHeight: vs(18),
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
