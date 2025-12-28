import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useCustomers } from "../../hooks/useCustomers";
import { getAllSales } from "../../services/database/sales";
import { getAllAccountsReceivable } from "../../services/database/accounts";
import { useCustomAlert } from "../../components/common/CustomAlert";

export const CustomersScreen = () => {
  const navigation = useNavigation();
  const {
    customers,
    loading,
    error,
    search,
    removeCustomer,
    refresh,
    cleanDuplicates,
    recoverDeleted,
  } = useCustomers();
  const { showAlert, CustomAlert } = useCustomAlert();

  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = useCallback(
    (query) => {
      setSearchQuery(query);
      search(query);
    },
    [search]
  );

  const handleCleanDuplicates = useCallback(async () => {
    showAlert({
      title: "Limpiar duplicados",
      message:
        "¿Estás seguro de que quieres limpiar los clientes duplicados? Se mantendrá el más reciente de cada grupo.",
      type: "warning",
      buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpiar",
          onPress: async () => {
            try {
              const result = await cleanDuplicates();
              showAlert({
                title: "Éxito",
                message: `Se limpiaron ${result.cleanedCount} duplicados. Las cuentas asociadas fueron transferidas al cliente más reciente.`,
                type: "success",
              });
            } catch (error) {
              console.error("Error limpiando duplicados:", error);
              showAlert({
                title: "Error",
                message: "No se pudieron limpiar los duplicados",
                type: "error",
              });
            }
          },
        },
      ],
    });
  }, [cleanDuplicates, showAlert]);

  const handleRecoverDeleted = useCallback(async () => {
    showAlert({
      title: "Recuperar eliminados",
      message:
        "¿Estás seguro de que quieres recuperar todos los clientes eliminados?",
      type: "warning",
      buttons: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Recuperar",
          onPress: async () => {
            try {
              const recoveredCount = await recoverDeleted();
              showAlert({
                title: "Éxito",
                message: `Se recuperaron ${recoveredCount} clientes eliminados.`,
                type: "success",
              });
            } catch (error) {
              console.error("Error recuperando clientes:", error);
              showAlert({
                title: "Error",
                message: "No se pudieron recuperar los clientes",
                type: "error",
              });
            }
          },
        },
      ],
    });
  }, [recoverDeleted, showAlert]);

  const confirmDeleteCustomer = useCallback(
    async (customer) => {
      try {
        // Verificar si es el cliente genérico
        if (customer.documentNumber === "1") {
          showAlert({
            title: "No se puede eliminar",
            message: "El cliente genérico no puede ser eliminado.",
            type: "error",
          });
          return;
        }

        // Verificar si el cliente tiene movimientos asociados
        const [allSales, allReceivables] = await Promise.all([
          getAllSales(),
          getAllAccountsReceivable(),
        ]);

        const customerSales = allSales.filter(
          (sale) => sale.customerId === customer.id
        );
        const customerReceivables = allReceivables.filter(
          (account) => account.customerId === customer.id
        );

        if (customerSales.length > 0 || customerReceivables.length > 0) {
          showAlert({
            title: "No se puede eliminar",
            message: `No se puede eliminar a ${customer.name} porque tiene ${customerSales.length} venta(s) y ${customerReceivables.length} cuenta(s) por cobrar asociada(s).`,
            type: "error",
          });
          return;
        }

        // Si no tiene movimientos, mostrar confirmación de eliminación
        showAlert({
          title: "Confirmar eliminación",
          message: `¿Estás seguro de que quieres eliminar a ${customer.name}?`,
          type: "warning",
          buttons: [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Eliminar",
              style: "destructive",
              onPress: async () => {
                try {
                  await removeCustomer(customer.id);
                  showAlert({
                    title: "Éxito",
                    message: "Cliente eliminado correctamente",
                    type: "success",
                  });
                } catch (error) {
                  console.error("Error eliminando cliente:", error);
                  showAlert({
                    title: "Error",
                    message: "No se pudo eliminar el cliente",
                    type: "error",
                  });
                }
              },
            },
          ],
        });
      } catch (error) {
        console.error("Error verificando movimientos del cliente:", error);
        showAlert({
          title: "Error",
          message: "No se pudo verificar los movimientos del cliente",
          type: "error",
        });
      }
    },
    [removeCustomer, showAlert]
  );

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      // Primero ordenar por número de cédula (tratando valores vacíos como último)
      const aDoc = a.documentNumber || "";
      const bDoc = b.documentNumber || "";

      if (aDoc && bDoc) {
        // Ambos tienen cédula, comparar numéricamente si son números
        const aNum = parseInt(aDoc.replace(/\D/g, ""));
        const bNum = parseInt(bDoc.replace(/\D/g, ""));
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return aDoc.localeCompare(bDoc);
      } else if (aDoc) {
        return -1; // a tiene cédula, va primero
      } else if (bDoc) {
        return 1; // b tiene cédula, va primero
      } else {
        // Ninguno tiene cédula, ordenar por nombre
        return a.name.localeCompare(b.name);
      }
    });
  }, [customers]);

  const renderCustomer = useCallback(
    ({ item }) => {
      const hasEmail = Boolean(item.email);
      const hasPhone = Boolean(item.phone);
      const isGeneric = item.documentNumber === "1";

      return (
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardBody}
            onPress={
              isGeneric
                ? undefined
                : () => navigation.navigate("EditCustomer", { customer: item })
            }
            activeOpacity={isGeneric ? 1 : 0.85}
          >
            <View style={styles.cardHeader}>
              <Text
                style={[
                  styles.customerName,
                  isGeneric && styles.genericCustomerName,
                ]}
              >
                {item.name}
                {isGeneric && " (ventas rápidas)"}
              </Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>#{item.documentNumber}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contacto</Text>
              <Text style={styles.infoValue}>
                {hasPhone ? item.phone : "Sin teléfono"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>
                {hasEmail ? item.email : "No registrado"}
              </Text>
            </View>
          </TouchableOpacity>

          {!isGeneric && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => confirmDeleteCustomer(item)}
              activeOpacity={0.85}
            >
              <Text style={styles.deleteButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    },
    [navigation, confirmDeleteCustomer]
  );

  const header = (
    <View style={styles.headerContent}>
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Text style={styles.heroIconText}>🤝</Text>
        </View>
        <View style={styles.heroTextContainer}>
          <Text style={styles.heroTitle}>Directorio de clientes</Text>
          <Text style={styles.heroSubtitle}>
            Centraliza la información de contacto y fortalece la relación con
            tus compradores.
          </Text>
        </View>
      </View>

      <View style={styles.searchCard}>
        <Text style={styles.searchTitle}>Buscar cliente</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Nombre, cédula o contacto"
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#9aa2b1"
        />
      </View>

      {/* <View style={styles.actionsCard}>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cleanButton]}
            onPress={handleCleanDuplicates}
            activeOpacity={0.85}
          >
            <Text style={styles.cleanButtonText}>🧹 Limpiar duplicados</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.recoverButton]}
            onPress={handleRecoverDeleted}
            activeOpacity={0.85}
          >
            <Text style={styles.recoverButtonText}>
              🔄 Recuperar eliminados
            </Text>
          </TouchableOpacity>
        </View>
      </View> */}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>
        {searchQuery
          ? "No se encontraron clientes"
          : "Aún no hay clientes registrados"}
      </Text>
      <Text style={styles.emptySubtitle}>
        Registra nuevos clientes para guardar sus datos y asociar cuentas por
        cobrar.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Cargando clientes...</Text>
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
      <FlatList
        data={sortedCustomers}
        renderItem={renderCustomer}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={header}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddCustomer")}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
      <CustomAlert />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8edf2",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e8edf2",
  },
  loadingText: {
    fontSize: 16,
    color: "#4c5767",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },
  headerContent: {
    gap: 18,
    marginBottom: 8,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#f3f8ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 18,
  },
  heroIconText: {
    fontSize: 30,
  },
  heroTextContainer: {
    flex: 1,
    gap: 6,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2633",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#5b6472",
    lineHeight: 20,
  },
  metricRow: {
    flexDirection: "row",
    gap: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7a8796",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2633",
  },
  metricHint: {
    fontSize: 12,
    color: "#6f7c8c",
  },
  searchCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    gap: 14,
  },
  searchTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2633",
  },
  searchInput: {
    backgroundColor: "#f3f5fa",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#1f2633",
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    gap: 16,
    marginBottom: 12,
  },
  cardBody: {
    flex: 1,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  customerName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2633",
  },
  genericCustomerName: {
    color: "#6f7c8c",
    fontStyle: "italic",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#f3f8ff",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2f5ae0",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7a8796",
  },
  infoValue: {
    fontSize: 13,
    color: "#4c5767",
    flex: 1,
    textAlign: "right",
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#d62828",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1f2633",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6f7c8c",
    textAlign: "center",
    lineHeight: 20,
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
  /* actionsCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  cleanButton: {
    backgroundColor: "#f59e0b",
    shadowColor: "#f59e0b",
  },
  cleanButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  recoverButton: {
    backgroundColor: "#10b981",
    shadowColor: "#10b981",
  },
  recoverButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  }, */
});
