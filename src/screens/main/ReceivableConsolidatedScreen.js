import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAccounts } from "../../hooks/useAccounts";
import { useExchangeRateContext } from "../../contexts/ExchangeRateContext";
import { formatCurrency } from "../../utils/currency";
import { openWhatsApp, isValidWhatsAppPhone } from "../../utils/whatsapp";
import { buildReceivableConsolidatedWhatsAppMessage } from "../../utils/whatsappMessages";
import { useCustomAlert } from "../../components/common/CustomAlert";
import {
  EmptyStateCard,
  InfoPill,
  SurfaceCard,
  SHADOWS,
  UI_COLORS,
} from "../../components/common/AppUI";
import { s, rf, vs, hs, spacing, borderRadius } from "../../utils/responsive";

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const formatShortDate = (value) => {
  if (!value) return "Sin fecha";

  if (typeof value === "string" && value.includes("-")) {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(year, (month || 1) - 1, day || 1);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("es-VE");
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : parsed.toLocaleDateString("es-VE");
};

const buildGroupKey = (account) => {
  const documentNumber = String(account?.documentNumber || "").trim();
  if (documentNumber) {
    return `doc:${documentNumber}`;
  }

  const customerId =
    account?.customerId != null ? String(account.customerId) : "";
  if (customerId) {
    return `customer:${customerId}`;
  }

  return `name:${String(account?.customerName || "sin-nombre")
    .trim()
    .toLowerCase()}`;
};

const getPendingAmount = (account) =>
  Math.max(
    0,
    (Number(account?.amount) || 0) - (Number(account?.paidAmount) || 0),
  );

const ReceivableConsolidatedScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { accountsReceivable, loading, error, refresh } = useAccounts();
  const { localCurrency, referenceCurrency, rateEnabled } =
    useExchangeRateContext();
  const { showAlert, CustomAlert } = useCustomAlert();

  const [query, setQuery] = useState("");
  const previousQueryRef = useRef("");

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    previousQueryRef.current = query;
  }, [query]);

  const consolidatedAccounts = useMemo(() => {
    const pendingAccounts = (accountsReceivable || []).filter((account) => {
      const pendingAmount = getPendingAmount(account);
      return account?.status !== "paid" && pendingAmount > 0.009;
    });

    const grouped = pendingAccounts.reduce((acc, account) => {
      const key = buildGroupKey(account);
      const pendingAmount = getPendingAmount(account);
      const pendingBaseUSD = Math.max(
        0,
        (Number(account?.baseAmountUSD) || 0) -
          ((Number(account?.baseAmountUSD) || 0) *
            (Number(account?.paidAmount) || 0)) /
            Math.max(Number(account?.amount) || 0, 1),
      );

      if (!acc[key]) {
        acc[key] = {
          key,
          customerName: account?.customerName || "Cliente sin nombre",
          documentNumber: String(account?.documentNumber || "").trim(),
          customerPhone: account?.customerPhone || "",
          totalPending: 0,
          totalPendingUSD: 0,
          items: [],
        };
      }

      acc[key].customerName =
        acc[key].customerName || account?.customerName || "Cliente sin nombre";
      acc[key].documentNumber =
        acc[key].documentNumber || String(account?.documentNumber || "").trim();
      acc[key].customerPhone =
        acc[key].customerPhone || account?.customerPhone || "";
      acc[key].totalPending += pendingAmount;
      acc[key].totalPendingUSD += pendingBaseUSD;
      acc[key].items.push({
        id: account.id,
        invoiceNumber: account.invoiceNumber,
        receivableNumber: account.receivableNumber,
        description: account.description,
        dueDate: account.dueDate,
        amount: Number(account.amount) || 0,
        paidAmount: Number(account.paidAmount) || 0,
        pendingAmount,
        pendingBaseUSD,
        account,
      });

      return acc;
    }, {});

    const normalizedQuery = normalizeText(query);

    return Object.values(grouped)
      .map((group) => ({
        ...group,
        items: [...group.items].sort((a, b) => {
          const dateDiff =
            new Date(a.dueDate || 0).getTime() -
            new Date(b.dueDate || 0).getTime();
          if (!Number.isNaN(dateDiff) && dateDiff !== 0) return dateDiff;
          return String(
            a.invoiceNumber || a.receivableNumber || "",
          ).localeCompare(
            String(b.invoiceNumber || b.receivableNumber || ""),
            "es",
          );
        }),
      }))
      .filter((group) => {
        if (!normalizedQuery) return true;

        const haystack = normalizeText(
          [
            group.customerName,
            group.documentNumber,
            ...group.items.map((item) => item.invoiceNumber),
            ...group.items.map((item) => item.receivableNumber),
            ...group.items.map((item) => item.description),
          ].join(" "),
        );

        return haystack.includes(normalizedQuery);
      })
      .sort((a, b) => b.totalPending - a.totalPending);
  }, [accountsReceivable, query]);

  const globalTotalPending = useMemo(
    () =>
      consolidatedAccounts.reduce((sum, item) => sum + item.totalPending, 0),
    [consolidatedAccounts],
  );

  const handleSendWhatsApp = useCallback(
    async (group) => {
      try {
        const phone = group?.customerPhone;
        const text = buildReceivableConsolidatedWhatsAppMessage({
          customerName: group?.customerName,
          documentNumber: group?.documentNumber,
          totalPendingVES: group?.totalPending,
          totalPendingUSD: group?.totalPendingUSD,
          localCurrency,
          referenceCurrency,
          rateEnabled,
          items: (group?.items || []).map((item) => ({
            invoiceNumber: item.invoiceNumber,
            receivableNumber: item.receivableNumber,
            description: item.description,
            dueDate: item.dueDate,
            pendingAmountVES: item.pendingAmount,
            pendingAmountUSD: item.pendingBaseUSD,
          })),
        });
        await openWhatsApp({ phone, text });
      } catch (err) {
        console.error("Error sending consolidated WhatsApp:", err);
        showAlert({
          title: "No se pudo enviar",
          message: err?.message || "No se pudo abrir WhatsApp",
          type: "error",
        });
      }
    },
    [showAlert],
  );

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

  const renderGroup = useCallback(
    ({ item }) => {
      const canSendWhatsapp = isValidWhatsAppPhone(item.customerPhone);

      return (
        <SurfaceCard style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <View style={styles.groupHeaderCopy}>
              <View style={styles.pillsRow}>
                <InfoPill
                  text={`${item.items.length} cuenta${item.items.length === 1 ? "" : "s"}`}
                  tone="info"
                />
                {item.documentNumber ? (
                  <InfoPill text={item.documentNumber} tone="neutral" />
                ) : null}
              </View>
              <Text style={styles.customerName}>{item.customerName}</Text>
              <Text style={styles.customerHint}>
                Total pendiente consolidado del cliente.
              </Text>
            </View>

            {canSendWhatsapp ? (
              <Pressable
                style={({ pressed }) => [
                  styles.whatsappButton,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => handleSendWhatsApp(item)}
              >
                <Ionicons name="logo-whatsapp" size={rf(20)} color="#25D366" />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Debe en total</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(item.totalPending, localCurrency)}
            </Text>
            {rateEnabled && item.totalPendingUSD > 0 ? (
              <Text style={styles.totalValueSecondary}>
                {formatCurrency(item.totalPendingUSD, referenceCurrency)}
              </Text>
            ) : null}
          </View>

          <View style={styles.detailsBlock}>
            {item.items.map((detail) => (
              <View key={`${item.key}-${detail.id}`} style={styles.detailRow}>
                <View style={styles.detailCopy}>
                  <Text style={styles.detailTitle}>
                    {detail.invoiceNumber
                      ? `Factura #${detail.invoiceNumber}`
                      : detail.receivableNumber || `Cuenta #${detail.id}`}
                  </Text>
                  <Text style={styles.detailMeta}>
                    {detail.description || "Sin descripción"}
                  </Text>
                  <Text style={styles.detailMeta}>
                    Vence: {formatShortDate(detail.dueDate)}
                  </Text>
                  <View style={styles.detailActions}>
                    {!detail.account?.invoiceNumber ? (
                      <Pressable
                        style={({ pressed }) => [
                          styles.detailActionButton,
                          styles.detailActionButtonSoft,
                          pressed && styles.cardPressed,
                        ]}
                        onPress={() => openEditScreen(detail.account)}
                      >
                        <Text style={styles.detailActionButtonText}>
                          Abrir cuenta
                        </Text>
                      </Pressable>
                    ) : null}

                    <Pressable
                      style={({ pressed }) => [
                        styles.detailActionButton,
                        styles.detailActionButtonPrimary,
                        pressed && styles.cardPressed,
                      ]}
                      onPress={() => openRecordPaymentScreen(detail.account)}
                    >
                      <Text
                        style={[
                          styles.detailActionButtonText,
                          styles.detailActionButtonTextPrimary,
                        ]}
                      >
                        Registrar pago
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.detailAmounts}>
                  <Text style={styles.detailPending}>
                    {formatCurrency(detail.pendingAmount, localCurrency)}
                  </Text>
                  {rateEnabled && detail.pendingAmountUSD > 0 ? (
                    <Text style={styles.detailPendingUsd}>
                      {formatCurrency(
                        detail.pendingAmountUSD,
                        referenceCurrency,
                      )}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </SurfaceCard>
      );
    },
    [
      handleSendWhatsApp,
      localCurrency,
      openEditScreen,
      openRecordPaymentScreen,
      rateEnabled,
      referenceCurrency,
    ],
  );

  const keyExtractor = useCallback((item) => item.key, []);

  const header = (
    <View style={styles.headerContent}>
      <SurfaceCard style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name="albums-outline"
              size={rf(22)}
              color={UI_COLORS.info}
            />
          </View>
          <View style={styles.summaryCopy}>
            <View style={styles.pillsRow}>
              <InfoPill
                text={`${consolidatedAccounts.length} clientes`}
                tone="info"
              />
              <InfoPill text="Por cobrar" tone="warning" />
            </View>
            <Text style={styles.summaryTitle}>Consolidado por cobrar</Text>
            <Text style={styles.summarySubtitle}>
              Busca por documento o identificación y revisa todas las cuentas
              pendientes del cliente en un solo lugar.
            </Text>
          </View>
        </View>

        <Text style={styles.summaryAmount}>
          {formatCurrency(globalTotalPending, localCurrency)}
        </Text>
        {rateEnabled ? (
          <Text style={styles.summaryAmountSecondary}>
            {formatCurrency(
              consolidatedAccounts.reduce(
                (sum, item) => sum + (Number(item.totalPendingUSD) || 0),
                0,
              ),
              referenceCurrency,
            )}
          </Text>
        ) : null}
      </SurfaceCard>

      <SurfaceCard style={styles.searchCard}>
        <Text style={styles.searchTitle}>Buscar cliente</Text>
        <Text style={styles.searchHint}>
          Usa documento, identificación, nombre o número de factura.
        </Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Documento o identificación del cliente"
          placeholderTextColor="#9aa6b5"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
      </SurfaceCard>

      {error ? (
        <SurfaceCard style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </SurfaceCard>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={UI_COLORS.info} />
        <Text style={styles.loadingText}>Preparando consolidado...</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <FlatList
          data={consolidatedAccounts}
          renderItem={renderGroup}
          keyExtractor={keyExtractor}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <EmptyStateCard
              title="No encontramos saldos pendientes"
              subtitle={
                query.trim()
                  ? "Prueba con otro documento o nombre del cliente."
                  : "Cuando existan cuentas por cobrar pendientes, aparecerán consolidadas aquí."
              }
              style={styles.emptyState}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, vs(18)) + vs(18) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
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
  listContent: {
    paddingHorizontal: hs(16),
    paddingTop: vs(14),
    gap: vs(12),
  },
  headerContent: {
    gap: vs(14),
    marginBottom: vs(6),
  },
  summaryCard: {
    gap: vs(16),
    ...SHADOWS.soft,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: hs(14),
  },
  summaryIcon: {
    width: s(48),
    height: s(48),
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    backgroundColor: UI_COLORS.infoSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCopy: {
    flex: 1,
    gap: vs(6),
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: hs(8),
  },
  summaryTitle: {
    fontSize: rf(20),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  summarySubtitle: {
    fontSize: rf(13),
    color: UI_COLORS.muted,
    lineHeight: vs(19),
  },
  summaryAmount: {
    fontSize: rf(28),
    fontWeight: "900",
    color: UI_COLORS.accentStrong,
  },
  summaryAmountSecondary: {
    fontSize: rf(14),
    fontWeight: "700",
    color: UI_COLORS.muted,
  },
  searchCard: {
    gap: vs(10),
    ...SHADOWS.soft,
  },
  searchTitle: {
    fontSize: rf(14),
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
    paddingHorizontal: hs(14),
    paddingVertical: vs(13),
    fontSize: rf(14),
    color: UI_COLORS.text,
  },
  groupCard: {
    gap: vs(14),
    ...SHADOWS.soft,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: hs(12),
  },
  groupHeaderCopy: {
    flex: 1,
    gap: vs(6),
  },
  customerName: {
    fontSize: rf(17),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  customerHint: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
  },
  whatsappButton: {
    width: s(42),
    height: s(42),
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    backgroundColor: "#eefaf1",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#d2f0da",
  },
  totalCard: {
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    paddingHorizontal: hs(14),
    paddingVertical: vs(14),
    gap: vs(4),
  },
  totalLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  totalValue: {
    fontSize: rf(24),
    fontWeight: "900",
    color: UI_COLORS.text,
  },
  totalValueSecondary: {
    fontSize: rf(13),
    fontWeight: "700",
    color: UI_COLORS.info,
  },
  detailsBlock: {
    gap: vs(10),
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: hs(12),
    paddingBottom: vs(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI_COLORS.border,
  },
  detailCopy: {
    flex: 1,
    gap: vs(3),
  },
  detailTitle: {
    fontSize: rf(14),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  detailMeta: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
    lineHeight: vs(17),
  },
  detailActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: hs(8),
    marginTop: vs(6),
  },
  detailActionButton: {
    borderRadius: borderRadius.sm,
    borderCurve: "continuous",
    paddingHorizontal: hs(10),
    paddingVertical: vs(8),
  },
  detailActionButtonSoft: {
    backgroundColor: UI_COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
  },
  detailActionButtonPrimary: {
    backgroundColor: UI_COLORS.infoSoft,
    borderWidth: 1,
    borderColor: "#cfe0ff",
  },
  detailActionButtonText: {
    fontSize: rf(11),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  detailActionButtonTextPrimary: {
    color: UI_COLORS.info,
  },
  detailAmounts: {
    alignItems: "flex-end",
    gap: vs(2),
    minWidth: hs(92),
  },
  detailPending: {
    fontSize: rf(13),
    fontWeight: "800",
    color: UI_COLORS.accentStrong,
    textAlign: "right",
  },
  detailPendingUsd: {
    fontSize: rf(11),
    fontWeight: "700",
    color: UI_COLORS.info,
    textAlign: "right",
  },
  errorCard: {
    backgroundColor: "#fdecea",
  },
  errorText: {
    color: "#b42318",
    fontSize: rf(13),
    fontWeight: "600",
  },
  emptyState: {
    marginTop: vs(8),
  },
  cardPressed: {
    opacity: 0.86,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: UI_COLORS.page,
    alignItems: "center",
    justifyContent: "center",
    gap: vs(12),
  },
  loadingText: {
    fontSize: rf(14),
    color: UI_COLORS.muted,
  },
});

export default ReceivableConsolidatedScreen;
