import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAccounts } from "../../hooks/useAccounts";
import { formatCurrency } from "../../utils/currency";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";
import DateTimePicker from "@react-native-community/datetimepicker";

export const RecordPaymentPayableScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { account } = route.params;
  const { recordPayment, getBalance } = useAccounts();

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
      const balanceData = await getBalance(account.id, "payable");
      setBalance(balanceData);
      setPaymentAmount(balanceData.balance.toString());
    } catch (error) {
      Alert.alert("Error", "No se pudo cargar el saldo de la cuenta");
    }
  };

  const safeBackToAccounts = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("Main", { screen: "AccountsPayable" });
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
      date.getDate()
    )}`;
  };

  const paymentDateLabel = formatLocalDate(paymentDate);

  const handleRecordPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      Alert.alert("Error", "Ingrese un monto válido");
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount > balance.balance) {
      Alert.alert("Error", "El monto no puede ser mayor al saldo pendiente");
      return;
    }

    try {
      setLoading(true);
      await recordPayment(
        account.id,
        {
          amount,
          paymentMethod,
          paymentDate: paymentDate.toISOString(),
          reference: reference.trim() || null,
          notes: notes.trim() || null,
        },
        "payable"
      );

      Alert.alert("Éxito", "Pago registrado correctamente");
      safeBackToAccounts();
    } catch (error) {
      Alert.alert("Error", "No se pudo registrar el pago");
    } finally {
      setLoading(false);
    }
  };

  if (!balance) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f5ae0" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Registrar Pago</Text>
        <Text style={styles.subtitle}>{account.supplierName}</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Saldo Pendiente</Text>
        <Text style={styles.balanceAmount}>
          {formatCurrency(balance.balance, "VES")}
        </Text>
        <Text style={styles.totalInfo}>
          Total: {formatCurrency(balance.totalAmount, "VES")} | Pagado:{" "}
          {formatCurrency(balance.paidAmount, "VES")}
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>💰 Monto del Pago</Text>
        <TextInput
          style={styles.amountInput}
          value={paymentAmount}
          onChangeText={setPaymentAmount}
          placeholder="0.00"
          keyboardType="numeric"
          selectTextOnFocus
        />

        <Text style={styles.sectionTitle}>💳 Método de Pago</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.paymentButtonsScroll}
          contentContainerStyle={styles.paymentButtons}
        >
          <TouchableOpacity
            style={[
              styles.paymentButton,
              paymentMethod === "cash" && styles.paymentButtonActive,
            ]}
            onPress={() => setPaymentMethod("cash")}
          >
            <Text style={styles.paymentButtonIcon}>💵</Text>
            <Text
              style={[
                styles.paymentButtonText,
                paymentMethod === "cash" && styles.paymentButtonTextActive,
              ]}
            >
              Efectivo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentButton,
              paymentMethod === "card" && styles.paymentButtonActive,
            ]}
            onPress={() => setPaymentMethod("card")}
          >
            <Text style={styles.paymentButtonIcon}>💳</Text>
            <Text
              style={[
                styles.paymentButtonText,
                paymentMethod === "card" && styles.paymentButtonTextActive,
              ]}
            >
              Tarjeta
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentButton,
              paymentMethod === "transfer" && styles.paymentButtonActive,
            ]}
            onPress={() => setPaymentMethod("transfer")}
          >
            <Text style={styles.paymentButtonIcon}>🏦</Text>
            <Text
              style={[
                styles.paymentButtonText,
                paymentMethod === "transfer" && styles.paymentButtonTextActive,
              ]}
            >
              Transferencia
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentButton,
              paymentMethod === "pago_movil" && styles.paymentButtonActive,
            ]}
            onPress={() => setPaymentMethod("pago_movil")}
          >
            <Text style={styles.paymentButtonIcon}>📱</Text>
            <Text
              style={[
                styles.paymentButtonText,
                paymentMethod === "pago_movil" &&
                  styles.paymentButtonTextActive,
              ]}
            >
              Pago Móvil
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {(paymentMethod === "transfer" || paymentMethod === "pago_movil") && (
          <TextInput
            style={styles.input}
            value={reference}
            onChangeText={setReference}
            placeholder="Número de referencia"
            autoCapitalize="none"
          />
        )}

        <Text style={styles.sectionTitle}>📅 Fecha del Pago</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={openDatePicker}
          activeOpacity={0.85}
          disabled={loading}
        >
          <Text style={styles.dateText}>{paymentDateLabel}</Text>
        </TouchableOpacity>

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

        <Text style={styles.sectionTitle}>📝 Notas (Opcional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Notas adicionales..."
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={safeBackToAccounts}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmButton, loading && styles.buttonDisabled]}
          onPress={handleRecordPayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>Registrar Pago</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f7fa",
  },
  loadingText: {
    marginTop: vs(16),
    fontSize: rf(16),
    color: "#666",
  },
  header: {
    backgroundColor: "#fff",
    padding: s(20),
    paddingTop: vs(16),
    borderBottomWidth: 1,
    borderBottomColor: "#e1e5e9",
  },
  title: {
    fontSize: rf(24),
    fontWeight: "bold",
    color: "#1a202c",
    marginBottom: vs(4),
  },
  subtitle: {
    fontSize: rf(16),
    color: "#718096",
  },
  balanceCard: {
    backgroundColor: "#fff",
    margin: s(16),
    padding: s(20),
    borderRadius: borderRadius.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: rf(14),
    color: "#718096",
    marginBottom: vs(8),
  },
  balanceAmount: {
    fontSize: rf(28),
    fontWeight: "bold",
    color: "#e53e3e",
    marginBottom: vs(8),
  },
  totalInfo: {
    fontSize: rf(12),
    color: "#718096",
  },
  formCard: {
    backgroundColor: "#fff",
    margin: s(16),
    marginTop: 0,
    padding: s(20),
    borderRadius: borderRadius.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#2d3748",
    marginTop: vs(20),
    marginBottom: vs(12),
  },
  amountInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: borderRadius.md,
    padding: s(16),
    fontSize: rf(18),
    fontWeight: "bold",
    textAlign: "center",
    backgroundColor: "#f7fafc",
    color: "#2d3748",
  },
  paymentButtonsScroll: {
    marginBottom: vs(8),
  },
  paymentButtons: {
    gap: s(8),
    paddingVertical: vs(4),
  },
  paymentButton: {
    backgroundColor: "#f7fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: borderRadius.md,
    padding: s(12),
    alignItems: "center",
    minWidth: hs(80),
  },
  paymentButtonActive: {
    backgroundColor: "#2f5ae0",
    borderColor: "#2f5ae0",
  },
  paymentButtonIcon: {
    fontSize: iconSize.md,
    marginBottom: vs(4),
  },
  paymentButtonText: {
    fontSize: rf(12),
    fontWeight: "500",
    color: "#4a5568",
  },
  paymentButtonTextActive: {
    color: "#fff",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: borderRadius.md,
    padding: s(12),
    fontSize: rf(16),
    backgroundColor: "#f7fafc",
    color: "#2d3748",
    marginBottom: vs(8),
  },
  dateText: {
    fontSize: rf(16),
    color: "#1f2937",
  },
  datePickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: vs(10),
    paddingHorizontal: hs(6),
    marginBottom: vs(15),
  },
  datePickerDone: {
    alignSelf: "flex-end",
    paddingVertical: vs(10),
    paddingHorizontal: hs(14),
    borderRadius: borderRadius.lg,
    backgroundColor: "#2f5ae0",
    marginTop: vs(8),
    marginRight: hs(8),
  },
  datePickerDoneText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: rf(14),
  },
  notesInput: {
    height: vs(80),
    textAlignVertical: "top",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: s(12),
    padding: s(16),
    paddingBottom: vs(32),
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f7fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: borderRadius.md,
    padding: s(16),
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#4a5568",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#2f5ae0",
    borderRadius: borderRadius.md,
    padding: s(16),
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#fff",
  },
});
