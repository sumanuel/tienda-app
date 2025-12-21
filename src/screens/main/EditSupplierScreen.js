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
import { useSuppliers } from "../../hooks/useSuppliers";

/**
 * Pantalla para editar proveedor existente
 */
export const EditSupplierScreen = ({ navigation, route }) => {
  const { editSupplier } = useSuppliers();
  const { supplier } = route.params;

  const [formData, setFormData] = useState({
    documentNumber: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    contactPerson: "",
    paymentTerms: "",
  });

  useEffect(() => {
    if (supplier) {
      setFormData({
        documentNumber: supplier.documentNumber || "",
        name: supplier.name || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        address: supplier.address || "",
        contactPerson: supplier.contactPerson || "",
        paymentTerms: supplier.paymentTerms || "",
      });
    }
  }, [supplier]);

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
      await editSupplier(supplier.id, formData);
      Alert.alert("Éxito", "Proveedor actualizado correctamente", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el proveedor");
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
              <Text style={styles.heroTitle}>Editar proveedor</Text>
              <Text style={styles.heroSubtitle}>
                Mantén al día tus datos de contacto y términos de pago.
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
              <Text style={styles.primaryButtonText}>Actualizar proveedor</Text>
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
