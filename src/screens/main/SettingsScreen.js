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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { getSettings, saveSettings } from "../../services/database/settings";
import { useCustomAlert } from "../../components/common/CustomAlert";
import {
  exportDatabaseBackup,
  importDatabaseBackupFromUri,
  pickBackupFile,
  shareBackupFile,
} from "../../services/backup/backupService";
import {
  exportDataToExcel,
  shareExcelFile,
} from "../../services/export/excelExportService";
import { useAuth } from "../../contexts/AuthContext";
import { requestCloudSync } from "../../services/firebase/firestoreSync";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";
import {
  ScreenHero,
  SurfaceCard,
  SHADOWS,
  UI_COLORS,
} from "../../components/common/AppUI";

const SettingsLinkCard = ({
  iconName,
  iconColor,
  title,
  subtitle,
  actionLabel,
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.formCard, pressed && styles.cardPressed]}
  >
    <View style={styles.cardHeader}>
      <View style={styles.cardIcon}>
        <Ionicons name={iconName} size={iconSize.md} color={iconColor} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
    </View>
    <View style={styles.cardAction}>
      <Text style={styles.cardActionText}>{actionLabel}</Text>
      <Ionicons name="chevron-forward" size={rf(18)} color={UI_COLORS.info} />
    </View>
  </Pressable>
);

