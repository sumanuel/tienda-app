import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { TourGuideProvider } from "rn-tourguide";
import TourTooltip from "./src/components/tour/TourTooltip";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  ActivityIndicator,
  AppState,
  Platform,
  StatusBar as RNStatusBar,
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";

// Context
import { ExchangeRateProvider } from "./src/contexts/ExchangeRateContext";
import { RateNotificationsProvider } from "./src/contexts/RateNotificationsContext";

// Hooks and Utils
import { useExchangeRate } from "./src/contexts/ExchangeRateContext";
import { useCustomAlert } from "./src/components/common/CustomAlert";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "./src/utils/responsive";

// Screens
import DashboardScreen from "./src/screens/main/DashboardScreen";
import POSScreen from "./src/screens/main/POSScreen";
import ProductsScreen from "./src/screens/main/ProductsScreen";
import SalesScreen from "./src/screens/main/SalesScreen";
import CancelledSalesScreen from "./src/screens/main/CancelledSalesScreen";
import SaleDetailScreen from "./src/screens/main/SaleDetailScreen";
import ExchangeRateScreen from "./src/screens/main/ExchangeRateScreen";
import SettingsScreen from "./src/screens/main/SettingsScreen";
import AddProductScreen from "./src/screens/main/AddProductScreen";
import EditProductScreen from "./src/screens/main/EditProductScreen";
import { CustomersScreen } from "./src/screens/main/CustomersScreen";
import { SuppliersScreen } from "./src/screens/main/SuppliersScreen";
import { AddCustomerScreen } from "./src/screens/main/AddCustomerScreen";
import { EditCustomerScreen } from "./src/screens/main/EditCustomerScreen";
import { AddSupplierScreen } from "./src/screens/main/AddSupplierScreen";
import { EditSupplierScreen } from "./src/screens/main/EditSupplierScreen";
import AccountsReceivableScreen from "./src/screens/main/AccountsReceivableScreen";
import AddAccountReceivableScreen from "./src/screens/main/AddAccountReceivableScreen";
import EditAccountReceivableScreen from "./src/screens/main/EditAccountReceivableScreen";
import { RecordPaymentScreen } from "./src/screens/main/RecordPaymentScreen";
import { PaymentHistoryScreen } from "./src/screens/main/PaymentHistoryScreen";
import { RecordPaymentPayableScreen } from "./src/screens/main/RecordPaymentPayableScreen";
import { PaymentHistoryPayableScreen } from "./src/screens/main/PaymentHistoryPayableScreen";
import AccountsPayableScreen from "./src/screens/main/AccountsPayableScreen";
import AddAccountPayableScreen from "./src/screens/main/AddAccountPayableScreen";
import EditAccountPayableScreen from "./src/screens/main/EditAccountPayableScreen";
import CapitalScreen from "./src/screens/main/CapitalScreen";
import BusinessSettingsScreen from "./src/screens/main/BusinessSettingsScreen";
import PricingSettingsScreen from "./src/screens/main/PricingSettingsScreen";
import QRProductsScreen from "./src/screens/main/QRProductsScreen";
import InventoryEntryScreen from "./src/screens/main/InventoryEntryScreen";
import InventoryEntryDetailScreen from "./src/screens/main/InventoryEntryDetailScreen";
import AddInventoryEntryScreen from "./src/screens/main/AddInventoryEntryScreen";
import InventoryExitScreen from "./src/screens/main/InventoryExitScreen";
import InventoryExitDetailScreen from "./src/screens/main/InventoryExitDetailScreen";
import AddInventoryExitScreen from "./src/screens/main/AddInventoryExitScreen";
import InventoryMovementsScreen from "./src/screens/main/InventoryMovementsScreen";
import InventoryMovementsDetailScreen from "./src/screens/main/InventoryMovementsDetailScreen";
import AboutScreen from "./src/screens/main/AboutScreen";
import OnboardingScreen from "./src/screens/main/OnboardingScreen";
import MobilePaymentsScreen from "./src/screens/main/MobilePaymentsScreen";
import RateNotificationsScreen from "./src/screens/main/RateNotificationsScreen";
import DailyExternalRatePrompt from "./src/components/exchange/DailyExternalRatePrompt";
import StoreUpdatePrompt from "./src/components/storeUpdate/StoreUpdatePrompt";

