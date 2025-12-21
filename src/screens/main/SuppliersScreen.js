import React, { useState, useCallback, useMemo } from "react";
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
import { useSuppliers } from "../../hooks/useSuppliers";

export const SuppliersScreen = () => {
  const navigation = useNavigation();
  const { suppliers, loading, error, search, removeSupplier, refresh } =
    useSuppliers();

  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = useCallback(
    (query) => {
      setSearchQuery(query);
      search(query);
    },
    [search]
  );

  // Recargar proveedores cuando la pantalla se enfoque
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
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

  const sortedSuppliers = useMemo(() => {
    return [...suppliers].sort((a, b) => a.name.localeCompare(b.name));
  }, [suppliers]);

  const renderSupplier = useCallback(
    ({ item }) => {
      const hasContact = Boolean(item.contactPerson);
      const hasTerms = Boolean(item.paymentTerms);

      return (
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardBody}
            onPress={() =>
              navigation.navigate("EditSupplier", { supplier: item })
            }
            activeOpacity={0.85}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.supplierName}>{item.name}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.documentNumber}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contacto</Text>
              <Text style={styles.infoValue}>
                {hasContact ? item.contactPerson : "No asignado"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Teléfono</Text>
              <Text style={styles.infoValue}>
                {item.phone || "Sin registro"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Términos</Text>
              <Text style={styles.infoValue}>
                {hasTerms ? item.paymentTerms : "No definidos"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => confirmDeleteSupplier(item)}
            activeOpacity={0.85}
          >
            <Text style={styles.deleteButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      );
    },
    [navigation, confirmDeleteSupplier]
  );

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Text style={styles.heroIconText}>🏢</Text>
        </View>
        <View style={styles.heroTextContainer}>
          <Text style={styles.heroTitle}>Proveedores y aliados</Text>
          <Text style={styles.heroSubtitle}>
            Organiza tus proveedores clave, términos de pago y contactos
            directos.
          </Text>
        </View>
      </View>

      <View style={styles.searchCard}>
        <Text style={styles.searchTitle}>Buscar proveedor</Text>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Nombre, RIF o contacto"
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#9aa2b1"
          />
        </View>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>
        {searchQuery
          ? "No se encontraron proveedores"
          : "Aún no hay proveedores registrados"}
      </Text>
      <Text style={styles.emptySubtitle}>
        Registra proveedores para vincularlos con tus compras y cuentas por
        pagar.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Cargando proveedores...</Text>
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
        data={sortedSuppliers}
        renderItem={renderSupplier}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddSupplier")}
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
  },
  loadingText: {
    fontSize: 16,
    color: "#4c5767",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 16,
  },
  headerContent: {
    gap: 24,
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
    backgroundColor: "#fff5f3",
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
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d9e0eb",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchIcon: {
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
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
  supplierName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2633",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#fff5f3",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#d55335",
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
});

export default SuppliersScreen;
