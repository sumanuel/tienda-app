import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Linking,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  InfoPill,
  SurfaceCard,
  UI_COLORS,
  SHADOWS,
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

import appConfig from "../../../app.json";

const appVersion = appConfig?.expo?.version || "1.0.0";

export const AboutScreen = () => {
  const handleEmailPress = () => {
    Linking.openURL("mailto:soporte@tsuma.com");
  };

  const handleWebsitePress = () => {
    Linking.openURL("https://tsuma.com");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo/Brand Section */}
        <SurfaceCard style={styles.brandCard}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../../assets/icon.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <InfoPill text={`Versión ${appVersion}`} tone="info" />
          <Text style={styles.logoText}>T-Suma</Text>
          <Text style={styles.taglineText}>
            Sistema de Punto de Venta Inteligente
          </Text>
        </SurfaceCard>

        {/* Description */}
        <SurfaceCard style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Sobre la aplicación</Text>
          <Text style={styles.descriptionText}>
            T-Suma es un sistema completo de punto de venta diseñado para
            pequeños y medianos negocios. Gestiona inventarios, ventas, clientes
            y finanzas de manera eficiente y sencilla.
          </Text>
        </SurfaceCard>

        {/* Features */}
        <SurfaceCard style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Características principales</Text>
          <View style={styles.featuresList}>
            <Text style={styles.featureItem}>
              • Gestión de productos e inventario
            </Text>
            <Text style={styles.featureItem}>
              • Punto de venta con lector QR
            </Text>
            <Text style={styles.featureItem}>
              • Control de clientes y cuentas por cobrar
            </Text>
            <Text style={styles.featureItem}>
              • Reportes de ventas y estadísticas
            </Text>
            <Text style={styles.featureItem}>
              • Respaldos automáticos de datos
            </Text>
            <Text style={styles.featureItem}>
              • Interfaz intuitiva y moderna
            </Text>
          </View>
        </SurfaceCard>

        {/* Contact */}
        <SurfaceCard style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Contacto</Text>
          <Text style={styles.contactText}>
            Para soporte técnico o consultas:
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.contactButton,
              pressed && styles.cardPressed,
            ]}
            onPress={handleEmailPress}
          >
            <Ionicons
              name="mail-outline"
              size={rf(18)}
              color={UI_COLORS.info}
            />
            <Text style={styles.contactButtonText}>jesusprada27@gmail.com</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.contactButton,
              pressed && styles.cardPressed,
            ]}
            onPress={handleWebsitePress}
          >
            <Ionicons
              name="globe-outline"
              size={rf(18)}
              color={UI_COLORS.info}
            />
            <Text style={styles.contactButtonText}>https://trenkit.com/</Text>
          </Pressable>
        </SurfaceCard>

        {/* Legal */}
        <SurfaceCard style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Información legal</Text>
          <Text style={styles.legalText}>
            © 2025 T-Suma. Todos los derechos reservados.
          </Text>
          <Text style={styles.legalText}>
            Esta aplicación está protegida por leyes de propiedad intelectual.
          </Text>
        </SurfaceCard>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Gracias por usar T-Suma</Text>
          <Ionicons name="rocket-outline" size={rf(22)} color="#2f5ae0" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_COLORS.page,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: vs(120),
    gap: spacing.lg,
  },
  brandCard: {
    padding: s(32),
    alignItems: "center",
    gap: spacing.sm,
    ...SHADOWS.soft,
  },
  logoContainer: {
    width: s(96),
    height: s(96),
    borderRadius: s(28),
    backgroundColor: UI_COLORS.infoSoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  logoText: {
    fontSize: rf(24),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  taglineText: {
    fontSize: rf(15),
    fontWeight: "600",
    color: UI_COLORS.muted,
    textAlign: "center",
  },
  infoCard: {
    padding: s(22),
    gap: spacing.md,
    ...SHADOWS.soft,
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  descriptionText: {
    fontSize: rf(15),
    color: UI_COLORS.muted,
    lineHeight: s(22),
  },
  featuresList: {
    gap: s(8),
  },
  featureItem: {
    fontSize: rf(15),
    color: UI_COLORS.muted,
    lineHeight: s(20),
  },
  contactText: {
    fontSize: rf(15),
    color: UI_COLORS.muted,
    lineHeight: s(22),
  },
  contactButton: {
    backgroundColor: UI_COLORS.infoSoft,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    flexDirection: "row",
    alignItems: "center",
    gap: hs(10),
  },
  contactButtonText: {
    fontSize: rf(15),
    color: UI_COLORS.info,
    fontWeight: "700",
  },
  legalText: {
    fontSize: rf(14),
    color: UI_COLORS.muted,
    lineHeight: s(20),
  },
  footer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  footerText: {
    fontSize: rf(16),
    fontWeight: "600",
    color: UI_COLORS.text,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});

export default AboutScreen;
