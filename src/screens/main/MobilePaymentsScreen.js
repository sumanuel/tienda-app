import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useCustomAlert } from "../../components/common/CustomAlert";
import {
  EmptyStateCard,
  FloatingActionButton,
  InfoPill,
  ScreenHero,
  SurfaceCard,
  SHADOWS,
  UI_COLORS,
} from "../../components/common/AppUI";
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

  const renderPaymentItem = useCallback(
    ({ item }) => {
      const amount = Number(item?.amount) || 0;

      return (
        <SurfaceCard style={styles.paymentCard}>
          <View style={styles.paymentInfo}>
            <View style={styles.paymentTopRow}>
              <InfoPill
                text={activeTab === "pending" ? "Pendiente" : "Verificado"}
                tone={activeTab === "pending" ? "warning" : "accent"}
              />
              <Text style={styles.paymentReference}>Ref: {item.reference}</Text>
            </View>
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
            <Pressable
              style={({ pressed }) => [
                styles.verifyButton,
                pressed && styles.cardPressed,
              ]}
              onPress={() => confirmVerify(item)}
            >
              <Ionicons name="checkmark" size={rf(18)} color="#fff" />
              <Text style={styles.verifyButtonText}>Verificar</Text>
            </Pressable>
          ) : null}
        </SurfaceCard>
      );
    },
    [activeTab, confirmVerify],
  );

  const paymentKeyExtractor = useCallback((item) => String(item.id), []);

  return (
    <>
      <View style={styles.container}>
        <View style={styles.headerContent}>
          <ScreenHero
            iconName="phone-portrait-outline"
            iconColor={UI_COLORS.info}
            eyebrow="Cobros"
            title="Pago móvil"
            subtitle="Registra movimientos pendientes y confirma pagos verificados con trazabilidad clara."
            pills={[
              {
                text: `${pendingPayments.length} pendientes`,
                tone: pendingPayments.length > 0 ? "warning" : "neutral",
              },
              {
                text: `${verifiedPayments.length} verificados`,
                tone: "accent",
              },
            ]}
          />
        </View>

        <View style={styles.tabs}>
          <Pressable
            style={({ pressed }) => [
              styles.tabButton,
              activeTab === "pending" && styles.tabActive,
              pressed && styles.cardPressed,
            ]}
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
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.tabButton,
              activeTab === "verified" && styles.tabActive,
              pressed && styles.cardPressed,
            ]}
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
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Cargando pagos...</Text>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={paymentKeyExtractor}
            renderItem={renderPaymentItem}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: listPaddingBottom },
              data.length === 0 && styles.emptyListContent,
            ]}
            ListEmptyComponent={
              <EmptyStateCard
                style={styles.emptyState}
                title={
                  activeTab === "pending" ? "Sin pendientes" : "Sin verificados"
                }
                subtitle={
                  activeTab === "pending"
                    ? "Agrega un pago móvil para verlo aquí"
                    : "Verifica un pago pendiente para verlo aquí"
                }
              />
            }
          />
        )}

        <FloatingActionButton
          style={styles.fab}
          bottom={fabBottom}
          onPress={openAddModal}
          iconName="add"
        />

        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeAddModal}
        >
          <View style={styles.modalOverlay}>
            <SurfaceCard style={styles.modalCard}>
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

              <Pressable
                style={({ pressed }) => [
                  styles.checkboxRow,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => setFormVerified((prev) => !prev)}
              >
                <Ionicons
                  name={formVerified ? "checkbox" : "square-outline"}
                  size={rf(22)}
                  color={formVerified ? "#4CAF50" : "#94a3b8"}
                />
                <Text style={styles.checkboxText}>Marcar como verificado</Text>
              </Pressable>

              <View style={styles.modalActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalButton,
                    styles.modalCancel,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={closeAddModal}
                  disabled={saving}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.modalButton,
                    styles.modalSave,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalSaveText}>Guardar</Text>
                  )}
                </Pressable>
              </View>
            </SurfaceCard>
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
    backgroundColor: UI_COLORS.page,
  },
  headerContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: vs(16),
    paddingBottom: vs(2),
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingTop: vs(10),
    paddingBottom: vs(8),
    gap: hs(10),
  },
  tabButton: {
    flex: 1,
    backgroundColor: UI_COLORS.surface,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    paddingVertical: vs(11),
    alignItems: "center",
    borderWidth: 1,
    borderColor: UI_COLORS.border,
  },
  tabActive: {
    backgroundColor: UI_COLORS.accent,
    borderColor: UI_COLORS.accent,
  },
  tabText: {
    fontSize: rf(13),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  tabTextActive: {
    color: "#ffffff",
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: vs(6),
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
    color: UI_COLORS.muted,
    fontWeight: "600",
  },
  emptyState: {
    marginTop: vs(20),
  },
  paymentCard: {
    padding: spacing.md,
    marginBottom: vs(10),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    ...SHADOWS.soft,
  },
  paymentInfo: {
    flex: 1,
    paddingRight: hs(10),
    gap: vs(3),
  },
  paymentTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: hs(10),
    marginBottom: vs(2),
  },
  paymentReference: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
  },
  paymentCustomer: {
    fontSize: rf(14),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  paymentAmount: {
    fontSize: rf(17),
    fontWeight: "800",
    color: UI_COLORS.accent,
  },
  paymentVerifiedAt: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
    fontWeight: "600",
  },
  paymentCreatedAt: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
    fontWeight: "600",
  },
  verifyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: hs(6),
    backgroundColor: UI_COLORS.info,
    paddingVertical: vs(9),
    paddingHorizontal: hs(12),
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    marginTop: vs(2),
  },
  verifyButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: rf(13),
  },
  fab: {
    right: spacing.lg,
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
    gap: vs(2),
  },
  modalTitle: {
    fontSize: rf(17),
    fontWeight: "800",
    color: UI_COLORS.text,
    marginBottom: vs(12),
    textAlign: "center",
  },
  fieldLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
    marginBottom: vs(6),
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: vs(13),
    paddingHorizontal: hs(14),
    fontSize: rf(14),
    color: UI_COLORS.text,
    backgroundColor: UI_COLORS.surfaceAlt,
    marginBottom: vs(10),
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: hs(10),
    paddingVertical: vs(7),
    marginBottom: vs(6),
  },
  checkboxText: {
    fontSize: rf(13),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  modalActions: {
    flexDirection: "row",
    gap: hs(12),
    marginTop: vs(12),
  },
  modalButton: {
    flex: 1,
    paddingVertical: vs(13),
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancel: {
    backgroundColor: UI_COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
  },
  modalCancelText: {
    color: UI_COLORS.info,
    fontWeight: "700",
    fontSize: rf(13),
  },
  modalSave: {
    backgroundColor: UI_COLORS.accent,
  },
  modalSaveText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: rf(13),
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

export default MobilePaymentsScreen;
