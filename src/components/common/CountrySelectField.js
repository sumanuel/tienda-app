import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { CountryPicker, countryCodes } from "react-native-country-codes-picker";
import {
  DEFAULT_COUNTRY_METADATA,
  getCountryMetadata,
} from "../../constants/countryMetadata";
import { borderRadius, hs, rf, vs } from "../../utils/responsive";

const findCountryByCode = (countryCode) => {
  const normalizedCode = String(countryCode || "")
    .trim()
    .toUpperCase();

  return (
    countryCodes.find((country) => country?.code === normalizedCode) || null
  );
};

export const CountrySelectField = ({
  value,
  onChange,
  disabled = false,
  placeholder = "Selecciona un país",
}) => {
  const [pickerVisible, setPickerVisible] = useState(false);
  const countryMetadata = getCountryMetadata(value);

  const selectedCountry = useMemo(
    () => findCountryByCode(countryMetadata.code),
    [countryMetadata.code],
  );

  const handleSelect = (country) => {
    const metadata = getCountryMetadata(country?.code);

    onChange?.({
      countryCode: metadata.code,
      countryName: metadata.name,
      defaultDialCode: metadata.dialCode,
      localCurrency: metadata.currencyCode,
      localCurrencyName: metadata.currencyName,
    });
    setPickerVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={() => !disabled && setPickerVisible(true)}
        activeOpacity={0.85}
        disabled={disabled}
      >
        <View style={styles.leftBlock}>
          <Text style={styles.flagText}>{selectedCountry?.flag || "🌐"}</Text>
          <View style={styles.copyBlock}>
            <Text style={styles.countryName}>
              {countryMetadata?.name || placeholder}
            </Text>
            <Text style={styles.countryMeta}>
              {countryMetadata.currencyCode} · +{countryMetadata.dialCode}
            </Text>
          </View>
        </View>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <CountryPicker
        show={pickerVisible}
        lang="es"
        initialState={countryMetadata.code}
        inputPlaceholder="Buscar país o código"
        searchMessage="No se encontraron países"
        enableModalAvoiding
        onBackdropPress={() => setPickerVisible(false)}
        pickerButtonOnPress={handleSelect}
        style={pickerStyles}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: vs(54),
    borderWidth: 1,
    borderColor: "#d9e0eb",
    borderRadius: borderRadius.sm,
    backgroundColor: "#f8f9fc",
    paddingHorizontal: hs(14),
    paddingVertical: vs(10),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: hs(10),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  leftBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: hs(12),
    flex: 1,
  },
  flagText: {
    fontSize: rf(20),
  },
  copyBlock: {
    flex: 1,
    gap: vs(2),
  },
  countryName: {
    fontSize: rf(15),
    fontWeight: "700",
    color: "#1f2633",
  },
  countryMeta: {
    fontSize: rf(12),
    color: "#6b7280",
  },
  chevron: {
    fontSize: rf(16),
    color: "#6b7280",
  },
});

const pickerStyles = {
  modal: {
    height: "72%",
    backgroundColor: "#ffffff",
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  textInput: {
    height: vs(48),
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "#d9e0eb",
    paddingHorizontal: hs(14),
    fontSize: rf(15),
    color: "#1f2633",
  },
  countryButtonStyles: {
    height: vs(56),
    paddingHorizontal: hs(14),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  countryName: {
    fontSize: rf(14),
    color: "#1f2633",
  },
  dialCode: {
    fontSize: rf(13),
    color: "#6b7280",
  },
};

export default CountrySelectField;
