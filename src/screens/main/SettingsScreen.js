import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useExchangeRate } from "../../contexts/ExchangeRateContext";
import { getSettings, saveSettings } from "../../services/database/settings";

export const SettingsScreen = () => {
  const {
    rate,
    setManualRate,
    loading: rateLoading,
    lastUpdate,
  } = useExchangeRate({ autoUpdate: false });
  const [isLoading, setIsLoading] = useState(true);

  const [business, setBusiness] = useState({
    name: "",
    rif: "",
    address: "",
    phone: "",
    email: "",
  });
  const [margin, setMargin] = useState(30);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [currencies, setCurrencies] = useState({
    USD: 280,
    EURO: 300,
    USD2: 350,
  });
  const [iva, setIva] = useState(16);

  const [editingSection, setEditingSection] = useState(null);
  const [savingSection, setSavingSection] = useState(null);

  const [formBusiness, setFormBusiness] = useState(business);
  const [formMargin, setFormMargin] = useState("30");
  const [formLowStock, setFormLowStock] = useState("10");
  const [formBaseCurrency, setFormBaseCurrency] = useState("USD");
  const [formCurrencies, setFormCurrencies] = useState({
    USD: "280",
    EURO: "300",
    USD2: "350",
  });
  const [formIva, setFormIva] = useState("16");
  const [manualRateInput, setManualRateInput] = useState("280");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const settings = await getSettings();

        const pricing = settings.pricing || {};
        const inventory = settings.inventory || {};
        const businessInfo = settings.business || {
          name: "",
          rif: "",
          address: "",
          phone: "",
          email: "",
        };

        const defaultMargin = pricing.defaultMargin ?? 30;
        const defaultLowStock = inventory.lowStockThreshold ?? 10;
        const defaultBaseCurrency = pricing.baseCurrency || "USD";
        let syncedCurrencies = pricing.currencies || {
          USD: 280,
          EURO: 300,
          USD2: 350,
        };

        if (rate && rate !== syncedCurrencies.USD) {
          syncedCurrencies = { ...syncedCurrencies, USD: rate };
          const updatedSettings = {
            ...settings,
            pricing: {
              ...pricing,
              currencies: syncedCurrencies,
            },
          };
          await saveSettings(updatedSettings);
        }

        const ivaValue = pricing.iva ?? 16;

        setBusiness(businessInfo);
        setMargin(defaultMargin);
        setLowStockThreshold(defaultLowStock);
        setBaseCurrency(defaultBaseCurrency);
        setCurrencies(syncedCurrencies);
        setIva(ivaValue);

        setFormBusiness(businessInfo);
        setFormMargin(defaultMargin.toString());
        setFormLowStock(defaultLowStock.toString());
        setFormBaseCurrency(defaultBaseCurrency);
        setFormCurrencies({
          USD: (syncedCurrencies.USD ?? 0).toString(),
          EURO: (syncedCurrencies.EURO ?? 0).toString(),
          USD2: (syncedCurrencies.USD2 ?? 0).toString(),
        });
        setFormIva(ivaValue.toString());
        setManualRateInput(
          rate?.toString() || (syncedCurrencies.USD ?? 0).toString()
        );
      } catch (error) {
        console.error("Error loading settings:", error);
        Alert.alert(
          "Error",
          "No pudimos cargar la configuración. Intenta nuevamente."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [rate]);

  useEffect(() => {
    if (rate) {
      setManualRateInput(rate.toString());
    }
  }, [rate]);

  const formattedLastUpdate = useMemo(() => {
    if (!lastUpdate) {
      return "Sin sincronizar";
    }
    return `${lastUpdate.toLocaleDateString()} · ${lastUpdate.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    )}`;
  }, [lastUpdate]);

  const startEditing = (section) => {
    if (section === "business") {
      setFormBusiness(business);
    }
    if (section === "pricing") {
      setFormMargin(margin.toString());
      setFormBaseCurrency(baseCurrency);
      setFormCurrencies({
        USD: (currencies.USD ?? 0).toString(),
        EURO: (currencies.EURO ?? 0).toString(),
        USD2: (currencies.USD2 ?? 0).toString(),
      });
      setFormIva(iva.toString());
      setManualRateInput(rate?.toString() || (currencies.USD ?? 0).toString());
    }
    if (section === "inventory") {
      setFormLowStock(lowStockThreshold.toString());
    }
    setEditingSection(section);
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setSavingSection(null);
    setFormBusiness(business);
    setFormMargin(margin.toString());
    setFormLowStock(lowStockThreshold.toString());
    setFormBaseCurrency(baseCurrency);
    setFormCurrencies({
      USD: (currencies.USD ?? 0).toString(),
      EURO: (currencies.EURO ?? 0).toString(),
      USD2: (currencies.USD2 ?? 0).toString(),
    });
    setFormIva(iva.toString());
    setManualRateInput(rate?.toString() || (currencies.USD ?? 0).toString());
  };

  const handleSaveBusiness = async () => {
    try {
      setSavingSection("business");
      const settings = await getSettings();
      const updatedSettings = {
        ...settings,
        business: formBusiness,
      };
      await saveSettings(updatedSettings);
      setBusiness(formBusiness);
      setEditingSection(null);
      Alert.alert("Éxito", "Información del negocio actualizada");
    } catch (error) {
      console.error("Error saving business info:", error);
      Alert.alert("Error", "No se pudo actualizar la información del negocio");
    } finally {
      setSavingSection(null);
    }
  };

  const handleSavePricing = async () => {
    const numericMargin = parseFloat(formMargin.replace(",", "."));
    const numericUsd = parseFloat(formCurrencies.USD.replace(",", "."));
    const numericEuro = parseFloat(formCurrencies.EURO.replace(",", "."));
    const numericUsd2 = parseFloat(formCurrencies.USD2.replace(",", "."));
    const numericIva = parseFloat(formIva.replace(",", "."));
    const numericManualRate = parseFloat(manualRateInput.replace(",", "."));

    if (
      Number.isNaN(numericMargin) ||
      numericMargin < 0 ||
      numericMargin > 200
    ) {
      Alert.alert("Valor inválido", "Ingresa un margen entre 0 y 200");
      return;
    }

    if (
      [numericUsd, numericEuro, numericUsd2].some(
        (value) => Number.isNaN(value) || value <= 0
      )
    ) {
      Alert.alert("Valor inválido", "Verifica los valores de las monedas");
      return;
    }

    if (Number.isNaN(numericIva) || numericIva < 0 || numericIva > 100) {
      Alert.alert("Valor inválido", "Ingresa un IVA entre 0 y 100");
      return;
    }

    if (Number.isNaN(numericManualRate) || numericManualRate <= 0) {
      Alert.alert("Valor inválido", "Ingresa una tasa manual válida para USD");
      return;
    }

    try {
      setSavingSection("pricing");
      const settings = await getSettings();
      const updatedSettings = {
        ...settings,
        pricing: {
          ...(settings.pricing || {}),
          defaultMargin: numericMargin,
          baseCurrency: formBaseCurrency,
          currencies: {
            USD: numericUsd,
            EURO: numericEuro,
            USD2: numericUsd2,
          },
          iva: numericIva,
        },
      };
      await saveSettings(updatedSettings);

      setMargin(numericMargin);
      setBaseCurrency(formBaseCurrency);
      setCurrencies({
        USD: numericUsd,
        EURO: numericEuro,
        USD2: numericUsd2,
      });
      setIva(numericIva);

      if (!Number.isNaN(numericManualRate) && numericManualRate !== rate) {
        await setManualRate(numericManualRate);
      }

      setEditingSection(null);
      Alert.alert("Éxito", "Configuración de precios actualizada");
    } catch (error) {
      console.error("Error saving pricing settings:", error);
      Alert.alert("Error", "No pudimos actualizar los datos de precios");
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveInventory = async () => {
    const numericLowStock = parseInt(formLowStock, 10);
    if (Number.isNaN(numericLowStock) || numericLowStock < 0) {
      Alert.alert("Valor inválido", "Ingresa un umbral mayor o igual a 0");
      return;
    }

    try {
      setSavingSection("inventory");
      const settings = await getSettings();
      const updatedSettings = {
        ...settings,
        inventory: {
          ...(settings.inventory || {}),
          lowStockThreshold: numericLowStock,
        },
      };
      await saveSettings(updatedSettings);
      setLowStockThreshold(numericLowStock);
      setEditingSection(null);
      Alert.alert("Éxito", "Umbral de stock bajo actualizado");
    } catch (error) {
      console.error("Error saving inventory settings:", error);
      Alert.alert("Error", "No pudimos actualizar el umbral de stock");
    } finally {
      setSavingSection(null);
    }
  };

  const formatCurrency = (value) => {
    if (value == null) {
      return "—";
    }
    return new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: "VES",
      minimumFractionDigits: 2,
    }).format(value);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f5ae0" />
        <Text style={styles.loadingText}>Cargando configuración...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroIconText}>⚙️</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle}>Configuración general</Text>
            <Text style={styles.heroSubtitle}>
              Personaliza datos del negocio, márgenes y parámetros operativos.
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Negocio</Text>
              <Text style={styles.sectionSubtitle}>
                Datos que se muestran en documentos y reportes.
              </Text>
            </View>
            {editingSection === "business" ? (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={cancelEditing}
                activeOpacity={0.8}
              >
                <Text style={styles.headerButtonText}>Cancelar</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => startEditing("business")}
                activeOpacity={0.8}
              >
                <Text style={styles.headerButtonText}>Editar</Text>
              </TouchableOpacity>
            )}
          </View>

          {editingSection === "business" ? (
            <View style={styles.formArea}>
              <TextInput
                style={styles.input}
                placeholder="Nombre del negocio"
                value={formBusiness.name}
                onChangeText={(text) =>
                  setFormBusiness({ ...formBusiness, name: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="RIF"
                value={formBusiness.rif}
                onChangeText={(text) =>
                  setFormBusiness({ ...formBusiness, rif: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Dirección"
                value={formBusiness.address}
                onChangeText={(text) =>
                  setFormBusiness({ ...formBusiness, address: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Teléfono"
                keyboardType="phone-pad"
                value={formBusiness.phone}
                onChangeText={(text) =>
                  setFormBusiness({ ...formBusiness, phone: text })
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                keyboardType="email-address"
                value={formBusiness.email}
                onChangeText={(text) =>
                  setFormBusiness({ ...formBusiness, email: text })
                }
              />
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  savingSection === "business" && styles.buttonDisabled,
                ]}
                onPress={handleSaveBusiness}
                disabled={savingSection === "business"}
                activeOpacity={0.85}
              >
                {savingSection === "business" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Guardar cambios</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.detailList}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Nombre</Text>
                <Text style={styles.detailValue}>{business.name || "—"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>RIF</Text>
                <Text style={styles.detailValue}>{business.rif || "—"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Dirección</Text>
                <Text style={styles.detailValue}>
                  {business.address || "—"}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Teléfono</Text>
                <Text style={styles.detailValue}>{business.phone || "—"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Correo</Text>
                <Text style={styles.detailValue}>{business.email || "—"}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Precios y divisas</Text>
              <Text style={styles.sectionSubtitle}>
                Controla márgenes, monedas y tasa manual.
              </Text>
            </View>
            {editingSection === "pricing" ? (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={cancelEditing}
                activeOpacity={0.8}
              >
                <Text style={styles.headerButtonText}>Cancelar</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => startEditing("pricing")}
                activeOpacity={0.8}
              >
                <Text style={styles.headerButtonText}>Editar</Text>
              </TouchableOpacity>
            )}
          </View>

          {editingSection === "pricing" ? (
            <View style={styles.formArea}>
              <Text style={styles.inputLabel}>Moneda base</Text>
              <View style={styles.chipRow}>
                {["USD", "EURO", "USD2"].map((currency) => {
                  const active = formBaseCurrency === currency;
                  return (
                    <TouchableOpacity
                      key={currency}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setFormBaseCurrency(currency)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {currency}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Margen por defecto (%)</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={formMargin}
                onChangeText={setFormMargin}
                placeholder="Ej: 30"
              />

              <Text style={styles.inputLabel}>Tasa USD manual (VES)</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={manualRateInput}
                onChangeText={setManualRateInput}
                placeholder="0.00"
              />
              {rateLoading && (
                <Text style={styles.helperText}>Guardando tasa manual...</Text>
              )}

              <Text style={styles.inputLabel}>Valores de referencia</Text>
              <View style={styles.inlineInputs}>
                <View style={styles.inlineInputBlock}>
                  <Text style={styles.inlineLabel}>USD</Text>
                  <TextInput
                    style={styles.inlineInput}
                    keyboardType="decimal-pad"
                    value={formCurrencies.USD}
                    onChangeText={(text) =>
                      setFormCurrencies({ ...formCurrencies, USD: text })
                    }
                  />
                </View>
                <View style={styles.inlineInputBlock}>
                  <Text style={styles.inlineLabel}>EURO</Text>
                  <TextInput
                    style={styles.inlineInput}
                    keyboardType="decimal-pad"
                    value={formCurrencies.EURO}
                    onChangeText={(text) =>
                      setFormCurrencies({ ...formCurrencies, EURO: text })
                    }
                  />
                </View>
                <View style={styles.inlineInputBlock}>
                  <Text style={styles.inlineLabel}>USD2</Text>
                  <TextInput
                    style={styles.inlineInput}
                    keyboardType="decimal-pad"
                    value={formCurrencies.USD2}
                    onChangeText={(text) =>
                      setFormCurrencies({ ...formCurrencies, USD2: text })
                    }
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>IVA (%)</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={formIva}
                onChangeText={setFormIva}
                placeholder="Ej: 16"
              />

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  savingSection === "pricing" && styles.buttonDisabled,
                ]}
                onPress={handleSavePricing}
                disabled={savingSection === "pricing"}
                activeOpacity={0.85}
              >
                {savingSection === "pricing" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Guardar cambios</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.detailList}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Moneda base</Text>
                <Text style={styles.detailValue}>{baseCurrency}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Margen por defecto</Text>
                <Text style={styles.detailValue}>{margin}%</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tasa USD manual</Text>
                <Text style={styles.detailValue}>{formatCurrency(rate)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Última actualización</Text>
                <Text style={styles.detailValue}>{formattedLastUpdate}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>USD</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(currencies.USD)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>EURO</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(currencies.EURO)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>USD2</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(currencies.USD2)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>IVA</Text>
                <Text style={styles.detailValue}>{iva}%</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Inventario</Text>
              <Text style={styles.sectionSubtitle}>
                Ajusta alertas para stock bajo.
              </Text>
            </View>
            {editingSection === "inventory" ? (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={cancelEditing}
                activeOpacity={0.8}
              >
                <Text style={styles.headerButtonText}>Cancelar</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => startEditing("inventory")}
                activeOpacity={0.8}
              >
                <Text style={styles.headerButtonText}>Editar</Text>
              </TouchableOpacity>
            )}
          </View>

          {editingSection === "inventory" ? (
            <View style={styles.formArea}>
              <Text style={styles.inputLabel}>Umbral de stock bajo</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={formLowStock}
                onChangeText={setFormLowStock}
                placeholder="Ej: 10"
              />
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  savingSection === "inventory" && styles.buttonDisabled,
                ]}
                onPress={handleSaveInventory}
                disabled={savingSection === "inventory"}
                activeOpacity={0.85}
              >
                {savingSection === "inventory" ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Guardar cambios</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.detailList}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Umbral actual</Text>
                <Text style={styles.detailValue}>
                  {lowStockThreshold} unidades
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Datos del sistema</Text>
              <Text style={styles.sectionSubtitle}>
                Gestiona backups y restauraciones.
              </Text>
            </View>
          </View>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.secondaryButtonOutline}>
              <Text style={styles.secondaryButtonOutlineText}>
                Exportar respaldo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButtonOutline}>
              <Text style={styles.secondaryButtonOutlineText}>
                Importar datos
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8edf2",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 24,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#e8edf2",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4c5767",
  },
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 22,
    flexDirection: "row",
    gap: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#f3f8ff",
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconText: {
    fontSize: 30,
  },
  heroInfo: {
    flex: 1,
    gap: 6,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2633",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#5b6472",
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 24,
    gap: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 6,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2633",
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#6f7c8c",
    marginTop: 4,
  },
  headerButton: {
    backgroundColor: "#f0f3fa",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexShrink: 0,
    marginLeft: 0,
    minWidth: 96,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  headerButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2f5ae0",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  formArea: {
    gap: 16,
  },
  input: {
    backgroundColor: "#f3f5fa",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#1f2633",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7a8796",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  chipRow: {
    flexDirection: "row",
    gap: 12,
  },
  chip: {
    flex: 1,
    backgroundColor: "#eef1f7",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 12,
  },
  chipActive: {
    backgroundColor: "#2f5ae0",
    shadowColor: "#2f5ae0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5b6472",
  },
  chipTextActive: {
    color: "#fff",
  },
  helperText: {
    fontSize: 12,
    color: "#6f7c8c",
  },
  inlineInputs: {
    flexDirection: "row",
    gap: 12,
  },
  inlineInputBlock: {
    flex: 1,
    backgroundColor: "#f3f5fa",
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  inlineLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7a8796",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  inlineInput: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2633",
  },
  detailList: {
    gap: 14,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 14,
    color: "#6f7c8c",
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2633",
    textAlign: "right",
    flexShrink: 1,
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#e4e9f2",
    marginVertical: 4,
  },
  primaryButton: {
    backgroundColor: "#1f9254",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  quickActions: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButtonOutline: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d5dbe7",
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonOutlineText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2f5ae0",
  },
});

export default SettingsScreen;
