import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOptionalBottomTabBarHeight } from "../../hooks/useOptionalBottomTabBarHeight";
import { useSales } from "../../hooks/useSales";
import { useCustomers } from "../../hooks/useCustomers";
import { useAccounts } from "../../hooks/useAccounts";
import { useExchangeRateContext } from "../../contexts/ExchangeRateContext";
import { useCustomAlert } from "../../components/common/CustomAlert";
import { getSettings } from "../../services/database/settings";
import {
  ScreenHero,
  SHADOWS,
  SurfaceCard,
  UI_COLORS,
} from "../../components/common/AppUI";
import {
  buildSaleItemMonetaryFields,
  formatCurrency,
  resolveSaleItemPricing,
  sumSaleItemsReferenceTotal,
} from "../../utils/currency";
import { borderRadius, hs, rf, s, spacing, vs } from "../../utils/responsive";

const SPECIAL_CODE = "VENTA-MARGINAL";

const PAYMENT_OPTIONS = [
  { value: "cash", label: "Efectivo", icon: "cash-outline" },
  { value: "card", label: "Tarjeta", icon: "card-outline" },
  {
    value: "transfer",
    label: "Transferencia",
    icon: "business-outline",
  },
  {
    value: "pago_movil",
    label: "Pago móvil",
    icon: "phone-portrait-outline",
  },
  {
    value: "por_cobrar",
    label: "Por cobrar",
    icon: "time-outline",
  },
];

