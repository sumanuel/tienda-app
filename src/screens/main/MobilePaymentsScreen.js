import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useCustomAlert } from "../../components/common/CustomAlert";
import {
  getMobilePaymentsByVerified,
  insertMobilePayment,
  verifyMobilePayment,
} from "../../services/database/mobilePayments";
import { formatCurrency, parseCurrency } from "../../utils/currency";
import {
  borderRadius,
  hs,
  iconSize,
  rf,
  s,
  spacing,
  vs,
} from "../../utils/responsive";

const parseSqliteDateTime = (value) => {
  if (!value) return new Date();

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    return new Date(value);
  }

  const asString = String(value);

  // ISO (con timezone) => parse directo
  if (asString.includes("T")) {
    const parsed = new Date(asString);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  // SQLite CURRENT_TIMESTAMP / datetime('now'): "YYYY-MM-DD HH:mm:ss" (UTC)
  if (asString.includes(" ")) {
    const normalized = `${asString.replace(" ", "T")}Z`;
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const fallback = new Date(asString);
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
};

const formatLocalDateTime = (value) => {
  const parsed = parseSqliteDateTime(value);
  return `${parsed.toLocaleDateString()} ${parsed.toLocaleTimeString()}`;
};

export const MobilePaymentsScreen = () => {
  const insets = useSafeAreaInsets();
  const { showAlert, CustomAlert } = useCustomAlert();

  const [activeTab, setActiveTab] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [verifiedPayments, setVerifiedPayments] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formReference, setFormReference] = useState("");
  const [formCustomer, setFormCustomer] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formVerified, setFormVerified] = useState(false);

  const fabBottom = vs(24) + Math.max(insets.bottom, vs(24));
  const listPaddingBottom = iconSize.xl + fabBottom + vs(24);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      const [pendingRows, verifiedRows] = await Promise.all([
        getMobilePaymentsByVerified(false),
        getMobilePaymentsByVerified(true),
      ]);
      setPendingPayments(pendingRows);
      setVerifiedPayments(verifiedRows);
    } catch (error) {
      console.error("Error loading mobile payments:", error);
      showAlert({
        title: "Error",
        message: "No se pudieron cargar los pagos móviles",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useFocusEffect(
    useCallback(() => {
      loadPayments();
    }, [loadPayments]),
  );

  const data = useMemo(() => {
    return activeTab === "pending" ? pendingPayments : verifiedPayments;
  }, [activeTab, pendingPayments, verifiedPayments]);

  const resetForm = useCallback(() => {
    setFormReference("");
    setFormCustomer("");
    setFormAmount("");
    setFormVerified(false);
  }, []);

  const openAddModal = useCallback(() => {
    resetForm();
    setModalVisible(true);
  }, [resetForm]);

  const closeAddModal = useCallback(() => {
    if (saving) return;
    setModalVisible(false);
  }, [saving]);

  const handleSave = useCallback(async () => {
    if (saving) return;

    const reference = formReference.trim();
    const customerName = formCustomer.trim();
    const amount = parseCurrency(formAmount);

    if (!reference) {
      showAlert({
        title: "Falta la referencia",
        message: "Ingresa la referencia del pago",
        type: "error",
      });
      return;
    }

    if (!customerName) {
      showAlert({
        title: "Falta el cliente",
        message: "Ingresa el nombre del cliente",
        type: "error",
      });
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      showAlert({
        title: "Monto inválido",
        message: "Ingresa un monto mayor a 0",
        type: "error",
      });
      return;
    }

    try {
      setSaving(true);
      await insertMobilePayment({
        reference,
        customerName,
        amount,
        verified: formVerified,
      });
      setModalVisible(false);
      await loadPayments();
      showAlert({
        title: "Guardado",
        message: formVerified
          ? "Pago móvil guardado como verificado"
          : "Pago móvil guardado en pendientes",
        type: "success",
      });
    } catch (error) {
      console.error("Error saving mobile payment:", error);
      showAlert({
        title: "Error",
        message: error?.message || "No se pudo guardar el pago móvil",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }, [
    formAmount,
    formCustomer,
    formReference,
    formVerified,
    loadPayments,
    showAlert,
  ]);

  const confirmVerify = useCallback(
    (payment) => {
      const reference = payment?.reference || "";
      const customerName = payment?.customerName || "";

      showAlert({
        title: "Verificar pago",
        message: `¿Confirmas que el pago con referencia ${reference} de ${customerName} fue verificado?`,
        type: "warning",
        buttons: [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Confirmar",
            onPress: async () => {
              try {
                await verifyMobilePayment(payment.id);
                await loadPayments();
                showAlert({
                  title: "Verificado",
                  message: "El pago pasó a verificados",
                  type: "success",
                });
              } catch (error) {
                console.error("Error verifying mobile payment:", error);
                showAlert({
                  title: "Error",
                  message: "No se pudo verificar el pago",
                  type: "error",
                });
              }
            },
          },
        ],
      });
    },
    [loadPayments, showAlert],
  );

  const renderPaymentItem = ({ item }) => {
    const amount = Number(item?.amount) || 0;

    return (
      <View style={styles.paymentCard}>
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentReference}>Ref: {item.reference}</Text>
          <Text style={styles.paymentCustomer}>{item.customerName}</Text>
          <Text style={styles.paymentAmount}>
            {formatCurrency(amount, "VES")}
          </Text>
          {item?.createdAt ? (
            <Text style={styles.paymentCreatedAt}>
              Agregado: {formatLocalDateTime(item.createdAt)}
            </Text>
          ) : null}
          {activeTab === "verified" && item?.verifiedAt ? (
            <Text style={styles.paymentVerifiedAt}>
              Verificado: {formatLocalDateTime(item.verifiedAt)}
            </Text>
          ) : null}
        </View>

        {activeTab === "pending" ? (
          <TouchableOpacity
            style={styles.verifyButton}
            activeOpacity={0.85}
            onPress={() => confirmVerify(item)}
          >
            <Ionicons name="checkmark" size={rf(18)} color="#fff" />
            <Text style={styles.verifyButtonText}>Verificar</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.headerContent}>
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Text style={styles.heroIconText}>📲</Text>
            </View>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>Pago movil</Text>
              <Text style={styles.heroSubtitle}>
                Registra pagos pendientes y confirma verificados con fecha.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "pending" && styles.tabActive,
            ]}
            activeOpacity={0.85}
            onPress={() => setActiveTab("pending")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "pending" && styles.tabTextActive,
              ]}
            >
              Pendientes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "verified" && styles.tabActive,
            ]}
            activeOpacity={0.85}
            onPress={() => setActiveTab("verified")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "verified" && styles.tabTextActive,
              ]}
            >
              Verificados
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Cargando pagos...</Text>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderPaymentItem}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: listPaddingBottom },
              data.length === 0 && styles.emptyListContent,
            ]}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                  {activeTab === "pending"
                    ? "Sin pendientes"
                    : "Sin verificados"}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {activeTab === "pending"
                    ? "Agrega un pago móvil para verlo aquí"
                    : "Verifica un pago pendiente para verlo aquí"}
                </Text>
              </View>
            }
          />
        )}

        <TouchableOpacity
          style={[styles.fab, { bottom: fabBottom }]}
          activeOpacity={0.9}
          onPress={openAddModal}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>

        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeAddModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Nuevo pago movil</Text>

              <Text style={styles.fieldLabel}>Referencia</Text>
              <TextInput
                value={formReference}
                onChangeText={setFormReference}
                placeholder="Ej: 123456"
                style={styles.input}
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>Cliente</Text>
              <TextInput
                value={formCustomer}
                onChangeText={setFormCustomer}
                placeholder="Nombre del cliente"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Monto</Text>
              <TextInput
                value={formAmount}
                onChangeText={setFormAmount}
                placeholder="0,00"
                style={styles.input}
                keyboardType="decimal-pad"
              />

              <TouchableOpacity
                style={styles.checkboxRow}
                activeOpacity={0.85}
                onPress={() => setFormVerified((prev) => !prev)}
              >
                <Ionicons
                  name={formVerified ? "checkbox" : "square-outline"}
                  size={rf(22)}
                  color={formVerified ? "#4CAF50" : "#94a3b8"}
                />
                <Text style={styles.checkboxText}>Marcar como verificado</Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancel]}
                  activeOpacity={0.85}
                  onPress={closeAddModal}
                  disabled={saving}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalSave]}
                  activeOpacity={0.85}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSaveText}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
      <CustomAlert />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f8fb",
  },
  headerContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: vs(16),
    paddingBottom: vs(4),
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(10) },
    shadowOpacity: 0.08,
    shadowRadius: s(18),
    elevation: 8,
  },
  heroIcon: {
    width: s(56),
    height: s(56),
    borderRadius: borderRadius.lg,
    backgroundColor: "#f3f8ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: hs(16),
  },
  heroIconText: {
    fontSize: rf(26),
  },
  heroTextContainer: {
    flex: 1,
    gap: vs(6),
  },
  heroTitle: {
    fontSize: rf(20),
    fontWeight: "800",
    color: "#1f2633",
  },
  heroSubtitle: {
    fontSize: rf(13),
    color: "#5b6472",
    lineHeight: vs(18),
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingTop: vs(12),
    paddingBottom: vs(10),
    gap: hs(10),
  },
  tabButton: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: borderRadius.lg,
    paddingVertical: vs(12),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e6edf6",
  },
  tabActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  tabText: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#2f3a4c",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: vs(8),
  },
  emptyListContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: vs(10),
    fontSize: rf(14),
    color: "#556270",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    marginTop: vs(24),
  },
  emptyTitle: {
    fontSize: rf(18),
    fontWeight: "800",
    color: "#1f2633",
  },
  emptySubtitle: {
    marginTop: vs(8),
    fontSize: rf(14),
    color: "#667085",
    textAlign: "center",
  },
  paymentCard: {
    backgroundColor: "#ffffff",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: vs(12),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: s(8),
    elevation: 2,
  },
  paymentInfo: {
    flex: 1,
    paddingRight: hs(12),
  },
  paymentReference: {
    fontSize: rf(12),
    fontWeight: "700",
    color: "#2f3a4c",
    marginBottom: vs(4),
  },
  paymentCustomer: {
    fontSize: rf(15),
    fontWeight: "800",
    color: "#111827",
    marginBottom: vs(6),
  },
  paymentAmount: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#4CAF50",
  },
  paymentVerifiedAt: {
    marginTop: vs(4),
    fontSize: rf(12),
    color: "#667085",
    fontWeight: "600",
  },
  paymentCreatedAt: {
    marginTop: vs(6),
    fontSize: rf(12),
    color: "#667085",
    fontWeight: "600",
  },
  verifyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: hs(6),
    backgroundColor: "#2f5ae0",
    paddingVertical: vs(10),
    paddingHorizontal: hs(12),
    borderRadius: borderRadius.md,
  },
  verifyButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: rf(13),
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    width: iconSize.xl,
    height: iconSize.xl,
    borderRadius: iconSize.xl / 2,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(10) },
    shadowOpacity: 0.18,
    shadowRadius: s(14),
    elevation: 8,
  },
  fabText: {
    color: "#ffffff",
    fontSize: rf(30),
    fontWeight: "900",
    marginTop: vs(-2),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(13, 22, 38, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  modalCard: {
    width: "100%",
    maxWidth: s(460),
    backgroundColor: "#ffffff",
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(14) },
    shadowOpacity: 0.2,
    shadowRadius: s(20),
    elevation: 12,
  },
  modalTitle: {
    fontSize: rf(18),
    fontWeight: "900",
    color: "#111827",
    marginBottom: vs(14),
    textAlign: "center",
  },
  fieldLabel: {
    fontSize: rf(13),
    fontWeight: "800",
    color: "#344054",
    marginBottom: vs(6),
  },
  input: {
    borderWidth: 1,
    borderColor: "#dbe3ee",
    borderRadius: borderRadius.lg,
    paddingVertical: vs(12),
    paddingHorizontal: hs(12),
    fontSize: rf(14),
    color: "#111827",
    backgroundColor: "#ffffff",
    marginBottom: vs(12),
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: hs(10),
    paddingVertical: vs(8),
    marginBottom: vs(8),
  },
  checkboxText: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#2f3a4c",
  },
  modalActions: {
    flexDirection: "row",
    gap: hs(12),
    marginTop: vs(14),
  },
  modalButton: {
    flex: 1,
    paddingVertical: vs(14),
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancel: {
    backgroundColor: "#f8f9fc",
    borderWidth: 1,
    borderColor: "#d9e0eb",
  },
  modalCancelText: {
    color: "#2f5ae0",
    fontWeight: "800",
    fontSize: rf(14),
  },
  modalSave: {
    backgroundColor: "#4CAF50",
  },
  modalSaveText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: rf(14),
  },
});

export default MobilePaymentsScreen;
