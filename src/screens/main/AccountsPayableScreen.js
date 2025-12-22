import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAccounts } from "../../hooks/useAccounts";
import { formatCurrency } from "../../utils/currency";

export const AccountsPayableScreen = ({ navigation }) => {
  const {
    accountsPayable,
    loading,
    error,
    refresh,
    searchPayable,
    removeAccountPayable,
    markPayableAsPaid,
    payableStats,
    recordPayment,
    getPayments,
  } = useAccounts();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  const handleSearch = useCallback(
    async (query) => {
      setSearchQuery(query);
      if (!query.trim()) {
        await refresh();
      } else {
        await searchPayable(query);
      }
    },
    [refresh, searchPayable]
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
        `¿Confirmar que la cuenta de ${
          account.supplierName
        } por ${formatCurrency(account.amount || 0, "VES")} ha sido pagada?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Confirmar",
            onPress: async () => {
              try {
                await markPayableAsPaid(account.id);
                Alert.alert("Éxito", "Cuenta marcada como pagada");
              } catch (err) {
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
        `¿Eliminar la cuenta de ${account.supplierName}?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: async () => {
              try {
                await removeAccountPayable(account.id);
                Alert.alert("Éxito", "Cuenta eliminada correctamente");
              } catch (err) {
                Alert.alert("Error", "No se pudo eliminar la cuenta");
              }
            },
          },
        ]
      );
    },
    [removeAccountPayable]
  );

  const totalAmount = payableStats?.totalAmount || 0;
  const totalCount =
    typeof payableStats?.total === "number"
      ? payableStats.total
      : accountsPayable.length;

  const getStatusAppearance = useCallback(
    (status, dueDate, paidAmount, amount) => {
      // Si está completamente pagada según los cálculos, mostrar como pagada
      const isFullyPaid = status === "paid" || paidAmount + 0.01 >= amount;

      if (isFullyPaid) {
        return {
          label: "Pagada",
          backgroundColor: "#e5f7ed",
          color: "#2e7d32",
        };
      }

      if (dueDate && new Date(dueDate) < new Date()) {
        return {
          label: "Vencida",
          backgroundColor: "#fdecea",
          color: "#c62828",
        };
      }

      return {
        label: "Pendiente",
        backgroundColor: "#fff4e5",
        color: "#ef6c00",
      };
    },
    []
  );

  // Filtrar cuentas basado en el tab activo
  const filteredAccounts = useMemo(() => {
    if (activeTab === "pending") {
      return accountsPayable.filter((account) => {
        const paidAmount = account.paidAmount || 0;
        return account.status !== "paid" && paidAmount + 0.01 < account.amount;
      });
    } else if (activeTab === "paid") {
      return accountsPayable.filter((account) => {
        const paidAmount = account.paidAmount || 0;
        return account.status === "paid" || paidAmount + 0.01 >= account.amount;
      });
    }
    return accountsPayable;
  }, [accountsPayable, activeTab]);

  const openRecordPaymentScreen = useCallback(
    (account) => {
      navigation.navigate("RecordPaymentPayable", { account });
    },
    [navigation]
  );

  const openPaymentHistoryScreen = useCallback(
    (account) => {
      navigation.navigate("PaymentHistoryPayable", { account });
    },
    [navigation]
  );

  const renderAccount = useCallback(
    ({ item }) => {
      const appearance = getStatusAppearance(
        item.status,
        item.dueDate,
        item.paidAmount || 0,
        item.amount
      );

      return (
        <TouchableOpacity
          style={styles.accountCard}
          activeOpacity={0.9}
          onPress={() => openEditScreen(item)}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.supplierName}>{item.supplierName}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: appearance.backgroundColor },
              ]}
            >
              <Text style={[styles.statusText, { color: appearance.color }]}>
                {appearance.label}
              </Text>
            </View>
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.amount}>
              {formatCurrency(item.amount || 0, item.currency || "VES")}
            </Text>
            {item.dueDate ? (
              <Text style={styles.dueDate}>
                Vence {new Date(item.dueDate).toLocaleDateString()}
              </Text>
            ) : null}
          </View>

          {item.invoiceNumber ? (
            <Text style={styles.invoiceNumber}>
              Factura {item.invoiceNumber}
            </Text>
          ) : null}
          {item.documentNumber ? (
            <Text style={styles.metaText}>
              Documento: {item.documentNumber}
            </Text>
          ) : null}
          {item.description ? (
            <Text style={styles.description}>{item.description}</Text>
          ) : null}
          {item.createdAt ? (
            <Text style={styles.metaText}>
              Registrada {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          ) : null}

          <View style={styles.cardFooter}>
            {(() => {
              const isFullyPaid =
                item.status === "paid" || (item.paidAmount || 0) >= item.amount;
              const hasPayments = (item.paidAmount || 0) > 0;
              return (
                <>
                  {!isFullyPaid && (
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => openRecordPaymentScreen(item)}
                    >
                      <Text style={styles.secondaryButtonText}>
                        Registrar pago
                      </Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.iconContainer}>
                    {hasPayments && (
                      <TouchableOpacity
                        style={[
                          styles.iconButton,
                          !isFullyPaid && styles.iconButtonSmall,
                          isFullyPaid && styles.iconButtonNormal,
                        ]}
                        onPress={() => openPaymentHistoryScreen(item)}
                      >
                        <Text style={styles.iconButtonText}>📋</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.iconButton,
                        hasPayments && !isFullyPaid && styles.iconButtonSmall,
                        (!hasPayments || isFullyPaid) &&
                          styles.iconButtonNormal,
                      ]}
                      onPress={() => handleDelete(item)}
                    >
                      <Text style={styles.iconButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      );
    },
    [
      getStatusAppearance,
      handleDelete,
      openRecordPaymentScreen,
      openPaymentHistoryScreen,
      openEditScreen,
    ]
  );

  const renderHeader = () => (
    <View>
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryIcon}>
            <Text style={styles.summaryIconText}>📤</Text>
          </View>
          <View>
            <Text style={styles.summaryTitle}>
              Cuentas por Pagar ({totalCount})
            </Text>
          </View>
        </View>

        <Text style={styles.summaryAmount}>
          {formatCurrency(totalAmount, "VES")}
        </Text>
      </View>

      <View style={styles.controlsCard}>
        <View style={styles.searchWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar cuentas..."
            placeholderTextColor="#9aa6b5"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "pending" && styles.activeTab]}
          onPress={() => setActiveTab("pending")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "pending" && styles.activeTabText,
            ]}
          >
            Pendientes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "paid" && styles.activeTab]}
          onPress={() => setActiveTab("paid")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "paid" && styles.activeTabText,
            ]}
          >
            Pagadas
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyIcon}>🗒️</Text>
        <Text style={styles.emptyTitle}>
          {searchQuery ? "Sin resultados" : "Aún no tienes cuentas"}
        </Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery
            ? "Ajusta los términos de búsqueda para intentarlo de nuevo."
            : "Registra tu primera cuenta por pagar desde el botón superior."}
        </Text>
      </View>
    </View>
  );

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando cuentas por pagar...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          Ocurrió un error al cargar la información.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredAccounts}
        renderItem={renderAccount}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshing={loading}
        onRefresh={refresh}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={openAddScreen}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
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
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6c7a8a",
  },
  errorText: {
    fontSize: 15,
    color: "#c62828",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#f6efff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  summaryIconText: {
    fontSize: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2f3a4c",
  },
  summaryAmount: {
    fontSize: 30,
    fontWeight: "700",
    color: "#c62828",
    marginBottom: 0,
  },
  controlsCard: {
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
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f7fb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dde4ed",
    paddingHorizontal: 14,
    height: 48,
  },
  searchIcon: {
    fontSize: 18,
    color: "#6c7a8a",
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#2f3a4c",
  },
  primaryButton: {
    marginTop: 14,
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  accountCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  supplierName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2f3a4c",
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 10,
  },
  amount: {
    fontSize: 22,
    fontWeight: "700",
    color: "#c62828",
  },
  dueDate: {
    fontSize: 13,
    color: "#6c7a8a",
    fontWeight: "500",
  },
  invoiceNumber: {
    fontSize: 13,
    color: "#4f6bed",
    fontWeight: "600",
    marginBottom: 6,
  },
  metaText: {
    fontSize: 13,
    color: "#6c7a8a",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: "#4c5c6e",
    lineHeight: 19,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#fdecea",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#c62828",
    fontWeight: "600",
    fontSize: 14,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#e8ecff",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  iconButtonAlone: {
    marginLeft: "auto",
  },
  iconButtonText: {
    fontSize: 20,
  },
  emptyState: {
    paddingTop: 40,
    alignItems: "center",
  },
  emptyCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2f3a4c",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6c7a8a",
    textAlign: "center",
    lineHeight: 20,
  },
  fab: {
    position: "absolute",
    bottom: 80,
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
    fontWeight: "bold",
  },
  iconContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
    gap: 8,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#fdecea",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonNormal: {
    // Normal size, no special positioning
  },
  iconButtonSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  iconButtonText: {
    fontSize: 20,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 4,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: "#2e7d32",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  activeTabText: {
    color: "#fff",
  },
});

export default AccountsPayableScreen;
