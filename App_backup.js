import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View, Text } from "react-native";

// Screens
import DashboardScreen from "./src/screens/main/DashboardScreen";
import POSScreen from "./src/screens/main/POSScreen";
import ProductsScreen from "./src/screens/main/ProductsScreen";
import SalesScreen from "./src/screens/main/SalesScreen";
import ExchangeRateScreen from "./src/screens/main/ExchangeRateScreen";
import SettingsScreen from "./src/screens/main/SettingsScreen";

// Database initialization
import { initDatabase } from "./src/services/database/products";
import { initSalesTable } from "./src/services/database/sales";
import { initCustomersTable } from "./src/services/database/customers";
import { initExchangeRatesTable } from "./src/services/database/exchangeRates";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Tabs de navegación principal
 */
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#4CAF50",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          paddingBottom: 5,
          height: 60,
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
      // Inicializar tablas de la base de datos
      await initDatabase();
      await initSalesTable();
      await initCustomersTable();
      await initExchangeRatesTable();

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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
