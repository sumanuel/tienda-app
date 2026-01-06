import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getSettings, saveSettings } from "../../services/database/settings";
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

export const BusinessSettingsScreen = () => {
  const navigation = useNavigation();
  const { showAlert, CustomAlert } = useCustomAlert();
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [business, setBusiness] = useState({
    name: "",
    rif: "",
    address: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    const loadBusinessData = async () => {
      try {
        setIsLoading(true);
        const settings = await getSettings();
        const businessInfo = settings.business || {
          name: "",
          rif: "",
          address: "",
          phone: "",
          email: "",
        };
        setBusiness(businessInfo);
      } catch (error) {
        console.error("Error loading business data:", error);
        showAlert({
          title: "Error",
          message: "No pudimos cargar los datos del negocio",
          type: "error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadBusinessData();
  }, []);

  const handleSave = async () => {
    // Validar campos requeridos
    if (!business.name.trim()) {
      showAlert({
        title: "Campo requerido",
        message: "El nombre del negocio es obligatorio",
        type: "error",
      });
      return;
    }

    try {
      setSaving(true);
      const settings = await getSettings();
      const updatedSettings = {
        ...settings,
        business,
      };
      await saveSettings(updatedSettings);
      showAlert({
        title: "Éxito",
        message: "Datos del negocio actualizados correctamente",
        type: "success",
        buttons: [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ],
      });
    } catch (error) {
      console.error("Error saving business data:", error);
      showAlert({
        title: "Error",
        message: "No se pudieron guardar los cambios",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f5ae0" />
        <Text style={styles.loadingText}>Cargando datos del negocio...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroIconText}>🏢</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>Datos del Negocio</Text>
            <Text style={styles.heroSubtitle}>
              Información que aparece en documentos y reportes.
            </Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Información General</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre del Negocio *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Mi Tienda C.A."
              value={business.name}
              onChangeText={(text) => setBusiness({ ...business, name: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>RIF</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: J-12345678-9"
              value={business.rif}
              onChangeText={(text) => setBusiness({ ...business, rif: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Dirección</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Calle Principal, Centro"
              value={business.address}
              onChangeText={(text) =>
                setBusiness({ ...business, address: text })
              }
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Teléfono</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: +58 412 123 4567"
              value={business.phone}
              onChangeText={(text) => setBusiness({ ...business, phone: text })}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Correo Electrónico</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: contacto@mitienda.com"
              value={business.email}
              onChangeText={(text) => setBusiness({ ...business, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                saving && styles.buttonDisabled,
              ]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Guardar Cambios</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <CustomAlert />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8edf2",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#e8edf2",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  loadingText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "#4c5767",
  },
  content: {
    padding: spacing.lg,
    paddingBottom: vs(100),
  },
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    flexDirection: "row",
    gap: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: vs(10) },
    shadowOpacity: 0.08,
    shadowRadius: s(20),
    elevation: 6,
  },
  heroIcon: {
    width: iconSize.xl,
    height: iconSize.xl,
    borderRadius: borderRadius.xl,
    backgroundColor: "#f3f8ff",
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconText: {
    fontSize: rf(28),
  },
  heroInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  heroTitle: {
    fontSize: rf(20),
    fontWeight: "700",
    color: "#1f2633",
  },
  heroSubtitle: {
    fontSize: rf(14),
    color: "#6f7c8c",
    lineHeight: rf(20),
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.xxl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: vs(8) },
    shadowOpacity: 0.06,
    shadowRadius: s(14),
    elevation: 6,
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: "#1f2633",
  },
  inputGroup: {
    gap: spacing.sm,
  },
  inputLabel: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "#2f3a4c",
  },
  input: {
    backgroundColor: "#f3f5fa",
    borderRadius: borderRadius.md,
    paddingVertical: vs(12),
    paddingHorizontal: hs(16),
    fontSize: rf(15),
    color: "#1f2633",
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: vs(8),
  },
  button: {
    flex: 1,
    borderRadius: s(14),
    paddingVertical: vs(14),
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f5fa",
    borderWidth: 1,
    borderColor: "#d5dbe7",
  },
  cancelButtonText: {
    fontSize: rf(15),
    fontWeight: "600",
    color: "#2f5ae0",
  },
  saveButton: {
    backgroundColor: "#1f9254",
  },
  saveButtonText: {
    fontSize: rf(15),
    fontWeight: "700",
    color: "#fff",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default BusinessSettingsScreen;
