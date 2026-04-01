import React, { useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { borderRadius, hs, rf, s, spacing, vs } from "../../utils/responsive";

const VerifyEmailScreen = () => {
  const { user, sendVerification, refreshVerification, signOut } = useAuth();
  const [busyAction, setBusyAction] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleResend = async () => {
    try {
      setBusyAction("resend");
      setError("");
      setMessage("");
      await sendVerification();
      setMessage("Te reenviamos el correo de verificación.");
    } catch (sendError) {
      setError(sendError?.message || "No se pudo reenviar el correo.");
    } finally {
      setBusyAction("");
    }
  };

  const handleRefresh = async () => {
    try {
      setBusyAction("refresh");
      setError("");
      setMessage("");
      const verified = await refreshVerification();
      if (!verified) {
        setMessage(
          "Aún no vemos la verificación. Revisa tu correo y vuelve a intentar.",
        );
      }
    } catch (refreshError) {
      setError(
        refreshError?.message || "No se pudo comprobar el estado del correo.",
      );
    } finally {
      setBusyAction("");
    }
  };

  const handleSignOut = async () => {
    try {
      setBusyAction("logout");
      await signOut();
    } finally {
      setBusyAction("");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Verifica tu correo</Text>
        <Text style={styles.subtitle}>
          Enviamos un correo a {user?.email || "tu cuenta"}. Debes verificarlo
          antes de usar la app.
        </Text>

        {!!message && <Text style={styles.message}>{message}</Text>}
        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.primaryButton, busyAction && styles.buttonDisabled]}
          onPress={handleRefresh}
          disabled={Boolean(busyAction)}
        >
          {busyAction === "refresh" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Ya verifiqué mi correo</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, busyAction && styles.buttonDisabled]}
          onPress={handleResend}
          disabled={Boolean(busyAction)}
        >
          {busyAction === "resend" ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.secondaryButtonText}>
              Reenviar verificación
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={handleSignOut}
          disabled={Boolean(busyAction)}
        >
          {busyAction === "logout" ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.linkButtonText}>Cerrar sesión</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#edf3f8",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: vs(14),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(8) },
    shadowOpacity: 0.12,
    shadowRadius: s(18),
    elevation: 10,
  },
  title: {
    fontSize: rf(24),
    fontWeight: "800",
    color: "#1f2633",
  },
  subtitle: {
    fontSize: rf(14),
    lineHeight: vs(20),
    color: "#5b6472",
  },
  message: {
    fontSize: rf(13),
    color: "#1f9254",
    fontWeight: "600",
  },
  error: {
    fontSize: rf(13),
    color: "#d6455d",
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#1f9254",
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: vs(15),
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: rf(15),
    fontWeight: "800",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#d8e0ec",
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: vs(14),
  },
  secondaryButtonText: {
    color: "#2f5ae0",
    fontSize: rf(14),
    fontWeight: "700",
  },
  linkButton: {
    alignItems: "center",
    paddingVertical: vs(8),
  },
  linkButtonText: {
    color: "#58677b",
    fontSize: rf(13),
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});

export default VerifyEmailScreen;
