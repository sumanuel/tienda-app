import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { useCustomAlert } from "../../components/common/CustomAlert";
import { getCloudAccessState } from "../../services/firebase/cloudAccess";
import {
  acceptInviteForCurrentUser,
  createInviteForActiveStore,
  createStoreForCurrentUser,
  getAvailableStoreRoles,
  listInvitesForStore,
  listMembersForStore,
  listPendingInvitesForCurrentUser,
} from "../../services/store/storeCollaborationService";
import {
  hs,
  iconSize,
  rf,
  s,
  spacing,
  borderRadius,
  vs,
} from "../../utils/responsive";

const canManageCollaborators = (membership) => {
  const role = String(membership?.role || "").trim();
  return role === "owner" || role === "admin";
};

const formatRole = (role) => {
  const map = {
    owner: "Propietario",
    admin: "Administrador",
    seller: "Ventas",
    inventory: "Inventario",
    viewer: "Consulta",
  };
  return map[role] || role || "Miembro";
};

const getStoreErrorMessage = (error, fallbackMessage) => {
  const code = String(error?.code || "")
    .trim()
    .toLowerCase();

  if (code === "permission-denied") {
    return "Firestore rechazó la operación por permisos. Debes publicar las reglas nuevas del modelo multi-tenant antes de crear tiendas o invitaciones.";
  }

  return error?.message || fallbackMessage;
};

