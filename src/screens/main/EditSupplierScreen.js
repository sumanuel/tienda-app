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
import { useCustomAlert } from "../../components/common/CustomAlert";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";

/**
 * Pantalla para editar proveedor existente
 */
export const EditSupplierScreen = ({ navigation, route }) => {
  const { editSupplier } = useSuppliers();
  const { supplier } = route.params;
  const { showAlert, CustomAlert } = useCustomAlert();

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
      showAlert({
        title: "Error",
        message: "El RIF/Cédula del proveedor es obligatorio",
        type: "error",
      });
      return;
    }
    if (!formData.name.trim()) {
      showAlert({
        title: "Error",
        message: "El nombre del proveedor es obligatorio",
        type: "error",
      });
      return;
    }

    try {
      await editSupplier(supplier.id, formData);
      showAlert({
        title: "Éxito",
        message: "Proveedor actualizado correctamente",
        type: "success",
        buttons: [{ text: "OK", onPress: () => navigation.goBack() }],
      });
    } catch (error) {
      console.error("Error actualizando proveedor:", error);
      showAlert({
        title: "Error",
        message: "No se pudo actualizar el proveedor",
        type: "error",
      });
    }
  };

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
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
                Asegúrate de tener un responsable para coordinar entregas y
                pagos.
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
                  onChangeText={(value) =>
                    updateFormData("contactPerson", value)
                  }
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
                  onChangeText={(value) =>
                    updateFormData("paymentTerms", value)
                  }
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
                <Text style={styles.primaryButtonText}>
                  Actualizar proveedor
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <CustomAlert />
    </>
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
    paddingHorizontal: hs(16),
    paddingTop: vs(16),
    paddingBottom: vs(60),
    gap: spacing.xl,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: vs(10) },
    shadowOpacity: 0.08,
    shadowRadius: s(18),
    elevation: 8,
  },
  heroIcon: {
    width: iconSize.xl,
    height: iconSize.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: "#f3f8ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: hs(18),
  },
  heroIconText: {
    fontSize: rf(30),
  },
  heroTextContainer: {
    flex: 1,
    gap: spacing.sm,
  },
  heroTitle: {
    fontSize: rf(20),
    fontWeight: "700",
    color: "#1f2633",
  },
  heroSubtitle: {
    fontSize: rf(14),
    color: "#5b6472",
    lineHeight: rf(20),
  },
  sectionHeader: {
    gap: spacing.xs,
    paddingHorizontal: hs(4),
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#1f2633",
  },
  sectionHint: {
    fontSize: rf(12),
    color: "#6f7c8c",
    lineHeight: rf(18),
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: vs(6) },
    shadowOpacity: 0.06,
    shadowRadius: s(12),
    elevation: 5,
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: rf(13),
    fontWeight: "600",
    color: "#1f2633",
  },
  input: {
    backgroundColor: "#f8f9fc",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "#d9e0eb",
    paddingHorizontal: hs(14),
    paddingVertical: vs(12),
    fontSize: rf(15),
    color: "#1f2633",
  },
  textArea: {
    minHeight: vs(92),
    textAlignVertical: "top",
  },
  dualRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  dualField: {
    flex: 1,
    gap: spacing.sm,
  },
  helperText: {
    fontSize: rf(12),
    color: "#6f7c8c",
    lineHeight: rf(18),
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    borderRadius: s(14),
    paddingVertical: vs(14),
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#2f5ae0",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: rf(15),
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#f3f5f8",
  },
  secondaryButtonText: {
    color: "#2f3a4c",
    fontSize: rf(15),
    fontWeight: "700",
  },
});