// Database initialization
import { initAllTables } from "./src/services/database/db";
import {
  getSettings,
  initSettingsTable,
  saveSettings,
} from "./src/services/database/settings";
import { registerDailyRateBackgroundTask } from "./src/services/exchange/dailyRateBackgroundTask";
import { getCurrentRate } from "./src/services/exchange/rateService";
// import { initSampleProducts } from "./src/services/database/products";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const navigationRef = createNavigationContainerRef();

/**
 * Tabs de navegación principal
 */
function MainTabs() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [showAccountsMenu, setShowAccountsMenu] = useState(false);
  const [showFichaMenu, setShowFichaMenu] = useState(false);
  const hasPushedExchangeRateRef = useRef(false);

  const isTablet = Math.min(width, height) >= 600;
  const tabIconFontSize = isTablet ? rf(32) : rf(22);
  const tabIconLineHeight = isTablet ? rf(34) : rf(24);
  const tabLabelFontSize = isTablet ? rf(15) : rf(12);
  const tabIconContainerHeight = isTablet ? 60 : 28;
  const tabIconContainerWidth = isTablet ? 60 : 28;
  const bottomOffset = insets.bottom + (isTablet ? 130 : 15);
  // NOTE: insets are already in pixels; don't scale them with vs().
  // Also avoid scaling tab bar height too much on tablets (creates large blank space).
  // On some Android tablets, `insets.bottom` can be small/0 even with system buttons.
  // Keep a sensible minimum padding for the system navigation area.
  const tabBarBottomPadding = Math.max(insets.bottom, isTablet ? 24 : 6);
  const tabBarHeight = (isTablet ? 96 : 62) + tabBarBottomPadding;

  // Hooks para validaciones
  const { rate: exchangeRate, loading: rateLoading } = useExchangeRate();
  const { showAlert, CustomAlert } = useCustomAlert();

  // Si no hay tasa (primera vez o falta valor), forzar configuración.
  useEffect(() => {
    if (rateLoading) return;

    const missingRate = !exchangeRate || exchangeRate <= 0;

    if (!missingRate) {
      hasPushedExchangeRateRef.current = false;
      return;
    }

    if (hasPushedExchangeRateRef.current) return;
    if (!navigationRef.isReady()) return;

    hasPushedExchangeRateRef.current = true;
    navigationRef.navigate("ExchangeRate");
  }, [exchangeRate, rateLoading]);

  const handleNavigate = (routeName) => {
    setShowAccountsMenu(false);
    setShowFichaMenu(false);
    if (navigationRef.isReady()) {
      navigationRef.navigate(routeName);
    }
  };

  // Validar tasa de cambio antes de mostrar menú de cuentas (POS)
  const handleAccountsTabPress = (e) => {
    e.preventDefault();
    if (!exchangeRate || exchangeRate <= 0) {
      showAlert({
        title: "Tasa de cambio requerida",
        message:
          "Debe configurar una tasa de cambio válida antes de realizar ventas. Ve a la sección de Tasa de Cambio.",
        type: "error",
        buttons: [
          {
            text: "OK",
            onPress: () => handleNavigate("ExchangeRate"),
          },
        ],
      });
      return;
    }
    setShowAccountsMenu(true);
    setShowFichaMenu(false);
  };

  // Validar tasa de cambio antes de navegar a Productos
  const handleProductsPress = () => {
    if (!exchangeRate || exchangeRate <= 0) {
      showAlert({
        title: "Tasa de cambio requerida",
        message:
          "Debe configurar una tasa de cambio válida antes de gestionar productos. Ve a la sección de Tasa de Cambio.",
        type: "error",
        buttons: [
          {
            text: "OK",
            onPress: () => handleNavigate("ExchangeRate"),
          },
        ],
      });
      return;
    }
    handleNavigate("Products");
  };

  // Validar tasa de cambio antes de navegar a QR de productos
  const handleQRPress = () => {
    if (!exchangeRate || exchangeRate <= 0) {
      showAlert({
        title: "Tasa de cambio requerida",
        message:
          "Debe configurar una tasa de cambio válida antes de generar códigos QR. Ve a la sección de Tasa de Cambio.",
        type: "error",
        buttons: [
          {
            text: "OK",
            onPress: () => handleNavigate("ExchangeRate"),
          },
        ],
      });
      return;
    }
    handleNavigate("QRProducts");
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: "#4CAF50",
          tabBarInactiveTintColor: "#999",
          tabBarStyle: {
            paddingBottom: tabBarBottomPadding,
            height: tabBarHeight,
            paddingTop: isTablet ? 10 : 6,
          },
          tabBarLabelPosition: "below-icon",
          tabBarLabelStyle: {
            fontSize: tabLabelFontSize,
            fontWeight: "600",
            includeFontPadding: false,
            marginTop: isTablet ? 2 : 0,
          },
          tabBarIconStyle: {
            height: tabIconContainerHeight,
            justifyContent: "center",
            alignItems: "center",
          },
          tabBarItemStyle: {
            paddingVertical: isTablet ? 8 : 4,
            justifyContent: "center",
            alignItems: "center",
          },
          headerShown: true,
          headerStyle: {
            backgroundColor: "#4CAF50",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
            fontSize: rf(18),
          },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarLabel: "Inicio",
            tabBarIcon: ({ color }) => (
              <View
                style={{
                  height: tabIconContainerHeight,
                  justifyContent: "center",
                  alignItems: "center",
                  width: tabIconContainerWidth,
                }}
              >
                <Text
                  style={{
                    fontSize: tabIconFontSize,
                    lineHeight: tabIconLineHeight,
                    includeFontPadding: false,
                    color,
                  }}
                >
                  🏠
                </Text>
              </View>
            ),
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="POS"
          component={POSScreen}
          options={({ navigation }) => ({
            tabBarLabel: "Cuentas",
            tabBarIcon: ({ color }) => (
              <View
                style={{
                  height: tabIconContainerHeight,
                  justifyContent: "center",
                  alignItems: "center",
                  width: tabIconContainerWidth,
                }}
              >
                <Text
                  style={{
                    fontSize: tabIconFontSize,
                    lineHeight: tabIconLineHeight,
                    includeFontPadding: false,
                    color,
                  }}
                >
                  💼
                </Text>
              </View>
            ),
            title: "Punto de venta",
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => {
                  setShowAccountsMenu(false);
                  setShowFichaMenu(false);
                  navigation.navigate("Dashboard");
                }}
                style={{ paddingHorizontal: hs(14), paddingVertical: vs(6) }}
                accessibilityRole="button"
                accessibilityLabel="Volver"
              >
                <Text style={{ color: "#fff", fontSize: rf(22) }}>←</Text>
              </TouchableOpacity>
            ),
          })}
          listeners={{
            tabPress: handleAccountsTabPress,
          }}
        />
        <Tab.Screen
          name="Sales"
          component={SalesScreen}
          options={({ navigation }) => ({
            tabBarLabel: "Ficha",
            tabBarIcon: ({ color }) => (
              <View
                style={{
                  height: tabIconContainerHeight,
                  justifyContent: "center",
                  alignItems: "center",
                  width: tabIconContainerWidth,
                }}
              >
                <Text
                  style={{
                    fontSize: tabIconFontSize,
                    lineHeight: tabIconLineHeight,
                    includeFontPadding: false,
                    color,
                  }}
                >
                  📂
                </Text>
              </View>
            ),
            title: "Historial de ventas",
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => {
                  setShowAccountsMenu(false);
                  setShowFichaMenu(false);
                  navigation.navigate("Dashboard");
                }}
                style={{ paddingHorizontal: hs(14), paddingVertical: vs(6) }}
                accessibilityRole="button"
                accessibilityLabel="Volver"
              >
                <Text style={{ color: "#fff", fontSize: rf(22) }}>←</Text>
              </TouchableOpacity>
            ),
          })}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setShowFichaMenu(true);
              setShowAccountsMenu(false);
            },
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: "Ajustes",
            tabBarIcon: ({ color }) => (
              <View
                style={{
                  height: tabIconContainerHeight,
                  justifyContent: "center",
                  alignItems: "center",
                  width: tabIconContainerWidth,
                }}
              >
                <Text
                  style={{
                    fontSize: tabIconFontSize,
                    lineHeight: tabIconLineHeight,
                    includeFontPadding: false,
                    color,
                  }}
                >
                  ⚙️
                </Text>
              </View>
            ),
            title: "Configuraciones",
          }}
        />
      </Tab.Navigator>

      <QuickActionMenu
        visible={showAccountsMenu}
        onClose={() => setShowAccountsMenu(false)}
        bottomOffset={bottomOffset}
        tabPosition="accounts"
        items={[
          {
            key: "accountsReceivable",
            icon: "📈",
            label: "Cuentas por Cobrar",
            onPress: () => handleNavigate("AccountsReceivable"),
          },
          {
            key: "accountsPayable",
            icon: "📉",
            label: "Cuentas por Pagar",
            onPress: () => handleNavigate("AccountsPayable"),
          },
          {
            key: "capital",
            icon: "🏦",
            label: "Capital",
            onPress: () => handleNavigate("Capital"),
          },
        ]}
      />

      <QuickActionMenu
        visible={showFichaMenu}
        onClose={() => setShowFichaMenu(false)}
        bottomOffset={bottomOffset}
        tabPosition="ficha"
        menuWidth="60%"
        items={[
          {
            key: "products",
            icon: "📦",
            label: "Productos",
            onPress: handleProductsPress,
          },
          {
            key: "qr",
            icon: "📱",
            label: "QR",
            onPress: handleQRPress,
          },
          {
            key: "mobilePayments",
            icon: "📲",
            label: "Pago movil",
            onPress: () => handleNavigate("MobilePayments"),
          },
          {
            key: "suppliers",
            icon: "🏢",
            label: "Proveedores",
            onPress: () => handleNavigate("Suppliers"),
          },
          {
            key: "customers",
            icon: "👥",
            label: "Clientes",
            onPress: () => handleNavigate("Customers"),
          },
          {
            key: "cancelledSales",
            icon: "🚫",
            label: "Anuladas",
            onPress: () => handleNavigate("CancelledSales"),
          },
        ]}
      />
      <CustomAlert />
    </>
  );
}