export const SettingsScreen = () => {
  const navigation = useNavigation();
  const { showAlert, CustomAlert } = useCustomAlert();
  const { user, syncing, signOut, syncNow, activeStoreId, memberships } =
    useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [backupBusy, setBackupBusy] = useState(false);
  const [excelBusy, setExcelBusy] = useState(false);
  const [manualSyncBusy, setManualSyncBusy] = useState(false);

  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  const [editingSection, setEditingSection] = useState(null);
  const [savingSection, setSavingSection] = useState(null);

  const [formLowStock, setFormLowStock] = useState("10");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const settings = await getSettings();

        const inventory = settings.inventory || {};
        const defaultLowStock = inventory.lowStockThreshold ?? 10;

        setLowStockThreshold(defaultLowStock);
        setFormLowStock(defaultLowStock.toString());
      } catch (error) {
        console.error("Error loading settings:", error);
        showAlert({
          title: "Error",
          message: "No pudimos cargar la configuración. Intenta nuevamente.",
          type: "error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const startEditing = (section) => {
    if (section === "inventory") {
      setFormLowStock(lowStockThreshold.toString());
    }
    setEditingSection(section);
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setSavingSection(null);
    setFormLowStock(lowStockThreshold.toString());
  };

  const handleSaveInventory = async () => {
    const numericLowStock = parseInt(formLowStock, 10);
    if (Number.isNaN(numericLowStock) || numericLowStock < 0) {
      showAlert({
        title: "Valor inválido",
        message: "Ingresa un umbral mayor o igual a 0",
        type: "error",
      });
      return;
    }

    try {
      setSavingSection("inventory");
      const settings = await getSettings();
      const updatedSettings = {
        ...settings,
        inventory: {
          ...(settings.inventory || {}),
          lowStockThreshold: numericLowStock,
        },
      };
      await saveSettings(updatedSettings);
      setLowStockThreshold(numericLowStock);
      setEditingSection(null);
      requestCloudSync("settings:inventory");
      showAlert({
        title: "Éxito",
        message: "Umbral de stock bajo actualizado",
        type: "success",
      });
    } catch (error) {
      console.error("Error saving inventory settings:", error);
      showAlert({
        title: "Error",
        message: error?.message || "No pudimos actualizar el umbral de stock",
        type: "error",
      });
    } finally {
      setSavingSection(null);
    }
  };

  const handleExportData = async () => {
    try {
      setBackupBusy(true);
      const { uri } = await exportDatabaseBackup();
      await shareBackupFile(uri);
      showAlert({
        title: "Respaldo creado",
        message: "Tus datos fueron exportados correctamente.",
        type: "success",
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      showAlert({
        title: "Error",
        message: "No se pudo exportar el respaldo.",
        type: "error",
      });
    } finally {
      setBackupBusy(false);
    }
  };

  const doImport = async () => {
    try {
      setBackupBusy(true);
      const file = await pickBackupFile();
      if (!file) return;

      await importDatabaseBackupFromUri(file.uri);
      await syncNow("settings:import-backup");

      showAlert({
        title: "Respaldo importado",
        message: "Los datos se importaron correctamente.",
        type: "success",
      });
    } catch (error) {
      console.error("Error importing data:", error);
      showAlert({
        title: "Error",
        message: error?.message || "No se pudo importar el respaldo.",
        type: "error",
      });
    } finally {
      setBackupBusy(false);
    }
  };

  const handleImportData = async () => {
    showAlert({
      title: "Importar datos",
      message:
        "Esto reemplazará los datos actuales por los del respaldo. ¿Deseas continuar?",
      type: "warning",
      buttons: [
        { text: "Cancelar", style: "cancel" },
        { text: "Importar", onPress: doImport },
      ],
    });
  };

  const handleExportExcel = async () => {
    try {
      setExcelBusy(true);
      const { uri } = await exportDataToExcel();
      await shareExcelFile(uri);
      showAlert({
        title: "Excel generado",
        message:
          "Se exportaron tus datos a un archivo de Excel con varias hojas.",
        type: "success",
      });
    } catch (error) {
      console.error("Error exporting excel:", error);
      showAlert({
        title: "Error",
        message: "No se pudo exportar a Excel.",
        type: "error",
      });
    } finally {
      setExcelBusy(false);
    }
  };

  const showBackupInfo = () => {
    showAlert({
      title: "💡 Recomendación de respaldo",
      message:
        "Te recomendamos guardar tus respaldos en Google Drive u otro servicio en la nube para tener una copia segura fuera de tu dispositivo.\n\nEsto te protegerá en caso de pérdida, robo o daño del teléfono.",
      type: "success",
    });
  };

  const handleManualCloudSync = async () => {
    try {
      setManualSyncBusy(true);
      const result = await syncNow("settings:manual-sync");

      if (result?.skipped && result?.reason === "no-sync-permission") {
        showAlert({
          title: "Sincronización no necesaria",
          message:
            "Tu rol en esta tienda no publica snapshots técnicos en Firestore. Los datos compartidos siguen leyéndose desde la nube según tus permisos.",
          type: "success",
        });
        return;
      }

      showAlert({
        title: "Sincronización completa",
        message: "Los datos locales fueron enviados a Firestore.",
        type: "success",
      });
    } catch (error) {
      console.error("Error syncing to Firestore:", error);
      showAlert({
        title: "Error",
        message: error?.message || "No se pudo sincronizar con Firestore.",
        type: "error",
      });
    } finally {
      setManualSyncBusy(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
      showAlert({
        title: "Error",
        message: "No se pudo cerrar la sesión.",
        type: "error",
      });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f5ae0" />
        <Text style={styles.loadingText}>Cargando configuración...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHero
            iconName="settings-outline"
            iconColor={UI_COLORS.info}
            eyebrow="Ajustes"
            title="Configuración"
            subtitle="Gestiona los parámetros, respaldo y acceso de tu negocio desde un solo lugar."
            pills={[
              {
                text: user?.email || "Sin cuenta",
                tone: "info",
                iconName: "mail-outline",
              },
              {
                text: `${memberships.length} tienda(s)`,
                tone: "accent",
                iconName: "storefront-outline",
              },
            ]}
          />

          <SettingsLinkCard
            iconName="storefront-outline"
            iconColor={UI_COLORS.info}
            title="Tiendas y colaboradores"
            subtitle={`${memberships.length} tienda(s) · activa ${
              memberships.find((item) => item.storeId === activeStoreId)
                ?.storeName || "sin contexto"
            }`}
            actionLabel="Gestionar"
            onPress={() => navigation.navigate("StoreManagement")}
          />

          <SettingsLinkCard
            iconName="business-outline"
            iconColor={UI_COLORS.info}
            title="Datos del Negocio"
            subtitle="Información fiscal y de contacto"
            actionLabel="Configurar"
            onPress={() => navigation.navigate("BusinessSettings")}
          />

          <SettingsLinkCard
            iconName="cash-outline"
            iconColor={UI_COLORS.accent}
            title="Margen de ganancias"
            subtitle="Márgenes y control de stocks"
            actionLabel="Configurar"
            onPress={() => navigation.navigate("PricingSettings")}
          />

          <SurfaceCard style={styles.formCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Ionicons
                  name="options-outline"
                  size={iconSize.md}
                  color={UI_COLORS.info}
                />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Sistema</Text>
                <Text style={styles.cardSubtitle}>
                  Exportación y acceso a la cuenta
                </Text>
              </View>
            </View>

            <View style={styles.quickActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButtonOutline,
                  excelBusy && styles.buttonDisabled,
                  pressed && styles.cardPressed,
                ]}
                onPress={handleExportExcel}
                disabled={excelBusy}
              >
                {excelBusy ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={styles.secondaryButtonOutlineText}>
                    Exportar Excel
                  </Text>
                )}
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  excelBusy && styles.buttonDisabled,
                  pressed && styles.cardPressed,
                ]}
                onPress={handleSignOut}
                disabled={excelBusy}
              >
                <Text style={styles.secondaryButtonText}>Cerrar sesión</Text>
              </Pressable>
            </View>
          </SurfaceCard>

          <SettingsLinkCard
            iconName="information-circle-outline"
            iconColor={UI_COLORS.info}
            title="Acerca de"
            subtitle="Información de la aplicación"
            actionLabel="Ver"
            onPress={() => navigation.navigate("About")}
          />

          {/* Modal de edición de inventario */}
          {editingSection === "inventory" && (
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Configurar Inventario</Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.modalCloseButton,
                      pressed && styles.cardPressed,
                    ]}
                    onPress={cancelEditing}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </Pressable>
                </View>

                <View style={styles.modalBody}>
                  <Text style={styles.inputLabel}>Umbral de stock bajo</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="number-pad"
                    value={formLowStock}
                    onChangeText={setFormLowStock}
                    placeholder="Ej: 10"
                  />
                </View>

                <View style={styles.modalFooter}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.cancelButton,
                      pressed && styles.cardPressed,
                    ]}
                    onPress={cancelEditing}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryButton,
                      savingSection === "inventory" && styles.buttonDisabled,
                      pressed && styles.cardPressed,
                    ]}
                    onPress={handleSaveInventory}
                    disabled={savingSection === "inventory"}
                  >
                    {savingSection === "inventory" ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Guardar</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
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
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: vs(120),
    gap: spacing.lg,
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
    color: "#4c5767",
  },
  formArea: {
    gap: spacing.lg,
  },
  input: {
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    fontSize: rf(15),
    color: UI_COLORS.text,
  },
  inputLabel: {
    fontSize: rf(13),
    fontWeight: "600",
    color: "#7a8796",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: rf(14),
    color: "#6f7c8c",
  },
  detailValue: {
    fontSize: rf(15),
    fontWeight: "600",
    color: UI_COLORS.text,
    textAlign: "right",
    flexShrink: 1,
    marginLeft: spacing.lg,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: UI_COLORS.accent,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: rf(15),
    letterSpacing: 0.4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  quickActions: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  cloudStatusBox: {
    backgroundColor: UI_COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    padding: spacing.md,
    gap: spacing.xs,
  },
  cloudStatusTitle: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#1f2633",
  },
  cloudStatusSubtitle: {
    fontSize: rf(13),
    color: "#5b6472",
  },
  secondaryButtonOutline: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    paddingVertical: spacing.lg,
    alignItems: "center",
    backgroundColor: UI_COLORS.surfaceAlt,
  },
  secondaryButtonOutlineText: {
    fontSize: rf(14),
    fontWeight: "700",
    color: UI_COLORS.info,
  },
  formCard: {
    backgroundColor: UI_COLORS.surface,
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    padding: spacing.lg,
    gap: spacing.xl,
    ...SHADOWS.card,
  },
  cardHeader: {
    flexDirection: "row",
    gap: spacing.xl,
    alignItems: "center",
  },
  cardIcon: {
    width: iconSize.lg,
    height: iconSize.lg,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    backgroundColor: UI_COLORS.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconText: {
    fontSize: iconSize.md,
  },
  cardInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    fontSize: rf(18),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  cardSubtitle: {
    fontSize: rf(14),
    color: UI_COLORS.muted,
  },
  cardAction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardActionText: {
    fontSize: rf(14),
    fontWeight: "700",
    color: UI_COLORS.info,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: rf(14),
    fontWeight: "700",
    color: UI_COLORS.info,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: UI_COLORS.surface,
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    width: "90%",
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(20) },
    shadowOpacity: 0.15,
    shadowRadius: s(25),
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: UI_COLORS.border,
  },
  modalTitle: {
    fontSize: rf(18),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  modalCloseButton: {
    width: iconSize.md,
    height: iconSize.md,
    borderRadius: borderRadius.sm,
    borderCurve: "continuous",
    backgroundColor: UI_COLORS.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    fontSize: rf(16),
    color: UI_COLORS.muted,
    fontWeight: "600",
  },
  modalBody: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  modalFooter: {
    flexDirection: "row",
    gap: spacing.lg,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: UI_COLORS.border,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: rf(15),
    fontWeight: "700",
    color: UI_COLORS.muted,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

export default SettingsScreen;