export const StoreManagementScreen = () => {
  const { activeStoreId, memberships, storeLoading, switchStore, syncNow } =
    useAuth();
  const { showAlert, CustomAlert } = useCustomAlert();
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState([]);
  const [storeInvites, setStoreInvites] = useState([]);
  const [incomingInvites, setIncomingInvites] = useState([]);
  const [newStoreName, setNewStoreName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("seller");

  const roles = useMemo(
    () => getAvailableStoreRoles().filter((role) => role !== "owner"),
    [],
  );

  const activeMembership = useMemo(
    () => memberships.find((item) => item.storeId === activeStoreId) || null,
    [memberships, activeStoreId],
  );
  const cloudAccessState = getCloudAccessState();
  const isCloudBlocked = Boolean(cloudAccessState?.disabled);
  const hasAnyMembership = memberships.length > 0;

  const loadData = async () => {
    try {
      setLoadingData(true);

      if (isCloudBlocked) {
        setIncomingInvites([]);
        setMembers([]);
        setStoreInvites([]);
        return;
      }

      const [nextIncomingInvites, nextMembers, nextStoreInvites] =
        await Promise.all([
          listPendingInvitesForCurrentUser(),
          activeStoreId
            ? listMembersForStore(activeStoreId)
            : Promise.resolve([]),
          activeStoreId
            ? listInvitesForStore(activeStoreId)
            : Promise.resolve([]),
        ]);

      setIncomingInvites(nextIncomingInvites);
      setMembers(nextMembers);
      setStoreInvites(nextStoreInvites);
    } catch (error) {
      console.error("Error loading store management data:", error);
      showAlert({
        title: "Error",
        message: getStoreErrorMessage(
          error,
          "No se pudo cargar la información de tiendas y colaboradores.",
        ),
        type: "error",
      });
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeStoreId, memberships.length, isCloudBlocked]);

  const handleSwitchStore = async (storeId) => {
    try {
      setSubmitting(true);
      await switchStore(storeId);
      await syncNow("stores:switch");
      showAlert({
        title: "Tienda activa actualizada",
        message: "Ahora estás trabajando sobre la tienda seleccionada.",
        type: "success",
      });
    } catch (error) {
      console.error("Error switching store:", error);
      showAlert({
        title: "Error",
        message: getStoreErrorMessage(error, "No se pudo cambiar de tienda."),
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateStore = async () => {
    try {
      setSubmitting(true);
      const createdStore = await createStoreForCurrentUser({
        name: newStoreName,
      });
      setNewStoreName("");
      await switchStore(createdStore.storeId);
      await syncNow("stores:create");
      await loadData();
      showAlert({
        title: "Tienda creada",
        message: `Ahora estás trabajando en ${createdStore.storeName}.`,
        type: "success",
      });
    } catch (error) {
      console.error("Error creating store:", error);
      showAlert({
        title: "Error",
        message: getStoreErrorMessage(error, "No se pudo crear la tienda."),
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInvite = async () => {
    try {
      setSubmitting(true);
      await createInviteForActiveStore({
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteEmail("");
      await loadData();
      showAlert({
        title: "Invitación creada",
        message: "La invitación quedó registrada para ese correo.",
        type: "success",
      });
    } catch (error) {
      console.error("Error creating invite:", error);
      showAlert({
        title: "Error",
        message: getStoreErrorMessage(error, "No se pudo crear la invitación."),
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptInvite = async (invite) => {
    try {
      setSubmitting(true);
      const accepted = await acceptInviteForCurrentUser(invite);
      await switchStore(accepted.storeId);
      await syncNow("stores:accept-invite");
      await loadData();
      showAlert({
        title: "Invitación aceptada",
        message: `Ya tienes acceso a ${accepted.storeName}.`,
        type: "success",
      });
    } catch (error) {
      console.error("Error accepting invite:", error);
      showAlert({
        title: "Error",
        message: getStoreErrorMessage(
          error,
          "No se pudo aceptar la invitación.",
        ),
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons
              name="storefront-outline"
              size={iconSize.lg}
              color="#2f5ae0"
            />
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>Tiendas y colaboradores</Text>
            <Text style={styles.heroSubtitle}>
              Cambia de tienda, crea nuevas sedes e invita usuarios por correo.
            </Text>
            <Text style={styles.activePill}>
              Activa: {activeMembership?.storeName || "Sin tienda"}
            </Text>
          </View>
        </View>

        {isCloudBlocked && (
          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>
              Sin tienda activa en Firestore
            </Text>
            <Text style={styles.warningText}>
              Los datos que guardaste en el onboarding quedaron en la base
              local, pero no se creó la tienda en la nube porque Firestore sigue
              rechazando permisos en esta sesión. Hasta que eso se resuelva,
              aquí vas a ver "Sin tienda".
            </Text>
          </View>
        )}

        {(storeLoading || loadingData) && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#2f5ae0" />
            <Text style={styles.loadingText}>Cargando información...</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Mis tiendas</Text>
          {!hasAnyMembership ? (
            <Text style={styles.emptyText}>
              No hay tiendas cargadas para este usuario en Firestore.
            </Text>
          ) : (
            memberships.map((membership) => {
              const isActive = membership.storeId === activeStoreId;
              return (
                <View key={membership.storeId} style={styles.listRow}>
                  <View style={styles.listInfo}>
                    <Text style={styles.listTitle}>{membership.storeName}</Text>
                    <Text style={styles.listSubtitle}>
                      {formatRole(membership.role)}
                    </Text>
                  </View>
                  {isActive ? (
                    <View style={styles.badgeActive}>
                      <Text style={styles.badgeActiveText}>Activa</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.smallButton,
                        submitting && styles.buttonDisabled,
                      ]}
                      onPress={() => handleSwitchStore(membership.storeId)}
                      disabled={submitting}
                    >
                      <Text style={styles.smallButtonText}>Entrar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Crear nueva tienda</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Tienda Centro"
            placeholderTextColor="#8a94a6"
            value={newStoreName}
            onChangeText={setNewStoreName}
          />
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!newStoreName.trim() || submitting || isCloudBlocked) &&
                styles.buttonDisabled,
            ]}
            onPress={handleCreateStore}
            disabled={!newStoreName.trim() || submitting || isCloudBlocked}
          >
            <Text style={styles.primaryButtonText}>Crear tienda</Text>
          </TouchableOpacity>
          {isCloudBlocked && (
            <Text style={styles.helperText}>
              Debes corregir los permisos de Firestore y volver a iniciar sesión
              antes de crear la tienda en la nube.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Invitaciones recibidas</Text>
          {incomingInvites.length === 0 ? (
            <Text style={styles.emptyText}>
              No tienes invitaciones pendientes.
            </Text>
          ) : (
            incomingInvites.map((invite) => (
              <View key={invite.id} style={styles.listRow}>
                <View style={styles.listInfo}>
                  <Text style={styles.listTitle}>{invite.storeName}</Text>
                  <Text style={styles.listSubtitle}>
                    {formatRole(invite.role)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.smallButton,
                    submitting && styles.buttonDisabled,
                  ]}
                  onPress={() => handleAcceptInvite(invite)}
                  disabled={submitting}
                >
                  <Text style={styles.smallButtonText}>Aceptar</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Colaboradores actuales</Text>
          {members.length === 0 ? (
            <Text style={styles.emptyText}>
              No hay colaboradores cargados para esta tienda.
            </Text>
          ) : (
            members.map((member) => (
              <View key={member.uid} style={styles.listRow}>
                <View style={styles.listInfo}>
                  <Text style={styles.listTitle}>
                    {member.displayName || member.email || member.uid}
                  </Text>
                  <Text style={styles.listSubtitle}>
                    {formatRole(member.role)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {canManageCollaborators(activeMembership) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Invitar colaborador</Text>
            <TextInput
              style={styles.input}
              placeholder="correo@dominio.com"
              placeholderTextColor="#8a94a6"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={styles.roleRow}>
              {roles.map((role) => {
                const active = inviteRole === role;
                return (
                  <TouchableOpacity
                    key={role}
                    style={[styles.roleChip, active && styles.roleChipActive]}
                    onPress={() => setInviteRole(role)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        active && styles.roleChipTextActive,
                      ]}
                    >
                      {formatRole(role)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!inviteEmail.trim() || submitting) && styles.buttonDisabled,
              ]}
              onPress={handleCreateInvite}
              disabled={!inviteEmail.trim() || submitting}
            >
              <Text style={styles.primaryButtonText}>Crear invitación</Text>
            </TouchableOpacity>

            <Text style={styles.subsectionTitle}>
              Invitaciones de esta tienda
            </Text>
            {storeInvites.length === 0 ? (
              <Text style={styles.emptyText}>
                Aún no hay invitaciones registradas.
              </Text>
            ) : (
              storeInvites.map((invite) => (
                <View key={invite.id} style={styles.listRow}>
                  <View style={styles.listInfo}>
                    <Text style={styles.listTitle}>{invite.invitedEmail}</Text>
                    <Text style={styles.listSubtitle}>
                      {formatRole(invite.role)} ·{" "}
                      {invite.status === "pending" ? "Pendiente" : "Aceptada"}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
      <CustomAlert />
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: vs(120),
    gap: spacing.lg,
    backgroundColor: "#e8edf2",
  },
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: "row",
    gap: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(10) },
    shadowOpacity: 0.08,
    shadowRadius: s(18),
    elevation: 8,
  },
  heroIcon: {
    width: iconSize.xl,
    height: iconSize.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: "#f3f8ff",
    alignItems: "center",
    justifyContent: "center",
  },
  heroInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  heroTitle: {
    fontSize: rf(22),
    fontWeight: "700",
    color: "#1f2633",
  },
  heroSubtitle: {
    fontSize: rf(14),
    color: "#5b6472",
    lineHeight: rf(20),
  },
  activePill: {
    alignSelf: "flex-start",
    backgroundColor: "#edf3ff",
    color: "#2f5ae0",
    fontSize: rf(12),
    fontWeight: "700",
    paddingHorizontal: hs(10),
    paddingVertical: vs(6),
    borderRadius: s(999),
  },
  loadingBox: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.md,
  },
  warningCard: {
    backgroundColor: "#fff8e8",
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: "#f2ddb2",
  },
  warningTitle: {
    fontSize: rf(16),
    fontWeight: "800",
    color: "#8b5e00",
  },
  warningText: {
    fontSize: rf(14),
    color: "#7a6240",
    lineHeight: rf(20),
  },
  loadingText: {
    fontSize: rf(14),
    color: "#5b6472",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(8) },
    shadowOpacity: 0.06,
    shadowRadius: s(14),
    elevation: 6,
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: "#1f2633",
  },
  subsectionTitle: {
    fontSize: rf(15),
    fontWeight: "700",
    color: "#2f3a4c",
    marginTop: vs(4),
  },
  input: {
    backgroundColor: "#f3f5fa",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    fontSize: rf(15),
    color: "#1f2633",
  },
  primaryButton: {
    backgroundColor: "#2f5ae0",
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: rf(15),
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: vs(4),
  },
  listInfo: {
    flex: 1,
    gap: vs(4),
  },
  listTitle: {
    fontSize: rf(15),
    fontWeight: "700",
    color: "#1f2633",
  },
  listSubtitle: {
    fontSize: rf(13),
    color: "#6f7c8c",
  },
  badgeActive: {
    backgroundColor: "#eaf7ee",
    borderRadius: borderRadius.sm,
    paddingHorizontal: hs(10),
    paddingVertical: vs(6),
  },
  badgeActiveText: {
    color: "#1f9254",
    fontWeight: "700",
    fontSize: rf(12),
  },
  smallButton: {
    backgroundColor: "#eef3ff",
    borderRadius: borderRadius.sm,
    paddingHorizontal: hs(12),
    paddingVertical: vs(8),
  },
  smallButtonText: {
    color: "#2f5ae0",
    fontSize: rf(13),
    fontWeight: "700",
  },
  roleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  roleChip: {
    paddingHorizontal: hs(12),
    paddingVertical: vs(8),
    borderRadius: borderRadius.sm,
    backgroundColor: "#f0f3fa",
  },
  roleChipActive: {
    backgroundColor: "#2f5ae0",
  },
  roleChipText: {
    color: "#506074",
    fontSize: rf(13),
    fontWeight: "600",
  },
  roleChipTextActive: {
    color: "#fff",
  },
  emptyText: {
    fontSize: rf(14),
    color: "#6f7c8c",
  },
  helperText: {
    fontSize: rf(13),
    color: "#6f7c8c",
    lineHeight: rf(18),
  },
});

export default StoreManagementScreen;
