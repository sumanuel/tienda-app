import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * CustomAlert - Reemplazo moderno y bonito para Alert.alert
 *
 * Uso:
 * import { showCustomAlert } from '../components/common/CustomAlert';
 *
 * showCustomAlert({
 *   title: "Título",
 *   message: "Mensaje",
 *   type: "success" | "error" | "warning" | "info",
 *   buttons: [{ text: "OK", onPress: () => {} }]
 * })
 */

const { width } = Dimensions.get("window");

const CustomAlert = ({ visible, onClose, config }) => {
  if (!config) return null;

  const {
    title = "Atención",
    message = "",
    type = "info",
    buttons = [{ text: "OK", onPress: onClose }],
  } = config;

  // Configuración de iconos y colores según el tipo
  const getTypeConfig = () => {
    switch (type) {
      case "success":
        return {
          icon: "checkmark-circle",
          color: "#2fb176",
          bgColor: "#f0fdf4",
        };
      case "error":
        return {
          icon: "close-circle",
          color: "#dc2626",
          bgColor: "#fef2f2",
        };
      case "warning":
        return {
          icon: "warning",
          color: "#d97706",
          bgColor: "#fffbeb",
        };
      case "info":
      default:
        return {
          icon: "information-circle",
          color: "#2f5ae0",
          bgColor: "#f3f8ff",
        };
    }
  };

  const typeConfig = getTypeConfig();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header con icono */}
          <View style={styles.header}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: typeConfig.bgColor },
              ]}
            >
              <Ionicons
                name={typeConfig.icon}
                size={32}
                color={typeConfig.color}
              />
            </View>
            <Text style={styles.title}>{title}</Text>
          </View>

          {/* Message */}
          <View style={styles.content}>
            <Text style={styles.message}>{message}</Text>
          </View>

          {/* Buttons */}
          <View style={styles.footer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  button.style === "cancel" && styles.cancelButton,
                  buttons.length === 1 && styles.singleButton,
                ]}
                onPress={() => {
                  button.onPress && button.onPress();
                  onClose();
                }}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.buttonText,
                    button.style === "cancel" && styles.cancelButtonText,
                  ]}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(13, 22, 38, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 22,
    width: width - 48,
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    alignItems: "center",
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2633",
    textAlign: "center",
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  message: {
    fontSize: 16,
    color: "#5b6472",
    textAlign: "center",
    lineHeight: 24,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: "#2f5ae0",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  singleButton: {
    marginHorizontal: 0,
  },
  cancelButton: {
    backgroundColor: "#f8f9fc",
    borderWidth: 1,
    borderColor: "#d9e0eb",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  cancelButtonText: {
    color: "#2f5ae0",
  },
});

export default CustomAlert;

// Función helper para mostrar el alert
let alertRef = null;

export const showCustomAlert = (config) => {
  if (alertRef) {
    alertRef.show(config);
  }
};

export const setAlertRef = (ref) => {
  alertRef = ref;
};

// Hook para usar el alert
export const useCustomAlert = () => {
  const [alertConfig, setAlertConfig] = React.useState(null);
  const [visible, setVisible] = React.useState(false);

  const show = React.useCallback((config) => {
    setAlertConfig(config);
    setVisible(true);
  }, []);

  const hide = React.useCallback(() => {
    setVisible(false);
    setAlertConfig(null);
  }, []);

  React.useEffect(() => {
    setAlertRef({ show });
  }, [show]);

  return {
    CustomAlert: () => (
      <CustomAlert visible={visible} onClose={hide} config={alertConfig} />
    ),
    showAlert: show,
  };
};
