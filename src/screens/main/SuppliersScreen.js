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
import { useSuppliers } from "../../hooks/useSuppliers";
import { getAllAccountsPayable } from "../../services/database/accounts";
import { useCustomAlert } from "../../components/common/CustomAlert";
import { hasSeenTour, markTourSeen } from "../../services/tour/tourStorage";
import {
  EmptyStateCard,
  FloatingActionButton,
  InfoPill,
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

export const SuppliersScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { canStart, start, TourGuideZone } =
    useTourGuideController("suppliers");
  const TOUR_ZONE_BASE = 3000;
  const { suppliers, loading, error, search, removeSupplier, refresh } =
    useSuppliers();
  const { showAlert, CustomAlert } = useCustomAlert();

  const fabBottom = vs(24) + Math.max(insets.bottom, vs(24));
  const listPaddingBottom = iconSize.xl + fabBottom + vs(24);

  const [searchQuery, setSearchQuery] = useState("");
  const [tourBooted, setTourBooted] = useState(false);

  const handleSearch = useCallback(
    (query) => {
      setSearchQuery(query);
      search(query);
    },
    [search],
  );

  // Recargar proveedores cuando la pantalla se enfoque
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    let mounted = true;
    let timeoutId;

    const maybeStartTour = async () => {
      if (tourBooted) return;
      if (!canStart) return;

      const tourId = "suppliers";
      const seen = await hasSeenTour(tourId);
      if (!mounted) return;

      if (!seen) {
        timeoutId = setTimeout(() => {
          start();
          markTourSeen(tourId);
        }, 450);
      }

      if (mounted) setTourBooted(true);
    };

    maybeStartTour();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [canStart, start, tourBooted]);

  const confirmDeleteSupplier = useCallback(
    async (supplier) => {
      try {
        // Verificar si el proveedor tiene movimientos asociados
        const allPayables = await getAllAccountsPayable();
        const supplierPayables = allPayables.filter(
          (account) => Number(account.supplierId) === Number(supplier.id),
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
    [removeSupplier, showAlert],
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
          <Pressable
            style={({ pressed }) => [
              styles.cardBody,
              pressed && styles.cardPressed,
            ]}
            onPress={() =>
              navigation.navigate("EditSupplier", { supplier: item })
            }
          >
            <View style={styles.cardHeader}>
              <View style={styles.supplierHeaderCopy}>
                <InfoPill
                  text={item.contactPerson || "Sin contacto"}
                  tone="info"
                />
                <Text style={styles.supplierName}>
                  {String(item.name || "").toUpperCase()}
                </Text>
              </View>
              <InfoPill
                text={
                  item.supplierNumber ||
                  `PRV-${String(item.id).padStart(6, "0")}`
                }
                tone="warning"
              />
            </View>

            <View style={styles.metaStack}>
              <View style={styles.metaRow}>
                <View style={[styles.metaCard, styles.metaCardHalf]}>
                  <Text style={styles.metaLabel}>Documento</Text>
                  <Text style={styles.metaValue}>
                    {item.documentNumber || "Sin documento"}
                  </Text>
                </View>

                <View style={[styles.metaCard, styles.metaCardHalf]}>
                  <Text style={styles.metaLabel}>Teléfono</Text>
                  <Text style={styles.metaValue}>
                    {item.phone || "Sin registro"}
                  </Text>
                </View>
              </View>

              <View style={[styles.metaCard, styles.metaCardWide]}>
                <Text style={styles.metaLabel}>Términos</Text>
                <Text style={styles.metaValue}>
                  {hasTerms ? item.paymentTerms : "No definidos"}
                </Text>
              </View>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.cardPressed,
            ]}
            onPress={() => confirmDeleteSupplier(item)}
          >
            <Ionicons name="close" size={rf(16)} color={UI_COLORS.danger} />
          </Pressable>
        </View>
      );
    },
    [navigation, confirmDeleteSupplier],
  );

  const header = useMemo(
    () => (
      <View style={styles.headerContent}>
        <SurfaceCard style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Ionicons
                name="business-outline"
                size={rf(22)}
                color={UI_COLORS.info}
              />
            </View>
            <InfoPill text={`${suppliers.length} proveedores`} tone="accent" />
          </View>

          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>Compras</Text>
            <Text style={styles.heroTitle}>Proveedores y aliados</Text>
            <Text style={styles.heroSubtitle}>
              Organiza contactos, documentos y términos de pago con una lectura
              más clara.
            </Text>
          </View>
        </SurfaceCard>

        <TourGuideZone
          zone={TOUR_ZONE_BASE + 1}
          text={
            "Usa 'Buscar proveedor' (Nombre, RIF o contacto) para encontrarlo rápidamente."
          }
          borderRadius={borderRadius.lg}
          style={styles.searchCard}
        >
          <SurfaceCard style={styles.searchSurface}>
            <View style={styles.searchTitleBlock}>
              <Text style={styles.searchTitle}>Buscar proveedor</Text>
              <Text style={styles.searchHint}>
                Filtra por nombre, RIF o contacto principal.
              </Text>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Nombre, RIF o contacto"
              value={searchQuery}
              onChangeText={handleSearch}
              placeholderTextColor="#9aa2b1"
            />
          </SurfaceCard>
        </TourGuideZone>
      </View>
    ),
    [
      TOUR_ZONE_BASE,
      TourGuideZone,
      handleSearch,
      searchQuery,
      suppliers.length,
    ],
  );

  const renderEmpty = useCallback(
    () => (
      <EmptyStateCard
        style={styles.emptyCard}
        title={
          searchQuery
            ? "No se encontraron proveedores"
            : "Aún no hay proveedores registrados"
        }
        subtitle="Registra proveedores para vincularlos con tus compras y cuentas por pagar."
      />
    ),
    [searchQuery],
  );

  const supplierKeyExtractor = useCallback((item) => item.id.toString(), []);

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
        data={sortedSuppliers}
        renderItem={renderSupplier}
        keyExtractor={supplierKeyExtractor}
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
        text={"Presiona '+' para registrar un nuevo proveedor."}
        shape="circle"
      >
        <FloatingActionButton
          style={styles.fab}
          bottom={fabBottom}
          onPress={() => navigation.navigate("AddSupplier")}
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
    color: UI_COLORS.muted,
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
  heroCard: {
    gap: vs(14),
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: hs(12),
  },
  heroBadge: {
    width: s(48),
    height: s(48),
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    backgroundColor: UI_COLORS.infoSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  heroCopy: {
    gap: vs(6),
  },
  heroEyebrow: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: s(0.8),
  },
  heroTitle: {
    fontSize: rf(20),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  heroSubtitle: {
    fontSize: rf(14),
    color: UI_COLORS.muted,
    lineHeight: vs(20),
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
    fontSize: rf(12),
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
    gap: hs(16),
    marginBottom: vs(12),
    ...SHADOWS.soft,
  },
  cardBody: {
    flex: 1,
    gap: vs(12),
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: hs(12),
  },
  supplierHeaderCopy: {
    flex: 1,
    gap: vs(8),
  },
  supplierName: {
    flex: 1,
    fontSize: rf(15),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  metaStack: {
    gap: hs(12),
  },
  metaRow: {
    flexDirection: "row",
    gap: hs(12),
  },
  metaCard: {
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: hs(12),
    paddingVertical: vs(10),
    gap: vs(4),
  },
  metaCardHalf: {
    flex: 1,
    minWidth: 0,
  },
  metaCardWide: {
    width: "100%",
  },
  metaLabel: {
    fontSize: rf(11),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: s(0.6),
  },
  metaValue: {
    fontSize: rf(12),
    color: UI_COLORS.text,
    fontWeight: "600",
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
  fab: {
    right: hs(20),
  },
  emptyCard: {
    marginTop: vs(40),
  },
  errorText: {
    fontSize: rf(16),
    color: UI_COLORS.danger,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: UI_COLORS.info,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

export default SuppliersScreen;
