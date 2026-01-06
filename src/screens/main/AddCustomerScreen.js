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
 * Pantalla para agregar nuevo cliente
 */
export const AddCustomerScreen = ({ navigation }) => {
  const { addCustomer } = useCustomers();
  const { showAlert, CustomAlert } = useCustomAlert();

  const [formData, setFormData] = useState({
    documentNumber: "",
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const handleSave = async () => {
    if (!formData.documentNumber.trim()) {
      showAlert({
        title: "Error",
        message: "La cédula del cliente es obligatoria",
        type: "error",
      });
      return;
    }
    if (!formData.name.trim()) {
      showAlert({
        title: "Error",
        message: "El nombre del cliente es obligatorio",
        type: "error",
      });
      return;
    }

    try {
      await addCustomer(formData);
      showAlert({
        title: "Éxito",
        message: "Cliente agregado correctamente",
        type: "success",
        buttons: [{ text: "OK", onPress: () => navigation.goBack() }],
      });
    } catch (error) {
      showAlert({
        title: "Error",
        message: "No se pudo guardar el cliente",
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
                <Text style={styles.heroIconText}>🧑‍💼</Text>
              </View>
              <View style={styles.heroTextContainer}>
                <Text style={styles.heroTitle}>Nuevo cliente</Text>
                <Text style={styles.heroSubtitle}>
                  Registra la información clave para personalizar tus ventas y
                  seguimientos.
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
                <Text style={styles.primaryButtonText}>Guardar cliente</Text>
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
    gap: vs(24),
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(10) },
    shadowOpacity: 0.08,
    shadowRadius: s(18),
    elevation: 8,
  },
  heroIcon: {
    width: s(60),
    height: s(60),
    borderRadius: borderRadius.lg,
    backgroundColor: "#f3f8ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: hs(18),
  },
  heroIconText: {
    fontSize: iconSize.xl,
  },
  heroTextContainer: {
    flex: 1,
    gap: vs(6),
  },
  heroTitle: {
    fontSize: rf(20),
    fontWeight: "700",
    color: "#1f2633",
  },
  heroSubtitle: {
    fontSize: rf(14),
    color: "#5b6472",
    lineHeight: vs(20),
  },
  sectionHeader: {
    gap: vs(4),
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
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.05,
    shadowRadius: s(10),
    elevation: 4,
    gap: vs(20),
  },
  fieldGroup: {
    gap: vs(8),
  },
  fieldLabel: {
    fontSize: rf(12),
    fontWeight: "600",
    color: "#8492a6",
    textTransform: "uppercase",
    letterSpacing: s(0.6),
  },
  input: {
    borderWidth: 1,
    borderColor: "#d9e0eb",
    borderRadius: borderRadius.sm,
    paddingHorizontal: hs(14),
    paddingVertical: vs(12),
    fontSize: rf(15),
    color: "#1f2633",
    backgroundColor: "#f8f9fc",
  },
  textArea: {
    minHeight: s(90),
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: rf(12),
    color: "#4c5767",
    backgroundColor: "#f3f8ff",
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    lineHeight: vs(18),
  },
  buttonRow: {
    flexDirection: "row",
    gap: hs(12),
  },
  actionButton: {
    flex: 1,
    paddingVertical: vs(16),
    borderRadius: borderRadius.sm,
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
    fontSize: rf(15),
  },
  primaryButton: {
    backgroundColor: "#2fb176",
    shadowColor: "#2fb176",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.22,
    shadowRadius: s(8),
    elevation: 6,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: rf(15),
  },
});
