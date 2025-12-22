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
      // Establecer el monto por defecto como el saldo pendiente
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

  const openDatePicker = () => setShowDatePicker(true);
  const closeDatePicker = () => setShowDatePicker(false);
  const paymentDateLabel = paymentDate.toISOString().split("T")[0];

  const handleRecordPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      Alert.alert("Error", "Ingrese un monto válido");
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (balance && amount > balance.balance) {
      Alert.alert(
        "Advertencia",
        "El monto del pago es mayor al saldo pendiente. ¿Desea continuar?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Continuar",
            onPress: () => processPayment(amount),
          },
        ]
      );
      return;
    }

    await processPayment(amount);
  };

  const processPayment = async (amount) => {
    setLoading(true);
    try {
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

  const paymentMethods = [
    { value: "cash", label: "Efectivo" },
    { value: "card", label: "Tarjeta" },
    { value: "transfer", label: "Transferencia" },
    { value: "pago_movil", label: "Pago Móvil" },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Registrar Pago</Text>
        <Text style={styles.subtitle}>
          {account.supplierName} - {formatCurrency(account.amount || 0, "VES")}
        </Text>
      </View>

      {balance && (
        <View style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>Saldo Pendiente</Text>
          <Text style={styles.balanceAmount}>
            {formatCurrency(balance.balance, "VES")}
          </Text>
          <Text style={styles.balanceSubtitle}>
            Pagado: {formatCurrency(balance.paidAmount, "VES")}
          </Text>
        </View>
      )}

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Monto del Pago *</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            keyboardType="numeric"
            value={paymentAmount}
            onChangeText={setPaymentAmount}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Método de Pago *</Text>
          <View style={styles.methodSelector}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.value}
                style={[
                  styles.methodOption,
                  paymentMethod === method.value && styles.methodOptionSelected,
                ]}
                onPress={() => setPaymentMethod(method.value)}
              >
                <Text
                  style={[
                    styles.methodOptionText,
                    paymentMethod === method.value &&
                      styles.methodOptionTextSelected,
                  ]}
                >
                  {method.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Fecha del Pago</Text>
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
        </View>

        {(paymentMethod === "transfer" || paymentMethod === "pago_movil") && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Referencia</Text>
            <TextInput
              style={styles.input}
              placeholder="Número de referencia"
              value={reference}
              onChangeText={setReference}
              autoCapitalize="none"
            />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notas</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Notas adicionales..."
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleRecordPayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Registrar Pago</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    color: "#1f2937",
  },
  datePickerWrapper: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
  subtitle: {
    fontSize: 16,
    color: "#64748b",
  },
  balanceCard: {
    margin: 16,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ef4444",
    marginBottom: 4,
  },
  balanceSubtitle: {
    fontSize: 14,
    color: "#64748b",
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  methodSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  methodOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
  },
  methodOptionSelected: {
    backgroundColor: "#2e7d32",
    borderColor: "#2e7d32",
  },
  methodOptionText: {
    fontSize: 14,
    color: "#6b7280",
  },
  methodOptionTextSelected: {
    color: "#fff",
  },
  submitButton: {
    backgroundColor: "#2e7d32",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default RecordPaymentPayableScreen;
