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
import { useSuppliers } from "../../hooks/useSuppliers";

export const SuppliersScreen = () => {
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
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    documentNumber: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    contactPerson: "",
    paymentTerms: "",
  });

  const handleSearch = useCallback(
    (query) => {
      setSearchQuery(query);
      search(query);
    },
    [search]
  );

  const openAddModal = useCallback(() => {
    setEditingSupplier(null);
    setFormData({
      documentNumber: "",
      name: "",
      email: "",
      phone: "",
      address: "",
      contactPerson: "",
      paymentTerms: "",
    });
    setModalVisible(true);
  }, []);

  const openEditModal = useCallback((supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      documentNumber: supplier.documentNumber || "",
      name: supplier.name || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      contactPerson: supplier.contactPerson || "",
      paymentTerms: supplier.paymentTerms || "",
    });
    setModalVisible(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.documentNumber.trim()) {
      Alert.alert("Error", "El RIF/Cédula del proveedor es obligatorio");
      return;
    }
    if (!formData.name.trim()) {
      Alert.alert("Error", "El nombre del proveedor es obligatorio");
      return;
    }

    try {
      if (editingSupplier) {
        await editSupplier(editingSupplier.id, formData);
        Alert.alert("Éxito", "Proveedor actualizado correctamente");
      } else {
        await addSupplier(formData);
        Alert.alert("Éxito", "Proveedor agregado correctamente");
      }
      setModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar el proveedor");
    }
  }, [formData, editingSupplier, addSupplier, editSupplier]);

  const handleDelete = useCallback(
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
      <TouchableOpacity
        style={styles.supplierCard}
        onPress={() => openEditModal(item)}
      >
        <View style={styles.supplierInfo}>
          <Text style={styles.supplierName}>
            {item.documentNumber} - {item.name}
          </Text>
          {item.contactPerson && (
            <Text style={styles.supplierContact}>
              Contacto: {item.contactPerson}
            </Text>
          )}
          {item.phone && <Text style={styles.supplierPhone}>{item.phone}</Text>}
          {item.email && <Text style={styles.supplierEmail}>{item.email}</Text>}
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.deleteButtonText}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    ),
    [openEditModal, handleDelete]
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar proveedores..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Agregar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={suppliers.sort((a, b) => a.name.localeCompare(b.name))}
        renderItem={renderSupplier}
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
              {editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
            </Text>

            <ScrollView style={styles.formContainer}>
              <TextInput
                style={styles.input}
                placeholder="RIF/Cédula *"
                value={formData.documentNumber}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, documentNumber: text }))
                }
                keyboardType="default"
              />

              <TextInput
                style={styles.input}
                placeholder="Nombre/Razón Social *"
                value={formData.name}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, name: text }))
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Persona de Contacto"
                value={formData.contactPerson}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, contactPerson: text }))
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Teléfono"
                value={formData.phone}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, phone: text }))
                }
                keyboardType="phone-pad"
              />

              <TextInput
                style={styles.input}
                placeholder="Email"
                value={formData.email}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, email: text }))
                }
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Dirección"
                value={formData.address}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, address: text }))
                }
                multiline
                numberOfLines={3}
              />

              <TextInput
                style={styles.input}
                placeholder="Términos de Pago"
                value={formData.paymentTerms}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, paymentTerms: text }))
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
                  {editingSupplier ? "Actualizar" : "Guardar"}
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
  deleteButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 18,
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

export default SuppliersScreen;
