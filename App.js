import React, { useEffect, useState } from "react";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Context
import { ExchangeRateProvider } from "./src/contexts/ExchangeRateContext";

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
import AddInventoryEntryScreen from "./src/screens/main/AddInventoryEntryScreen";

// Database initialization
import { initAllTables } from "./src/services/database/db";
import { initSettingsTable } from "./src/services/database/settings";
import { initSampleProducts } from "./src/services/database/products";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const navigationRef = createNavigationContainerRef();

/**
 * Tabs de navegación principal
 */
function MainTabs() {
  const insets = useSafeAreaInsets();
  const [showAccountsMenu, setShowAccountsMenu] = useState(false);
  const [showFichaMenu, setShowFichaMenu] = useState(false);
  const bottomOffset = insets.bottom + 15;

  const handleNavigate = (routeName) => {
    setShowAccountsMenu(false);
    setShowFichaMenu(false);
    if (navigationRef.isReady()) {
      navigationRef.navigate(routeName);
    }
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: "#4CAF50",
          tabBarInactiveTintColor: "#999",
          tabBarStyle: {
            paddingBottom: insets.bottom + 5,
            height: 60 + insets.bottom,
            paddingTop: 5,
          },
          headerShown: true,
          headerStyle: {
            backgroundColor: "#4CAF50",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarLabel: "Inicio",
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🏠</Text>,
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="POS"
          component={POSScreen}
          options={{
            tabBarLabel: "Cuentas",
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>💼</Text>,
            title: "Punto de venta",
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setShowAccountsMenu(true);
              setShowFichaMenu(false);
            },
          }}
        />
        <Tab.Screen
          name="Sales"
          component={SalesScreen}
          options={{
            tabBarLabel: "Ficha",
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📂</Text>,
            title: "Historial de ventas",
          }}
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
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>⚙️</Text>,
            title: "Configuraciones",
          }}
        />

        {/* Screens accesibles desde menús, ocultas del tab bar (mantienen header + tab bar) */}
        <Tab.Screen
          name="ExchangeRate"
          component={ExchangeRateScreen}
          options={{
            title: "Tasa de cambio",
            tabBarButton: () => null,
            tabBarItemStyle: { display: "none" },
          }}
        />
        <Tab.Screen
          name="Products"
          component={ProductsScreen}
          options={{
            title: "Productos",
            tabBarButton: () => null,
            tabBarItemStyle: { display: "none" },
          }}
        />
        <Tab.Screen
          name="QRProducts"
          component={QRProductsScreen}
          options={{
            title: "Códigos QR",
            tabBarButton: () => null,
            tabBarItemStyle: { display: "none" },
          }}
        />
        <Tab.Screen
          name="Suppliers"
          component={SuppliersScreen}
          options={{
            title: "Proveedores",
            tabBarButton: () => null,
            tabBarItemStyle: { display: "none" },
          }}
        />
        <Tab.Screen
          name="Customers"
          component={CustomersScreen}
          options={{
            title: "Clientes",
            tabBarButton: () => null,
            tabBarItemStyle: { display: "none" },
          }}
        />
        <Tab.Screen
          name="AccountsReceivable"
          component={AccountsReceivableScreen}
          options={{
            title: "Cuentas por cobrar",
            tabBarButton: () => null,
            tabBarItemStyle: { display: "none" },
          }}
        />
        <Tab.Screen
          name="AccountsPayable"
          component={AccountsPayableScreen}
          options={{
            title: "Cuentas por pagar",
            tabBarButton: () => null,
            tabBarItemStyle: { display: "none" },
          }}
        />
        <Tab.Screen
          name="Capital"
          component={CapitalScreen}
          options={{
            title: "Capital",
            tabBarButton: () => null,
            tabBarItemStyle: { display: "none" },
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
            onPress: () => handleNavigate("Products"),
          },
          {
            key: "qr",
            icon: "📱",
            label: "QR",
            onPress: () => handleNavigate("QRProducts"),
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
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  menuDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e5eaf0",
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#ecf4ef",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  menuIconText: {
    fontSize: 16,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2f3a4c",
  },
});

/**
 * Componente principal de la aplicación
 */
export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeApp();
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

      // Inicializar productos de ejemplo si no existen
      await initSampleProducts();

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
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ExchangeRateProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator>
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false }}
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
              },
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ExchangeRateProvider>
  );
}
