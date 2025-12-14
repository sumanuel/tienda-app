import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Context
import { ExchangeRateProvider } from "./src/contexts/ExchangeRateContext";

// Screens
import DashboardScreen from "./src/screens/main/DashboardScreen";
import POSScreen from "./src/screens/main/POSScreen";
import ProductsScreen from "./src/screens/main/ProductsScreen";
import SalesScreen from "./src/screens/main/SalesScreen";
import ExchangeRateScreen from "./src/screens/main/ExchangeRateScreen";
import SettingsScreen from "./src/screens/main/SettingsScreen";
import AddProductScreen from "./src/screens/main/AddProductScreen";
import EditProductScreen from "./src/screens/main/EditProductScreen";

// Database initialization
import { initAllTables } from "./src/services/database/db";
import { initSettingsTable } from "./src/services/database/settings";
import { initSampleProducts } from "./src/services/database/products";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Tabs de navegación principal
 */
function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#4CAF50",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          paddingBottom: insets.bottom + 5,
          height: 60 + insets.bottom,
          paddingTop: 5,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: "Inicio",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="POS"
        component={POSScreen}
        options={{
          tabBarLabel: "Venta",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>🛒</Text>,
        }}
      />
      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        options={{
          tabBarLabel: "Productos",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📦</Text>,
        }}
      />
      <Tab.Screen
        name="Sales"
        component={SalesScreen}
        options={{
          tabBarLabel: "Ventas",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📊</Text>,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: "Ajustes",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>⚙️</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

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
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ExchangeRate"
            component={ExchangeRateScreen}
            options={{
              title: "Tasa de Cambio",
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
        </Stack.Navigator>
      </NavigationContainer>
    </ExchangeRateProvider>
  );
}
