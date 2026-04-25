import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { useCustomers } from "../../hooks/useCustomers";
import { useCustomAlert } from "../../components/common/CustomAlert";
import {
  ScreenHero,
  SurfaceCard,
  UI_COLORS,
  SHADOWS,
} from "../../components/common/AppUI";
import { rf, vs, hs, spacing, borderRadius } from "../../utils/responsive";
import PhoneInput from "../../components/common/PhoneInput";

/**
 * Pantalla para agregar nuevo cliente
 */
export const AddCustomerScreen = ({ navigation }) => {
  const { addCustomer } = useCustomers();
  const { showAlert, CustomAlert } = useCustomAlert();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    documentNumber: "",
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const handleSave = async () => {
    if (loading) return;

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
      setLoading(true);
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
        message: error?.message || "No se pudo guardar el cliente",
        type: "error",
      });
    } finally {
      setLoading(false);
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
            <ScreenHero
              iconName="person-add-outline"
              iconColor={UI_COLORS.info}
              eyebrow="Clientes"
              title="Nuevo cliente"
              subtitle="Registra la información clave para personalizar ventas, cobros y seguimiento."
              style={styles.heroCard}
            />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Identificación</Text>
              <Text style={styles.sectionHint}>
                Estos datos son obligatorios para asociar cuentas por cobrar.
              </Text>
            </View>

            <SurfaceCard style={styles.card}>
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
            </SurfaceCard>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Datos de contacto</Text>
              <Text style={styles.sectionHint}>
                Facilitan recordatorios y campañas personalizadas.
              </Text>
            </View>

            <SurfaceCard style={styles.card}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Teléfono</Text>
                <PhoneInput
                  value={formData.phone}
                  onChangeText={(value) => updateFormData("phone", value)}
                  placeholder="Ej: 4121234567"
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
            </SurfaceCard>

            <View style={styles.buttonRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.secondaryButton,
                  loading && styles.buttonDisabled,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => navigation.goBack()}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.primaryButton,
                  loading && styles.buttonDisabled,
                  pressed && styles.cardPressed,
                ]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Guardar cliente</Text>
                )}
              </Pressable>
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
    backgroundColor: UI_COLORS.page,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: hs(16),
    paddingTop: vs(16),
    paddingBottom: vs(72),
    gap: vs(18),
  },
  heroCard: {
    marginBottom: vs(2),
  },
  sectionHeader: {
    gap: vs(4),
    paddingHorizontal: hs(4),
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  sectionHint: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
    lineHeight: vs(18),
  },
  card: {
    padding: spacing.lg,
    gap: vs(18),
    ...SHADOWS.soft,
  },
  fieldGroup: {
    gap: vs(7),
  },
  fieldLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: hs(14),
    paddingVertical: vs(13),
    fontSize: rf(15),
    color: UI_COLORS.text,
    backgroundColor: UI_COLORS.surfaceAlt,
  },
  textArea: {
    minHeight: vs(92),
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: rf(12),
    color: UI_COLORS.info,
    backgroundColor: UI_COLORS.infoSoft,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    lineHeight: vs(18),
  },
  buttonRow: {
    flexDirection: "row",
    gap: hs(12),
    paddingTop: vs(4),
  },
  actionButton: {
    flex: 1,
    paddingVertical: vs(15),
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    backgroundColor: UI_COLORS.surface,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    color: UI_COLORS.info,
    fontWeight: "700",
    fontSize: rf(14),
  },
  primaryButton: {
    backgroundColor: UI_COLORS.accent,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: rf(14),
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
