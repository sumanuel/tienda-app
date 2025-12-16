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
import { useFocusEffect } from "@react-navigation/native";
import { useAccounts } from "../../hooks/useAccounts";

/**
 * Pantalla de gestión de cuentas por cobrar
 */
export const AccountsReceivableScreen = ({ navigation }) => {
  const {
    accountsReceivable,
    loading,
    error,
    refresh,
    searchReceivable,
    removeAccountReceivable,
    markReceivableAsPaid,
  } = useAccounts();

  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = useCallback(
    async (query) => {
      setSearchQuery(query);
      if (!query.trim()) {
        // Si no hay búsqueda, recargar todas las cuentas
        await refresh();
      } else {
        // Si hay búsqueda, buscar
        await searchReceivable(query);
      }
    },
    [searchReceivable, refresh]
  );

  const openAddScreen = useCallback(() => {
    navigation.navigate("AddAccountReceivable");
  }, [navigation]);

  const openEditScreen = useCallback(
    (account) => {
      navigation.navigate("EditAccountReceivable", { account });
    },
    [navigation]
  );

  const handleMarkAsPaid = useCallback(
    (account) => {
      Alert.alert(
        "Marcar como pagada",
        `¿Confirmar que la cuenta de ${account.customerName.toUpperCase()} por VES. ${
          account.amount
        } ha sido pagada?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Confirmar",
            onPress: async () => {
              try {
                await markReceivableAsPaid(account.id);
                Alert.alert("Éxito", "Cuenta marcada como pagada");
              } catch (error) {
                Alert.alert("Error", "No se pudo actualizar la cuenta");
              }
            },
          },
        ]
      );
    },
    [markReceivableAsPaid]
  );

  const handleDelete = useCallback(
    (account) => {
      Alert.alert(
        "Eliminar cuenta",
        `¿Estás seguro de que quieres eliminar la cuenta de ${account.customerName.toUpperCase()}?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: async () => {
              try {
                await removeAccountReceivable(account.id);
                Alert.alert("Éxito", "Cuenta eliminada correctamente");
              } catch (error) {
                Alert.alert("Error", "No se pudo eliminar la cuenta");
              }
            },
          },
        ]
      );
    },
    [removeAccountReceivable]
  );

  const getStatusColor = useCallback((status, dueDate) => {
    if (status === "paid") return "#4CAF50";
    if (dueDate && new Date(dueDate) < new Date()) return "#FF3B30";
    return "#FF9800";
  }, []);

  const getStatusText = useCallback((status, dueDate) => {
    if (status === "paid") return "Pagada";
    if (dueDate && new Date(dueDate) < new Date()) return "Vencida";
    return "Pendiente";
  }, []);

  const renderAccount = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={styles.accountCard}
        onPress={() => openEditScreen(item)}
      >
        <View style={styles.accountInfo}>
          <Text style={styles.customerName}>
            {item.customerName.toUpperCase()}
          </Text>
          {item.documentNumber && (
            <Text style={styles.documentNumber}>
              Cédula: {item.documentNumber}
            </Text>
          )}
          {item.createdAt && (
            <Text style={styles.createdDate}>
              Creada: {new Date(item.createdAt).toLocaleString()}
            </Text>
          )}
          {item.invoiceNumber && (
            <Text style={styles.invoiceNumber}>
              Factura: {item.invoiceNumber}
            </Text>
          )}
          <Text style={styles.amount}>VES. {item.amount?.toFixed(2)}</Text>
          {item.description && (
            <Text style={styles.description}>{item.description}</Text>
          )}
          <View style={styles.statusContainer}>
            <Text
              style={[
                styles.status,
                { color: getStatusColor(item.status, item.dueDate) },
              ]}
            >
              {getStatusText(item.status, item.dueDate)}
            </Text>
            {item.dueDate && (
              <Text style={styles.dueDate}>
                Vence: {new Date(item.dueDate).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.actionsContainer}>
          {item.status !== "paid" && (
            <TouchableOpacity
              style={[styles.actionButton, styles.payButton]}
              onPress={() => handleMarkAsPaid(item)}
            >
              <Text style={styles.payButtonText}>✓ Pagar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item)}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    ),
    [
      openEditScreen,
      handleMarkAsPaid,
      handleDelete,
      getStatusColor,
      getStatusText,
    ]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {searchQuery
          ? "No se encontraron cuentas"
          : "No hay cuentas por cobrar registradas"}
      </Text>
    </View>
  );

  // Refrescar la lista cuando la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Cargando cuentas por cobrar...</Text>
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
          placeholder="Buscar cuentas..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
        <TouchableOpacity style={styles.addButton} onPress={openAddScreen}>
          <Text style={styles.addButtonText}>+ Agregar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={accountsReceivable}
        renderItem={renderAccount}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
    backgroundColor: "#f9f9f9",
  },
  addButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: "center",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  listContainer: {
    padding: 16,
  },
  accountCard: {
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
  accountInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  documentNumber: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  createdDate: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
    marginBottom: 4,
  },
  amount: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4CAF50",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  status: {
    fontSize: 14,
    fontWeight: "600",
  },
  dueDate: {
    fontSize: 12,
    color: "#666",
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  payButton: {
    backgroundColor: "#4CAF50",
  },
  payButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
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

export default AccountsReceivableScreen;
