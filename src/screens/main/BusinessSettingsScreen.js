import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { getSettings, saveSettings } from "../../services/database/settings";
import { useCustomAlert } from "../../components/common/CustomAlert";
import PhoneInput from "../../components/common/PhoneInput";
import {
  ScreenHero,
  SurfaceCard,
  UI_COLORS,
  SHADOWS,
} from "../../components/common/AppUI";
import { s, rf, vs, hs, spacing, borderRadius } from "../../utils/responsive";

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
        business: {
          ...business,
          isConfigured: true,
        },
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
        message: error?.message || "No se pudieron guardar los cambios",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={UI_COLORS.info} />
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
        <ScreenHero
          iconName="business-outline"
          iconColor={UI_COLORS.info}
          eyebrow="Sistema"
          title="Datos del negocio"
          subtitle="Información que se refleja en documentos, reportes y configuración general."
          style={styles.heroCard}
        />

        <SurfaceCard style={styles.formCard}>
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
            <PhoneInput
              value={business.phone}
              onChangeText={(text) => setBusiness({ ...business, phone: text })}
              placeholder="Ej: 4121234567"
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
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                pressed && styles.cardPressed,
              ]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.saveButton,
                saving && styles.buttonDisabled,
                pressed && styles.cardPressed,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Guardar Cambios</Text>
              )}
            </Pressable>
          </View>
        </SurfaceCard>
      </ScrollView>
      <CustomAlert />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_COLORS.page,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: UI_COLORS.page,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  loadingText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: UI_COLORS.muted,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: vs(100),
    gap: spacing.lg,
  },
  heroCard: {
    marginBottom: vs(2),
  },
  formCard: {
    padding: spacing.xl,
    gap: spacing.xl,
    ...SHADOWS.soft,
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  inputLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: UI_COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: vs(13),
    paddingHorizontal: hs(16),
    fontSize: rf(15),
    color: UI_COLORS.text,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: vs(8),
  },
  button: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: vs(14),
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: UI_COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
  },
  cancelButtonText: {
    fontSize: rf(14),
    fontWeight: "700",
    color: UI_COLORS.info,
  },
  saveButton: {
    backgroundColor: UI_COLORS.accent,
  },
  saveButtonText: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#fff",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

export default BusinessSettingsScreen;
