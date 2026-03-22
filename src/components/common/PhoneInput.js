import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import CountryPicker, {
  getCallingCode,
} from "react-native-country-picker-modal";
import * as Localization from "expo-localization";
import { borderRadius, hs, rf, s, spacing, vs } from "../../utils/responsive";

const getDeviceRegion = () => {
  const region =
    Localization.getLocales?.()?.[0]?.regionCode || Localization.region;
  if (typeof region === "string" && region.trim())
    return region.trim().toUpperCase();
  return "VE";
};

const parsePhoneValue = (value, fallbackCallingCode) => {
  const raw = (value || "").toString().trim();
  if (!raw) {
    return { callingCode: fallbackCallingCode || "58", nationalNumber: "" };
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
    callingCode: fallbackCallingCode || "58",
    nationalNumber: raw,
  };
};

export const PhoneInput = ({
  value,
  onChangeText,
  placeholder = "Ej: 4121234567",
  disabled = false,
}) => {
  const [countryCode, setCountryCode] = useState(getDeviceRegion());
  const [callingCode, setCallingCode] = useState("58");
  const [nationalNumber, setNationalNumber] = useState("");
  const [pickerVisible, setPickerVisible] = useState(false);

  const lastEmittedValueRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const region = getDeviceRegion();
        const cc = await getCallingCode(region);
        if (!mounted) return;
        setCountryCode(region);
        setCallingCode(String(cc || "58"));
      } catch {
        // Si falla, quedamos con VE / 58
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const parsed = parsePhoneValue(value, callingCode);

    // Evitar pisar el input si el valor viene del propio componente.
    if (lastEmittedValueRef.current === value) {
      return;
    }

    setCallingCode(String(parsed.callingCode || callingCode || "58"));
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
    const nextCountryCode = country?.cca2;
    const nextCallingCode = country?.callingCode?.[0];

    if (nextCountryCode) setCountryCode(nextCountryCode);
    if (nextCallingCode) {
      setCallingCode(String(nextCallingCode));
      emit(String(nextCallingCode), nationalNumber);
    }

    setPickerVisible(false);
  };

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      <TouchableOpacity
        style={styles.prefixButton}
        onPress={() => !disabled && setPickerVisible(true)}
        activeOpacity={0.85}
        disabled={disabled}
      >
        <CountryPicker
          countryCode={countryCode}
          withFlag
          withCallingCode={false}
          withEmoji
          withFilter
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          onSelect={onSelectCountry}
        />
        <Text style={styles.prefixText}>{`+${callingCode}`}</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#9aa2b1"
        value={nationalNumber}
        onChangeText={(text) => {
          setNationalNumber(text);
          emit(callingCode, text);
        }}
        keyboardType="phone-pad"
        editable={!disabled}
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

export default PhoneInput;
