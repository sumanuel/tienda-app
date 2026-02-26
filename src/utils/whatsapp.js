import { Linking } from "react-native";

export const normalizePhoneForWhatsApp = (
  rawPhone,
  defaultCountryCode = "58",
) => {
  const digits = (rawPhone || "").toString().replace(/\D+/g, "");
  if (!digits) return null;

  // Si viene con prefijo internacional sin + (ej: 58...), dejarlo.
  if (
    digits.length >= 10 &&
    digits.length <= 15 &&
    digits.startsWith(defaultCountryCode)
  ) {
    return digits;
  }

  // Números locales típicos VE: 0XXXXXXXXXX (11 dígitos)
  if (digits.length === 11 && digits.startsWith("0")) {
    return `${defaultCountryCode}${digits.slice(1)}`;
  }

  // Si viene con + en string, ya se eliminó; aceptar si parece E.164 sin el +
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }

  return null;
};

export const isValidWhatsAppPhone = (rawPhone) => {
  const normalized = normalizePhoneForWhatsApp(rawPhone);
  return !!normalized;
};

export const openWhatsApp = async ({ phone, text }) => {
  const normalizedPhone = normalizePhoneForWhatsApp(phone);
  if (!normalizedPhone) {
    throw new Error("El cliente no tiene un número de teléfono válido");
  }

  const safeText = (text || "").toString();
  const encodedText = encodeURIComponent(safeText);

  // Intentar deep link a WhatsApp primero
  const appUrl = `whatsapp://send?phone=${normalizedPhone}&text=${encodedText}`;
  const webUrl = `https://wa.me/${normalizedPhone}?text=${encodedText}`;

  const canOpenApp = await Linking.canOpenURL(appUrl);
  const urlToOpen = canOpenApp ? appUrl : webUrl;

  const canOpen = await Linking.canOpenURL(urlToOpen);
  if (!canOpen) {
    throw new Error("No se pudo abrir WhatsApp en este dispositivo");
  }

  await Linking.openURL(urlToOpen);
};
