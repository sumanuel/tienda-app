import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTourGuideController } from "rn-tourguide";
import { useCustomers } from "../../hooks/useCustomers";
import { getAllSales } from "../../services/database/sales";
import { getAllAccountsReceivable } from "../../services/database/accounts";
import { useCustomAlert } from "../../components/common/CustomAlert";
import { hasSeenTour, markTourSeen } from "../../services/tour/tourStorage";
import {
  EmptyStateCard,
  FloatingActionButton,
  InfoPill,
  ScreenHero,
  SurfaceCard,
  SHADOWS,
  UI_COLORS,
} from "../../components/common/AppUI";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";

export const CustomersScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
  const { canStart, start, TourGuideZone } =
    useTourGuideController("customers");
  const TOUR_ZONE_BASE = 2000;
  const [tourBooted, setTourBooted] = useState(false);

  const fabBottom = vs(24) + Math.max(insets.bottom, vs(24));
  const listPaddingBottom = iconSize.xl + fabBottom + vs(24);

  const [searchQuery, setSearchQuery] = useState("");

  // Recargar clientes cuando la pantalla se enfoque
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    let mounted = true;

    const maybeStartTour = async () => {
      if (tourBooted) return;
      if (!canStart) return;

      const tourId = "customers";
      const seen = await hasSeenTour(tourId);
      if (!mounted) return;

      if (!seen) {
        setTimeout(() => {
          start();
          markTourSeen(tourId);
        }, 450);
      }

      if (mounted) setTourBooted(true);
    };

    maybeStartTour();

    return () => {
      mounted = false;
    };
  }, [canStart, start, tourBooted]);

  const handleSearch = useCallback(
    (query) => {
      setSearchQuery(query);
      search(query);
    },
    [search],
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
          getAllSales(100000),
          getAllAccountsReceivable(),
        ]);

        const customerSales = allSales.filter(
          (sale) => Number(sale.customerId) === Number(customer.id),
        );
        const customerReceivables = allReceivables.filter(
          (account) => Number(account.customerId) === Number(customer.id),
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
    [removeCustomer, showAlert],
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
          <Pressable
            style={({ pressed }) => [
              styles.cardBody,
              pressed && !isGeneric && styles.cardPressed,
            ]}
            onPress={
              isGeneric
                ? undefined
                : () => navigation.navigate("EditCustomer", { customer: item })
            }
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
              <InfoPill
                text={
                  item.customerNumber ||
                  `CLI-${String(item.id).padStart(6, "0")}`
                }
                tone={isGeneric ? "warning" : "info"}
              />
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Documento</Text>
              <Text style={styles.infoValue}>
                {item.documentNumber || "Sin documento"}
              </Text>
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
          </Pressable>

          {!isGeneric && (
            <Pressable
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.cardPressed,
              ]}
              onPress={() => confirmDeleteCustomer(item)}
            >
              <Ionicons name="close" size={rf(16)} color={UI_COLORS.danger} />
            </Pressable>
          )}
        </View>
      );
    },
    [navigation, confirmDeleteCustomer],
  );

  const header = (
    <View style={styles.headerContent}>
      <ScreenHero
        iconName="people-outline"
        iconColor={UI_COLORS.info}
        eyebrow="Clientes"
        title="Directorio de clientes"
        subtitle="Busca, actualiza y mantiene a mano la información de cada cliente."
        pills={[
          { text: `${customers.length} registrados`, tone: "accent" },
          {
            text: `${sortedCustomers.filter((item) => item.documentNumber === "1").length} genérico`,
            tone: "warning",
          },
        ]}
      />

      <TourGuideZone
        zone={TOUR_ZONE_BASE + 1}
        text={
          "Usa 'Buscar cliente' (Nombre, cédula o contacto) para encontrarlo rápidamente."
        }
        borderRadius={borderRadius.lg}
        style={styles.searchCard}
      >
        <SurfaceCard style={styles.searchSurface}>
          <View style={styles.searchTitleBlock}>
            <Text style={styles.searchTitle}>Buscar cliente</Text>
            <Text style={styles.searchHint}>
              Filtra por nombre, cédula o dato de contacto.
            </Text>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Nombre, cédula o contacto"
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#9aa2b1"
          />
        </SurfaceCard>
      </TourGuideZone>

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
    <EmptyStateCard
      title={
        searchQuery
          ? "No se encontraron clientes"
          : "Aún no hay clientes registrados"
      }
      subtitle="Registra nuevos clientes para guardar sus datos y asociar cuentas por cobrar."
    />
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
        <Pressable
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.cardPressed,
          ]}
          onPress={refresh}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </Pressable>
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
        contentContainerStyle={[
          styles.list,
          { paddingBottom: listPaddingBottom },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      <TourGuideZone
        zone={TOUR_ZONE_BASE + 2}
        text={"Presiona '+' para registrar un nuevo cliente."}
        shape="circle"
      >
        <FloatingActionButton
          onPress={() => navigation.navigate("AddCustomer")}
          bottom={fabBottom}
          iconName="add"
        />
      </TourGuideZone>
      <CustomAlert />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_COLORS.page,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: UI_COLORS.page,
  },
  loadingText: {
    fontSize: rf(16),
    color: "#4c5767",
  },
  list: {
    paddingHorizontal: hs(16),
    paddingTop: vs(16),
    paddingBottom: vs(120),
  },
  headerContent: {
    gap: vs(16),
    marginBottom: vs(8),
  },
  searchCard: {
    gap: vs(14),
  },
  searchSurface: {
    gap: vs(14),
    ...SHADOWS.soft,
  },
  searchTitleBlock: {
    gap: vs(4),
  },
  searchTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  searchHint: {
    fontSize: rf(13),
    color: UI_COLORS.muted,
    lineHeight: vs(18),
  },
  searchInput: {
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: vs(12),
    paddingHorizontal: hs(16),
    fontSize: rf(15),
    color: UI_COLORS.text,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: UI_COLORS.surface,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    padding: spacing.lg,
    ...SHADOWS.soft,
    gap: hs(16),
    marginBottom: vs(12),
  },
  cardBody: {
    flex: 1,
    gap: vs(12),
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: hs(12),
  },
  customerName: {
    flex: 1,
    fontSize: rf(16),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  genericCustomerName: {
    color: UI_COLORS.muted,
    fontStyle: "italic",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: hs(12),
  },
  infoLabel: {
    fontSize: rf(13),
    fontWeight: "700",
    color: UI_COLORS.muted,
  },
  infoValue: {
    fontSize: rf(13),
    color: UI_COLORS.text,
    flex: 1,
    textAlign: "right",
  },
  deleteButton: {
    width: s(44),
    height: s(44),
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    backgroundColor: UI_COLORS.dangerSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: rf(16),
    color: UI_COLORS.danger,
    textAlign: "center",
    marginBottom: vs(16),
  },
  retryButton: {
    backgroundColor: UI_COLORS.info,
    paddingHorizontal: hs(20),
    paddingVertical: vs(12),
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    shadowColor: UI_COLORS.info,
    shadowOffset: { width: 0, height: s(2) },
    shadowOpacity: 0.3,
    shadowRadius: s(4),
    elevation: 4,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
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
