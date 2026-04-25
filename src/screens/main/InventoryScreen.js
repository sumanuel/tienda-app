import React from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  ScreenHero,
  SurfaceCard,
  UI_COLORS,
  SHADOWS,
} from "../../components/common/AppUI";
import { rf, spacing, vs } from "../../utils/responsive";

export const InventoryScreen = ({ navigation }) => {
  const actions = [
    {
      key: "entry",
      title: "Entradas",
      subtitle: "Consulta productos y registra reposiciones o compras.",
      icon: "arrow-down-circle-outline",
      tone: UI_COLORS.accent,
      screen: "InventoryEntry",
    },
    {
      key: "exit",
      title: "Salidas",
      subtitle: "Revisa rebajas de stock y registra ajustes o pérdidas.",
      icon: "arrow-up-circle-outline",
      tone: UI_COLORS.danger,
      screen: "InventoryExit",
    },
    {
      key: "movements",
      title: "Movimientos",
      subtitle: "Explora el historial completo de entradas y salidas.",
      icon: "cube-outline",
      tone: UI_COLORS.warning,
      screen: "InventoryMovements",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ScreenHero
          iconName="layers-outline"
          iconColor={UI_COLORS.warning}
          eyebrow="Inventario"
          title="Centro de inventario"
          subtitle="Accede rápido a entradas, salidas y movimientos con una lectura más clara del flujo operativo."
        />

        {actions.map((action) => (
          <Pressable
            key={action.key}
            style={({ pressed }) => [
              styles.actionCard,
              pressed && styles.pressed,
            ]}
            onPress={() => navigation.navigate(action.screen)}
          >
            <SurfaceCard style={styles.actionCardInner}>
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: `${action.tone}18` },
                ]}
              >
                <Ionicons
                  name={action.icon}
                  size={rf(24)}
                  color={action.tone}
                />
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={rf(20)}
                color={UI_COLORS.muted}
              />
            </SurfaceCard>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_COLORS.page,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  actionCard: {
    borderRadius: 24,
  },
  actionCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    ...SHADOWS.soft,
  },
  actionIcon: {
    width: vs(50),
    height: vs(50),
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCopy: {
    flex: 1,
    gap: vs(4),
  },
  actionTitle: {
    fontSize: rf(16),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  actionSubtitle: {
    fontSize: rf(13),
    color: UI_COLORS.muted,
    lineHeight: vs(18),
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

export default InventoryScreen;