const QuickActionMenu = ({
  visible,
  onClose,
  items,
  bottomOffset,
  tabPosition,
  menuWidth = "70%",
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={tabStyles.modalContainer}>
      <TouchableOpacity
        style={tabStyles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View
        style={[
          tabStyles.menuWrapper,
          {
            marginBottom: bottomOffset,
            marginLeft:
              tabPosition === "accounts"
                ? "5%"
                : tabPosition === "ficha"
                  ? "45%"
                  : 0,
            width: menuWidth,
          },
        ]}
      >
        <View style={tabStyles.menuCard}>
          {items.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              style={[tabStyles.menuItem, index > 0 && tabStyles.menuDivider]}
              activeOpacity={0.85}
              onPress={item.onPress}
            >
              <View style={tabStyles.menuIcon}>
                <Text style={tabStyles.menuIconText}>{item.icon}</Text>
              </View>
              <Text style={tabStyles.menuLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  </Modal>
);

const tabStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  menuWrapper: {
    paddingHorizontal: 24,
    alignItems: "center",
    alignItems: "center",
  },
  menuCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.12,
    shadowRadius: s(14),
    elevation: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  menuDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5eaf0",
  },
  menuIcon: {
    width: iconSize.md,
    height: iconSize.md,
    borderRadius: borderRadius.sm,
    backgroundColor: "#ecf4ef",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  menuIconText: {
    fontSize: rf(16),
  },
  menuLabel: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "#2f3a4c",
  },
});

/**
 * Componente principal de la aplicación
 */
export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingInitialStep, setOnboardingInitialStep] = useState("slides");

  const applyImmersiveMode = useCallback(async () => {
    try {
      // Ocultar status bar en ambas plataformas.
      RNStatusBar.setHidden(true, "fade");
      if (Platform.OS === "android") {
        RNStatusBar.setTranslucent(true);
        RNStatusBar.setBackgroundColor("transparent", true);
      }

      if (Platform.OS !== "android") return;

      // Oculta la barra de navegación y permite que reaparezca temporalmente con swipe.
      await NavigationBar.setBehaviorAsync("overlay-swipe");
      await NavigationBar.setPositionAsync("absolute");
      await NavigationBar.setBackgroundColorAsync("#00000000");
      await NavigationBar.setVisibilityAsync("hidden");
    } catch (error) {
      console.warn("Immersive mode setup failed:", error);
    }
  }, []);

  useEffect(() => {
    applyImmersiveMode();

    // Algunos dispositivos vuelven a mostrar la barra al regresar a foreground.
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        applyImmersiveMode();
      }
    });

    return () => sub.remove();
  }, [applyImmersiveMode]);

  useEffect(() => {
    initializeApp();
  }, []);

  /**
   * Resetea el onboarding para mostrarlo nuevamente
   */
  const resetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem("onboardingCompleted");
      await AsyncStorage.removeItem("onboardingSlidesSeen");
      setShowOnboarding(true);
      setOnboardingInitialStep("slides");
    } catch (error) {
      console.error("Error resetting onboarding:", error);
    }
  };

  // Hacer la función disponible globalmente para que pueda ser llamada desde otras pantallas
  useEffect(() => {
    global.resetOnboarding = resetOnboarding;
  }, []);

  /**
   * Inicializa la aplicación y la base de datos
   */
  const initializeApp = async () => {
    try {
      // Inicializar todas las tablas en una sola transacción
      await initAllTables();

      // Inicializar settings con valores por defecto
      await initSettingsTable();

      // Verificar si el usuario ya completó el onboarding y si ya vio las slides
      const [onboardingCompleted, onboardingSlidesSeen] = await Promise.all([
        AsyncStorage.getItem("onboardingCompleted"),
        AsyncStorage.getItem("onboardingSlidesSeen"),
      ]);

      // Si aún no llenó datos del negocio, pedirlos al entrar.
      let isBusinessConfigured = false;
      let inferredBusinessConfigured = false;
      let hasRate = false;
      try {
        const [currentSettings, currentRate] = await Promise.all([
          getSettings(),
          getCurrentRate(),
        ]);

        const business = currentSettings?.business || {};
        const name = String(business?.name || "").trim();
        const nameIsDefault = name.toLowerCase() === "mi tienda";
        const hasAnyExtraData = [
          business?.rif,
          business?.address,
          business?.phone,
          business?.email,
        ].some((v) => String(v || "").trim().length > 0);

        inferredBusinessConfigured =
          (name && !nameIsDefault) || Boolean(hasAnyExtraData);
        isBusinessConfigured =
          Boolean(business?.isConfigured) || inferredBusinessConfigured;

        hasRate = Boolean(currentRate?.rate && currentRate.rate > 0);

        // Migración automática: si inferimos que está configurado, persistir el flag.
        if (!business?.isConfigured && inferredBusinessConfigured) {
          await saveSettings({
            ...currentSettings,
            business: {
              ...business,
              isConfigured: true,
            },
          });
        }
      } catch (error) {
        console.warn("Error loading settings for onboarding check:", error);
      }

      const needsBusinessSetup = !isBusinessConfigured;

      // Si el usuario ya tiene negocio configurado y una tasa guardada,
      // consideramos onboarding completo (migración para usuarios antiguos).
      const inferredOnboardingCompleted =
        !needsBusinessSetup && Boolean(hasRate);

      if (!onboardingCompleted && inferredOnboardingCompleted) {
        try {
          await AsyncStorage.setItem("onboardingCompleted", "true");
          await AsyncStorage.setItem("onboardingSlidesSeen", "true");
        } catch (error) {
          console.warn("Error migrating onboarding flags:", error);
        }
      }

      const shouldShowOnboarding =
        needsBusinessSetup ||
        (!onboardingCompleted && !inferredOnboardingCompleted);
      const isFirstRun = !onboardingCompleted && !onboardingSlidesSeen;
      const initialStep = isFirstRun
        ? "slides"
        : needsBusinessSetup
          ? "business"
          : !onboardingCompleted && onboardingSlidesSeen
            ? "business"
            : "slides";

      setOnboardingInitialStep(initialStep);
      setShowOnboarding(shouldShowOnboarding);

      // Registrar tarea de consulta diaria en background (best-effort)
      // Nota: En Expo Go (store client) no corre de forma confiable.
      const executionEnvironment = String(
        Constants.executionEnvironment || "",
      ).toLowerCase();
      const isExpoGo = executionEnvironment === "storeclient";

      if (!isExpoGo) {
        await registerDailyRateBackgroundTask();
      } else {
        console.log(
          "Expo Go detectado: se omite BackgroundFetch; la consulta diaria se hará al abrir la app.",
        );
      }

      // Productos de ejemplo solo en desarrollo (removido para evitar creación en producción)
      // if (__DEV__) {
      //   await initSampleProducts();
      // }

      console.log("Database initialized successfully");
      setIsReady(true);
    } catch (error) {
      console.error("Error initializing app:", error);
      setIsReady(true); // Continuar aunque haya error
    }
  };

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <StatusBar hidden translucent />
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  // Mostrar onboarding si no se ha completado
  if (showOnboarding) {
    return (
      <>
        <StatusBar hidden translucent />
        <OnboardingScreen
          initialStep={onboardingInitialStep}
          onComplete={() => setShowOnboarding(false)}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar hidden translucent />
      <TourGuideProvider
        backdropColor="rgba(0,0,0,0)"
        tooltipComponent={TourTooltip}
      >
        <ExchangeRateProvider>
          <RateNotificationsProvider>
            <DailyExternalRatePrompt />
            <StoreUpdatePrompt />
            <NavigationContainer
              ref={navigationRef}
              onReady={applyImmersiveMode}
              onStateChange={applyImmersiveMode}
            >
              <Stack.Navigator>
                <Stack.Screen
                  name="Main"
                  component={MainTabs}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="RateNotifications"
                  component={RateNotificationsScreen}
                  options={{
                    title: "Notificaciones",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="AddProduct"
                  component={AddProductScreen}
                  options={{
                    title: "Nuevo Producto",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="EditProduct"
                  component={EditProductScreen}
                  options={{
                    title: "Editar Producto",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="AddCustomer"
                  component={AddCustomerScreen}
                  options={{
                    title: "Nuevo Cliente",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="EditCustomer"
                  component={EditCustomerScreen}
                  options={{
                    title: "Editar Cliente",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="AddSupplier"
                  component={AddSupplierScreen}
                  options={{
                    title: "Nuevo Proveedor",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="EditSupplier"
                  component={EditSupplierScreen}
                  options={{
                    title: "Editar Proveedor",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="AddAccountReceivable"
                  component={AddAccountReceivableScreen}
                  options={{
                    title: "Nueva Cuenta por Cobrar",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="EditAccountReceivable"
                  component={EditAccountReceivableScreen}
                  options={{
                    title: "Editar Cuenta por Cobrar",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="RecordPayment"
                  component={RecordPaymentScreen}
                  options={{
                    title: "Registrar Pago",
                    headerStyle: {
                      backgroundColor: "#2f5ae0",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="PaymentHistory"
                  component={PaymentHistoryScreen}
                  options={{
                    title: "Historial de Pagos",
                    headerStyle: {
                      backgroundColor: "#2f5ae0",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="RecordPaymentPayable"
                  component={RecordPaymentPayableScreen}
                  options={{
                    title: "Registrar Pago",
                    headerStyle: {
                      backgroundColor: "#2f5ae0",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="PaymentHistoryPayable"
                  component={PaymentHistoryPayableScreen}
                  options={{
                    title: "Historial de Pagos",
                    headerStyle: {
                      backgroundColor: "#2f5ae0",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="AddAccountPayable"
                  component={AddAccountPayableScreen}
                  options={{
                    title: "Nueva Cuenta por Pagar",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="EditAccountPayable"
                  component={EditAccountPayableScreen}
                  options={{
                    title: "Editar Cuenta por Pagar",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="SaleDetail"
                  component={SaleDetailScreen}
                  options={{
                    title: "Detalle de Venta",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="CancelledSales"
                  component={CancelledSalesScreen}
                  options={{
                    title: "Ventas Anuladas",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="BusinessSettings"
                  component={BusinessSettingsScreen}
                  options={{
                    title: "Datos del Negocio",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="PricingSettings"
                  component={PricingSettingsScreen}
                  options={{
                    title: "Margen de Ganancias",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="AddInventoryEntry"
                  component={AddInventoryEntryScreen}
                  options={{
                    title: "Agregar Entrada",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="AddInventoryExit"
                  component={AddInventoryExitScreen}
                  options={{
                    title: "Agregar Salida",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="ExchangeRate"
                  component={ExchangeRateScreen}
                  options={{
                    title: "Tasa de cambio",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="MobilePayments"
                  component={MobilePaymentsScreen}
                  options={{
                    title: "Pago movil",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="Products"
                  component={ProductsScreen}
                  options={{
                    title: "Productos",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="QRProducts"
                  component={QRProductsScreen}
                  options={{
                    title: "Códigos QR",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="Suppliers"
                  component={SuppliersScreen}
                  options={{
                    title: "Proveedores",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="Customers"
                  component={CustomersScreen}
                  options={{
                    title: "Clientes",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="AccountsReceivable"
                  component={AccountsReceivableScreen}
                  options={{
                    title: "Cuentas por cobrar",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="AccountsPayable"
                  component={AccountsPayableScreen}
                  options={{
                    title: "Cuentas por pagar",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="Capital"
                  component={CapitalScreen}
                  options={{
                    title: "Capital",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="InventoryEntry"
                  component={InventoryEntryScreen}
                  options={{
                    title: "Entrada de Inventario",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="InventoryMovements"
                  component={InventoryMovementsScreen}
                  options={{
                    title: "Movimientos de inventario",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="InventoryMovementsDetail"
                  component={InventoryMovementsDetailScreen}
                  options={{
                    title: "Movimientos",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="InventoryEntryDetail"
                  component={InventoryEntryDetailScreen}
                  options={{
                    title: "Entradas",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="InventoryExit"
                  component={InventoryExitScreen}
                  options={{
                    title: "Salida de Inventario",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="InventoryExitDetail"
                  component={InventoryExitDetailScreen}
                  options={{
                    title: "Salidas",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
                <Stack.Screen
                  name="About"
                  component={AboutScreen}
                  options={{
                    title: "Acerca de",
                    headerStyle: {
                      backgroundColor: "#4CAF50",
                    },
                    headerTintColor: "#fff",
                    headerTitleStyle: {
                      fontWeight: "bold",
                      fontSize: rf(18),
                    },
                  }}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </RateNotificationsProvider>
        </ExchangeRateProvider>
      </TourGuideProvider>
    </>
  );
}
