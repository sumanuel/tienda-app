import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useExchangeRate } from "../../contexts/ExchangeRateContext";
import { useCustomAlert } from "../../components/common/CustomAlert";
import { useSales } from "../../hooks/useSales";
import { useInventory } from "../../hooks/useInventory";
import { useCustomers } from "../../hooks/useCustomers";
import { useSuppliers } from "../../hooks/useSuppliers";
import { useAccounts } from "../../hooks/useAccounts";
import { getSettings } from "../../services/database/settings";
import { formatCurrency } from "../../utils/currency";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";
import RateDisplay from "../../components/exchange/RateDisplay";
import { useRateNotifications } from "../../contexts/RateNotificationsContext";

const DASHBOARD_COLORS = {
  page: "#f4f7fb",
  heroTop: "#1f7a59",
  heroBottom: "#2f9e71",
  surface: "#ffffff",
  surfaceAlt: "#f7faf8",
  border: "#d9e5dd",
  text: "#163126",
  muted: "#5f7268",
  accent: "#1f7a59",
  accentSoft: "#e8f5ef",
  accentStrong: "#0f5a3f",
  infoSoft: "#edf5ff",
  infoStrong: "#245fd1",
  warningSoft: "#fff4df",
  warningStrong: "#bb7a14",
  dangerSoft: "#ffe8e6",
  dangerStrong: "#cf4f43",
  shadow: "rgba(22, 49, 38, 0.12)",
};

/**
 * Pantalla principal del Dashboard
 */
const DashboardStatIcon = ({ name, backgroundColor, color }) => (
  <View style={[styles.statIconContainer, { backgroundColor }]}>
    <Ionicons name={name} size={rf(26)} color={color} />
  </View>
);

const DashboardAction = ({
  onPress,
  icon,
  title,
  subtitle,
  tone = "default",
}) => {
  const iconStyle =
    tone === "accent"
      ? styles.actionIconAccent
      : tone === "soft"
        ? styles.actionIconSoft
        : styles.actionIcon;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.actionIconBase, iconStyle]}>
        <Ionicons
          name={icon}
          size={rf(18)}
          color={DASHBOARD_COLORS.accentStrong}
        />
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={rf(18)}
        color={DASHBOARD_COLORS.muted}
      />
    </Pressable>
  );
};

const StatCard = ({
  onPress,
  icon,
  iconBackground,
  iconColor,
  label,
  value,
  helper,
  emphasis = "default",
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.statCard,
      emphasis === "accent" && styles.statCardAccent,
      pressed && styles.cardPressed,
    ]}
  >
    <View style={styles.statHeaderRow}>
      <DashboardStatIcon
        name={icon}
        backgroundColor={iconBackground}
        color={iconColor}
      />
      <Ionicons
        name="arrow-forward-outline"
        size={rf(16)}
        color={DASHBOARD_COLORS.muted}
      />
    </View>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
    {helper ? <Text style={styles.statHelper}>{helper}</Text> : null}
  </Pressable>
);

