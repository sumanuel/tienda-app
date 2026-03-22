import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  deleteRateNotification,
  getRateNotifications,
} from "../../services/database/rateNotifications";
import { useRateNotifications } from "../../contexts/RateNotificationsContext";
import { rf, spacing, borderRadius, s, vs, hs } from "../../utils/responsive";

const formatDateTime = (value) => {
  try {
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
};

const RateNotificationsScreen = () => {
  const { refreshCount } = useRateNotifications();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const suppressOpenRef = useRef(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getRateNotifications({ limit: 200 });
      setItems(list || []);
    } catch (error) {
      console.error("Error loading rate notifications:", error);
    } finally {
      setLoading(false);
      refreshCount();
    }
  }, [refreshCount]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleDelete = (id) => {
    Alert.alert(
      "Eliminar notificación",
      "¿Deseas eliminar esta notificación?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRateNotification(id);
              setItems((prev) => prev.filter((x) => x.id !== id));
            } catch (error) {
              console.error("Error deleting notification:", error);
            } finally {
              refreshCount();
            }
          },
        },
      ],
    );
  };

  const getTypeMeta = (type) => {
    switch (type) {
      case "store_update":
        return { icon: "⬆️", label: "Actualización" };
      case "exchange_rate":
        return { icon: "💱", label: "Tasa" };
      default:
        return { icon: "🔔", label: "Aviso" };
    }
  };

  const maybeOpenUpdate = async (item) => {
    if (suppressOpenRef.current) {
      suppressOpenRef.current = false;
      return;
    }
    if (item?.type !== "store_update") return;
    const url = String(item?.source || "").trim();
    if (!url || !/^https?:\/\//i.test(url)) return;
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.warn("Error opening store update URL:", error);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={item?.type === "store_update" ? 0.85 : 1}
      onPress={() => maybeOpenUpdate(item)}
      style={[styles.card, item?.type === "store_update" && styles.cardUpdate]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>{getTypeMeta(item.type).icon}</Text>
          <View style={styles.headerTextBlock}>
            <Text style={styles.typeLabel}>{getTypeMeta(item.type).label}</Text>
            <Text style={styles.date}>{formatDateTime(item.createdAt)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            suppressOpenRef.current = true;
            handleDelete(item.id);
          }}
        >
          <Text style={styles.deleteText}>🗑️</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.message}>{item.message}</Text>
      {item?.type === "store_update" &&
        String(item?.source || "")
          .trim()
          .match(/^https?:\/\//i) && (
          <Text style={styles.tapHint}>Toca para abrir Play Store</Text>
        )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {items.length === 0 && !loading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Sin notificaciones</Text>
          <Text style={styles.emptyText}>
            Aquí se guardarán los avisos de tasa cuando decidas no actualizar.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          onRefresh={load}
          refreshing={loading}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8edf2",
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: vs(24),
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: "#2f3a4c",
    marginBottom: vs(8),
  },
  emptyText: {
    fontSize: rf(13),
    color: "#6b778a",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(3) },
    shadowOpacity: 0.08,
    shadowRadius: s(8),
    elevation: 2,
  },
  cardUpdate: {
    borderWidth: 1,
    borderColor: "#bde5c5",
    backgroundColor: "#f4fbf5",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: vs(8),
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: hs(10),
    flex: 1,
  },
  headerIcon: {
    fontSize: rf(16),
  },
  headerTextBlock: {
    flex: 1,
  },
  typeLabel: {
    fontSize: rf(12),
    color: "#2f3a4c",
    fontWeight: "800",
  },
  date: {
    fontSize: rf(12),
    color: "#6b778a",
    fontWeight: "600",
  },
  deleteButton: {
    paddingHorizontal: hs(6),
    paddingVertical: vs(4),
  },
  deleteText: {
    fontSize: rf(16),
  },
  message: {
    fontSize: rf(14),
    color: "#2f3a4c",
    fontWeight: "600",
  },
  tapHint: {
    marginTop: vs(8),
    fontSize: rf(12),
    color: "#2e7d32",
    fontWeight: "700",
  },
});

export default RateNotificationsScreen;
