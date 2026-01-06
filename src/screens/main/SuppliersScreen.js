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
import { useSuppliers } from "../../hooks/useSuppliers";
import { getAllAccountsPayable } from "../../services/database/accounts";
import { useCustomAlert } from "../../components/common/CustomAlert";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";

export const SuppliersScreen = () => {
  const navigation = useNavigation();
  const { suppliers, loading, error, search, removeSupplier, refresh } =
    useSuppliers();
  const { showAlert, CustomAlert } = useCustomAlert();

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
    async (supplier) => {
      try {
        // Verificar si el proveedor tiene movimientos asociados
        const allPayables = await getAllAccountsPayable();
        const supplierPayables = allPayables.filter(
          (account) => account.supplierId === supplier.id
        );

        if (supplierPayables.length > 0) {
          showAlert({
            title: "No se puede eliminar",
            message: `No se puede eliminar a ${supplier.name} porque tiene ${supplierPayables.length} cuenta(s) por pagar asociada(s).`,
            type: "error",
          });
          return;
        }

        // Si no tiene movimientos, mostrar confirmación de eliminación
        showAlert({
          title: "Confirmar eliminación",
          message: `¿Estás seguro de que quieres eliminar a ${supplier.name}?`,
          type: "warning",
          buttons: [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Eliminar",
              style: "destructive",
              onPress: async () => {
                try {
                  await removeSupplier(supplier.id);
                  showAlert({
                    title: "Éxito",
                    message: "Proveedor eliminado correctamente",
                    type: "success",
                  });
                } catch (error) {
                  console.error("Error eliminando proveedor:", error);
                  showAlert({
                    title: "Error",
                    message: "No se pudo eliminar el proveedor",
                    type: "error",
                  });
                }
              },
            },
          ],
        });
      } catch (error) {
        console.error("Error verificando movimientos del proveedor:", error);
        showAlert({
          title: "Error",
          message: "No se pudo verificar los movimientos del proveedor",
          type: "error",
        });
      }
    },
    [removeSupplier, showAlert]
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

  const header = (
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
        <TextInput
          style={styles.searchInput}
          placeholder="Nombre, RIF o contacto"
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#9aa2b1"
        />
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
        ListHeaderComponent={header}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddSupplier")}
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
    fontSize: rf(16),
    color: "#4c5767",
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: vs(120),
  },
  headerContent: {
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(10) },
    shadowOpacity: 0.08,
    shadowRadius: s(18),
    elevation: 8,
  },
  heroIcon: {
    width: iconSize.xl,
    height: iconSize.xl,
    borderRadius: borderRadius.xl,
    backgroundColor: "#fff5f3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.lg,
  },
  heroIconText: {
    fontSize: rf(30),
  },
  heroTextContainer: {
    flex: 1,
    gap: spacing.sm,
  },
  heroTitle: {
    fontSize: rf(20),
    fontWeight: "700",
    color: "#1f2633",
  },
  heroSubtitle: {
    fontSize: rf(14),
    color: "#5b6472",
    lineHeight: vs(20),
  },
  metricRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.05,
    shadowRadius: s(10),
    elevation: 4,
    gap: spacing.sm,
  },
  metricLabel: {
    fontSize: rf(12),
    fontWeight: "600",
    color: "#7a8796",
    textTransform: "uppercase",
    letterSpacing: s(0.8),
  },
  metricValue: {
    fontSize: rf(22),
    fontWeight: "700",
    color: "#1f2633",
  },
  metricHint: {
    fontSize: rf(12),
    color: "#6f7c8c",
  },
  searchCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.05,
    shadowRadius: s(8),
    elevation: 4,
    gap: spacing.md,
  },
  searchTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#1f2633",
  },
  searchInput: {
    backgroundColor: "#f3f5fa",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: rf(15),
    color: "#1f2633",
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.05,
    shadowRadius: s(10),
    elevation: 4,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cardBody: {
    flex: 1,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  supplierName: {
    flex: 1,
    fontSize: rf(16),
    fontWeight: "700",
    color: "#1f2633",
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: "#fff5f3",
  },
  badgeText: {
    fontSize: rf(12),
    fontWeight: "600",
    color: "#d55335",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  infoLabel: {
    fontSize: rf(13),
    fontWeight: "600",
    color: "#7a8796",
  },
  infoValue: {
    fontSize: rf(13),
    color: "#4c5767",
    flex: 1,
    textAlign: "right",
  },
  deleteButton: {
    width: iconSize.lg,
    height: iconSize.lg,
    borderRadius: borderRadius.md,
    backgroundColor: "#fff0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: rf(18),
    fontWeight: "700",
    color: "#d62828",
  },
  fab: {
    position: "absolute",
    bottom: vs(20),
    right: hs(20),
    width: iconSize.xl,
    height: iconSize.xl,
    borderRadius: s(28),
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(4) },
    shadowOpacity: 0.3,
    shadowRadius: s(8),
    elevation: 8,
  },
  fabIcon: {
    fontSize: rf(28),
    color: "#fff",
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.05,
    shadowRadius: s(10),
    elevation: 4,
    marginTop: vs(40),
  },
  emptyTitle: {
    fontSize: rf(17),
    fontWeight: "700",
    color: "#1f2633",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: rf(13),
    color: "#6f7c8c",
    textAlign: "center",
    lineHeight: vs(20),
  },
  errorText: {
    fontSize: rf(16),
    color: "#ef4444",
    textAlign: "center",
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: s(2) },
    shadowOpacity: 0.3,
    shadowRadius: s(4),
    elevation: 4,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});

export default SuppliersScreen;