export const DashboardScreen = ({ navigation }) => {
  const { showAlert, CustomAlert } = useCustomAlert();
  const {
    rate,
    loading: rateLoading,
    lastUpdate,
    updateRate,
  } = useExchangeRate({ autoUpdate: false });
  const { todayStats, loading: salesLoading, loadTodayStats } = useSales();
  const {
    stats: inventoryStats,
    loading: inventoryLoading,
    refresh: refreshInventory,
  } = useInventory();
  const { customers, loading: customersLoading } = useCustomers();
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const {
    receivableStats,
    payableStats,
    loading: accountsLoading,
    refresh: refreshAccounts,
  } = useAccounts();
  const [refreshing, setRefreshing] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const { count: notificationCount, refreshCount: refreshNotificationsCount } =
    useRateNotifications();

  const requireExchangeRate = (contextMessage) => {
    if (!rate || rate <= 0) {
      showAlert({
        title: "Tasa de cambio requerida",
        message: `Debe configurar una tasa de cambio válida antes de ${contextMessage}. Ve a la sección de Tasa de Cambio.`,
        type: "error",
        buttons: [
          {
            text: "OK",
            onPress: () => navigation.navigate("ExchangeRate"),
          },
        ],
      });
      return false;
    }
    return true;
  };

  // Cargar nombre del negocio
  useEffect(() => {
    const loadBusinessInfo = async () => {
      const settings = await getSettings();
      setBusinessName(settings.business?.name || "Mi Negocio");
    };
    loadBusinessInfo();
  }, []);

  // Recargar estadísticas cuando cambie el tipo de cambio
  useEffect(() => {
    if (rate) {
      loadTodayStats();
    }
  }, [rate, loadTodayStats]);

  // Listener para cuando se vuelve a la pantalla (recargar inventario y cuentas)
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      refreshInventory();
      refreshAccounts();
      refreshNotificationsCount();
    });

    return unsubscribe;
  }, [navigation, refreshInventory, refreshAccounts]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await updateRate("BCV");
      await refreshInventory();
      await loadTodayStats();
      await refreshAccounts();
    } catch (error) {
      console.error("Error refreshing:", error);
    }
    setRefreshing(false);
  };

  const formatDate = () => {
    const now = new Date();
    const options = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };
    return now.toLocaleString("es-VE", options);
  };

  const balanceDateLabel = new Date().toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const exchangeRateLabel = rate ? `${rate.toFixed(2)} VES` : "Pendiente";
  const exchangeRateHelper = rateLoading
    ? "Actualizando referencia"
    : lastUpdate
      ? `Actualizada ${new Date(lastUpdate).toLocaleDateString("es-VE")}`
      : "Configura la tasa para vender";

  const pendingReceivable = formatCurrency(
    receivableStats?.pending || 0,
    "VES",
  );
  const pendingPayable = formatCurrency(payableStats?.pending || 0, "VES");
  const inventorySummary = `${inventoryStats?.totalProducts || 0} productos`;
  const salesSummary = `${todayStats?.count || 0} ${
    todayStats?.count === 1 ? "venta" : "ventas"
  } hoy`;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.headerEyebrow}>Panel de control</Text>
              <Text style={styles.businessName}>{businessName}</Text>
              <Text style={styles.lastSession}>
                Última sesión: {formatDate()}
              </Text>
            </View>

            <View style={styles.headerActionsStack}>
              <Pressable
                style={({ pressed }) => [
                  styles.iconPill,
                  pressed && styles.iconPillPressed,
                ]}
                onPress={() => navigation.navigate("RateNotifications")}
              >
                <Ionicons
                  name="notifications-outline"
                  size={rf(18)}
                  color="#ffffff"
                />
                {(notificationCount || 0) > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {(notificationCount || 0) > 99
                        ? "99+"
                        : notificationCount}
                    </Text>
                  </View>
                )}
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.iconPill,
                  pressed && styles.iconPillPressed,
                ]}
                onPress={() => {
                  if (global.resetOnboarding) {
                    global.resetOnboarding();
                  }
                }}
              >
                <Ionicons
                  name="help-circle-outline"
                  size={rf(18)}
                  color="#ffffff"
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.currencyButtons}>
            <View style={styles.currencyButtonActive}>
              <Text style={styles.currencyButtonTextActive}>
                Operando en VES
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.currencyButton,
                pressed && styles.iconPillPressed,
              ]}
              onPress={() => navigation.navigate("ExchangeRate")}
            >
              <Text style={styles.currencyButtonText}>
                Ver tasa y referencia
              </Text>
            </Pressable>
          </View>

          <View style={styles.heroPanel}>
            <View style={styles.heroRateBlock}>
              <Text style={styles.heroLabel}>Tasa activa</Text>
              <Text style={styles.heroRateValue}>{exchangeRateLabel}</Text>
              <Text style={styles.heroHelper}>{exchangeRateHelper}</Text>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroSummaryList}>
              <View style={styles.heroSummaryItem}>
                <Text style={styles.heroSummaryValue}>{salesSummary}</Text>
                <Text style={styles.heroSummaryLabel}>Movimiento del día</Text>
              </View>
              <View style={styles.heroSummaryItem}>
                <Text style={styles.heroSummaryValue}>{inventorySummary}</Text>
                <Text style={styles.heroSummaryLabel}>
                  Inventario registrado
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.mainCard}>
          <View style={styles.mainCardHeader}>
            <View>
              <Text style={styles.mainCardTitle}>Balance del Día</Text>
              <Text style={styles.accountNumber}>
                Ventas del {balanceDateLabel}
              </Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate("Sales")}
              style={({ pressed }) => [
                styles.roundIconButton,
                pressed && styles.cardPressed,
              ]}
            >
              <Ionicons
                name="bar-chart-outline"
                size={iconSize.lg}
                color={DASHBOARD_COLORS.infoStrong}
              />
            </Pressable>
          </View>

          <View style={styles.balanceSection}>
            <Text style={styles.balanceLabel}>TOTAL VENDIDO</Text>
            <Text style={styles.balanceAmount}>
              {formatCurrency(todayStats?.total || 0, "VES")}
            </Text>
            <Text style={styles.salesCount}>
              {todayStats?.count || 0}{" "}
              {todayStats?.count === 1
                ? "venta realizada"
                : "ventas realizadas"}
            </Text>
          </View>

          <View style={styles.balanceHighlights}>
            <View style={styles.highlightPill}>
              <Text style={styles.highlightPillLabel}>Clientes</Text>
              <Text style={styles.highlightPillValue}>
                {customers?.length || 0}
              </Text>
            </View>
            <View style={styles.highlightPill}>
              <Text style={styles.highlightPillLabel}>Proveedores</Text>
              <Text style={styles.highlightPillValue}>
                {suppliers?.length || 0}
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.viewDetailsButton,
              pressed && styles.viewDetailsButtonPressed,
            ]}
            onPress={() => navigation.navigate("Sales")}
          >
            <Text style={styles.viewDetailsButtonText}>
              Ver historial completo
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Accesos clave</Text>
          <Text style={styles.sectionSubtitle}>
            Tareas frecuentes para operar la tienda con menos pasos.
          </Text>
        </View>

        <View style={styles.actionsColumn}>
          <DashboardAction
            icon="cart-outline"
            title="Registrar nueva venta"
            subtitle="Abre el punto de venta con la tasa activa"
            tone="accent"
            onPress={() => {
              if (!requireExchangeRate("realizar ventas")) return;
              navigation.navigate("POS");
            }}
          />
          <DashboardAction
            icon="cube-outline"
            title="Revisar inventario"
            subtitle="Consulta stock, entradas y movimientos recientes"
            tone="soft"
            onPress={() => {
              if (!requireExchangeRate("consultar inventario")) return;
              navigation.navigate("InventoryMovements");
            }}
          />
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Resumen operativo</Text>
          <Text style={styles.sectionSubtitle}>
            Indicadores claros para ventas, cuentas y control comercial.
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              icon="swap-horizontal-outline"
              iconBackground={DASHBOARD_COLORS.infoSoft}
              iconColor={DASHBOARD_COLORS.infoStrong}
              label="Tasa de cambio"
              value={exchangeRateLabel}
              helper={exchangeRateHelper}
              emphasis="accent"
              onPress={() => navigation.navigate("ExchangeRate")}
            />

            <StatCard
              icon="cart-outline"
              iconBackground={DASHBOARD_COLORS.accentSoft}
              iconColor={DASHBOARD_COLORS.accent}
              label="Nueva venta"
              value="Iniciar ahora"
              helper="Acceso directo al punto de venta"
              onPress={() => {
                if (!requireExchangeRate("realizar ventas")) return;
                navigation.navigate("POS");
              }}
            />
          </View>

          <View style={styles.statsRow}>
            <StatCard
              icon="cash-outline"
              iconBackground={DASHBOARD_COLORS.accentSoft}
              iconColor={DASHBOARD_COLORS.accent}
              label="Por cobrar"
              value={pendingReceivable}
              helper={
                (receivableStats?.overdue || 0) > 0
                  ? `${(receivableStats?.overdue || 0).toFixed(2)} vencidas`
                  : "Sin vencimientos críticos"
              }
              onPress={() => {
                if (!requireExchangeRate("gestionar cuentas por cobrar"))
                  return;
                navigation.navigate("AccountsReceivable");
              }}
            />

            <StatCard
              icon="card-outline"
              iconBackground={DASHBOARD_COLORS.dangerSoft}
              iconColor={DASHBOARD_COLORS.dangerStrong}
              label="Por pagar"
              value={pendingPayable}
              helper={
                (payableStats?.overdue || 0) > 0
                  ? `${(payableStats?.overdue || 0).toFixed(2)} vencidas`
                  : "Pagos al día"
              }
              onPress={() => {
                if (!requireExchangeRate("gestionar cuentas por pagar")) return;
                navigation.navigate("AccountsPayable");
              }}
            />
          </View>

          <View style={styles.statsRow}>
            <StatCard
              icon="cube-outline"
              iconBackground={DASHBOARD_COLORS.warningSoft}
              iconColor={DASHBOARD_COLORS.warningStrong}
              label="Movimientos de inventario"
              value="Ver actividad"
              helper="Entradas, salidas y ajustes recientes"
              onPress={() => {
                if (
                  !requireExchangeRate("consultar movimientos de inventario")
                ) {
                  return;
                }
                navigation.navigate("InventoryMovements");
              }}
            />

            <StatCard
              icon="people-outline"
              iconBackground={DASHBOARD_COLORS.surfaceAlt}
              iconColor={DASHBOARD_COLORS.accentStrong}
              label="Red comercial"
              value={`${customers?.length || 0} clientes`}
              helper={`${suppliers?.length || 0} proveedores registrados`}
              onPress={() => navigation.navigate("Customers")}
            />
          </View>
        </View>
      </ScrollView>
      <CustomAlert />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DASHBOARD_COLORS.page,
  },
  scrollContent: {
    paddingBottom: vs(120),
    gap: vs(18),
  },
  header: {
    backgroundColor: DASHBOARD_COLORS.heroTop,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    borderCurve: "continuous",
    padding: spacing.lg,
    paddingTop: vs(50),
    paddingBottom: vs(24),
    gap: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: s(18),
    elevation: 4,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerTextBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  headerEyebrow: {
    fontSize: rf(12),
    color: "rgba(255, 255, 255, 0.72)",
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  businessName: {
    fontSize: rf(24),
    fontWeight: "800",
    color: "#ffffff",
  },
  lastSession: {
    fontSize: rf(12),
    color: "rgba(255, 255, 255, 0.86)",
  },
  headerActionsStack: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  currencyButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: hs(10),
    alignItems: "center",
  },
  currencyButtonActive: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    paddingVertical: vs(8),
    paddingHorizontal: hs(16),
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
  },
  currencyButtonTextActive: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: rf(13),
  },
  currencyButton: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: vs(8),
    paddingHorizontal: hs(16),
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderCurve: "continuous",
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  currencyButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: rf(13),
  },
  iconPill: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    width: s(42),
    height: s(42),
    borderRadius: s(21),
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconPillPressed: {
    opacity: 0.82,
  },
  badge: {
    position: "absolute",
    top: vs(-6),
    right: hs(-6),
    minWidth: hs(18),
    height: vs(18),
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    paddingHorizontal: hs(5),
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: DASHBOARD_COLORS.accent,
    fontSize: rf(10),
    fontWeight: "800",
  },
  heroPanel: {
    backgroundColor: "#ffffff",
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: DASHBOARD_COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: s(22),
    elevation: 5,
  },
  heroRateBlock: {
    gap: spacing.xs,
  },
  heroLabel: {
    fontSize: rf(12),
    color: DASHBOARD_COLORS.muted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroRateValue: {
    fontSize: rf(28),
    fontWeight: "800",
    color: DASHBOARD_COLORS.text,
  },
  heroHelper: {
    fontSize: rf(12),
    color: DASHBOARD_COLORS.muted,
  },
  heroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DASHBOARD_COLORS.border,
  },
  heroSummaryList: {
    flexDirection: "row",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  heroSummaryItem: {
    flex: 1,
    minWidth: hs(120),
    backgroundColor: DASHBOARD_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    padding: spacing.md,
    gap: spacing.xs,
  },
  heroSummaryValue: {
    fontSize: rf(15),
    fontWeight: "700",
    color: DASHBOARD_COLORS.text,
  },
  heroSummaryLabel: {
    fontSize: rf(12),
    color: DASHBOARD_COLORS.muted,
  },
  mainCard: {
    backgroundColor: DASHBOARD_COLORS.surface,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    margin: spacing.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    shadowColor: DASHBOARD_COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: s(22),
    elevation: 5,
  },
  mainCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  mainCardTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: DASHBOARD_COLORS.text,
  },
  accountNumber: {
    fontSize: rf(12),
    color: DASHBOARD_COLORS.muted,
    marginTop: vs(4),
  },
  roundIconButton: {
    width: s(48),
    height: s(48),
    borderRadius: s(24),
    borderCurve: "continuous",
    backgroundColor: DASHBOARD_COLORS.infoSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceSection: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    backgroundColor: DASHBOARD_COLORS.surfaceAlt,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    gap: spacing.xs,
  },
  balanceLabel: {
    fontSize: rf(11),
    fontWeight: "600",
    color: DASHBOARD_COLORS.muted,
    letterSpacing: 1,
  },
  balanceAmount: {
    fontSize: rf(36),
    fontWeight: "800",
    color: DASHBOARD_COLORS.text,
  },
  salesCount: {
    fontSize: rf(13),
    color: DASHBOARD_COLORS.muted,
  },
  balanceHighlights: {
    flexDirection: "row",
    gap: spacing.md,
  },
  highlightPill: {
    flex: 1,
    backgroundColor: DASHBOARD_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    padding: spacing.md,
    gap: spacing.xs,
  },
  highlightPillLabel: {
    fontSize: rf(12),
    color: DASHBOARD_COLORS.muted,
    fontWeight: "600",
  },
  highlightPillValue: {
    fontSize: rf(20),
    color: DASHBOARD_COLORS.text,
    fontWeight: "800",
  },
  viewDetailsButton: {
    backgroundColor: DASHBOARD_COLORS.accent,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    alignItems: "center",
  },
  viewDetailsButtonPressed: {
    opacity: 0.88,
  },
  viewDetailsButtonText: {
    fontSize: rf(13),
    fontWeight: "700",
    color: "#ffffff",
  },
  sectionHeading: {
    paddingHorizontal: hs(16),
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: DASHBOARD_COLORS.text,
  },
  sectionSubtitle: {
    fontSize: rf(12),
    color: DASHBOARD_COLORS.muted,
  },
  actionsColumn: {
    paddingHorizontal: hs(16),
    gap: spacing.md,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: DASHBOARD_COLORS.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    shadowColor: DASHBOARD_COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: s(18),
    elevation: 4,
  },
  actionIconBase: {
    width: s(46),
    height: s(46),
    borderRadius: s(23),
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  actionIcon: {
    backgroundColor: DASHBOARD_COLORS.surfaceAlt,
  },
  actionIconAccent: {
    backgroundColor: DASHBOARD_COLORS.accentSoft,
  },
  actionIconSoft: {
    backgroundColor: DASHBOARD_COLORS.warningSoft,
  },
  actionContent: {
    flex: 1,
    gap: spacing.xs,
  },
  actionTitle: {
    fontSize: rf(15),
    fontWeight: "700",
    color: DASHBOARD_COLORS.text,
  },
  actionSubtitle: {
    fontSize: rf(12),
    color: DASHBOARD_COLORS.muted,
  },
  statsGrid: {
    flexDirection: "column",
    gap: vs(16),
    paddingHorizontal: hs(16),
    marginBottom: vs(8),
  },
  statsRow: {
    flexDirection: "row",
    gap: hs(16),
  },
  statCard: {
    flex: 1,
    backgroundColor: DASHBOARD_COLORS.surface,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: DASHBOARD_COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: s(18),
    elevation: 4,
  },
  statCardAccent: {
    borderWidth: 1,
    borderColor: DASHBOARD_COLORS.border,
  },
  statHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statIconContainer: {
    width: s(54),
    height: s(54),
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    fontSize: rf(12),
    color: DASHBOARD_COLORS.muted,
    fontWeight: "600",
  },
  statValue: {
    fontSize: rf(18),
    fontWeight: "800",
    color: DASHBOARD_COLORS.text,
  },
  statHelper: {
    fontSize: rf(11),
    color: DASHBOARD_COLORS.muted,
    lineHeight: rf(16),
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});

export default DashboardScreen;
