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
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAccounts } from "../../hooks/useAccounts";
import { formatCurrency } from "../../utils/currency";

export const RecordPaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { account } = route.params;
  const { recordPayment, getBalance } = useAccounts();

  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      const balanceData = await getBalance(account.id);
      setBalance(balanceData);
      // Establecer el monto por defecto como el saldo pendiente
      setPaymentAmount(balanceData.balance.toString());
    } catch (error) {
      Alert.alert("Error", "No se pudo cargar el saldo de la cuenta");
    }
  };

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
      await recordPayment(account.id, {
        amount,
        paymentMethod,
        paymentDate: new Date(paymentDate).toISOString(),
        reference: reference.trim() || null,
        notes: notes.trim() || null,
      });

      Alert.alert("Éxito", "Pago registrado correctamente", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
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
        <Text style={styles.subtitle}>{account.customerName}</Text>
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
        <TextInput
          style={styles.input}
          value={paymentDate}
          onChangeText={setPaymentDate}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
        />

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
          onPress={() => navigation.goBack()}
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
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e5e9",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a202c",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#718096",
  },
  balanceCard: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 14,
    color: "#718096",
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#e53e3e",
    marginBottom: 8,
  },
  totalInfo: {
    fontSize: 12,
    color: "#718096",
  },
  formCard: {
    backgroundColor: "#fff",
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2d3748",
    marginTop: 20,
    marginBottom: 12,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    backgroundColor: "#f7fafc",
    color: "#2d3748",
  },
  paymentButtonsScroll: {
    marginBottom: 8,
  },
  paymentButtons: {
    gap: 8,
    paddingVertical: 4,
  },
  paymentButton: {
    backgroundColor: "#f7fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    minWidth: 80,
  },
  paymentButtonActive: {
    backgroundColor: "#2f5ae0",
    borderColor: "#2f5ae0",
  },
  paymentButtonIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  paymentButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4a5568",
  },
  paymentButtonTextActive: {
    color: "#fff",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f7fafc",
    color: "#2d3748",
    marginBottom: 8,
  },
  notesInput: {
    height: 80,
    textAlignVertical: "top",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    paddingBottom: 32,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f7fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4a5568",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#2f5ae0",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
