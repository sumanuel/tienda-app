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

/**
 * Pantalla para editar cuenta por cobrar existente
 */
export const EditAccountReceivableScreen = ({ navigation, route }) => {
  const { editAccountReceivable } = useAccounts();
  const { account } = route.params;

  const [formData, setFormData] = useState({
    customerName: "",
    amount: "",
    description: "",
    dueDate: "",
  });

  useEffect(() => {
    if (account) {
      setFormData({
        customerName: account.customerName || "",
        amount: account.amount?.toString() || "",
        description: account.description || "",
        dueDate: account.dueDate || "",
      });
    }
  }, [account]);

  const handleSave = async () => {
    if (!formData.customerName.trim()) {
      Alert.alert("Error", "El nombre del cliente es obligatorio");
      return;
    }
    if (!formData.amount.trim()) {
      Alert.alert("Error", "El monto es obligatorio");
      return;
    }

    try {
      await editAccountReceivable(account.id, {
        ...formData,
        amount: parseFloat(formData.amount),
      });
      Alert.alert("Éxito", "Cuenta por cobrar actualizada correctamente", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar la cuenta por cobrar");
    }
  };

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Editar Cuenta por Cobrar</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Nombre del Cliente *"
              value={formData.customerName}
              onChangeText={(value) => updateFormData("customerName", value)}
            />

            <TextInput
              style={styles.input}
              placeholder="Monto *"
              value={formData.amount}
              onChangeText={(value) => updateFormData("amount", value)}
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="Descripción"
              value={formData.description}
              onChangeText={(value) => updateFormData("description", value)}
              multiline
              numberOfLines={3}
            />

            <TextInput
              style={styles.input}
              placeholder="Fecha de vencimiento (YYYY-MM-DD)"
              value={formData.dueDate}
              onChangeText={(value) => updateFormData("dueDate", value)}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Actualizar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  form: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  buttonContainer: {
    flexDirection: "row",
    padding: 20,
    paddingBottom: 40,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: "#666",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#2196F3",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default EditAccountReceivableScreen;
