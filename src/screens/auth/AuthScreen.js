import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { borderRadius, hs, rf, s, spacing, vs } from "../../utils/responsive";

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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>T-Suma Cloud</Text>
          <Text style={styles.heroSubtitle}>{helperText}</Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.modeSwitch}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                !isRegister && styles.modeButtonActive,
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
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, isRegister && styles.modeButtonActive]}
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
            </TouchableOpacity>
          </View>

          {isRegister && (
            <>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Nombre del usuario"
                placeholderTextColor="#8a94a6"
              />
            </>
          )}

          <Text style={styles.label}>Correo</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="correo@dominio.com"
            placeholderTextColor="#8a94a6"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor="#8a94a6"
            secureTextEntry
          />

          {isRegister && (
            <>
              <Text style={styles.label}>Confirmar contraseña</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repite la contraseña"
                placeholderTextColor="#8a94a6"
                secureTextEntry
              />
            </>
          )}

          {!!infoMessage && <Text style={styles.infoText}>{infoMessage}</Text>}
          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[
              styles.submitButton,
              loading && styles.submitButtonDisabled,
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
          </TouchableOpacity>

          {!isRegister && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={handlePasswordReset}
            >
              <Text style={styles.linkButtonText}>Recuperar contraseña</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#edf3f8",
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
    gap: vs(18),
  },
  heroCard: {
    backgroundColor: "#2f5ae0",
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: vs(10),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(8) },
    shadowOpacity: 0.12,
    shadowRadius: s(18),
    elevation: 10,
  },
  heroTitle: {
    color: "#fff",
    fontSize: rf(24),
    fontWeight: "800",
  },
  heroSubtitle: {
    color: "#e7eeff",
    fontSize: rf(14),
    lineHeight: vs(20),
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: vs(10),
  },
  modeSwitch: {
    flexDirection: "row",
    backgroundColor: "#eef2f9",
    borderRadius: borderRadius.lg,
    padding: s(4),
    marginBottom: vs(8),
  },
  modeButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: vs(12),
    alignItems: "center",
  },
  modeButtonActive: {
    backgroundColor: "#2f5ae0",
  },
  modeButtonText: {
    color: "#58708f",
    fontSize: rf(14),
    fontWeight: "700",
  },
  modeButtonTextActive: {
    color: "#fff",
  },
  label: {
    color: "#506074",
    fontSize: rf(13),
    fontWeight: "700",
    marginTop: vs(4),
  },
  input: {
    borderWidth: 1,
    borderColor: "#d8e0ec",
    borderRadius: borderRadius.md,
    backgroundColor: "#f8fbff",
    paddingHorizontal: hs(14),
    paddingVertical: vs(14),
    fontSize: rf(15),
    color: "#1f2633",
  },
  errorText: {
    color: "#d6455d",
    fontSize: rf(13),
    fontWeight: "600",
    marginTop: vs(4),
  },
  infoText: {
    color: "#1f9254",
    fontSize: rf(13),
    fontWeight: "600",
    marginTop: vs(4),
  },
  submitButton: {
    marginTop: vs(12),
    backgroundColor: "#1f9254",
    borderRadius: borderRadius.md,
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
  linkButtonText: {
    color: "#2f5ae0",
    fontSize: rf(13),
    fontWeight: "700",
  },
});

export default AuthScreen;
