import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { borderRadius, hs, rf, s, spacing, vs } from "../../utils/responsive";

const AUTH_COLORS = {
  page: "#f4f7fb",
  surface: "#ffffff",
  surfaceAlt: "#f6faf7",
  accent: "#1f7a59",
  accentStrong: "#0f5a3f",
  accentSoft: "#e8f5ef",
  text: "#193227",
  muted: "#66766d",
  border: "#d8e4db",
  danger: "#cf4f43",
  info: "#245fd1",
};

const mapAuthError = (error) => {
  const code = error?.code || "";

  switch (code) {
    case "auth/invalid-email":
      return "El correo no es válido.";
    case "auth/email-already-in-use":
      return "Ese correo ya está registrado.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos.";
    default:
      return error?.message || "No se pudo completar la operación.";
  }
};

const AuthScreen = () => {
  const { signIn, signUp, syncing, sendPasswordReset } = useAuth();
  const scrollRef = useRef(null);
  const nameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const isRegister = mode === "register";
  const loading = submitting || syncing;

  const helperText = useMemo(() => {
    return isRegister
      ? "Crea tu cuenta para vincular tus datos locales con Firestore."
      : "Inicia sesión para cargar tu espacio de trabajo y sincronizar tus datos.";
  }, [isRegister]);

  const scrollToFocusedInput = (y) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y, animated: true });
    });
  };

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (isRegister && !name.trim()) {
      setError("Debes ingresar tu nombre.");
      setInfoMessage("");
      return;
    }

    if (!normalizedEmail) {
      setError("Debes ingresar tu correo.");
      setInfoMessage("");
      return;
    }

    if (!password) {
      setError("Debes ingresar tu contraseña.");
      setInfoMessage("");
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setInfoMessage("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setInfoMessage("");

      if (isRegister) {
        await signUp({ name, email: normalizedEmail, password });
        setInfoMessage("Te enviamos un correo de verificación.");
      } else {
        await signIn({ email: normalizedEmail, password });
      }
    } catch (authError) {
      setError(mapAuthError(authError));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Escribe tu correo para enviarte el enlace de recuperación.");
      setInfoMessage("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setInfoMessage("");
      await sendPasswordReset(normalizedEmail);
      setInfoMessage("Te enviamos un correo para restablecer tu contraseña.");
    } catch (authError) {
      setError(mapAuthError(authError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? vs(24) : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Acceso seguro</Text>
            <Text style={styles.heroTitle}>T-Suma Cloud</Text>
            <Text style={styles.heroSubtitle}>{helperText}</Text>

            <View style={styles.heroHighlights}>
              <View style={styles.heroHighlightPill}>
                <Ionicons
                  name="cloud-done-outline"
                  size={rf(16)}
                  color={AUTH_COLORS.accentStrong}
                />
                <Text style={styles.heroHighlightText}>Sincronización</Text>
              </View>
              <View style={styles.heroHighlightPill}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={rf(16)}
                  color={AUTH_COLORS.accentStrong}
                />
                <Text style={styles.heroHighlightText}>Seguridad</Text>
              </View>
              <View style={styles.heroHighlightPill}>
                <Ionicons
                  name="storefront-outline"
                  size={rf(16)}
                  color={AUTH_COLORS.accentStrong}
                />
                <Text style={styles.heroHighlightText}>Tu tienda</Text>
              </View>
            </View>
          </View>

          <View style={styles.formCard}>
            <View style={styles.modeSwitch}>
              <Pressable
                style={({ pressed }) => [
                  styles.modeButton,
                  !isRegister && styles.modeButtonActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  setMode("login");
                  setError("");
                  setInfoMessage("");
                }}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    !isRegister && styles.modeButtonTextActive,
                  ]}
                >
                  Iniciar sesión
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modeButton,
                  isRegister && styles.modeButtonActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  setMode("register");
                  setError("");
                  setInfoMessage("");
                }}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    isRegister && styles.modeButtonTextActive,
                  ]}
                >
                  Registrarme
                </Text>
              </Pressable>
            </View>

            {isRegister && (
              <>
                <Text style={styles.label}>Nombre</Text>
                <TextInput
                  ref={nameInputRef}
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Nombre del usuario"
                  placeholderTextColor="#8a94a6"
                  returnKeyType="next"
                  onFocus={() => scrollToFocusedInput(vs(120))}
                  onSubmitEditing={() => emailInputRef.current?.focus()}
                />
              </>
            )}

            <Text style={styles.label}>Correo</Text>
            <TextInput
              ref={emailInputRef}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="correo@dominio.com"
              placeholderTextColor="#8a94a6"
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              returnKeyType="next"
              onFocus={() => scrollToFocusedInput(vs(180))}
              onSubmitEditing={() => passwordInputRef.current?.focus()}
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              ref={passwordInputRef}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#8a94a6"
              secureTextEntry
              returnKeyType={isRegister ? "next" : "done"}
              onFocus={() =>
                scrollToFocusedInput(isRegister ? vs(240) : vs(210))
              }
              onSubmitEditing={() => {
                if (isRegister) {
                  confirmPasswordInputRef.current?.focus();
                  return;
                }

                submit();
              }}
            />

            {isRegister && (
              <>
                <Text style={styles.label}>Confirmar contraseña</Text>
                <TextInput
                  ref={confirmPasswordInputRef}
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repite la contraseña"
                  placeholderTextColor="#8a94a6"
                  secureTextEntry
                  returnKeyType="done"
                  onFocus={() => scrollToFocusedInput(vs(300))}
                  onSubmitEditing={submit}
                />
              </>
            )}

            {!!infoMessage && (
              <Text style={styles.infoText}>{infoMessage}</Text>
            )}
            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                loading && styles.submitButtonDisabled,
                pressed && styles.pressed,
              ]}
              onPress={submit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isRegister ? "Crear cuenta" : "Entrar"}
                </Text>
              )}
            </Pressable>

            {!isRegister && (
              <Pressable
                style={({ pressed }) => [
                  styles.linkButton,
                  pressed && styles.linkButtonPressed,
                ]}
                onPress={handlePasswordReset}
              >
                <Text style={styles.linkButtonText}>Recuperar contraseña</Text>
              </Pressable>
            )}

            <Text style={styles.securityHint}>
              Al continuar, tus datos locales se vinculan con tu espacio seguro
              en la nube.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AUTH_COLORS.page,
  },
  keyboardContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: vs(48),
    gap: vs(18),
  },
  heroCard: {
    backgroundColor: AUTH_COLORS.accent,
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    padding: spacing.xl,
    gap: vs(10),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(8) },
    shadowOpacity: 0.12,
    shadowRadius: s(18),
    elevation: 10,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.7)",
    fontSize: rf(12),
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: "#fff",
    fontSize: rf(24),
    fontWeight: "800",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.84)",
    fontSize: rf(14),
    lineHeight: vs(20),
  },
  heroHighlights: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: hs(10),
    marginTop: vs(8),
  },
  heroHighlightPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: hs(6),
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    paddingHorizontal: hs(12),
    paddingVertical: vs(8),
  },
  heroHighlightText: {
    color: "#ffffff",
    fontSize: rf(12),
    fontWeight: "700",
  },
  formCard: {
    backgroundColor: AUTH_COLORS.surface,
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    padding: spacing.lg,
    gap: vs(10),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(8) },
    shadowOpacity: 0.08,
    shadowRadius: s(18),
    elevation: 8,
  },
  modeSwitch: {
    flexDirection: "row",
    backgroundColor: AUTH_COLORS.surfaceAlt,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    padding: s(4),
    marginBottom: vs(8),
  },
  modeButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: vs(12),
    alignItems: "center",
  },
  modeButtonActive: {
    backgroundColor: AUTH_COLORS.accent,
  },
  modeButtonText: {
    color: AUTH_COLORS.muted,
    fontSize: rf(14),
    fontWeight: "700",
  },
  modeButtonTextActive: {
    color: "#fff",
  },
  label: {
    color: AUTH_COLORS.text,
    fontSize: rf(13),
    fontWeight: "700",
    marginTop: vs(4),
  },
  input: {
    borderWidth: 1,
    borderColor: AUTH_COLORS.border,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    backgroundColor: AUTH_COLORS.surfaceAlt,
    paddingHorizontal: hs(14),
    paddingVertical: vs(14),
    fontSize: rf(15),
    color: AUTH_COLORS.text,
  },
  errorText: {
    color: AUTH_COLORS.danger,
    fontSize: rf(13),
    fontWeight: "600",
    marginTop: vs(4),
  },
  infoText: {
    color: AUTH_COLORS.accent,
    fontSize: rf(13),
    fontWeight: "600",
    marginTop: vs(4),
  },
  submitButton: {
    marginTop: vs(12),
    backgroundColor: AUTH_COLORS.accent,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: vs(15),
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: rf(15),
    fontWeight: "800",
  },
  linkButton: {
    alignItems: "center",
    paddingTop: vs(8),
  },
  linkButtonPressed: {
    opacity: 0.75,
  },
  linkButtonText: {
    color: AUTH_COLORS.info,
    fontSize: rf(13),
    fontWeight: "700",
  },
  securityHint: {
    marginTop: vs(4),
    color: AUTH_COLORS.muted,
    fontSize: rf(12),
    lineHeight: vs(18),
    textAlign: "center",
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});

export default AuthScreen;
