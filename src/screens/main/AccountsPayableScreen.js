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
import { useAccounts } from "../../hooks/useAccounts";

/**
 * Pantalla de gestión de cuentas por pagar
 */
export const AccountsPayableScreen = ({ navigation }) => {
  const {
    accountsPayable,
    loading,
    error,
    refresh,
    searchPayable,
    removeAccountPayable,
    markPayableAsPaid,
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
        await searchPayable(query);
      }
    },
    [searchPayable, refresh]
  );

  const openAddScreen = useCallback(() => {
    navigation.navigate("AddAccountPayable");
  }, [navigation]);

  const openEditScreen = useCallback(
    (account) => {
      navigation.navigate("EditAccountPayable", { account });
    },
    [navigation]
  );

  const handleMarkAsPaid = useCallback(
    (account) => {
      Alert.alert(
        "Marcar como pagada",
        `¿Confirmar que la cuenta de ${account.supplierName} por VES. ${account.amount} ha sido pagada?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Confirmar",
            onPress: async () => {
              try {
                await markPayableAsPaid(account.id);
                Alert.alert("Éxito", "Cuenta marcada como pagada");
              } catch (error) {
                Alert.alert("Error", "No se pudo actualizar la cuenta");
              }
            },
          },
        ]
      );
    },
    [markPayableAsPaid]
  );

  const handleDelete = useCallback(
    (account) => {
      Alert.alert(
        "Eliminar cuenta",
        `¿Estás seguro de que quieres eliminar la cuenta de ${account.supplierName}?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            onPress: async () => {
              try {
                await removeAccountPayable(account.id);
                Alert.alert("Éxito", "Cuenta eliminada correctamente");
              } catch (error) {
                Alert.alert("Error", "No se pudo eliminar la cuenta");
              }
            },
          },
        ]
      );
    },
    [removeAccountPayable]
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
          <Text style={styles.supplierName}>
            {item.supplierName.toUpperCase()}
          </Text>
          {item.documentNumber && (
            <Text style={styles.documentNumber}>
              Cédula: {item.documentNumber}
            </Text>
          )}
          <Text style={styles.amount}>VES. {item.amount?.toFixed(2)}</Text>
          {item.description && (
            <Text style={styles.description}>{item.description}</Text>
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
          <View style={styles.statusContainer}>
            <Text
              style={[
                styles.status,
                item.status === "paid"
                  ? styles.statusPaid
                  : item.dueDate &&
                    new Date(item.dueDate) < new Date() &&
                    item.status !== "paid"
                  ? styles.statusOverdue
                  : styles.statusPending,
              ]}
            >
              {item.status === "paid"
                ? "Pagada"
                : item.dueDate &&
                  new Date(item.dueDate) < new Date() &&
                  item.status !== "paid"
                ? "Vencida"
                : "Pendiente"}
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
    [openEditScreen, handleMarkAsPaid, handleDelete]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {searchQuery
          ? "No se encontraron cuentas"
          : "No hay cuentas por pagar registradas"}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Cargando cuentas por pagar...</Text>
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
        data={accountsPayable}
        renderItem={renderAccount}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No hay cuentas por pagar registradas
            </Text>
          </View>
        }
        refreshing={loading}
        onRefresh={refresh}
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
  listContainer: {
    padding: 16,
  },
  accountCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  accountInfo: {
    marginBottom: 12,
  },
  supplierName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  documentNumber: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  amount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4CAF50",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  dueDate: {
    fontSize: 14,
    color: "#FF9800",
    marginBottom: 4,
  },
  createdDate: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 14,
    color: "#2196F3",
    marginBottom: 8,
  },
  statusContainer: {
    marginTop: 8,
  },
  status: {
    fontSize: 12,
    fontWeight: "600",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    textAlign: "center",
    alignSelf: "flex-start",
  },
  statusPaid: {
    backgroundColor: "#4CAF50",
    color: "#fff",
  },
  statusPending: {
    backgroundColor: "#FF9800",
    color: "#fff",
  },
  statusOverdue: {
    backgroundColor: "#f44336",
    color: "#fff",
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 4,
  },
  payButton: {
    backgroundColor: "#4CAF50",
  },
  payButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  deleteButton: {
    backgroundColor: "#f44336",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  formContainer: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  modalButtons: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  modalButton: {
    flex: 1,
    padding: 16,
    alignItems: "center",
  },
  cancelButton: {
    borderRightWidth: 1,
    borderRightColor: "#e0e0e0",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#007AFF",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default AccountsPayableScreen;
