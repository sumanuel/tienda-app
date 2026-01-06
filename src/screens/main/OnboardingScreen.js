import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { s, rf, vs, hs, spacing, borderRadius, iconSize } from "../../utils/responsive";

const { width, height } = Dimensions.get("window");

const slides = [
  {
    id: 1,
    title: "¡Bienvenido a T-Suma!",
    description:
      "Tu sistema completo de punto de venta para gestionar tu negocio de manera eficiente.",
    icon: "🏪",
  },
  {
    id: 2,
    title: "Gestión de Productos",
    description:
      "Administra tu inventario, precios y stock. Escanea códigos QR para ventas rápidas.",
    icon: "📦",
  },
  {
    id: 3,
    title: "Ventas y Clientes",
    description:
      "Registra ventas, administra clientes y controla cuentas por cobrar y pagar.",
    icon: "💰",
  },
  {
    id: 4,
    title: "Reportes y Respaldos",
    description:
      "Visualiza estadísticas de ventas, genera respaldos automáticos y mantén tus datos seguros.",
    icon: "📊",
  },
];

export const OnboardingScreen = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef(null);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      const nextSlide = currentSlide + 1;
      setCurrentSlide(nextSlide);
      scrollViewRef.current?.scrollTo({
        x: nextSlide * width,
        animated: true,
      });
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem("onboardingCompleted", "true");
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Error saving onboarding status:", error);
      if (onComplete) {
        onComplete();
      }
    }
  };

  const handleScroll = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentSlide(slideIndex);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.skipContainer}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Saltar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={styles.slide}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{slide.icon}</Text>
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.title}>{slide.title}</Text>
              {slide.id === 3 ? (
                <Text style={styles.description}>
                  Registra ventas, administra clientes y controla cuentas por
                  cobrar y pagar.{" "}
                  <Text style={styles.boldText}>
                    La tasa de cambio actualiza automáticamente los precios de
                    productos y saldos de cuentas.
                  </Text>
                </Text>
              ) : (
                <Text style={styles.description}>{slide.description}</Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.indicatorContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                currentSlide === index && styles.activeIndicator,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {currentSlide === slides.length - 1 ? "Comenzar" : "Siguiente"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#4CAF50",
  },
  skipContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: hs(20),
    paddingTop: vs(50),
  },
  skipButton: {
    paddingVertical: vs(8),
    paddingHorizontal: hs(16),
  },
  skipText: {
    color: "#fff",
    fontSize: rf(16),
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: hs(40),
  },
  iconContainer: {
    width: s(120),
    height: s(120),
    borderRadius: s(60),
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: vs(40),
  },
  icon: {
    fontSize: iconSize.xxl,
  },
  textContainer: {
    alignItems: "center",
    maxWidth: s(300),
  },
  title: {
    fontSize: rf(28),
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: vs(20),
  },
  description: {
    fontSize: rf(16),
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: vs(24),
  },
  boldText: {
    fontSize: rf(16),
    color: "#fff",
    fontStyle: "italic",
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: vs(24),
  },
  footer: {
    paddingHorizontal: hs(20),
    paddingBottom: vs(40),
    paddingTop: vs(20),
  },
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: vs(30),
  },
  indicator: {
    width: s(10),
    height: s(10),
    borderRadius: s(5),
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    marginHorizontal: hs(5),
  },
  activeIndicator: {
    backgroundColor: "#fff",
    width: s(20),
  },
  nextButton: {
    backgroundColor: "#fff",
    paddingVertical: vs(15),
    paddingHorizontal: hs(30),
    borderRadius: borderRadius.xl,
    alignItems: "center",
  },
  nextButtonText: {
    color: "#4CAF50",
    fontSize: rf(18),
    fontWeight: "bold",
  },
});

export default OnboardingScreen;
