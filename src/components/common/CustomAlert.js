import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { s, rf, vs, hs, spacing, borderRadius } from "../../utils/responsive";
import { SHADOWS, UI_COLORS } from "./AppUI";

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

const ALERT_TONE_MAP = {
  success: {
    icon: "checkmark-circle",
    color: UI_COLORS.accent,
    bgColor: UI_COLORS.accentSoft,
  },
  error: {
    icon: "close-circle",
    color: UI_COLORS.danger,
    bgColor: UI_COLORS.dangerSoft,
  },
  warning: {
    icon: "warning",
    color: UI_COLORS.warning,
    bgColor: UI_COLORS.warningSoft,
  },
  info: {
    icon: "information-circle",
    color: UI_COLORS.info,
    bgColor: UI_COLORS.infoSoft,
  },
};

const normalizeButtonStyle = (style) => {
  switch (style) {
    case "cancel":
    case "destructive":
    case "success":
      return style;
    case "default":
    case "primary":
    case "info":
    default:
      return "default";
  }
};

const normalizeAlertConfig = (config, onClose) => {
  const buttons =
    Array.isArray(config?.buttons) && config.buttons.length > 0
      ? config.buttons
      : [{ text: "OK", onPress: onClose, style: "default" }];

  return {
    title:
      typeof config?.title === "string" && config.title.trim()
        ? config.title
        : "Atención",
    message:
      typeof config?.message === "string"
        ? config.message
        : String(config?.message || ""),
    type: ALERT_TONE_MAP[config?.type] ? config.type : "info",
    buttons: buttons.map((button, index) => ({
      key: `${button?.text || "button"}-${index}`,
      text: button?.text || "OK",
      onPress: typeof button?.onPress === "function" ? button.onPress : null,
      style: normalizeButtonStyle(button?.style),
    })),
  };
};

const CustomAlert = ({ visible, onClose, config }) => {
  if (!config) return null;

  const { title, message, type, buttons } = normalizeAlertConfig(
    config,
    onClose,
  );
  const typeConfig = ALERT_TONE_MAP[type];
  const isStackedButtons = buttons.length > 2;

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
          <View
            style={[styles.footer, isStackedButtons && styles.footerStacked]}
          >
            {buttons.map((button, index) =>
              (() => {
                const isCancel = button.style === "cancel";
                const isDestructive = button.style === "destructive";
                const isSuccess = button.style === "success";
                const isDefault = button.style === "default";

                return (
                  <Pressable
                    key={button.key || index}
                    style={({ pressed }) => [
                      styles.button,
                      isStackedButtons && styles.buttonStacked,
                      isCancel && styles.cancelButton,
                      isDestructive && styles.destructiveButton,
                      isSuccess && styles.successButton,
                      isDefault && styles.defaultButton,
                      buttons.length === 1 && styles.singleButton,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => {
                      button.onPress && button.onPress();
                      onClose();
                    }}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isDefault && styles.defaultButtonText,
                        isCancel && styles.cancelButtonText,
                        isDestructive && styles.destructiveButtonText,
                        isSuccess && styles.successButtonText,
                      ]}
                    >
                      {button.text}
                    </Text>
                  </Pressable>
                );
              })(),
            )}
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
    padding: spacing.xl,
  },
  modalContainer: {
    backgroundColor: UI_COLORS.surface,
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    width: "86%",
    maxWidth: s(360),
    ...SHADOWS.card,
  },
  header: {
    alignItems: "center",
    paddingTop: vs(24),
    paddingHorizontal: hs(20),
    paddingBottom: vs(10),
  },
  iconContainer: {
    width: s(56),
    height: s(56),
    borderRadius: s(28),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: vs(12),
  },
  title: {
    fontSize: rf(18),
    fontWeight: "800",
    color: UI_COLORS.text,
    textAlign: "center",
  },
  content: {
    paddingHorizontal: hs(20),
    paddingBottom: vs(18),
  },
  message: {
    fontSize: rf(14),
    color: UI_COLORS.muted,
    textAlign: "center",
    lineHeight: vs(20),
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: hs(20),
    paddingBottom: vs(20),
    gap: hs(12),
  },
  footerStacked: {
    flexDirection: "column",
    gap: vs(12),
  },
  button: {
    flex: 1,
    backgroundColor: UI_COLORS.info,
    minHeight: vs(44),
    paddingVertical: vs(10),
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonStacked: {
    flex: 0,
    width: "100%",
  },
  singleButton: {
    flex: 0,
    alignSelf: "center",
    minWidth: s(160),
    width: "72%",
  },
  defaultButton: {
    backgroundColor: UI_COLORS.info,
  },
  cancelButton: {
    backgroundColor: UI_COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
  },
  destructiveButton: {
    backgroundColor: UI_COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: UI_COLORS.danger,
  },
  successButton: {
    backgroundColor: UI_COLORS.accentSoft,
    borderWidth: 1,
    borderColor: UI_COLORS.accent,
  },
  buttonText: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#fff",
  },
  defaultButtonText: {
    color: "#fff",
  },
  cancelButtonText: {
    color: UI_COLORS.info,
  },
  destructiveButtonText: {
    color: UI_COLORS.danger,
  },
  successButtonText: {
    color: UI_COLORS.accentStrong,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
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
