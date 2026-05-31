export const COUNTRY_METADATA = {
  VE: {
    code: "VE",
    name: "Venezuela",
    currencyCode: "VES",
    currencyName: "Bolívar",
    dialCode: "58",
  },
  CO: {
    code: "CO",
    name: "Colombia",
    currencyCode: "COP",
    currencyName: "Peso colombiano",
    dialCode: "57",
  },
  MX: {
    code: "MX",
    name: "México",
    currencyCode: "MXN",
    currencyName: "Peso mexicano",
    dialCode: "52",
  },
  PE: {
    code: "PE",
    name: "Perú",
    currencyCode: "PEN",
    currencyName: "Sol peruano",
    dialCode: "51",
  },
  CL: {
    code: "CL",
    name: "Chile",
    currencyCode: "CLP",
    currencyName: "Peso chileno",
    dialCode: "56",
  },
  EC: {
    code: "EC",
    name: "Ecuador",
    currencyCode: "USD",
    currencyName: "Dólar estadounidense",
    dialCode: "593",
  },
  AR: {
    code: "AR",
    name: "Argentina",
    currencyCode: "ARS",
    currencyName: "Peso argentino",
    dialCode: "54",
  },
  BO: {
    code: "BO",
    name: "Bolivia",
    currencyCode: "BOB",
    currencyName: "Boliviano",
    dialCode: "591",
  },
  BR: {
    code: "BR",
    name: "Brasil",
    currencyCode: "BRL",
    currencyName: "Real brasileño",
    dialCode: "55",
  },
  PA: {
    code: "PA",
    name: "Panamá",
    currencyCode: "PAB",
    currencyName: "Balboa panameño",
    dialCode: "507",
  },
  DO: {
    code: "DO",
    name: "República Dominicana",
    currencyCode: "DOP",
    currencyName: "Peso dominicano",
    dialCode: "1",
  },
  UY: {
    code: "UY",
    name: "Uruguay",
    currencyCode: "UYU",
    currencyName: "Peso uruguayo",
    dialCode: "598",
  },
  PY: {
    code: "PY",
    name: "Paraguay",
    currencyCode: "PYG",
    currencyName: "Guaraní paraguayo",
    dialCode: "595",
  },
  CR: {
    code: "CR",
    name: "Costa Rica",
    currencyCode: "CRC",
    currencyName: "Colón costarricense",
    dialCode: "506",
  },
  GT: {
    code: "GT",
    name: "Guatemala",
    currencyCode: "GTQ",
    currencyName: "Quetzal guatemalteco",
    dialCode: "502",
  },
  SV: {
    code: "SV",
    name: "El Salvador",
    currencyCode: "USD",
    currencyName: "Dólar estadounidense",
    dialCode: "503",
  },
  HN: {
    code: "HN",
    name: "Honduras",
    currencyCode: "HNL",
    currencyName: "Lempira hondureña",
    dialCode: "504",
  },
  NI: {
    code: "NI",
    name: "Nicaragua",
    currencyCode: "NIO",
    currencyName: "Córdoba nicaragüense",
    dialCode: "505",
  },
  ES: {
    code: "ES",
    name: "España",
    currencyCode: "EUR",
    currencyName: "Euro",
    dialCode: "34",
  },
  US: {
    code: "US",
    name: "Estados Unidos",
    currencyCode: "USD",
    currencyName: "Dólar estadounidense",
    dialCode: "1",
  },
};

export const DEFAULT_COUNTRY_CODE = "VE";
export const DEFAULT_COUNTRY_METADATA = COUNTRY_METADATA[DEFAULT_COUNTRY_CODE];

export const COUNTRY_OPTIONS = Object.values(COUNTRY_METADATA);

export const getCountryMetadata = (countryCode) => {
  const normalizedCode = String(countryCode || "")
    .trim()
    .toUpperCase();

  return COUNTRY_METADATA[normalizedCode] || DEFAULT_COUNTRY_METADATA;
};

export const resolveUsesUsdConversion = (countryCode, explicitValue) => {
  const normalizedCode = getCountryMetadata(countryCode).code;
  if (normalizedCode === "VE") {
    return true;
  }

  return Boolean(explicitValue);
};

export const resolveExchangeMode = ({ countryCode, usesUsdConversion }) => {
  const normalizedCode = getCountryMetadata(countryCode).code;

  if (!usesUsdConversion) {
    return "disabled";
  }

  return normalizedCode === "VE" ? "official_ve" : "manual";
};

export const buildCurrencyConfig = ({ countryCode, usesUsdConversion }) => {
  const country = getCountryMetadata(countryCode);
  const normalizedUsesUsd = resolveUsesUsdConversion(
    country.code,
    usesUsdConversion,
  );
  const exchangeMode = resolveExchangeMode({
    countryCode: country.code,
    usesUsdConversion: normalizedUsesUsd,
  });

  return {
    countryCode: country.code,
    countryName: country.name,
    defaultDialCode: country.dialCode,
    localCurrency: country.currencyCode,
    localCurrencyName: country.currencyName,
    referenceCurrency: "USD",
    usesUsdConversion: normalizedUsesUsd,
    exchangeMode,
    exchangeSource: exchangeMode === "official_ve" ? "BCV" : "MANUAL",
    displayCurrency: country.currencyCode,
    baseCurrency: normalizedUsesUsd ? "USD" : country.currencyCode,
  };
};
