import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
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
          <Text style={styles.customerName}>{item.name}</Text>
          <Text style={styles.customerDocument}>{item.documentNumber}</Text>
          <View style={styles.contactRow}>
            {item.phone && (
              <Text style={styles.contactText}>📞 {item.phone}</Text>
            )}
            {item.email && (
              <Text style={styles.contactText}>✉️ {item.email}</Text>
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.actionsContainer}>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() =>
                navigation.navigate("EditCustomer", { customer: item })
              }
            >
              <Text style={styles.editButtonText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => confirmDeleteCustomer(item)}
            >
              <Text style={styles.deleteButtonText}>🗑️</Text>
            </TouchableOpacity>
          </View>
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clientes</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddCustomer")}
        >
          <Text style={styles.addButtonText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Buscar clientes..."
        value={searchQuery}
        onChangeText={handleSearch}
      />

      <FlatList
        data={customers.sort((a, b) => a.name.localeCompare(b.name))}
        renderItem={renderCustomer}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingBottom: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  addButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  searchInput: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  customerCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  customerEmail: {
    fontSize: 14,
    color: "#666",
  },
  customerDocument: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  contactText: {
    fontSize: 14,
    color: "#666",
    marginRight: 16,
    marginBottom: 2,
  },
  actionsContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 16,
  },
  actionButtons: {
    flexDirection: "row",
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
  },
  editButton: {
    backgroundColor: "#007AFF",
  },
  editButtonText: {
    color: "#fff",
    fontSize: 18,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
