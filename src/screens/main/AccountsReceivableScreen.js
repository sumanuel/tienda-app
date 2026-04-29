import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTourGuideController } from "rn-tourguide";
import { useAccounts } from "../../hooks/useAccounts";
import { formatCurrency } from "../../utils/currency";
import { useCustomAlert } from "../../components/common/CustomAlert";
import { openWhatsApp, isValidWhatsAppPhone } from "../../utils/whatsapp";
import { buildReceivableReminderWhatsAppMessage } from "../../utils/whatsappMessages";
import { hasSeenTour, markTourSeen } from "../../services/tour/tourStorage";
import {
  EmptyStateCard,
  FloatingActionButton,
  InfoPill,
  SurfaceCard,
  SHADOWS,
  UI_COLORS,
} from "../../components/common/AppUI";
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
  const { canStart, start, TourGuideZone } =
    useTourGuideController("accountsReceivable");
  const TOUR_ZONE_BASE = 6100;
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

  const previousQueryRef = useRef("");

  useEffect(() => {
    const query = (searchQuery || "").trim();
    const previousQuery = previousQueryRef.current;
    previousQueryRef.current = query;

    const timeoutId = setTimeout(() => {
      if (!query) {
        if (previousQuery) {
          refresh();
        }
        return;
      }

      searchReceivable(query);
    }, 250);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchQuery, refresh, searchReceivable]);

  useEffect(() => {
    let mounted = true;
    let timeoutId;

    const maybeStartTour = async () => {
      if (tourBooted) return;
      if (!canStart) return;

      const tourId = "accountsReceivable_v2";
      const seen = await hasSeenTour(tourId);
      if (!mounted) return;

      if (!seen) {
        timeoutId = setTimeout(() => {
          start();
          markTourSeen(tourId);
        }, 450);
      }

      if (mounted) setTourBooted(true);
    };

    maybeStartTour();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [canStart, start, tourBooted]);

  const buildReceivableWhatsAppText = useCallback((account) => {
    const amount = Number(account?.amount) || 0;
    const paidAmount = Number(account?.paidAmount) || 0;
    const pendingAmount = Math.max(0, amount - paidAmount);

    return buildReceivableReminderWhatsAppMessage({
      customerName: account?.customerName,
      invoiceNumber: account?.invoiceNumber,
      description: account?.description,
      dueDate: account?.dueDate,
      amountVES: amount,
      baseAmountUSD: Number(account?.baseAmountUSD) || 0,
      paidAmountVES: paidAmount,
      pendingAmountVES: pendingAmount,
    });
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
        <Pressable
          style={({ pressed }) => [
            styles.accountCard,
            pressed && !item.invoiceNumber && styles.cardPressed,
          ]}
          onPress={item.invoiceNumber ? undefined : () => openEditScreen(item)}
        >
          <View style={styles.cardHeader}>
            <View style={styles.headerCopy}>
              <View style={styles.headerPillsRow}>
                <InfoPill
                  text={
                    item.receivableNumber ||
                    `CXC-${String(item.id).padStart(6, "0")}`
                  }
                  tone="info"
                />
                {item.invoiceNumber ? (
                  <InfoPill text="Auto" tone="neutral" />
                ) : null}
              </View>
              <Text style={styles.customerName}>{item.customerName}</Text>
            </View>
            <View style={styles.statusContainer}>
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
              {(item.paidAmount || 0) > 0 && (
                <View style={styles.balanceRow}>
                  <View style={[styles.balanceCard, styles.balanceCardSoft]}>
                    <Text style={styles.balanceLabel}>Pagado</Text>
                    <Text style={styles.balanceValuePaid}>
                      {formatCurrency(
                        item.paidAmount || 0,
                        item.currency || "VES",
                      )}
                    </Text>
                  </View>
                  <View style={[styles.balanceCard, styles.balanceCardWarn]}>
                    <Text style={styles.balanceLabel}>Pendiente</Text>
                    <Text style={styles.balanceValuePending}>
                      {formatCurrency(
                        Math.max(
                          0,
                          (item.amount || 0) - (item.paidAmount || 0),
                        ),
                        item.currency || "VES",
                      )}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          <View style={styles.metaGrid}>
            {item.invoiceNumber ? (
              <View style={[styles.metaCard, styles.metaCardHalf]}>
                <Text style={styles.metaLabel}>Factura</Text>
                <Text style={styles.metaValue}>#{item.invoiceNumber}</Text>
              </View>
            ) : null}
            {item.documentNumber ? (
              <View style={[styles.metaCard, styles.metaCardHalf]}>
                <Text style={styles.metaLabel}>Documento</Text>
                <Text style={styles.metaValue}>{item.documentNumber}</Text>
              </View>
            ) : null}
            {item.createdAt ? (
              <View style={[styles.metaCard, styles.metaCardWide]}>
                <Text style={styles.metaLabel}>Registro</Text>
                <Text style={styles.metaValue}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ) : null}
            {item.description ? (
              <View style={[styles.metaCard, styles.metaCardWide]}>
                <Text style={styles.metaLabel}>Descripción</Text>
                <Text style={styles.metaValue}>{item.description}</Text>
              </View>
            ) : null}
          </View>

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
                    <Pressable
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        pressed && styles.cardPressed,
                      ]}
                      onPress={() => openRecordPaymentScreen(item)}
                    >
                      <Text style={styles.secondaryButtonText}>
                        Registrar pago
                      </Text>
                    </Pressable>
                  )}

                  <View style={styles.iconContainer}>
                    {canSendWhatsapp && (
                      <Pressable
                        style={({ pressed }) => [
                          styles.iconButton,
                          styles.whatsappButton,
                          pressed && styles.cardPressed,
                        ]}
                        onPress={() => handleSendWhatsApp(item)}
                      >
                        <Ionicons
                          name="logo-whatsapp"
                          size={rf(16)}
                          color="#25D366"
                        />
                      </Pressable>
                    )}

                    {hasPayments && (
                      <Pressable
                        style={({ pressed }) => [
                          styles.iconButton,
                          styles.infoIconButton,
                          pressed && styles.cardPressed,
                        ]}
                        onPress={() => openPaymentHistoryScreen(item)}
                      >
                        <Ionicons
                          name="document-text-outline"
                          size={rf(16)}
                          color={UI_COLORS.info}
                        />
                      </Pressable>
                    )}

                    <Pressable
                      style={({ pressed }) => [
                        styles.iconButton,
                        styles.dangerIconButton,
                        pressed && styles.cardPressed,
                      ]}
                      onPress={() => handleDelete(item)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={rf(16)}
                        color={UI_COLORS.danger}
                      />
                    </Pressable>
                  </View>
                </>
              );
            })()}
          </View>
        </Pressable>
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
    <View style={styles.headerContent}>
      <TourGuideZone
        zone={TOUR_ZONE_BASE + 1}
        text={
          "Aquí ves el total. Usa 'Buscar cuentas…' para filtrar por cliente, factura o concepto."
        }
        borderRadius={borderRadius.lg}
        style={styles.heroWrap}
      >
        <SurfaceCard style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIcon}>
              <Ionicons
                name="cash-outline"
                size={rf(22)}
                color={UI_COLORS.accent}
              />
            </View>
            <View style={styles.summaryCopy}>
              <View style={styles.summaryPillsRow}>
                <InfoPill text={`${totalCount} cuentas`} tone="accent" />
                <InfoPill
                  text={activeTab === "pending" ? "Pendientes" : "Pagadas"}
                  tone={activeTab === "pending" ? "warning" : "info"}
                />
              </View>
              <Text style={styles.summaryTitle}>Cuentas por cobrar</Text>
              <Text style={styles.summarySubtitle}>
                Controla saldos pendientes, historial y seguimiento por cliente.
              </Text>
            </View>
          </View>

          <Text style={styles.summaryAmount}>
            {formatCurrency(totalAmount, "VES")}
          </Text>
        </SurfaceCard>
      </TourGuideZone>

      <SurfaceCard style={styles.controlsCard}>
        <Text style={styles.searchTitle}>Buscar cuentas</Text>
        <Text style={styles.searchHint}>
          Filtra por cliente, factura o concepto.
        </Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar cuentas..."
          placeholderTextColor="#9aa6b5"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
      </SurfaceCard>

      <TourGuideZone
        zone={TOUR_ZONE_BASE + 2}
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
            <Pressable
              key={tab.key}
              style={({ pressed }) => [
                styles.tabChip,
                active && styles.tabChipActive,
                pressed && styles.cardPressed,
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[styles.tabChipText, active && styles.tabChipTextActive]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </TourGuideZone>
    </View>
  );

  const renderEmpty = () => (
    <EmptyStateCard
      style={styles.emptyCard}
      title={searchQuery ? "Sin resultados" : "Aún no tienes cuentas"}
      subtitle={
        searchQuery
          ? "Ajusta los términos de búsqueda para intentarlo de nuevo."
          : "Registra tu primera cuenta por cobrar desde el botón superior."
      }
    />
  );

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={UI_COLORS.accent} />
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
        <Pressable
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.cardPressed,
          ]}
          onPress={refresh}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </Pressable>
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
        zone={TOUR_ZONE_BASE + 3}
        text={"Presiona '+' para crear una nueva cuenta por cobrar."}
        shape="circle"
      >
        <FloatingActionButton
          style={styles.fab}
          bottom={fabBottom}
          onPress={openAddScreen}
          iconName="add"
        />
      </TourGuideZone>
      <CustomAlert />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_COLORS.page,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: UI_COLORS.page,
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: rf(15),
    color: UI_COLORS.muted,
  },
  errorText: {
    fontSize: rf(15),
    color: UI_COLORS.danger,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: UI_COLORS.info,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: rf(14),
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: vs(36),
  },
  headerContent: {
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  heroWrap: {
    gap: spacing.lg,
  },
  summaryCard: {
    gap: spacing.lg,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  summaryIcon: {
    width: iconSize.lg,
    height: iconSize.lg,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    backgroundColor: UI_COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCopy: {
    flex: 1,
    gap: vs(6),
  },
  summaryPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: hs(10),
  },
  summaryTitle: {
    fontSize: rf(20),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  summaryAmount: {
    fontSize: rf(30),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  summarySubtitle: {
    fontSize: rf(13),
    color: UI_COLORS.muted,
    lineHeight: vs(19),
  },
  controlsCard: {
    gap: vs(6),
    ...SHADOWS.soft,
  },
  searchTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  searchHint: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
    lineHeight: vs(18),
  },
  searchInput: {
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    paddingVertical: vs(13),
    paddingHorizontal: spacing.md,
    fontSize: rf(15),
    color: UI_COLORS.text,
  },
  accountCard: {
    backgroundColor: UI_COLORS.surface,
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
    ...SHADOWS.soft,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: vs(8),
  },
  headerPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: hs(8),
  },
  customerName: {
    fontSize: rf(16),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: vs(8),
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
  },
  statusText: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  amountRow: {
    gap: spacing.sm,
  },
  amount: {
    fontSize: rf(24),
    fontWeight: "800",
    color: UI_COLORS.accent,
  },
  dueDate: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
    fontWeight: "600",
    marginTop: vs(2),
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: hs(10),
  },
  metaCard: {
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: hs(12),
    paddingVertical: vs(10),
    gap: vs(4),
  },
  metaCardHalf: {
    flex: 1,
    minWidth: s(140),
  },
  metaCardWide: {
    width: "100%",
  },
  metaLabel: {
    fontSize: rf(11),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  metaValue: {
    fontSize: rf(13),
    color: UI_COLORS.text,
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  secondaryButton: {
    backgroundColor: UI_COLORS.accentSoft,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: vs(12),
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: UI_COLORS.accentStrong,
    fontWeight: "700",
    fontSize: rf(13),
  },
  iconContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
    gap: hs(8),
  },
  iconButton: {
    width: iconSize.lg,
    height: iconSize.lg,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  whatsappButton: {
    backgroundColor: "#ebfff2",
  },
  infoIconButton: {
    backgroundColor: UI_COLORS.infoSoft,
  },
  dangerIconButton: {
    backgroundColor: UI_COLORS.dangerSoft,
  },
  balanceRow: {
    flexDirection: "row",
    gap: hs(10),
    marginTop: vs(10),
  },
  balanceCard: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: hs(12),
    paddingVertical: vs(10),
    gap: vs(4),
  },
  balanceCardSoft: {
    backgroundColor: UI_COLORS.accentSoft,
  },
  balanceCardWarn: {
    backgroundColor: UI_COLORS.warningSoft,
  },
  balanceLabel: {
    fontSize: rf(11),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  balanceValuePaid: {
    fontSize: rf(13),
    fontWeight: "700",
    color: UI_COLORS.accentStrong,
  },
  balanceValuePending: {
    fontSize: rf(13),
    fontWeight: "700",
    color: UI_COLORS.warning,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.small,
  },
  fab: {
    right: hs(20),
  },
  tabGroup: {
    flexDirection: "row",
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    padding: spacing.sm,
    gap: spacing.sm,
  },
  tabChip: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  tabChipActive: {
    backgroundColor: UI_COLORS.info,
  },
  tabChipText: {
    fontSize: rf(13),
    fontWeight: "700",
    color: UI_COLORS.muted,
  },
  tabChipTextActive: {
    color: "#fff",
  },
  amountContainer: {
    flex: 1,
  },
  emptyCard: {
    marginTop: vs(40),
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

export default AccountsReceivableScreen;
