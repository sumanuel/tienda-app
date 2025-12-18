import React, { useState } from "react";
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
import { useCustomers } from "../../hooks/useCustomers";

/**
 * Pantalla para agregar nuevo cliente
 */
export const AddCustomerScreen = ({ navigation }) => {
  const { addCustomer } = useCustomers();

  const [formData, setFormData] = useState({
    documentNumber: "",
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const handleSave = async () => {
    if (!formData.documentNumber.trim()) {
      Alert.alert("Error", "La cédula del cliente es obligatoria");
      return;
    }
    if (!formData.name.trim()) {
      Alert.alert("Error", "El nombre del cliente es obligatorio");
      return;
    }

    try {
      await addCustomer(formData);
      Alert.alert("Éxito", "Cliente agregado correctamente", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar el cliente");
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
          <View style={styles.formCard}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Cédula de Identidad</Text>
              <TextInput
                style={styles.input}
                placeholder="Ingresa la cédula"
                placeholderTextColor="#999"
                value={formData.documentNumber}
                onChangeText={(value) =>
                  updateFormData("documentNumber", value)
                }
                keyboardType="numeric"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Nombre y Apellido</Text>
              <TextInput
                style={styles.input}
                placeholder="Ingresa el nombre completo"
                placeholderTextColor="#999"
                value={formData.name}
                onChangeText={(value) => updateFormData("name", value)}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Número de Teléfono</Text>
              <TextInput
                style={styles.input}
                placeholder="Ingresa el teléfono"
                placeholderTextColor="#999"
                value={formData.phone}
                onChangeText={(value) => updateFormData("phone", value)}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Ingresa el email"
                placeholderTextColor="#999"
                value={formData.email}
                onChangeText={(value) => updateFormData("email", value)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Dirección</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ingresa la dirección"
                placeholderTextColor="#999"
                value={formData.address}
                onChangeText={(value) => updateFormData("address", value)}
                multiline
                numberOfLines={3}
              />
            </View>
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
              <Text style={styles.saveButtonText}>Guardar</Text>
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
    backgroundColor: "#e8edf2",
  },
  scrollContainer: {
    flex: 1,
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 6,
    marginLeft: 4,
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
  textArea: {
    height: 80,
    textAlignVertical: "top",
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
    backgroundColor: "#4CAF50",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
