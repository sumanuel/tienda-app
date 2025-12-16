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
import { useSuppliers } from "../../hooks/useSuppliers";

export const SuppliersScreen = () => {
  const navigation = useNavigation();
  const {
    suppliers,
    loading,
    error,
    search,
    addSupplier,
    editSupplier,
    removeSupplier,
    refresh,
  } = useSuppliers();

  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = useCallback(
    (query) => {
      setSearchQuery(query);
      search(query);
    },
    [search]
  );

  const confirmDeleteSupplier = useCallback(
    (supplier) => {
      Alert.alert(
        "Confirmar eliminación",
        `¿Estás seguro de que quieres eliminar a ${supplier.name}?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: async () => {
              try {
                await removeSupplier(supplier.id);
                Alert.alert("Éxito", "Proveedor eliminado correctamente");
              } catch (error) {
                Alert.alert("Error", "No se pudo eliminar el proveedor");
              }
            },
          },
        ]
      );
    },
    [removeSupplier]
  );

  const renderSupplier = useCallback(
    ({ item }) => (
      <View style={styles.supplierCard}>
        <TouchableOpacity
          style={styles.supplierInfo}
          onPress={() =>
            navigation.navigate("EditSupplier", { supplier: item })
          }
        >
          <Text style={styles.supplierName}>
            {item.documentNumber} - {item.name}
          </Text>
          {item.contactPerson && (
            <Text style={styles.supplierContact}>
              Contacto: {item.contactPerson}
            </Text>
          )}
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
                navigation.navigate("EditSupplier", { supplier: item })
              }
            >
              <Text style={styles.editButtonText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => confirmDeleteSupplier(item)}
            >
              <Text style={styles.deleteButtonText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    ),
    [navigation, confirmDeleteSupplier]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {searchQuery
          ? "No se encontraron proveedores"
          : "No hay proveedores registrados"}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Cargando proveedores...</Text>
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
        <Text style={styles.title}>Proveedores</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddSupplier")}
        >
          <Text style={styles.addButtonText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Buscar proveedores..."
        value={searchQuery}
        onChangeText={handleSearch}
      />

      <FlatList
        data={suppliers.sort((a, b) => a.name.localeCompare(b.name))}
        renderItem={renderSupplier}
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
  supplierCard: {
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
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  supplierContact: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  supplierPhone: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  supplierEmail: {
    fontSize: 14,
    color: "#666",
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
});
