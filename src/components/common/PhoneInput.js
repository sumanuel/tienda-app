import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { CountryPicker, countryCodes } from "react-native-country-codes-picker";
import * as Localization from "expo-localization";
import { borderRadius, hs, rf, vs } from "../../utils/responsive";

const DEFAULT_COUNTRY_CODE = "VE";
const DEFAULT_CALLING_CODE = "58";

const getDeviceRegion = () => {
  const region =
    Localization.getLocales?.()?.[0]?.regionCode || Localization.region;
  if (typeof region === "string" && region.trim())
    return region.trim().toUpperCase();
  return DEFAULT_COUNTRY_CODE;
};

const normalizeDialCode = (value) =>
  (value || "").toString().replace(/[^\d]/g, "").trim();

const findCountryByCode = (countryCode) => {
  const normalizedCode = (countryCode || "").toString().trim().toUpperCase();
  if (!normalizedCode) return null;

  return (
    countryCodes.find((country) => country?.code === normalizedCode) || null
  );
};

const findCountryByCallingCode = (value) => {
  const normalizedDialCode = normalizeDialCode(value);
  if (!normalizedDialCode) return null;

  return (
    countryCodes.find(
      (country) => normalizeDialCode(country?.dial_code) === normalizedDialCode,
    ) || null
  );
};

const getDefaultCountry = () => {
  const deviceCountry = findCountryByCode(getDeviceRegion());
  if (deviceCountry) return deviceCountry;

  return (
    findCountryByCallingCode(DEFAULT_CALLING_CODE) || {
      code: DEFAULT_COUNTRY_CODE,
      dial_code: `+${DEFAULT_CALLING_CODE}`,
      flag: "🇻🇪",
      name: { es: "Venezuela", en: "Venezuela" },
    }
  );
};

const parsePhoneValue = (value, fallbackCallingCode) => {
  const raw = (value || "").toString().trim();
  if (!raw) {
    return {
      callingCode: fallbackCallingCode || DEFAULT_CALLING_CODE,
      nationalNumber: "",
    };
  }

  // Soporta formatos tipo: "+58 4121234567" o "+584121234567"
  const match = raw.match(/^\+(\d{1,4})\s*(.*)$/);
  if (match) {
    const callingCode = match[1];
    const nationalNumber = (match[2] || "").trim();
    return { callingCode, nationalNumber };
  }

  // Sin prefijo internacional: asumir el del dispositivo
  return {
    callingCode: fallbackCallingCode || DEFAULT_CALLING_CODE,
    nationalNumber: raw,
  };
};

