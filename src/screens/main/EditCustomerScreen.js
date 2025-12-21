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
import { useCustomers } from "../../hooks/useCustomers";

/**
 * Pantalla para editar cliente existente
 */
export const EditCustomerScreen = ({ navigation, route }) => {
  const { editCustomer } = useCustomers();
  const { customer } = route.params;

  const [formData, setFormData] = useState({
    documentNumber: "",
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        documentNumber: customer.documentNumber || "",
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
      });
    }
  }, [customer]);

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
      await editCustomer(customer.id, formData);
      Alert.alert("Éxito", "Cliente actualizado correctamente", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el cliente");
    }
  };

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
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
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Text style={styles.heroIconText}>🧑‍💼</Text>
            </View>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>Editar cliente</Text>
              <Text style={styles.heroSubtitle}>
                Actualiza la información para mantener tus ventas y seguimientos
                al día.
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Identificación</Text>
            <Text style={styles.sectionHint}>
              Estos datos son obligatorios para asociar cuentas por cobrar.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Cédula *</Text>
              <TextInput
                style={styles.input}
                placeholder="V12345678"
                placeholderTextColor="#9aa2b1"
                value={formData.documentNumber}
                onChangeText={(value) =>
                  updateFormData("documentNumber", value)
                }
                keyboardType="numeric"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nombre completo *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ingresa el nombre y apellido"
                placeholderTextColor="#9aa2b1"
                value={formData.name}
                onChangeText={(value) => updateFormData("name", value)}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Datos de contacto</Text>
            <Text style={styles.sectionHint}>
              Facilitan recordatorios y campañas personalizadas.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Teléfono</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 0412-1234567"
                placeholderTextColor="#9aa2b1"
                value={formData.phone}
                onChangeText={(value) => updateFormData("phone", value)}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="cliente@correo.com"
                placeholderTextColor="#9aa2b1"
                value={formData.email}
                onChangeText={(value) => updateFormData("email", value)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Dirección</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ciudad, municipio, referencias"
                placeholderTextColor="#9aa2b1"
                value={formData.address}
                onChangeText={(value) => updateFormData("address", value)}
                multiline
                numberOfLines={3}
              />
            </View>

            <Text style={styles.helperText}>
              Completar contacto y dirección permite generar comprobantes y
              coordinar entregas.
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Actualizar cliente</Text>
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
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    paddingBottom: 60,
    gap: 24,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#f3f8ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 18,
  },
  heroIconText: {
    fontSize: 30,
  },
  heroTextContainer: {
    flex: 1,
    gap: 6,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2633",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#5b6472",
    lineHeight: 20,
  },
  sectionHeader: {
    gap: 4,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2633",
  },
  sectionHint: {
    fontSize: 12,
    color: "#6f7c8c",
    lineHeight: 18,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 5,
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f2633",
  },
  input: {
    backgroundColor: "#f8f9fc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d9e0eb",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1f2633",
  },
  textArea: {
    minHeight: 92,
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: 12,
    color: "#6f7c8c",
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#2f5ae0",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#f3f5f8",
  },
  secondaryButtonText: {
    color: "#2f3a4c",
    fontSize: 15,
    fontWeight: "700",
  },
});
