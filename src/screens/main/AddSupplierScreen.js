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
import { useSuppliers } from "../../hooks/useSuppliers";

/**
 * Pantalla para agregar nuevo proveedor
 */
export const AddSupplierScreen = ({ navigation }) => {
  const { addSupplier } = useSuppliers();

  const [formData, setFormData] = useState({
    documentNumber: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    contactPerson: "",
    paymentTerms: "",
  });

  const handleSave = async () => {
    if (!formData.documentNumber.trim()) {
      Alert.alert("Error", "El RIF/Cédula del proveedor es obligatorio");
      return;
    }
    if (!formData.name.trim()) {
      Alert.alert("Error", "El nombre del proveedor es obligatorio");
      return;
    }

    try {
      await addSupplier(formData);
      Alert.alert("Éxito", "Proveedor agregado correctamente", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar el proveedor");
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
            <Text style={styles.title}>Nuevo Proveedor</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="RIF/Cédula *"
              value={formData.documentNumber}
              onChangeText={(value) => updateFormData("documentNumber", value)}
              keyboardType="default"
            />

            <TextInput
              style={styles.input}
              placeholder="Nombre/Razón Social *"
              value={formData.name}
              onChangeText={(value) => updateFormData("name", value)}
            />

            <TextInput
              style={styles.input}
              placeholder="Persona de Contacto"
              value={formData.contactPerson}
              onChangeText={(value) => updateFormData("contactPerson", value)}
            />

            <TextInput
              style={styles.input}
              placeholder="Teléfono"
              value={formData.phone}
              onChangeText={(value) => updateFormData("phone", value)}
              keyboardType="phone-pad"
            />

            <TextInput
              style={styles.input}
              placeholder="Email"
              value={formData.email}
              onChangeText={(value) => updateFormData("email", value)}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Dirección"
              value={formData.address}
              onChangeText={(value) => updateFormData("address", value)}
              multiline
              numberOfLines={3}
            />

            <TextInput
              style={styles.input}
              placeholder="Términos de Pago"
              value={formData.paymentTerms}
              onChangeText={(value) => updateFormData("paymentTerms", value)}
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
