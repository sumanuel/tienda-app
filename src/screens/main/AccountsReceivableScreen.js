import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAccounts } from "../../hooks/useAccounts";

export const AccountsReceivableScreen = () => {
  const {
    accountsReceivable,
    loading,
    error,
    refresh,
    addAccountReceivable,
    editAccountReceivable,
    removeAccountReceivable,
    markReceivableAsPaid,
  } = useAccounts();

  const [searchQuery, setSearchQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState({
    customerName: "",
    amount: "",
    description: "",
    dueDate: "",
  });

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    // TODO: Implementar búsqueda
  }, []);

  const openAddModal = useCallback(() => {
    setEditingAccount(null);
    setFormData({
      customerName: "",
      amount: "",
      description: "",
      dueDate: "",
    });
    setModalVisible(true);
  }, []);

  const openEditModal = useCallback((account) => {
    setEditingAccount(account);
    setFormData({
      customerName: account.customerName || "",
      amount: account.amount?.toString() || "",
      description: account.description || "",
      dueDate: account.dueDate || "",
    });
    setModalVisible(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.customerName.trim()) {
      Alert.alert("Error", "El nombre del cliente es obligatorio");
      return;
    }
    if (!formData.amount.trim() || isNaN(parseFloat(formData.amount))) {
      Alert.alert("Error", "El monto debe ser un número válido");
      return;
    }

    try {
      const accountData = {
        customerName: formData.customerName.trim(),
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        dueDate: formData.dueDate.trim() || null,
      };

      if (editingAccount) {
        await editAccountReceivable(editingAccount.id, accountData);
      } else {
        await addAccountReceivable(accountData);
      }

      Alert.alert(
        "Éxito",
        editingAccount
          ? "Cuenta actualizada correctamente"
          : "Cuenta agregada correctamente"
      );
      setModalVisible(false);
      refresh();
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar la cuenta");
    }
  }, [
    formData,
    editingAccount,
    addAccountReceivable,
    editAccountReceivable,
    refresh,
  ]);

  const handleMarkAsPaid = useCallback(
    (account) => {
      Alert.alert(
        "Marcar como pagada",
        `¿Confirmar que la cuenta de ${account.customerName} por VES. ${account.amount} ha sido pagada?`,
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
        `¿Estás seguro de que quieres eliminar la cuenta de ${account.customerName}?`,
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
        onPress={() => openEditModal(item)}
      >
        <View style={styles.accountInfo}>
          <Text style={styles.customerName}>{item.customerName}</Text>
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
      openEditModal,
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar cuentas..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
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

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingAccount
                ? "Editar Cuenta por Cobrar"
                : "Nueva Cuenta por Cobrar"}
            </Text>

            <ScrollView style={styles.formContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nombre del Cliente *"
                value={formData.customerName}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, customerName: text }))
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Monto *"
                value={formData.amount}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, amount: text }))
                }
                keyboardType="numeric"
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Descripción"
                value={formData.description}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, description: text }))
                }
                multiline
                numberOfLines={3}
              />

              <TextInput
                style={styles.input}
                placeholder="Fecha de vencimiento (YYYY-MM-DD)"
                value={formData.dueDate}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, dueDate: text }))
                }
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>
                  {editingAccount ? "Actualizar" : "Guardar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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

export default AccountsReceivableScreen;
