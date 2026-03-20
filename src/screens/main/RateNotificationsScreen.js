import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
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

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{formatDateTime(item.createdAt)}</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
        >
          <Text style={styles.deleteText}>🗑️</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.message}>{item.message}</Text>
    </View>
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: vs(8),
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
});

export default RateNotificationsScreen;
