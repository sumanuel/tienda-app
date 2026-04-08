import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";

export const AboutScreen = () => {
  const navigation = useNavigation();

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
        <View style={styles.brandCard}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>T-Suma</Text>
          </View>
          <Text style={styles.versionText}>Versión 1.0.0</Text>
          <Text style={styles.taglineText}>
            Sistema de Punto de Venta Inteligente
          </Text>
        </View>

        {/* Description */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Sobre la aplicación</Text>
          <Text style={styles.descriptionText}>
            T-Suma es un sistema completo de punto de venta diseñado para
            pequeños y medianos negocios. Gestiona inventarios, ventas, clientes
            y finanzas de manera eficiente y sencilla.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.infoCard}>
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
        </View>

        {/* Contact */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Contacto</Text>
          <Text style={styles.contactText}>
            Para soporte técnico o consultas:
          </Text>

          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleEmailPress}
            activeOpacity={0.8}
          >
            <Text style={styles.contactButtonText}>
              📧 jesusprada27@gmail.com
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleWebsitePress}
            activeOpacity={0.8}
          >
            <Text style={styles.contactButtonText}>
              🌐 https://trenkit.com/
            </Text>
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Información legal</Text>
          <Text style={styles.legalText}>
            © 2025 T-Suma. Todos los derechos reservados.
          </Text>
          <Text style={styles.legalText}>
            Esta aplicación está protegida por leyes de propiedad intelectual.
          </Text>
        </View>

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
    backgroundColor: "#e8edf2",
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: vs(120),
    gap: spacing.lg,
  },
  brandCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: s(32),
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: s(14),
    elevation: 6,
  },
  logoContainer: {
    width: s(80),
    height: s(80),
    borderRadius: s(40),
    backgroundColor: "#2f5ae0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  logoText: {
    fontSize: rf(24),
    fontWeight: "700",
    color: "#fff",
  },
  versionText: {
    fontSize: rf(14),
    color: "#6f7c8c",
    marginBottom: s(8),
  },
  taglineText: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#1f2633",
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: s(22),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: s(14),
    elevation: 6,
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: "#1f2633",
    marginBottom: spacing.lg,
  },
  descriptionText: {
    fontSize: rf(15),
    color: "#5b6472",
    lineHeight: s(22),
  },
  featuresList: {
    gap: s(8),
  },
  featureItem: {
    fontSize: rf(15),
    color: "#5b6472",
    lineHeight: s(20),
  },
  contactText: {
    fontSize: rf(15),
    color: "#5b6472",
    marginBottom: spacing.lg,
    lineHeight: s(22),
  },
  contactButton: {
    backgroundColor: "#f3f8ff",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: s(8),
  },
  contactButtonText: {
    fontSize: rf(15),
    color: "#2f5ae0",
    fontWeight: "600",
  },
  legalText: {
    fontSize: rf(14),
    color: "#6f7c8c",
    lineHeight: s(20),
    marginBottom: s(8),
  },
  footer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  footerText: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#1f2633",
    marginBottom: s(8),
  },
});

export default AboutScreen;
