import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useCustomers } from "../../hooks/useCustomers";

export const CustomersScreen = () => {
  const navigation = useNavigation();
  const {
    customers,
    loading,
    error,
    search,
    addCustomer,
    editCustomer,
    removeCustomer,
    refresh,
  } = useCustomers();

  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = useCallback(
    (query) => {
      setSearchQuery(query);
      search(query);
    },
    [search]
  );

  // Recargar clientes cuando la pantalla se enfoque
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const confirmDeleteCustomer = useCallback(
    (customer) => {
      Alert.alert(
        "Confirmar eliminación",
        `¿Estás seguro de que quieres eliminar a ${customer.name}?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: async () => {
              try {
                await removeCustomer(customer.id);
                Alert.alert("Éxito", "Cliente eliminado correctamente");
              } catch (error) {
                Alert.alert("Error", "No se pudo eliminar el cliente");
              }
            },
          },
        ]
      );
    },
    [removeCustomer]
  );

  const renderCustomer = useCallback(
    ({ item }) => (
      <View style={styles.customerCard}>
        <TouchableOpacity
          style={styles.customerInfo}
          onPress={() =>
            navigation.navigate("EditCustomer", { customer: item })
          }
        >
          <Text style={styles.customerName}>{item.name.toUpperCase()}</Text>
          <Text style={styles.customerDocument}>
            CÉDULA: {item.documentNumber}
          </Text>
          {item.phone && (
            <Text style={styles.contactText}>TELÉFONO: {item.phone}</Text>
          )}
          {item.email && (
            <Text style={styles.contactText}>EMAIL: {item.email}</Text>
          )}
        </TouchableOpacity>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => confirmDeleteCustomer(item)}
          >
            <Text style={styles.deleteButtonText}>✖</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [navigation, confirmDeleteCustomer]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {searchQuery
          ? "No se encontraron clientes"
          : "No hay clientes registrados"}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Cargando clientes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar clientes..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddCustomer")}
        >
          <Text style={styles.addButtonText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={customers.sort((a, b) => a.name.localeCompare(b.name))}
        renderItem={renderCustomer}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingBottom: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButton: {
    backgroundColor: "#10b981",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    backgroundColor: "#f8fafc",
    fontSize: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  list: {
    padding: 20,
    paddingBottom: 100,
  },
  customerCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  customerDocument: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 8,
    fontWeight: "600",
  },
  contactText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
    marginBottom: 4,
  },
  actionsContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  deleteButton: {
    backgroundColor: "#ef4444",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: "#94a3b8",
    textAlign: "center",
    fontWeight: "500",
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