const parseAmount = (value) => {
  const normalized = String(value || "")
    .replace(/,/g, ".")
    .replace(/\s/g, "")
    .trim();
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const createMarginalItem = ({
  description,
  localAmount,
  referenceAmount,
  localCurrency,
  referenceCurrency,
  rateEnabled,
  exchangeRate,
  iva,
  sequence,
}) => {
  return {
    id: `marginal-${Date.now()}-${sequence}`,
    name: description,
    price: localAmount,
    priceUSD: referenceAmount,
    quantity: 1,
    subtotal: localAmount,
    iva: Number(iva) || 0,
    localCurrency,
    referenceCurrency,
    priceSnapshot: {
      localAmount,
      referenceAmount,
      localCurrency,
      referenceCurrency,
      exchangeRate,
      rateEnabled,
    },
    product: {
      id: 0,
      name: description,
      priceUSD: referenceAmount,
      priceVES: localAmount,
      stock: 1,
      trackInventory: 0,
      iva: Number(iva) || 0,
      barcode: SPECIAL_CODE,
      category: "Venta marginal",
    },
  };
};

const MarginalSaleScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useOptionalBottomTabBarHeight();
  const { rate, localCurrency, referenceCurrency, rateEnabled } =
    useExchangeRateContext();
  const { registerSale: addSale } = useSales();
  const { addAccountReceivable } = useAccounts();
  const { getCustomerByDocument, ensureGenericCustomer, addCustomer } =
    useCustomers();
  const { showAlert, CustomAlert } = useCustomAlert();

  const [draft, setDraft] = useState({
    description: "",
    amount: "",
  });
  const [amountCurrency, setAmountCurrency] = useState(referenceCurrency);
  const [cart, setCart] = useState([]);
  const [quantityDrafts, setQuantityDrafts] = useState({});
  const [showCart, setShowCart] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerDocument, setCustomerDocument] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [pendingSaleData, setPendingSaleData] = useState(null);
  const [processingSale, setProcessingSale] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [pricingSettings, setPricingSettings] = useState({
    iva: 0,
    applyIvaOnSales: false,
  });

  const cartBarBottom = Math.max(tabBarHeight, insets.bottom) + vs(12);
  const contentBottomPadding = isKeyboardVisible
    ? vs(28)
    : cartBarBottom + s(78);

  useEffect(() => {
    let mounted = true;

    const loadPricingSettings = async () => {
      try {
        const settings = await getSettings();
        if (!mounted) return;

        setPricingSettings({
          iva: Number(settings?.pricing?.iva) || 0,
          applyIvaOnSales: Boolean(settings?.pricing?.applyIvaOnSales),
        });
      } catch (error) {
        console.warn("Error loading pricing settings in marginal sale:", error);
      }
    };

    loadPricingSettings();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const amountValue = useMemo(() => parseAmount(draft.amount), [draft.amount]);
  const rateValue = Number(rate) || 0;
  const amountCurrencyOptions = useMemo(() => {
    if (!rateEnabled || referenceCurrency === localCurrency) {
      return [{ code: localCurrency, label: `Monto en ${localCurrency}` }];
    }

    return [
      { code: referenceCurrency, label: `Monto en ${referenceCurrency}` },
      { code: localCurrency, label: `Monto en ${localCurrency}` },
    ];
  }, [localCurrency, rateEnabled, referenceCurrency]);

  useEffect(() => {
    if (
      !amountCurrencyOptions.some((option) => option.code === amountCurrency)
    ) {
      setAmountCurrency(amountCurrencyOptions[0]?.code || localCurrency);
    }
  }, [amountCurrency, amountCurrencyOptions, localCurrency]);

  const referenceAmount = useMemo(() => {
    if (amountCurrency === referenceCurrency) {
      return amountValue;
    }

    return rateValue > 0 ? amountValue / rateValue : 0;
  }, [amountCurrency, amountValue, rateValue, referenceCurrency]);
  const localAmount = useMemo(() => {
    if (amountCurrency === localCurrency) {
      return amountValue;
    }

    return rateValue > 0 ? amountValue * rateValue : 0;
  }, [amountCurrency, amountValue, localCurrency, rateValue]);
  const subtotalAmount = useMemo(
    () => cart.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0),
    [cart],
  );
  const taxAmount = useMemo(() => {
    if (!pricingSettings.applyIvaOnSales) {
      return 0;
    }

    return cart.reduce(
      (sum, item) =>
        sum + (Number(item.subtotal) || 0) * ((Number(item.iva) || 0) / 100),
      0,
    );
  }, [cart, pricingSettings.applyIvaOnSales]);
  const total = subtotalAmount + taxAmount;
  const totalReference = sumSaleItemsReferenceTotal(cart, {
    exchangeRate: rateValue,
    localCurrency,
    referenceCurrency,
    rateEnabled,
  });
  const requiresReference =
    paymentMethod === "transfer" || paymentMethod === "pago_movil";

  const updateDraft = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const formatQuantity = (quantity) => {
    const value = Number(quantity);
    if (!Number.isFinite(value)) return "";
    if (Number.isInteger(value)) return String(value);

    const fixed = value.toFixed(3);
    return fixed.replace(/\.0+$/, "").replace(/(\.[0-9]*?)0+$/, "$1");
  };

  const parseQuantityInput = (rawInput) => {
    const raw = String(rawInput ?? "").trim();
    if (!raw) return null;

    const normalized = raw.replace(/,/g, ".").replace(/[^0-9.]/g, "");
    if (!normalized) return null;

    const [intPart, ...rest] = normalized.split(".");
    const decimalPart = rest.join("");
    const rebuilt =
      decimalPart.length > 0 ? `${intPart}.${decimalPart}` : intPart;

    const parsed = Number.parseFloat(rebuilt);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;

    return Math.round(parsed * 1000) / 1000;
  };

  const setQuantityDraft = (itemId, value) => {
    setQuantityDrafts((prev) => {
      const next = { ...prev };
      if (value == null) {
        delete next[itemId];
        return next;
      }

      next[itemId] = value;
      return next;
    });
  };

  const updateQuantity = (itemId, nextQuantity) => {
    const normalizedQuantity = Number(nextQuantity) || 0;

    if (normalizedQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: normalizedQuantity,
              subtotal: normalizedQuantity * (Number(item.price) || 0),
            }
          : item,
      ),
    );
  };

  const commitQuantityDraft = (item) => {
    const itemId = item?.id;
    if (!itemId) return;

    const parsed = parseQuantityInput(quantityDrafts[itemId]);
    if (parsed == null) {
      setQuantityDraft(itemId, null);
      return;
    }

    updateQuantity(itemId, parsed);
    setQuantityDraft(itemId, null);
  };

  const handleChangeAmountCurrency = (nextCurrency) => {
    if (nextCurrency === amountCurrency) return;

    if (nextCurrency === localCurrency && rateEnabled && rateValue <= 0) {
      showAlert({
        title: "Tasa requerida",
        message: `Configura la tasa ${referenceCurrency}→${localCurrency} para ingresar montos en ${localCurrency}.`,
        type: "error",
      });
      return;
    }

    if (Number.isFinite(amountValue) && amountValue > 0 && rateValue > 0) {
      const factor = nextCurrency === localCurrency ? rateValue : 1 / rateValue;
      updateDraft("amount", (amountValue * factor).toFixed(2));
    }

    setAmountCurrency(nextCurrency);
  };

  const resetDraft = () => {
    setDraft({ description: "", amount: "" });
  };

  const handleAddItem = () => {
    if (!draft.description.trim()) {
      showAlert({
        title: "Error",
        message: "Ingresa la descripción de la venta marginal",
        type: "error",
      });
      return;
    }

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      showAlert({
        title: "Error",
        message: "Ingresa un monto válido mayor a cero",
        type: "error",
      });
      return;
    }

    if (rateValue <= 0) {
      showAlert({
        title: "Tasa requerida",
        message: "Debes tener una tasa activa para preparar esta venta.",
        type: "error",
      });
      return;
    }

    const resolvedLocalAmount =
      amountCurrency === localCurrency ? amountValue : localAmount;
    const resolvedReferenceAmount =
      amountCurrency === referenceCurrency ? amountValue : referenceAmount;

    if (resolvedLocalAmount <= 0 || resolvedReferenceAmount <= 0) {
      showAlert({
        title: "Monto inválido",
        message: "No se pudo convertir el monto con la tasa activa.",
        type: "error",
      });
      return;
    }

    const nextItem = createMarginalItem({
      description: draft.description.trim(),
      localAmount: resolvedLocalAmount,
      referenceAmount: resolvedReferenceAmount,
      localCurrency,
      referenceCurrency,
      rateEnabled,
      exchangeRate: rateValue,
      iva: pricingSettings.iva,
      sequence: cart.length,
    });

    setCart((prev) => [nextItem, ...prev]);
    resetDraft();
  };

  const handleRemoveItem = (itemId) => {
    setQuantityDraft(itemId, null);
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  const renderMarginalCartRow = (item, { compact = false } = {}) => (
    <View key={item.id} style={compact ? styles.pendingItem : styles.cartItem}>
      <View style={compact ? styles.pendingItemCopy : styles.cartItemLeft}>
        {(() => {
          const pricing = resolveSaleItemPricing(item, {
            exchangeRate: rateValue,
            localCurrency,
            referenceCurrency,
            rateEnabled,
          });

          return (
            <>
              <Text
                style={compact ? styles.pendingItemTitle : styles.cartItemName}
                numberOfLines={compact ? 2 : 1}
              >
                {compact ? item.name : item.name.toUpperCase()}
              </Text>
              <Text
                style={compact ? styles.pendingItemMeta : styles.cartItemPrice}
              >
                {formatCurrency(pricing.localPrice, localCurrency)}
                {rateEnabled && pricing.referencePrice > 0
                  ? ` · ${formatCurrency(pricing.referencePrice, referenceCurrency)} c/u`
                  : ""}
              </Text>
              <Text
                style={
                  compact ? styles.pendingItemAmount : styles.cartItemSubtotal
                }
              >
                {`Subtotal: ${formatCurrency(
                  Number(item.subtotal) || pricing.subtotalLocal,
                  localCurrency,
                )}`}
              </Text>
            </>
          );
        })()}
      </View>

      <View style={compact ? styles.pendingItemControls : styles.cartItemRight}>
        <View style={styles.quantityControls}>
          <Pressable
            style={({ pressed }) => [
              styles.quantityButton,
              pressed && styles.cardPressed,
            ]}
            onPress={() =>
              updateQuantity(item.id, (Number(item.quantity) || 0) - 1)
            }
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </Pressable>
          <TextInput
            style={styles.quantityInput}
            value={quantityDrafts[item.id] ?? formatQuantity(item.quantity)}
            onChangeText={(text) => setQuantityDraft(item.id, text)}
            onEndEditing={() => commitQuantityDraft(item)}
            keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
            returnKeyType="done"
            maxLength={8}
          />
          <Pressable
            style={({ pressed }) => [
              styles.quantityButton,
              pressed && styles.cardPressed,
            ]}
            onPress={() =>
              updateQuantity(item.id, (Number(item.quantity) || 0) + 1)
            }
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            compact ? styles.removeCompactButton : styles.removeCartButton,
            pressed && styles.cardPressed,
          ]}
          onPress={() => handleRemoveItem(item.id)}
        >
          <Text
            style={
              compact
                ? styles.removeCompactButtonText
                : styles.removeCartButtonText
            }
          >
            Eliminar
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const handleOpenCart = () => {
    if (cart.length === 0) {
      showAlert({
        title: "Carrito vacío",
        message: "Agrega al menos una venta marginal antes de continuar.",
        type: "warning",
      });
      return;
    }

    setShowCart(true);
  };

  const cancelNewCustomer = () => {
    setShowNewCustomerModal(false);
    setNewCustomerName("");
    setPendingSaleData(null);
  };

  const completeSale = async () => {
    if (processingSale) return;

    if (cart.length === 0) {
      showAlert({
        title: "Error",
        message: "El carrito está vacío",
        type: "error",
      });
      return;
    }

    if (!customerDocument.trim()) {
      showAlert({
        title: "Error",
        message: "Debe especificar la cédula del cliente",
        type: "error",
      });
      return;
    }

    if (customerDocument === "1" && paymentMethod === "por_cobrar") {
      showAlert({
        title: "Método de Pago No Permitido",
        message:
          "El cliente genérico es solo para ventas rápidas. No se permite el método de pago 'Por Cobrar' para este cliente.",
        buttons: [{ text: "Entendido", style: "default" }],
      });
      return;
    }

    if (requiresReference && !referenceNumber.trim()) {
      showAlert({
        title: "Referencia requerida",
        message: "Ingresa la referencia para completar la venta.",
        type: "error",
      });
      return;
    }

    try {
      setProcessingSale(true);
      let customerId = null;
      let customerName = "Cliente";

      if (customerDocument.trim()) {
        if (customerDocument === "1") {
          customerId = await ensureGenericCustomer();
          customerName = "Cliente Genérico";
        } else {
          const existingCustomer =
            await getCustomerByDocument(customerDocument);
          if (existingCustomer) {
            customerId = existingCustomer.id;
            customerName = existingCustomer.name;
          } else {
            setPendingSaleData({
              subtotal: subtotalAmount,
              tax: taxAmount,
              discount: 0,
              total,
              currency: localCurrency,
              localCurrency,
              referenceCurrency,
              exchangeRate: rateValue,
              paymentMethod,
              paid: total,
              change: 0,
              status: "completed",
              notes: `Cliente: ${customerDocument}${
                referenceNumber ? ` - Ref: ${referenceNumber}` : ""
              }`,
              saleItems: cart.map((item) => {
                const monetary = buildSaleItemMonetaryFields(item, {
                  exchangeRate: rateValue,
                  localCurrency,
                  referenceCurrency,
                  rateEnabled,
                });

                return {
                  productId: 0,
                  productName: item.name,
                  quantity: item.quantity,
                  price: monetary.price,
                  priceUSD: monetary.priceUSD,
                  localCurrency: monetary.localCurrency,
                  referenceCurrency: monetary.referenceCurrency,
                  subtotal: monetary.subtotal,
                };
              }),
            });
            setShowNewCustomerModal(true);
            setProcessingSale(false);
            return;
          }
        }
      }

      const saleData = {
        customerId,
        subtotal: subtotalAmount,
        tax: taxAmount,
        discount: 0,
        total,
        currency: localCurrency,
        localCurrency,
        referenceCurrency,
        exchangeRate: rateValue,
        paymentMethod,
        paid: total,
        change: 0,
        status: "completed",
        notes: `Cliente: ${customerName}${
          referenceNumber ? ` - Ref: ${referenceNumber}` : ""
        }`,
      };

      const saleItems = cart.map((item) => {
        const monetary = buildSaleItemMonetaryFields(item, {
          exchangeRate: rateValue,
          localCurrency,
          referenceCurrency,
          rateEnabled,
        });

        return {
          productId: 0,
          productName: item.name,
          quantity: item.quantity,
          price: monetary.price,
          priceUSD: monetary.priceUSD,
          localCurrency: monetary.localCurrency,
          referenceCurrency: monetary.referenceCurrency,
          subtotal: monetary.subtotal,
        };
      });

      const saleResult = await addSale(saleData, saleItems);
      const saleId = saleResult?.id ?? saleResult;
      const saleNumber =
        saleResult?.saleNumber || `VTA-${String(saleId).padStart(6, "0")}`;

      if (paymentMethod === "por_cobrar") {
        try {
          const baseAmountUSD = sumSaleItemsReferenceTotal(cart, {
            exchangeRate: rateValue,
            localCurrency,
            referenceCurrency,
            rateEnabled,
          });
          await addAccountReceivable({
            customerId: customerId || null,
            customerName: customerName.trim() || "Cliente",
            documentNumber: customerDocument?.trim() || null,
            amount: total,
            baseCurrency: referenceCurrency,
            baseAmountUSD,
            exchangeRateAtCreation: rateValue,
            description: `Venta a crédito - ${cart.length} producto(s): ${cart
              .map((item) => item.name.toUpperCase())
              .join(", ")}`,
            dueDate: null,
            invoiceNumber: saleNumber,
          });
        } catch (accountError) {
          console.error("Error creando cuenta por cobrar:", accountError);
        }
      }

      setCart([]);
      setCustomerDocument("");
      setReferenceNumber("");
      setPaymentMethod("cash");
      setShowCart(false);

      const confirmationMessage =
        paymentMethod === "por_cobrar"
          ? `Total: ${formatCurrency(total, localCurrency)}\nCliente: ${customerName}\n\nCuenta por cobrar creada automáticamente`
          : `Total: ${formatCurrency(total, localCurrency)}\nCliente: ${customerName}`;

      showAlert({
        title: "Venta completada",
        message: confirmationMessage,
        type: "success",
      });
    } catch (error) {
      console.error("Error completing marginal sale:", error);
      showAlert({
        title: "Error",
        message: "No se pudo completar la venta",
        type: "error",
      });
    } finally {
      setProcessingSale(false);
    }
  };

  const createCustomerAndCompleteSale = async () => {
    if (processingSale) return;

    if (!newCustomerName.trim()) {
      showAlert({
        title: "Error",
        message: "El nombre del cliente es obligatorio",
        type: "error",
      });
      return;
    }

    try {
      setProcessingSale(true);

      let customerId;
      if (customerDocument.trim()) {
        const existingCustomer = await getCustomerByDocument(
          customerDocument.trim(),
        );
        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          customerId = await addCustomer({
            name: newCustomerName.trim(),
            documentNumber: customerDocument,
            documentType: "V",
          });
        }
      } else {
        customerId = await ensureGenericCustomer();
      }

      const saleData = {
        ...pendingSaleData,
        customerId,
        notes: customerDocument.trim()
          ? `Cliente: ${newCustomerName.trim()}`
          : "Cliente genérico",
      };

      const saleResult = await addSale(saleData, pendingSaleData.saleItems);
      const saleId = saleResult?.id ?? saleResult;
      const saleNumber =
        saleResult?.saleNumber || `VTA-${String(saleId).padStart(6, "0")}`;

      if (pendingSaleData.paymentMethod === "por_cobrar") {
        try {
          const baseAmountUSD = sumSaleItemsReferenceTotal(
            pendingSaleData.saleItems || [],
            {
              exchangeRate: pendingSaleData.exchangeRate,
              localCurrency: pendingSaleData.localCurrency || localCurrency,
              referenceCurrency:
                pendingSaleData.referenceCurrency || referenceCurrency,
              rateEnabled,
            },
          );
          await addAccountReceivable({
            customerId: customerId || null,
            customerName: newCustomerName.trim(),
            documentNumber: customerDocument?.trim() || null,
            amount: pendingSaleData.total,
            baseCurrency:
              pendingSaleData.referenceCurrency || referenceCurrency,
            baseAmountUSD,
            exchangeRateAtCreation: pendingSaleData.exchangeRate,
            description: `Venta a crédito - ${cart.length} producto(s): ${cart
              .map((item) => item.name.toUpperCase())
              .join(", ")}`,
            dueDate: null,
            invoiceNumber: saleNumber,
          });
        } catch (accountError) {
          console.error("Error creando cuenta por cobrar:", accountError);
        }
      }

      setCart([]);
      setCustomerDocument("");
      setReferenceNumber("");
      setPaymentMethod("cash");
      setShowCart(false);
      setShowNewCustomerModal(false);
      setNewCustomerName("");
      setPendingSaleData(null);

      const confirmationMessage =
        pendingSaleData.paymentMethod === "por_cobrar"
          ? `Total: ${formatCurrency(pendingSaleData.total, localCurrency)}\nCliente: ${newCustomerName.trim()}\n\nCliente creado y cuenta por cobrar generada`
          : `Total: ${formatCurrency(pendingSaleData.total, localCurrency)}\nCliente: ${newCustomerName.trim()}\n\nCliente creado exitosamente`;

      showAlert({
        title: "Venta completada",
        message: confirmationMessage,
        type: "success",
      });
    } catch (error) {
      console.error("Error creating customer and completing sale:", error);
      showAlert({
        title: "Error",
        message: "No se pudo crear el cliente y completar la venta",
        type: "error",
      });
    } finally {
      setProcessingSale(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: contentBottomPadding },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHero
            iconName="cart-outline"
            iconColor={UI_COLORS.accentStrong}
            eyebrow="Venta asistida"
            title="Registrar venta marginal"
            subtitle="Carga productos especiales y ciérralos desde este mismo carrito sin salir del flujo marginal."
            pills={[
              {
                text:
                  rateValue > 0
                    ? `Tasa ${rateValue.toFixed(2)}`
                    : "Sin tasa activa",
                tone: rateValue > 0 ? "info" : "warning",
                iconName: "swap-horizontal-outline",
              },
            ]}
          />

          <SurfaceCard style={styles.card}>
            <Text style={styles.sectionTitle}>Producto especial</Text>
            <Text style={styles.sectionHint}>
              Agrega cada línea directamente al carrito marginal y revísala con
              el mismo acceso flotante del punto de venta.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Descripción *</Text>
              <TextInput
                style={styles.input}
                value={draft.description}
                onChangeText={(value) => updateDraft("description", value)}
                placeholder="Descripcion del producto"
                placeholderTextColor="#9aa2b1"
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Monto *</Text>
              <View style={styles.currencySwitch}>
                {AMOUNT_CURRENCY_OPTIONS.map((option) => {
                  const active = amountCurrency === option.code;
                  return (
                    <Pressable
                      key={option.code}
                      style={({ pressed }) => [
                        styles.currencyChip,
                        active ? styles.currencyChipActive : null,
                        pressed && styles.cardPressed,
                      ]}
                      onPress={() => handleChangeAmountCurrency(option.code)}
                    >
                      <Text
                        style={[
                          styles.currencyChipText,
                          active ? styles.currencyChipTextActive : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                style={styles.input}
                value={draft.amount}
                onChangeText={(value) => updateDraft("amount", value)}
                placeholder="0.00"
                placeholderTextColor="#9aa2b1"
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>

            <View style={styles.priceGrid}>
              <View style={styles.priceCard}>
                <Text style={styles.priceLabel}>{referenceCurrency}</Text>
                <Text style={styles.priceValue}>
                  {referenceAmount > 0
                    ? formatCurrency(referenceAmount, referenceCurrency)
                    : "—"}
                </Text>
                <Text style={styles.priceHint}>Monto unitario calculado</Text>
              </View>
              <View style={styles.priceCard}>
                <Text style={styles.priceLabel}>{localCurrency}</Text>
                <Text style={styles.priceValue}>
                  {localAmount > 0
                    ? formatCurrency(localAmount, localCurrency)
                    : "—"}
                </Text>
                <Text style={styles.priceHint}>
                  Conversión con tasa vigente
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleAddItem}
              style={({ pressed }) => [
                styles.addButton,
                styles.addButtonWide,
                pressed && styles.cardPressed,
              ]}
            >
              <Ionicons name="add" size={rf(20)} color="#fff" />
              <Text style={styles.addButtonText}>
                Agregar al carrito marginal
              </Text>
            </Pressable>
          </SurfaceCard>

          <SurfaceCard style={styles.card}>
            <Text style={styles.sectionTitle}>Carrito marginal</Text>
            <Text style={styles.sectionHint}>
              Cada línea que agregues caerá directamente aquí. Puedes abrir el
              carrito cuando quieras y volver a esta pantalla sin salir del
              flujo.
            </Text>

            {cart.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="receipt-outline"
                  size={rf(22)}
                  color={UI_COLORS.muted}
                />
                <Text style={styles.emptyTitle}>El carrito está vacío</Text>
                <Text style={styles.emptySubtitle}>
                  Agrega una descripción y un monto para comenzar esta venta
                  especial.
                </Text>
              </View>
            ) : (
              cart.map((item) => renderMarginalCartRow(item, { compact: true }))
            )}
          </SurfaceCard>
        </ScrollView>

        {!isKeyboardVisible ? (
          <View style={[styles.cartBarWrap, { bottom: cartBarBottom }]}>
            {cart.length > 0 ? (
              <Pressable
                onPress={handleOpenCart}
                style={({ pressed }) => [
                  styles.cartAmountButton,
                  pressed && styles.cardPressed,
                ]}
              >
                <Text style={styles.cartAmountLabel}>Carrito marginal</Text>
                <Text style={styles.cartAmountValue}>
                  {formatCurrency(total, localCurrency)}
                </Text>
                <Text style={styles.cartAmountUsd}>
                  {rateEnabled && totalReference > 0
                    ? formatCurrency(totalReference, referenceCurrency)
                    : `Sin conversión ${referenceCurrency}`}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={handleOpenCart}
              style={({ pressed }) => [
                styles.cartButton,
                cart.length === 0 && styles.cartButtonIdle,
                pressed && styles.cardPressed,
              ]}
            >
              <Ionicons name="cart-outline" size={rf(22)} color="#ffffff" />
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cart.length}</Text>
              </View>
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <Modal
        visible={showCart}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCart(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalHeader}>
            <Pressable
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.cardPressed,
              ]}
              onPress={() => setShowCart(false)}
            >
              <Ionicons
                name="chevron-back-outline"
                size={rf(18)}
                color={UI_COLORS.text}
              />
              <Text style={styles.backButtonText}>Volver</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Carrito de Compras</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={styles.customerSection}>
              <Text style={styles.sectionTitle}>Cliente</Text>
              <TextInput
                style={styles.customerInput}
                placeholder="Cédula del cliente (obligatorio)*"
                value={customerDocument}
                onChangeText={(text) => {
                  const numericText = text.replace(/[^0-9]/g, "");
                  setCustomerDocument(numericText);
                }}
                keyboardType="numeric"
                maxLength={10}
                placeholderTextColor="#999"
              />
              {customerDocument === "1" ? (
                <Text style={styles.genericCustomerText}>
                  Cliente genérico para operaciones rápidas
                </Text>
              ) : null}
            </View>

            <View style={styles.cartItemsSection}>
              <Text style={styles.sectionTitle}>Productos ({cart.length})</Text>
              {cart.length === 0 ? (
                <View style={styles.emptyCartContainer}>
                  <Text style={styles.emptyCartText}>
                    El carrito está vacío
                  </Text>
                  <Text style={styles.emptyCartSubtext}>
                    Agrega productos para comenzar
                  </Text>
                </View>
              ) : (
                cart.map((item) => renderMarginalCartRow(item))
              )}
            </View>

            {cart.length > 0 ? (
              <View style={styles.paymentSection}>
                <Text style={styles.sectionTitle}>Método de Pago</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.paymentButtonsScroll}
                  contentContainerStyle={styles.paymentButtons}
                >
                  {PAYMENT_OPTIONS.map((option) => {
                    const active = paymentMethod === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        style={[
                          styles.paymentButton,
                          active && styles.paymentButtonActive,
                        ]}
                        onPress={() => setPaymentMethod(option.value)}
                      >
                        <Ionicons
                          name={option.icon}
                          size={rf(20)}
                          color={active ? "#ffffff" : UI_COLORS.text}
                          style={styles.paymentButtonIcon}
                        />
                        <Text
                          style={[
                            styles.paymentButtonText,
                            active && styles.paymentButtonTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {requiresReference ? (
                  <TextInput
                    style={styles.referenceInput}
                    placeholder="Número de referencia *"
                    value={referenceNumber}
                    onChangeText={setReferenceNumber}
                    placeholderTextColor="#999"
                  />
                ) : null}
              </View>
            ) : null}

            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Resumen</Text>
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(subtotalAmount, localCurrency)}
                  </Text>
                </View>
                {taxAmount > 0 ? (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>IVA</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(taxAmount, localCurrency)}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total</Text>
                  <Text style={styles.summaryTotal}>
                    {formatCurrency(total, localCurrency)}
                  </Text>
                </View>
              </View>
            </View>

            <Pressable
              style={[
                styles.completeSaleButton,
                processingSale && styles.buttonDisabled,
              ]}
              onPress={completeSale}
              disabled={processingSale}
            >
              {processingSale ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.completeSaleButtonText}>
                  Completar venta
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showNewCustomerModal}
        animationType="slide"
        transparent
        onRequestClose={cancelNewCustomer}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.newCustomerModalContent}>
            <Text style={styles.modalTitle}>Nuevo Cliente</Text>
            <Text style={styles.newCustomerInfo}>
              La cédula {customerDocument} no está registrada.{"\n"}
              Ingresa el nombre para crear el cliente:
            </Text>

            <TextInput
              style={styles.newCustomerInput}
              placeholder="Nombre completo del cliente *"
              value={newCustomerName}
              onChangeText={setNewCustomerName}
              autoFocus
              placeholderTextColor="#999"
            />

            <View style={styles.newCustomerButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelNewCustomer}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  processingSale && styles.buttonDisabled,
                ]}
                onPress={createCustomerAndCompleteSale}
                disabled={processingSale}
              >
                {processingSale ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Crear y Vender</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CustomAlert />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_COLORS.page,
  },
  content: {
    paddingHorizontal: hs(16),
    paddingTop: vs(16),
    gap: vs(18),
  },
  card: {
    gap: vs(18),
    ...SHADOWS.soft,
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  sectionHint: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
    lineHeight: vs(18),
  },
  currencySwitch: {
    flexDirection: "row",
    gap: hs(10),
    flexWrap: "wrap",
  },
  currencyChip: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    backgroundColor: UI_COLORS.surfaceAlt,
    paddingHorizontal: hs(14),
    paddingVertical: vs(12),
    minWidth: hs(130),
  },
  currencyChipActive: {
    backgroundColor: UI_COLORS.accent,
    borderColor: UI_COLORS.accent,
  },
  currencyChipText: {
    fontSize: rf(13),
    fontWeight: "700",
    color: UI_COLORS.text,
    textAlign: "center",
  },
  currencyChipTextActive: {
    color: "#fff",
  },
  priceGrid: {
    flexDirection: "row",
    gap: hs(12),
  },
  priceCard: {
    flex: 1,
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: hs(14),
    paddingVertical: vs(14),
    gap: vs(4),
  },
  priceLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    textTransform: "uppercase",
    color: UI_COLORS.muted,
    letterSpacing: 0.6,
  },
  priceValue: {
    fontSize: rf(18),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  priceHint: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
  },
  addButton: {
    minWidth: hs(108),
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    backgroundColor: UI_COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    gap: vs(6),
    paddingHorizontal: hs(16),
    paddingVertical: vs(14),
    ...SHADOWS.soft,
  },
  addButtonWide: {
    width: "100%",
    flexDirection: "row",
  },
  addButtonText: {
    fontSize: rf(14),
    fontWeight: "800",
    color: "#fff",
  },
  fieldGroup: {
    gap: vs(8),
  },
  fieldLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: hs(14),
    paddingVertical: vs(13),
    fontSize: rf(15),
    color: UI_COLORS.text,
    backgroundColor: UI_COLORS.surfaceAlt,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: vs(8),
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: hs(18),
    paddingVertical: vs(22),
  },
  emptyTitle: {
    fontSize: rf(14),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  emptySubtitle: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
    textAlign: "center",
    lineHeight: vs(18),
  },
  pendingItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: hs(12),
    paddingVertical: vs(12),
  },
  pendingItemCopy: {
    flex: 1,
    gap: vs(4),
  },
  pendingItemTitle: {
    fontSize: rf(14),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  pendingItemMeta: {
    fontSize: rf(12),
    color: UI_COLORS.muted,
  },
  pendingItemControls: {
    alignItems: "flex-end",
    gap: vs(8),
    marginLeft: hs(10),
  },
  pendingItemAmount: {
    fontSize: rf(13),
    fontWeight: "800",
    color: UI_COLORS.accentStrong,
  },
  removeCompactButton: {
    backgroundColor: UI_COLORS.dangerSoft,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: hs(10),
    paddingVertical: vs(8),
  },
  removeCompactButtonText: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.danger,
  },
  removeButton: {
    width: s(32),
    height: s(32),
    borderRadius: s(16),
    borderCurve: "continuous",
    backgroundColor: UI_COLORS.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBarWrap: {
    position: "absolute",
    left: hs(16),
    right: hs(16),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: hs(12),
  },
  cartAmountButton: {
    flex: 1,
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    backgroundColor: UI_COLORS.surface,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    paddingHorizontal: hs(18),
    paddingVertical: vs(12),
    ...SHADOWS.soft,
  },
  cartAmountLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.muted,
  },
  cartAmountValue: {
    fontSize: rf(18),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  cartAmountUsd: {
    marginTop: vs(2),
    fontSize: rf(12),
    fontWeight: "600",
    color: UI_COLORS.muted,
  },
  cartButton: {
    width: s(62),
    height: s(62),
    borderRadius: s(31),
    borderCurve: "continuous",
    backgroundColor: UI_COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.soft,
  },
  cartButtonIdle: {
    backgroundColor: UI_COLORS.muted,
  },
  cartBadge: {
    position: "absolute",
    top: vs(4),
    right: hs(4),
    minWidth: s(22),
    height: s(22),
    borderRadius: s(11),
    backgroundColor: UI_COLORS.warning,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: hs(4),
  },
  cartBadgeText: {
    fontSize: rf(11),
    fontWeight: "700",
    color: "#fff",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: UI_COLORS.page,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: hs(16),
    paddingTop: vs(12),
    paddingBottom: vs(10),
  },
  backButton: {
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: hs(14),
    paddingVertical: vs(10),
    flexDirection: "row",
    alignItems: "center",
    gap: hs(6),
  },
  backButtonText: {
    color: UI_COLORS.text,
    fontWeight: "700",
    fontSize: rf(14),
  },
  modalTitle: {
    fontSize: rf(20),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  headerSpacer: {
    width: s(44),
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: hs(16),
    paddingBottom: vs(20),
  },
  customerSection: {
    backgroundColor: UI_COLORS.surface,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    padding: spacing.md,
    marginBottom: vs(10),
    gap: vs(12),
    ...SHADOWS.soft,
  },
  customerInput: {
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: vs(14),
    paddingHorizontal: hs(16),
    fontSize: rf(14),
    color: UI_COLORS.text,
  },
  genericCustomerText: {
    fontSize: rf(12),
    color: UI_COLORS.accent,
    fontStyle: "italic",
  },
  cartItemsSection: {
    backgroundColor: UI_COLORS.surface,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    padding: spacing.md,
    marginBottom: vs(8),
    gap: vs(14),
    ...SHADOWS.soft,
  },
  emptyCartContainer: {
    alignItems: "center",
    gap: vs(8),
    paddingVertical: vs(32),
  },
  emptyCartText: {
    fontSize: rf(16),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  emptyCartSubtext: {
    fontSize: rf(14),
    color: UI_COLORS.muted,
  },
  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    padding: spacing.sm + 2,
    gap: hs(12),
    marginBottom: vs(8),
  },
  cartItemLeft: {
    flex: 1,
    gap: vs(6),
  },
  cartItemName: {
    fontSize: rf(15),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  cartItemPrice: {
    fontSize: rf(13),
    color: UI_COLORS.muted,
  },
  cartItemSubtotal: {
    fontSize: rf(13),
    fontWeight: "700",
    color: UI_COLORS.accentStrong,
  },
  cartItemRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: vs(10),
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: hs(6),
  },
  quantityButton: {
    width: s(30),
    height: s(30),
    borderRadius: s(15),
    borderCurve: "continuous",
    backgroundColor: UI_COLORS.surface,
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButtonText: {
    fontSize: rf(16),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  quantityInput: {
    minWidth: hs(52),
    borderWidth: 1,
    borderColor: UI_COLORS.border,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    backgroundColor: UI_COLORS.surface,
    paddingHorizontal: hs(10),
    paddingVertical: vs(8),
    fontSize: rf(13),
    fontWeight: "700",
    color: UI_COLORS.text,
    textAlign: "center",
  },
  removeCartButton: {
    alignSelf: "center",
    backgroundColor: UI_COLORS.dangerSoft,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: hs(12),
    paddingVertical: vs(10),
  },
  removeCartButtonText: {
    fontSize: rf(12),
    fontWeight: "700",
    color: UI_COLORS.danger,
  },
  paymentSection: {
    backgroundColor: UI_COLORS.surface,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    padding: spacing.md,
    marginBottom: vs(8),
    gap: vs(14),
    ...SHADOWS.soft,
  },
  paymentButtonsScroll: {
    marginHorizontal: -hs(2),
  },
  paymentButtons: {
    paddingHorizontal: hs(2),
    gap: hs(10),
  },
  paymentButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: hs(6),
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: hs(14),
    paddingVertical: vs(12),
  },
  paymentButtonActive: {
    backgroundColor: UI_COLORS.accent,
  },
  paymentButtonIcon: {
    marginRight: hs(2),
  },
  paymentButtonText: {
    fontSize: rf(13),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  paymentButtonTextActive: {
    color: "#ffffff",
  },
  referenceInput: {
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: vs(14),
    paddingHorizontal: hs(16),
    fontSize: rf(14),
    color: UI_COLORS.text,
  },
  summarySection: {
    marginBottom: vs(12),
  },
  summaryCard: {
    backgroundColor: UI_COLORS.surface,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    padding: spacing.md,
    gap: vs(12),
    marginTop: vs(8),
    ...SHADOWS.soft,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: rf(14),
    color: UI_COLORS.muted,
  },
  summaryValue: {
    fontSize: rf(14),
    fontWeight: "700",
    color: UI_COLORS.text,
  },
  summaryTotal: {
    fontSize: rf(18),
    fontWeight: "800",
    color: UI_COLORS.accentStrong,
  },
  completeSaleButton: {
    backgroundColor: UI_COLORS.accent,
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    paddingVertical: vs(16),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: vs(24),
    ...SHADOWS.soft,
  },
  completeSaleButtonText: {
    color: "#ffffff",
    fontSize: rf(16),
    fontWeight: "800",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    paddingHorizontal: hs(20),
  },
  newCustomerModalContent: {
    backgroundColor: UI_COLORS.surface,
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    padding: spacing.lg,
    gap: vs(16),
    ...SHADOWS.card,
  },
  newCustomerInfo: {
    fontSize: rf(14),
    color: UI_COLORS.muted,
    lineHeight: vs(20),
  },
  newCustomerInput: {
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: vs(14),
    paddingHorizontal: hs(16),
    fontSize: rf(14),
    color: UI_COLORS.text,
  },
  newCustomerButtons: {
    flexDirection: "row",
    gap: hs(12),
  },
  modalButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: vs(14),
  },
  cancelButton: {
    backgroundColor: UI_COLORS.surfaceAlt,
  },
  cancelButtonText: {
    color: UI_COLORS.text,
    fontSize: rf(14),
    fontWeight: "700",
  },
  saveButton: {
    backgroundColor: UI_COLORS.accent,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: rf(14),
    fontWeight: "800",
  },
  cardPressed: {
    opacity: 0.9,
  },
});

export default MarginalSaleScreen;
