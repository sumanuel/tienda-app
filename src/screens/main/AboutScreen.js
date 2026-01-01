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
import { useNavigation } from "@react-navigation/native";

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
            <Text style={styles.contactButtonText}>📧 soporte@tsuma.com</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleWebsitePress}
            activeOpacity={0.8}
          >
            <Text style={styles.contactButtonText}>🌐 www.tsuma.com</Text>
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
          <Text style={styles.footerEmoji}>🚀</Text>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 16,
  },
  brandCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 6,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#2f5ae0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  versionText: {
    fontSize: 14,
    color: "#6f7c8c",
    marginBottom: 8,
  },
  taglineText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2633",
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2633",
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 15,
    color: "#5b6472",
    lineHeight: 22,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 15,
    color: "#5b6472",
    lineHeight: 20,
  },
  contactText: {
    fontSize: 15,
    color: "#5b6472",
    marginBottom: 16,
    lineHeight: 22,
  },
  contactButton: {
    backgroundColor: "#f3f8ff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  contactButtonText: {
    fontSize: 15,
    color: "#2f5ae0",
    fontWeight: "600",
  },
  legalText: {
    fontSize: 14,
    color: "#6f7c8c",
    lineHeight: 20,
    marginBottom: 8,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2633",
    marginBottom: 8,
  },
  footerEmoji: {
    fontSize: 24,
  },
});

export default AboutScreen;
