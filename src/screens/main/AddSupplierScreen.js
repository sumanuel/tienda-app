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
          <View style={styles.formCard}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>RIF/Cédula</Text>
              <TextInput
                style={styles.input}
                placeholder="Ingresa el RIF o cédula"
                placeholderTextColor="#999"
                value={formData.documentNumber}
                onChangeText={(value) =>
                  updateFormData("documentNumber", value)
                }
                keyboardType="default"
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Nombre/Razón Social</Text>
              <TextInput
                style={styles.input}
                placeholder="Ingresa el nombre del proveedor"
                placeholderTextColor="#999"
                value={formData.name}
                onChangeText={(value) => updateFormData("name", value)}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Persona de Contacto</Text>
              <TextInput
                style={styles.input}
                placeholder="Ingresa el nombre del contacto"
                placeholderTextColor="#999"
                value={formData.contactPerson}
                onChangeText={(value) => updateFormData("contactPerson", value)}
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

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Términos de Pago</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 30 días"
                placeholderTextColor="#999"
                value={formData.paymentTerms}
                onChangeText={(value) => updateFormData("paymentTerms", value)}
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
    height: 48,
    borderWidth: 1,
    borderColor: "#e8edf2",
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 15,
    backgroundColor: "#f8f9fa",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 15,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