export const PhoneInput = ({
  value,
  onChangeText,
  placeholder = "Ej: 4121234567",
  disabled = false,
  inputRef,
  returnKeyType,
  onSubmitEditing,
  onFocus,
  blurOnSubmit,
  containerStyle,
  inputStyle,
}) => {
  const [selectedCountry, setSelectedCountry] = useState(getDefaultCountry);
  const [callingCode, setCallingCode] = useState(() => {
    const defaultCountry = getDefaultCountry();
    return normalizeDialCode(defaultCountry?.dial_code) || DEFAULT_CALLING_CODE;
  });
  const [nationalNumber, setNationalNumber] = useState("");
  const [pickerVisible, setPickerVisible] = useState(false);

  const lastEmittedValueRef = useRef(null);

  useEffect(() => {
    const defaultCountry = getDefaultCountry();
    setSelectedCountry(defaultCountry);
    setCallingCode(
      normalizeDialCode(defaultCountry?.dial_code) || DEFAULT_CALLING_CODE,
    );
  }, []);

  useEffect(() => {
    const parsed = parsePhoneValue(value, callingCode);

    // Evitar pisar el input si el valor viene del propio componente.
    if (lastEmittedValueRef.current === value) {
      return;
    }

    const nextCallingCode = String(
      parsed.callingCode || callingCode || DEFAULT_CALLING_CODE,
    );
    const resolvedCountry =
      findCountryByCallingCode(nextCallingCode) ||
      selectedCountry ||
      getDefaultCountry();

    setCallingCode(nextCallingCode);
    setSelectedCountry(resolvedCountry);
    setNationalNumber(parsed.nationalNumber || "");
  }, [value]);

  const combinedValue = useMemo(() => {
    const num = (nationalNumber || "").toString().trim();
    if (!num) return "";
    return `+${String(callingCode || "").trim()} ${num}`.trim();
  }, [callingCode, nationalNumber]);

  const emit = (nextCallingCode, nextNationalNumber) => {
    const num = (nextNationalNumber || "").toString().trim();
    const next = num
      ? `+${String(nextCallingCode || "").trim()} ${num}`.trim()
      : "";

    lastEmittedValueRef.current = next;
    onChangeText?.(next);
  };

  const onSelectCountry = (country) => {
    const nextCallingCode = normalizeDialCode(country?.dial_code);

    if (country) setSelectedCountry(country);
    if (nextCallingCode) {
      setCallingCode(String(nextCallingCode));
      emit(String(nextCallingCode), nationalNumber);
    }

    setPickerVisible(false);
  };

  return (
    <View
      style={[
        styles.container,
        disabled && styles.containerDisabled,
        containerStyle,
      ]}
    >
      <TouchableOpacity
        style={styles.prefixButton}
        onPress={() => !disabled && setPickerVisible(true)}
        activeOpacity={0.85}
        disabled={disabled}
      >
        <Text style={styles.flagText}>{selectedCountry?.flag || "🌐"}</Text>
        <Text style={styles.prefixText}>{`+${callingCode}`}</Text>
      </TouchableOpacity>

      <CountryPicker
        show={pickerVisible}
        lang="es"
        initialState={`+${callingCode}`}
        inputPlaceholder="Buscar pais o codigo"
        searchMessage="No se encontraron paises"
        enableModalAvoiding
        onBackdropPress={() => setPickerVisible(false)}
        pickerButtonOnPress={onSelectCountry}
        style={pickerStyles}
      />

      <TextInput
        ref={inputRef}
        style={[styles.input, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor="#9aa2b1"
        value={nationalNumber}
        onChangeText={(text) => {
          setNationalNumber(text);
          emit(callingCode, text);
        }}
        keyboardType="phone-pad"
        editable={!disabled}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        onFocus={onFocus}
        blurOnSubmit={blurOnSubmit}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d9e0eb",
    borderRadius: borderRadius.sm,
    backgroundColor: "#f8f9fc",
    overflow: "hidden",
  },
  containerDisabled: {
    opacity: 0.6,
  },
  prefixButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: hs(12),
    paddingVertical: vs(10),
    borderRightWidth: 1,
    borderRightColor: "#d9e0eb",
    gap: hs(8),
    minWidth: hs(92),
  },
  flagText: {
    fontSize: rf(18),
  },
  prefixText: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#1f2633",
  },
  input: {
    flex: 1,
    paddingHorizontal: hs(14),
    paddingVertical: vs(12),
    fontSize: rf(15),
    color: "#1f2633",
  },
});

const pickerStyles = {
  modal: {
    height: "72%",
    backgroundColor: "#ffffff",
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  backdrop: {
    backgroundColor: "rgba(15, 23, 42, 0.35)",
  },
  textInput: {
    height: vs(48),
    marginHorizontal: hs(16),
    marginTop: vs(14),
    marginBottom: vs(8),
    paddingHorizontal: hs(14),
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: "#d9e0eb",
    color: "#1f2633",
    backgroundColor: "#f8f9fc",
    fontSize: rf(14),
  },
  line: {
    marginHorizontal: hs(16),
    backgroundColor: "#e6ebf2",
  },
  itemsList: {
    paddingHorizontal: hs(8),
  },
  countryButtonStyles: {
    borderRadius: borderRadius.sm,
    backgroundColor: "#f8f9fc",
    marginHorizontal: hs(8),
    marginVertical: vs(3),
    paddingVertical: vs(12),
    paddingHorizontal: hs(16),
  },
  flag: {
    fontSize: rf(18),
  },
  dialCode: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#1f2633",
  },
  countryName: {
    fontSize: rf(14),
    color: "#4b5565",
  },
  searchMessageText: {
    color: "#6b7280",
    fontSize: rf(14),
  },
};

export default PhoneInput;
