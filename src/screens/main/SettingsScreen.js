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
  Alert,
} from "react-native";
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

export const SettingsScreen = () => {
  const navigation = useNavigation();
  const { showAlert, CustomAlert } = useCustomAlert();
  const { user, syncing, signOut, syncNow } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [backupBusy, setBackupBusy] = useState(false);
  const [excelBusy, setExcelBusy] = useState(false);

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
        message: "No pudimos actualizar el umbral de stock",
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
      await syncNow("settings:manual-sync");
      showAlert({
        title: "Sincronización completa",
        message: "Los datos locales fueron enviados a Firestore.",
        type: "success",
      });
    } catch (error) {
      console.error("Error syncing to Firestore:", error);
      showAlert({
        title: "Error",
        message: "No se pudo sincronizar con Firestore.",
        type: "error",
      });
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
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Text style={styles.heroIconText}>⚙️</Text>
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle}>Configuración</Text>
              <Text style={styles.heroSubtitle}>
                Gestiona los parámetros y datos de tu negocio.
              </Text>
              <Text style={styles.accountPill}>
                {user?.email || "Sin cuenta"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.formCard}
            onPress={() => navigation.navigate("BusinessSettings")}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>🏢</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Datos del Negocio</Text>
                <Text style={styles.cardSubtitle}>
                  Información fiscal y de contacto
                </Text>
              </View>
            </View>
            <View style={styles.cardAction}>
              <Text style={styles.cardActionText}>Configurar</Text>
              <Text style={styles.cardArrow}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.formCard}
            onPress={() => navigation.navigate("PricingSettings")}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>💰</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Margen de ganancias</Text>
                <Text style={styles.cardSubtitle}>
                  Márgenes y control de stocks
                </Text>
              </View>
            </View>
            <View style={styles.cardAction}>
              <Text style={styles.cardActionText}>Configurar</Text>
              <Text style={styles.cardArrow}>›</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.formCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>📦</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Inventario</Text>
                <Text style={styles.cardSubtitle}>
                  Alertas y umbrales de stock
                </Text>
              </View>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Stock bajo</Text>
                <Text style={styles.detailValue}>
                  {lowStockThreshold} unidades
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.cardButton}
              onPress={() => startEditing("inventory")}
              activeOpacity={0.8}
            >
              <Text style={styles.cardButtonText}>Configurar inventario</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>💾</Text>
              </View>
              <View style={styles.cardInfo}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>Sistema</Text>
                  <TouchableOpacity
                    onPress={showBackupInfo}
                    style={styles.infoIcon}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.infoIconText}>i</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardSubtitle}>
                  Respaldos y gestión de datos
                </Text>
              </View>
            </View>

            <View style={styles.cloudStatusBox}>
              <Text style={styles.cloudStatusTitle}>Firestore conectado</Text>
              <Text style={styles.cloudStatusSubtitle}>
                Sesión activa: {user?.email || "sin correo"}
              </Text>
            </View>

            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  backupBusy && styles.buttonDisabled,
                ]}
                onPress={handleExportData}
                disabled={backupBusy}
              >
                {backupBusy ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={styles.secondaryButtonText}>Exportar datos</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  backupBusy && styles.buttonDisabled,
                ]}
                onPress={handleImportData}
                disabled={backupBusy}
              >
                {backupBusy ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={styles.secondaryButtonText}>Importar datos</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  (syncing || backupBusy || excelBusy) && styles.buttonDisabled,
                ]}
                onPress={handleManualCloudSync}
                disabled={syncing || backupBusy || excelBusy}
              >
                {syncing ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={styles.secondaryButtonText}>
                    Sincronizar Firestore
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.secondaryButtonOutline,
                  syncing && styles.buttonDisabled,
                ]}
                onPress={handleSignOut}
                disabled={syncing}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryButtonOutlineText}>
                  Cerrar sesión
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.secondaryButtonOutline,
                (excelBusy || backupBusy) && styles.buttonDisabled,
              ]}
              onPress={handleExportExcel}
              disabled={excelBusy || backupBusy}
              activeOpacity={0.85}
            >
              {excelBusy ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.secondaryButtonOutlineText}>
                  Exportar a Excel
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.formCard}
            onPress={() => navigation.navigate("About")}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>ℹ️</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Acerca de</Text>
                <Text style={styles.cardSubtitle}>
                  Información de la aplicación
                </Text>
              </View>
            </View>
            <View style={styles.cardAction}>
              <Text style={styles.cardActionText}>Ver</Text>
              <Text style={styles.cardArrow}>›</Text>
            </View>
          </TouchableOpacity>

          {/* Modal de edición de inventario */}
          {editingSection === "inventory" && (
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Configurar Inventario</Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={cancelEditing}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
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
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={cancelEditing}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      savingSection === "inventory" && styles.buttonDisabled,
                    ]}
                    onPress={handleSaveInventory}
                    disabled={savingSection === "inventory"}
                    activeOpacity={0.85}
                  >
                    {savingSection === "inventory" ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Guardar</Text>
                    )}
                  </TouchableOpacity>
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
    backgroundColor: "#e8edf2",
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: vs(120),
    gap: spacing.lg,
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
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: "row",
    gap: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(10) },
    shadowOpacity: 0.08,
    shadowRadius: s(18),
    elevation: 8,
  },
  heroIcon: {
    width: iconSize.xl,
    height: iconSize.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: "#f3f8ff",
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconText: {
    fontSize: iconSize.lg,
  },
  heroInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  heroTitle: {
    fontSize: rf(22),
    fontWeight: "700",
    color: "#1f2633",
  },
  heroSubtitle: {
    fontSize: rf(14),
    color: "#5b6472",
    lineHeight: rf(20),
  },
  accountPill: {
    alignSelf: "flex-start",
    marginTop: vs(4),
    backgroundColor: "#edf3ff",
    color: "#2f5ae0",
    fontSize: rf(12),
    fontWeight: "700",
    paddingHorizontal: hs(10),
    paddingVertical: vs(6),
    borderRadius: s(999),
  },
  formArea: {
    gap: spacing.lg,
  },
  input: {
    backgroundColor: "#f3f5fa",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    fontSize: rf(15),
    color: "#1f2633",
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
    color: "#1f2633",
    textAlign: "right",
    flexShrink: 1,
    marginLeft: spacing.lg,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#1f9254",
    borderRadius: borderRadius.lg,
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
    backgroundColor: "#f7fbff",
    borderWidth: 1,
    borderColor: "#d9e8ff",
    borderRadius: borderRadius.lg,
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
    borderWidth: 1,
    borderColor: "#d5dbe7",
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  secondaryButtonOutlineText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "#2f5ae0",
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(8) },
    shadowOpacity: 0.06,
    shadowRadius: s(14),
    elevation: 6,
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
    backgroundColor: "#f3f8ff",
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
    fontWeight: "700",
    color: "#1f2633",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoIcon: {
    width: iconSize.sm,
    height: iconSize.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: "#2196F3",
    alignItems: "center",
    justifyContent: "center",
  },
  infoIconText: {
    fontSize: rf(12),
    color: "#fff",
    fontWeight: "bold",
  },
  cardSubtitle: {
    fontSize: rf(14),
    color: "#6f7c8c",
  },
  cardContent: {
    gap: spacing.lg,
  },
  cardAction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardActionText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "#2f5ae0",
  },
  cardArrow: {
    fontSize: rf(20),
    color: "#2f5ae0",
    fontWeight: "300",
  },
  cardButton: {
    backgroundColor: "#f0f3fa",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  cardButtonText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "#2f5ae0",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#f0f3fa",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "#2f5ae0",
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
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
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
    borderBottomColor: "#e4e9f2",
  },
  modalTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: "#1f2633",
  },
  modalCloseButton: {
    width: iconSize.md,
    height: iconSize.md,
    borderRadius: borderRadius.sm,
    backgroundColor: "#f3f5fa",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    fontSize: rf(16),
    color: "#6f7c8c",
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
    borderTopColor: "#e4e9f2",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f3f5fa",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: rf(15),
    fontWeight: "600",
    color: "#6f7c8c",
  },
});

export default SettingsScreen;
