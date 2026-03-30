import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TourGuideZone, useTourGuideController } from "rn-tourguide";
import { useAccounts } from "../../hooks/useAccounts";
import { formatCurrency } from "../../utils/currency";
import { useCustomAlert } from "../../components/common/CustomAlert";
import { openWhatsApp, isValidWhatsAppPhone } from "../../utils/whatsapp";
import { hasSeenTour, markTourSeen } from "../../services/tour/tourStorage";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";

export const AccountsReceivableScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { canStart, start } = useTourGuideController();
  const [tourBooted, setTourBooted] = useState(false);
  const {
    accountsReceivable,
    loading,
    error,
    refresh,
    searchReceivable,
    removeAccountReceivable,
    markReceivableAsPaid,
    receivableStats,
    recordPayment,
    getPayments,
    getBalance,
  } = useAccounts();
  const { showAlert, CustomAlert } = useCustomAlert();

  const fabBottom = vs(24) + Math.max(insets.bottom, vs(24));
  const listPaddingBottom = iconSize.xl + fabBottom + vs(24);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    let mounted = true;

    const maybeStartTour = async () => {
      if (tourBooted) return;
      if (!canStart) return;

      const tourId = "accountsReceivable";
      const seen = await hasSeenTour(tourId);
      if (!mounted) return;

      if (!seen) {
        setTimeout(() => {
          start();
          markTourSeen(tourId);
        }, 450);
      }

      if (mounted) setTourBooted(true);
    };

    maybeStartTour();

    return () => {
      mounted = false;
    };
  }, [canStart, start, tourBooted]);

  const buildReceivableWhatsAppText = useCallback((account) => {
    const customerName = account?.customerName || "Cliente";
    const amount = Number(account?.amount) || 0;
    const paidAmount = Number(account?.paidAmount) || 0;
    const pendingAmount = Math.max(0, amount - paidAmount);
    const baseAmountUSD = Number(account?.baseAmountUSD) || 0;

    const parts = [`Hola ${customerName},`];
    parts.push("Te escribo para compartirte un recordatorio de pago.");

    if (account?.invoiceNumber) {
      parts.push(`Factura: ${account.invoiceNumber}`);
    }
    if (account?.description) {
      parts.push(`Concepto: ${account.description}`);
    }
    if (account?.dueDate) {
      parts.push(`Vence: ${account.dueDate}`);
    }

    parts.push(`Monto: ${formatCurrency(amount, "VES")}`);
    if (baseAmountUSD > 0) {
      parts.push(`Monto (USD): ${formatCurrency(baseAmountUSD, "USD")}`);
    }
    if (paidAmount > 0) {
      parts.push(`Pagado: ${formatCurrency(paidAmount, "VES")}`);
      parts.push(`Pendiente: ${formatCurrency(pendingAmount, "VES")}`);
    }

    return parts.join("\n");
  }, []);

  const handleSendWhatsApp = useCallback(
    async (account) => {
      try {
        const phone = account?.customerPhone;
        const text = buildReceivableWhatsAppText(account);
        await openWhatsApp({ phone, text });
      } catch (err) {
        console.error("Error sending WhatsApp message:", err);
        showAlert({
          title: "No se pudo enviar",
          message: err?.message || "No se pudo abrir WhatsApp",
          type: "error",
        });
      }
    },
    [buildReceivableWhatsAppText, showAlert],
  );

  const handleSearch = useCallback(
    async (query) => {
      setSearchQuery(query);
      if (!query.trim()) {
        await refresh();
      } else {
        await searchReceivable(query);
      }
    },
    [refresh, searchReceivable],
  );

  // Filtrar cuentas basado en el tab activo
  const filteredAccounts = useMemo(() => {
    if (activeTab === "pending") {
      return accountsReceivable.filter((account) => {
        const paidAmount = account.paidAmount || 0;
        return account.status !== "paid" && paidAmount + 0.01 < account.amount;
      });
    } else if (activeTab === "paid") {
      return accountsReceivable.filter((account) => {
        const paidAmount = account.paidAmount || 0;
        return account.status === "paid" || paidAmount + 0.01 >= account.amount;
      });
    }
    return accountsReceivable;
  }, [accountsReceivable, activeTab]);

  const openAddScreen = useCallback(() => {
    navigation.navigate("AddAccountReceivable");
  }, [navigation]);

  const openEditScreen = useCallback(
    (account) => {
      navigation.navigate("EditAccountReceivable", { account });
    },
    [navigation],
  );

  const openRecordPaymentScreen = useCallback(
    (account) => {
      navigation.navigate("RecordPayment", { account });
    },
    [navigation],
  );

  const openPaymentHistoryScreen = useCallback(
    (account) => {
      navigation.navigate("PaymentHistory", { account });
    },
    [navigation],
  );

  const handleMarkAsPaid = useCallback(
    (account) => {
      showAlert({
        title: "Marcar como pagada",
        message: `¿Confirmar que la cuenta de ${
          account.customerName
        } por ${formatCurrency(account.amount || 0, "VES")} ha sido pagada?`,
        type: "warning",
        buttons: [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Confirmar",
            onPress: async () => {
              try {
                await markReceivableAsPaid(account.id);
                showAlert({
                  title: "Éxito",
                  message: "Cuenta marcada como pagada",
                  type: "success",
                });
              } catch (err) {
                console.error("Error marcando cuenta como pagada:", err);
                showAlert({
                  title: "Error",
                  message: "No se pudo actualizar la cuenta",
                  type: "error",
                });
              }
            },
          },
        ],
      });
    },
    [markReceivableAsPaid, showAlert],
  );

  const handleDelete = useCallback(
    (account) => {
      showAlert({
        title: "Eliminar cuenta",
        message: `¿Eliminar la cuenta de ${account.customerName}?`,
        type: "warning",
        buttons: [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: async () => {
              try {
                await removeAccountReceivable(account.id);
                showAlert({
                  title: "Éxito",
                  message: "Cuenta eliminada correctamente",
                  type: "success",
                });
              } catch (err) {
                console.error("Error eliminando cuenta:", err);
                showAlert({
                  title: "Error",
                  message: "No se pudo eliminar la cuenta",
                  type: "error",
                });
              }
            },
          },
        ],
      });
    },
    [removeAccountReceivable, showAlert],
  );

  const totalAmount = receivableStats?.totalAmount || 0;
  const totalCount =
    typeof receivableStats?.total === "number"
      ? receivableStats.total
      : accountsReceivable.length;

  const getStatusAppearance = useCallback(
    (status, dueDate, paidAmount, amount) => {
      const parseLocalYmd = (ymd) => {
        if (!ymd || typeof ymd !== "string") return null;
        const [y, m, d] = ymd.split("-").map(Number);
        if (!y || !m || !d) return null;
        const parsed = new Date(y, m - 1, d);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      };

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // Si está completamente pagada según los cálculos, mostrar como pagada
      const isFullyPaid = status === "paid" || paidAmount + 0.01 >= amount;

      if (isFullyPaid) {
        return {
          label: "Pagado",
          backgroundColor: "#e5f7ed",
          color: "#2e7d32",
        };
      }

      const dueLocal = parseLocalYmd(dueDate);
      if (dueLocal && dueLocal < startOfToday) {
        return {
          label: "Vencida",
          backgroundColor: "#fdecea",
          color: "#c62828",
        };
      }

      return {
        label: "Pendiente",
        backgroundColor: "#fff4e5",
        color: "#ef6c00",
      };
    },
    [],
  );

  const renderAccount = useCallback(
    ({ item }) => {
      const appearance = getStatusAppearance(
        item.status,
        item.dueDate,
        item.paidAmount || 0,
        item.amount,
      );

      return (
        <TouchableOpacity
          style={styles.accountCard}
          activeOpacity={item.invoiceNumber ? 1 : 0.9}
          onPress={item.invoiceNumber ? undefined : () => openEditScreen(item)}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <View style={styles.statusContainer}>
              {item.invoiceNumber && (
                <View style={styles.autoGeneratedBadge}>
                  <Text style={styles.autoGeneratedText}>Auto</Text>
                </View>
              )}
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: appearance.backgroundColor },
                ]}
              >
                <Text style={[styles.statusText, { color: appearance.color }]}>
                  {appearance.label}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.amountRow}>
            <View style={styles.amountContainer}>
              <Text style={styles.amount}>
                {formatCurrency(item.amount || 0, item.currency || "VES")}
              </Text>
              {(item.paidAmount || 0) > 0 && (
                <View style={styles.paymentInfo}>
                  <Text style={styles.paidText}>
                    Pagado:{" "}
                    {formatCurrency(
                      item.paidAmount || 0,
                      item.currency || "VES",
                    )}
                  </Text>
                  <Text style={styles.pendingText}>
                    Pendiente:{" "}
                    {formatCurrency(
                      Math.max(0, (item.amount || 0) - (item.paidAmount || 0)),
                      item.currency || "VES",
                    )}
                  </Text>
                </View>
              )}
            </View>
            {item.dueDate ? (
              <Text style={styles.dueDate}>
                Vence{" "}
                {(() => {
                  const [y, m, d] = item.dueDate.split("-").map(Number);
                  const parsed = new Date(y, m - 1, d);
                  return Number.isNaN(parsed.getTime())
                    ? item.dueDate
                    : parsed.toLocaleDateString();
                })()}
              </Text>
            ) : null}
          </View>

          {item.invoiceNumber ? (
            <Text style={styles.invoiceNumber}>
              Factura {item.invoiceNumber}
            </Text>
          ) : null}
          {item.documentNumber ? (
            <Text style={styles.metaText}>Cédula: {item.documentNumber}</Text>
          ) : null}
          {item.description ? (
            <Text style={styles.description}>{item.description}</Text>
          ) : null}
          {item.createdAt ? (
            <Text style={styles.metaText}>
              Registrada {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          ) : null}

          <View style={styles.cardFooter}>
            {(() => {
              const paidAmount = item.paidAmount || 0;
              const isFullyPaid =
                item.status === "paid" || paidAmount >= item.amount;
              const hasPayments = paidAmount > 0;
              const canSendWhatsapp =
                !isFullyPaid && isValidWhatsAppPhone(item.customerPhone);
              return (
                <>
                  {!isFullyPaid && (
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => openRecordPaymentScreen(item)}
                    >
                      <Text style={styles.secondaryButtonText}>
                        Registrar pago
                      </Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.iconContainer}>
                    {canSendWhatsapp && (
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => handleSendWhatsApp(item)}
                      >
                        <Text style={styles.iconButtonText}>✉️</Text>
                      </TouchableOpacity>
                    )}

                    {hasPayments && (
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => openPaymentHistoryScreen(item)}
                      >
                        <Text style={styles.iconButtonText}>📋</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleDelete(item)}
                    >
                      <Text style={styles.iconButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      );
    },
    [
      getStatusAppearance,
      handleDelete,
      handleSendWhatsApp,
      openRecordPaymentScreen,
      openPaymentHistoryScreen,
      openEditScreen,
    ],
  );

  const header = (
    <View>
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryIcon}>
            <Text style={styles.summaryIconText}>📥</Text>
          </View>
          <View>
            <Text style={styles.summaryTitle}>
              Cuentas por Cobrar ({totalCount})
            </Text>
          </View>
        </View>

        <Text style={styles.summaryAmount}>
          {formatCurrency(totalAmount, "VES")}
        </Text>
      </View>

      <TourGuideZone
        zone={1}
        text={"Busca cuentas por cliente, factura o concepto."}
        borderRadius={borderRadius.lg}
        style={styles.controlsCard}
      >
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar cuentas..."
          placeholderTextColor="#9aa6b5"
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
      </TourGuideZone>

      <TourGuideZone
        zone={2}
        text={"Filtra entre cuentas pendientes y pagadas."}
        borderRadius={borderRadius.md}
        style={styles.tabGroup}
      >
        {[
          { key: "pending", label: "Pendientes" },
          { key: "paid", label: "Pagadas" },
        ].map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabChip, active && styles.tabChipActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.tabChipText, active && styles.tabChipTextActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </TourGuideZone>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyIcon}>🗒️</Text>
        <Text style={styles.emptyTitle}>
          {searchQuery ? "Sin resultados" : "Aún no tienes cuentas"}
        </Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery
            ? "Ajusta los términos de búsqueda para intentarlo de nuevo."
            : "Registra tu primera cuenta por cobrar desde el botón superior."}
        </Text>
      </View>
    </View>
  );

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando cuentas por cobrar...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          Ocurrió un error al cargar la información.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredAccounts}
        renderItem={renderAccount}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: listPaddingBottom },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListEmptyComponent={renderEmpty}
        keyboardShouldPersistTaps="handled"
        refreshing={loading}
        onRefresh={refresh}
      />

      <TourGuideZone
        zone={3}
        text={"Crea una nueva cuenta por cobrar."}
        shape="circle"
      >
        <TouchableOpacity
          style={[styles.fab, { bottom: fabBottom }]}
          onPress={openAddScreen}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </TourGuideZone>
      <CustomAlert />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8edf2",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e8edf2",
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: rf(15),
    color: "#6c7a8a",
  },
  errorText: {
    fontSize: rf(15),
    color: "#c62828",
    textAlign: "center",
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: s(4) },
    shadowOpacity: 0.2,
    shadowRadius: s(6),
    elevation: 2,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: rf(15),
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: vs(36),
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(10) },
    shadowOpacity: 0.08,
    shadowRadius: s(18),
    elevation: 6,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  summaryIcon: {
    width: iconSize.lg,
    height: iconSize.lg,
    borderRadius: borderRadius.md,
    backgroundColor: "#ecf4ef",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  summaryIconText: {
    fontSize: rf(24),
  },
  summaryTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#2f3a4c",
  },
  summaryAmount: {
    fontSize: rf(30),
    fontWeight: "700",
    color: "#2f3a4c",
    marginBottom: 0,
  },
  controlsCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(8) },
    shadowOpacity: 0.06,
    shadowRadius: s(14),
    elevation: 4,
  },
  searchInput: {
    backgroundColor: "#f3f5fa",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: rf(15),
    color: "#1f2633",
  },
  primaryButton: {
    marginTop: spacing.md,
    backgroundColor: "#4CAF50",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.2,
    shadowRadius: s(10),
    elevation: 3,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: rf(15),
    fontWeight: "600",
  },
  accountCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(8) },
    shadowOpacity: 0.07,
    shadowRadius: s(12),
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  customerName: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#2f3a4c",
    flex: 1,
    marginRight: spacing.md,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  statusText: {
    fontSize: rf(13),
    fontWeight: "600",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  amount: {
    fontSize: rf(22),
    fontWeight: "700",
    color: "#2e7d32",
  },
  dueDate: {
    fontSize: rf(13),
    color: "#6c7a8a",
    fontWeight: "500",
  },
  invoiceNumber: {
    fontSize: rf(13),
    color: "#4f6bed",
    fontWeight: "600",
    marginBottom: spacing.small,
  },
  metaText: {
    fontSize: rf(13),
    color: "#6c7a8a",
    marginBottom: spacing.small,
  },
  description: {
    fontSize: rf(13),
    color: "#4c5c6e",
    lineHeight: vs(19),
    marginBottom: spacing.small,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
  },
  secondaryButton: {
    backgroundColor: "#edf8ef",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    marginRight: spacing.md,
  },
  secondaryButtonText: {
    color: "#2e7d32",
    fontWeight: "600",
    fontSize: rf(14),
  },
  iconContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
    gap: spacing.small,
  },
  iconButton: {
    width: iconSize.lg,
    height: iconSize.lg,
    borderRadius: borderRadius.md,
    backgroundColor: "#fdecea",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonAlone: {
    marginLeft: "auto",
  },
  iconButtonNormal: {
    // Normal size, no special positioning
  },
  iconButtonSmall: {
    width: iconSize.md,
    height: iconSize.md,
    borderRadius: borderRadius.lg,
  },
  iconButtonText: {
    fontSize: rf(20),
  },
  emptyState: {
    paddingTop: vs(40),
    alignItems: "center",
  },
  emptyCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(8) },
    shadowOpacity: 0.06,
    shadowRadius: s(12),
    elevation: 3,
  },
  emptyIcon: {
    fontSize: rf(32),
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#2f3a4c",
    marginBottom: spacing.small,
  },
  emptySubtitle: {
    fontSize: rf(14),
    color: "#6c7a8a",
    textAlign: "center",
    lineHeight: vs(20),
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.small,
  },
  autoGeneratedBadge: {
    backgroundColor: "#e8f4fd",
    paddingHorizontal: spacing.small,
    paddingVertical: spacing.xsmall,
    borderRadius: borderRadius.small,
  },
  autoGeneratedText: {
    fontSize: rf(10),
    fontWeight: "600",
    color: "#2f5ae0",
    textTransform: "uppercase",
  },
  fab: {
    position: "absolute",
    bottom: vs(20),
    right: hs(20),
    width: iconSize.xl,
    height: iconSize.xl,
    borderRadius: s(28),
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(4) },
    shadowOpacity: 0.3,
    shadowRadius: s(8),
    elevation: 8,
  },
  fabIcon: {
    fontSize: rf(28),
    color: "#fff",
    fontWeight: "bold",
  },
  tabGroup: {
    flexDirection: "row",
    backgroundColor: "#f3f5fa",
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  tabChip: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  tabChipActive: {
    backgroundColor: "#2f5ae0",
    shadowColor: "#2f5ae0",
    shadowOffset: { width: 0, height: s(4) },
    shadowOpacity: 0.18,
    shadowRadius: s(6),
    elevation: 4,
  },
  tabChipText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "#5b6472",
  },
  tabChipTextActive: {
    color: "#fff",
  },
  amountContainer: {
    flex: 1,
  },
  paymentInfo: {
    marginTop: spacing.small,
  },
  paidText: {
    fontSize: rf(12),
    color: "#48bb78",
    fontWeight: "500",
  },
  pendingText: {
    fontSize: rf(12),
    color: "#e53e3e",
    fontWeight: "500",
  },
});

export default AccountsReceivableScreen;
