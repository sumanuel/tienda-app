import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { useExchangeRate } from "../../hooks/useExchangeRate";
import { useSales } from "../../hooks/useSales";
import { useCustomers } from "../../hooks/useCustomers";
import { useAccounts } from "../../hooks/useAccounts";
import { useCustomAlert } from "../../components/common/CustomAlert";
import {
  ScreenHero,
  SHADOWS,
  SurfaceCard,
  UI_COLORS,
} from "../../components/common/AppUI";
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
  amount,
  exchangeRate,
  sequence,
}) => {
  const amountUSD = exchangeRate > 0 ? amount / exchangeRate : 0;

  return {
    id: `marginal-${Date.now()}-${sequence}`,
    name: description,
    price: amount,
    priceUSD: amountUSD,
    quantity: 1,
    subtotal: amount,
    iva: 0,
    product: {
      id: 0,
      name: description,
      priceUSD: amountUSD,
      priceVES: amount,
      stock: 1,
      trackInventory: 0,
      iva: 0,
      barcode: SPECIAL_CODE,
      category: "Venta marginal",
    },
  };
};

const MarginalSaleScreen = ({ navigation }) => {
  const { rate: exchangeRate } = useExchangeRate();
  const { registerSale: addSale } = useSales();
  const { addAccountReceivable } = useAccounts();
  const { getCustomerByDocument, ensureGenericCustomer, addCustomer } =
    useCustomers();
  const { showAlert, CustomAlert } = useCustomAlert();

  const [draft, setDraft] = useState({
    description: "",
    amount: "",
  });
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerDocument, setCustomerDocument] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [pendingSaleData, setPendingSaleData] = useState(null);
  const [processingSale, setProcessingSale] = useState(false);

  const amountValue = useMemo(() => parseAmount(draft.amount), [draft.amount]);
  const rateValue = Number(exchangeRate) || 0;
  const amountUSD = rateValue > 0 ? amountValue / rateValue : 0;
  const subtotalAmount = useMemo(
    () => cart.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0),
    [cart],
  );
  const total = subtotalAmount;
  const totalUSD = rateValue > 0 ? total / rateValue : 0;
  const requiresReference =
    paymentMethod === "transfer" || paymentMethod === "pago_movil";

  const updateDraft = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
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

    const nextItem = createMarginalItem({
      description: draft.description.trim(),
      amount: amountValue,
      exchangeRate: rateValue,
      sequence: cart.length,
    });

    setCart((prev) => [nextItem, ...prev]);
    resetDraft();
  };

  const handleRemoveItem = (itemId) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

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
              tax: 0,
              discount: 0,
              total,
              currency: "VES",
              exchangeRate: rateValue,
              paymentMethod,
              paid: total,
              change: 0,
              status: "completed",
              notes: `Cliente: ${customerDocument}${
                referenceNumber ? ` - Ref: ${referenceNumber}` : ""
              }`,
              saleItems: cart.map((item) => ({
                productId: 0,
                productName: item.name,
                quantity: item.quantity,
                price: item.price,
                priceUSD:
                  Number(item.priceUSD) ||
                  (rateValue ? Number(item.price) / rateValue : 0),
                subtotal: item.subtotal,
              })),
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
        tax: 0,
        discount: 0,
        total,
        currency: "VES",
        exchangeRate: rateValue,
        paymentMethod,
        paid: total,
        change: 0,
        status: "completed",
        notes: `Cliente: ${customerName}${
          referenceNumber ? ` - Ref: ${referenceNumber}` : ""
        }`,
      };

      const saleItems = cart.map((item) => ({
        productId: 0,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
        priceUSD:
          Number(item.priceUSD) ||
          (rateValue ? Number(item.price) / rateValue : 0),
        subtotal: item.subtotal,
      }));

      const saleResult = await addSale(saleData, saleItems);
      const saleId = saleResult?.id ?? saleResult;
      const saleNumber =
        saleResult?.saleNumber || `VTA-${String(saleId).padStart(6, "0")}`;

      if (paymentMethod === "por_cobrar") {
        try {
          const baseAmountUSD = cart.reduce(
            (sum, item) =>
              sum + (Number(item.priceUSD) || 0) * (Number(item.quantity) || 0),
            0,
          );
          await addAccountReceivable({
            customerId: customerId || null,
            customerName: customerName.trim() || "Cliente",
            documentNumber: customerDocument?.trim() || null,
            amount: total,
            baseCurrency: "USD",
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
          ? `Total: VES. ${total.toFixed(2)}\nCliente: ${customerName}\n\nCuenta por cobrar creada automáticamente`
          : `Total: VES. ${total.toFixed(2)}\nCliente: ${customerName}`;

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
          const baseAmountUSD = (pendingSaleData.saleItems || []).reduce(
            (sum, item) =>
              sum + (Number(item.priceUSD) || 0) * (Number(item.quantity) || 0),
            0,
          );
          await addAccountReceivable({
            customerId: customerId || null,
            customerName: newCustomerName.trim(),
            documentNumber: customerDocument?.trim() || null,
            amount: pendingSaleData.total,
            baseCurrency: "USD",
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
          ? `Total: VES. ${pendingSaleData.total.toFixed(2)}\nCliente: ${newCustomerName.trim()}\n\nCliente creado y cuenta por cobrar generada`
          : `Total: VES. ${pendingSaleData.total.toFixed(2)}\nCliente: ${newCustomerName.trim()}\n\nCliente creado exitosamente`;

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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
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
              <Text style={styles.fieldLabel}>Monto en VES *</Text>
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

            <View style={styles.previewRow}>
              <View style={styles.previewAmountCard}>
                <Text style={styles.previewAmountLabel}>Vista previa</Text>
                <Text style={styles.previewAmountValue}>
                  {amountValue > 0 ? `VES ${amountValue.toFixed(2)}` : "—"}
                </Text>
                <Text style={styles.previewAmountHint}>
                  {rateValue > 0 && amountValue > 0
                    ? `$${amountUSD.toFixed(2)} al cambio`
                    : "Se convertirá con la tasa activa"}
                </Text>
              </View>

              <Pressable
                onPress={handleAddItem}
                style={({ pressed }) => [
                  styles.addButton,
                  pressed && styles.cardPressed,
                ]}
              >
                <Ionicons name="add" size={rf(20)} color="#fff" />
                <Text style={styles.addButtonText}>Agregar</Text>
              </Pressable>
            </View>
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
              cart.map((item) => (
                <View key={item.id} style={styles.pendingItem}>
                  <View style={styles.pendingItemCopy}>
                    <Text style={styles.pendingItemTitle}>{item.name}</Text>
                    <Text style={styles.pendingItemMeta}>
                      {SPECIAL_CODE} · $ {item.priceUSD.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.pendingItemActions}>
                    <Text style={styles.pendingItemAmount}>
                      VES {item.subtotal.toFixed(2)}
                    </Text>
                    <Pressable
                      onPress={() => handleRemoveItem(item.id)}
                      style={({ pressed }) => [
                        styles.removeButton,
                        pressed && styles.cardPressed,
                      ]}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={rf(16)}
                        color={UI_COLORS.danger}
                      />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </SurfaceCard>
        </ScrollView>

        <View style={styles.cartBarWrap}>
          {cart.length > 0 ? (
            <Pressable
              onPress={handleOpenCart}
              style={({ pressed }) => [
                styles.cartAmountButton,
                pressed && styles.cardPressed,
              ]}
            >
              <Text style={styles.cartAmountLabel}>Carrito marginal</Text>
              <Text style={styles.cartAmountValue}>VES {total.toFixed(2)}</Text>
              <Text style={styles.cartAmountUsd}>
                {rateValue > 0
                  ? `$${totalUSD.toFixed(2)}`
                  : "Sin conversion USD"}
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
      </KeyboardAvoidingView>

      <Modal
        visible={showCart}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCart(false)}
      >
        <View style={styles.modalContainer}>
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

          <ScrollView style={styles.modalContent}>
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
                cart.map((item) => (
                  <View key={item.id} style={styles.cartItem}>
                    <View style={styles.cartItemLeft}>
                      <Text style={styles.cartItemName} numberOfLines={1}>
                        {item.name.toUpperCase()}
                      </Text>
                      <Text style={styles.cartItemPrice}>
                        VES. {item.price.toFixed(2)} x {item.quantity}
                      </Text>
                      <Text style={styles.cartItemSubtotal}>
                        Subtotal: VES. {item.subtotal.toFixed(2)}
                      </Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [
                        styles.removeCartButton,
                        pressed && styles.cardPressed,
                      ]}
                      onPress={() => handleRemoveItem(item.id)}
                    >
                      <Text style={styles.removeCartButtonText}>Eliminar</Text>
                    </Pressable>
                  </View>
                ))
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
                    VES. {subtotalAmount.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total</Text>
                  <Text style={styles.summaryTotal}>
                    VES. {total.toFixed(2)}
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
        </View>
      </Modal>

      <Modal
        visible={showNewCustomerModal}
        animationType="slide"
        transparent
        onRequestClose={cancelNewCustomer}
      >
        <View style={styles.modalOverlay}>
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
        </View>
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
    paddingBottom: vs(148),
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
  previewRow: {
    flexDirection: "row",
    gap: hs(12),
    alignItems: "stretch",
  },
  previewAmountCard: {
    flex: 1,
    backgroundColor: UI_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: hs(14),
    paddingVertical: vs(14),
    gap: vs(4),
  },
  previewAmountLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    textTransform: "uppercase",
    color: UI_COLORS.muted,
    letterSpacing: 0.6,
  },
  previewAmountValue: {
    fontSize: rf(18),
    fontWeight: "800",
    color: UI_COLORS.text,
  },
  previewAmountHint: {
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
    alignItems: "center",
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
  pendingItemActions: {
    alignItems: "flex-end",
    gap: vs(8),
  },
  pendingItemAmount: {
    fontSize: rf(14),
    fontWeight: "800",
    color: UI_COLORS.accentStrong,
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
    bottom: vs(18),
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
