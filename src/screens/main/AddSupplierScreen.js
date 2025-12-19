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
              <Text style={styles.heroIconText}>🏭</Text>
            </View>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>Nuevo proveedor</Text>
              <Text style={styles.heroSubtitle}>
                Registra tus aliados comerciales con los datos necesarios para
                compras ágiles.
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Identidad del proveedor</Text>
            <Text style={styles.sectionHint}>
              Nombre y documento permitirán vincular facturas y cuentas por
              pagar.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>RIF/Cédula *</Text>
              <TextInput
                style={styles.input}
                placeholder="J123456789"
                placeholderTextColor="#9aa2b1"
                value={formData.documentNumber}
                onChangeText={(value) =>
                  updateFormData("documentNumber", value)
                }
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Razón social *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre de la empresa"
                placeholderTextColor="#9aa2b1"
                value={formData.name}
                onChangeText={(value) => updateFormData("name", value)}
              />
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Contacto directo</Text>
            <Text style={styles.sectionHint}>
              Asegúrate de tener un responsable para coordinar entregas y pagos.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Persona de contacto</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre del responsable"
                placeholderTextColor="#9aa2b1"
                value={formData.contactPerson}
                onChangeText={(value) => updateFormData("contactPerson", value)}
              />
            </View>

            <View style={styles.dualRow}>
              <View style={styles.dualField}>
                <Text style={styles.fieldLabel}>Teléfono</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 0414-1234567"
                  placeholderTextColor="#9aa2b1"
                  value={formData.phone}
                  onChangeText={(value) => updateFormData("phone", value)}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.dualField}>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="contacto@empresa.com"
                  placeholderTextColor="#9aa2b1"
                  value={formData.email}
                  onChangeText={(value) => updateFormData("email", value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Información adicional</Text>
            <Text style={styles.sectionHint}>
              Establece dirección y términos para ordenar y pagar sin
              fricciones.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Dirección</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ciudad, estado, referencias"
                placeholderTextColor="#9aa2b1"
                value={formData.address}
                onChangeText={(value) => updateFormData("address", value)}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Términos de pago</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 30 días, contado, crédito"
                placeholderTextColor="#9aa2b1"
                value={formData.paymentTerms}
                onChangeText={(value) => updateFormData("paymentTerms", value)}
              />
            </View>

            <Text style={styles.helperText}>
              Documenta los términos pactados para evitar retrasos y conservar
              historial.
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
              <Text style={styles.primaryButtonText}>Guardar proveedor</Text>
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
    padding: 24,
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
    backgroundColor: "#fff5f3",
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
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8492a6",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d9e0eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1f2633",
    backgroundColor: "#f8f9fc",
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  dualRow: {
    flexDirection: "row",
    gap: 12,
  },
  dualField: {
    flex: 1,
    gap: 8,
  },
  helperText: {
    fontSize: 12,
    color: "#5a2e2e",
    backgroundColor: "#fff4f2",
    padding: 12,
    borderRadius: 12,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#c3cad5",
  },
  secondaryButtonText: {
    color: "#4c5767",
    fontWeight: "600",
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: "#ef5350",
    shadowColor: "#ef5350",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
