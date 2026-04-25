import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  FlatList,
  TextInput,
  Modal,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  TourGuideProvider,
  TourGuideZone,
  useTourGuideController,
} from "rn-tourguide";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TourTooltip from "../../components/tour/TourTooltip";
import { useProducts } from "../../hooks/useProducts";
import { useSales } from "../../hooks/useSales";
import { useExchangeRate } from "../../contexts/ExchangeRateContext";
import { useAccounts } from "../../hooks/useAccounts";
import { useCustomers } from "../../hooks/useCustomers";
import { useCustomAlert } from "../../components/common/CustomAlert";
import { hasSeenTour, markTourSeen } from "../../services/tour/tourStorage";
import { InfoPill, SHADOWS, UI_COLORS } from "../../components/common/AppUI";
import { getSettings } from "../../services/database/settings";
import {
  updateProductStock,
  insertInventoryMovement,
} from "../../services/database/products";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  s,
  rf,
  vs,
  hs,
  spacing,
  borderRadius,
  iconSize,
} from "../../utils/responsive";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const TOUR_ZONE_BASE = 0;
const CART_TOUR_ZONE_BASE = 0;

const POS_COLORS = UI_COLORS;

/**
 * Pantalla de punto de venta (POS)
 */
export const POSScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { canStart, start } = useTourGuideController("pos_v3");
  const [tourBooted, setTourBooted] = useState(false);
  const {
    products,
    loading: productsLoading,
    loadProducts: refreshProducts,
  } = useProducts();
  const { registerSale: addSale } = useSales();
  const { rate: exchangeRate } = useExchangeRate();
  const { addAccountReceivable } = useAccounts();
  const { getCustomerByDocument, ensureGenericCustomer, addCustomer } =
    useCustomers();
  const { showAlert, CustomAlert } = useCustomAlert();

  const [cart, setCart] = useState([]);
  const [quantityDrafts, setQuantityDrafts] = useState({});
  const [subtotalAmount, setSubtotalAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [total, setTotal] = useState(0);
  const [pricingSettings, setPricingSettings] = useState({
    iva: 0,
    applyIvaOnSales: false,
  });
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerDocument, setCustomerDocument] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [pendingSaleData, setPendingSaleData] = useState(null);
  const [processingSale, setProcessingSale] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);

  const scrollViewRef = useRef(null);

  const loadPricingSettings = async () => {
    try {
      const settings = await getSettings();
      setPricingSettings({
        iva: Number(settings?.pricing?.iva) || 0,
        applyIvaOnSales: Boolean(settings?.pricing?.applyIvaOnSales),
      });
    } catch (error) {
      console.warn("Error loading pricing settings in POS:", error);
    }
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

    // Normalizar: coma -> punto, remover caracteres no numéricos.
    const normalized = raw.replace(/,/g, ".").replace(/[^0-9.]/g, "");
    if (!normalized) return null;

    // Permitir solo 1 punto decimal.
    const [intPart, ...rest] = normalized.split(".");
    const decimalPart = rest.join("");
    const rebuilt =
      decimalPart.length > 0 ? `${intPart}.${decimalPart}` : intPart;

    const parsed = Number.parseFloat(rebuilt);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;

    // Redondear a 3 decimales para evitar ruido de floats.
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

  const commitQuantityDraft = (item) => {
    const itemId = item?.id;
    if (itemId == null) return;

    const parsed = parseQuantityInput(quantityDrafts[itemId]);
    if (parsed == null) {
      setQuantityDraft(itemId, null);
      return;
    }

    updateQuantity(itemId, parsed);
    setQuantityDraft(itemId, null);
  };

  const CartTourBootstrapper = () => {
    const { canStart: canStartCart, start: startCart } =
      useTourGuideController("pos_cart_v2");
    const [booted, setBooted] = useState(false);

    useEffect(() => {
      let mounted = true;

      const maybeStart = async () => {
        if (booted) return;
        if (!showCart) return;
        if (!canStartCart) return;

        const tourId = "pos_cart_v2";
        const seen = await hasSeenTour(tourId);
        if (!mounted) return;

        if (!seen) {
          // Dar tiempo a que el Modal y sus layouts midan posiciones.
          setTimeout(() => {
            startCart();
            markTourSeen(tourId);
          }, 650);
        }

        if (mounted) setBooted(true);
      };

      maybeStart();

      return () => {
        mounted = false;
      };
    }, [booted, showCart, canStartCart, startCart]);

    return null;
  };

  useEffect(() => {
    loadPricingSettings();
  }, []);

  // Calcular total cuando cambie el carrito
  useEffect(() => {
    const newSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const newTax = pricingSettings.applyIvaOnSales
      ? cart.reduce(
          (sum, item) => sum + item.subtotal * ((Number(item.iva) || 0) / 100),
          0,
        )
      : 0;
    setSubtotalAmount(newSubtotal);
    setTaxAmount(newTax);
    setTotal(newSubtotal + newTax);
  }, [cart, pricingSettings]);

  // Scroll hacia arriba cuando se abre el carrito
  useEffect(() => {
    if (showCart && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: false });
      }, 100); // Pequeño delay para asegurar que el modal esté completamente abierto
    }
  }, [showCart]);

  // Recargar productos cuando se vuelve a la pantalla POS
  useEffect(() => {
    if (navigation) {
      const unsubscribe = navigation.addListener("focus", () => {
        console.log("Volviendo a POS, recargando productos...");
        refreshProducts();
        loadPricingSettings();
      });
      return unsubscribe;
    }
  }, [navigation, refreshProducts]);

  useEffect(() => {
    let mounted = true;

    const maybeStartTour = async () => {
      if (tourBooted) return;
      if (!canStart) return;
      if (showCart) return;

      const tourId = "pos_v3";
      const seen = await hasSeenTour(tourId);
      if (!mounted) return;

      if (!seen) {
        setTimeout(() => {
          start();
          markTourSeen(tourId);
        }, 450);
      }

      if (mounted) setTourBooted(true);
    };

    maybeStartTour();

    return () => {
      mounted = false;
    };
  }, [canStart, start, tourBooted, showCart]);

  // Auto-scroll cuando se muestra u oculta el campo de referencia
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        if (paymentMethod === "transfer" || paymentMethod === "pago_movil") {
          scrollViewRef.current.scrollToEnd({ animated: true });
        } else {
          // Cuando se oculta, hacer scroll hacia arriba para mostrar los botones de pago
          scrollViewRef.current.scrollTo({ x: 0, y: 400, animated: true }); // Ajustar Y según sea necesario
        }
      }, 200);
    }
  }, [paymentMethod]);

  // Filtrar productos (ordenados por código de barras)
  const filteredProducts = products
    .sort((a, b) => {
      const numA = parseInt((a.barcode || "").replace("PROD-", "")) || 0;
      const numB = parseInt((b.barcode || "").replace("PROD-", "")) || 0;
      return numA - numB;
    })
    .filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

  /**
   * Agrega un producto al carrito
   */
  const addToCart = (product, options = {}) => {
    const { showAlert: shouldShowAlert = true } = options;

    const stockValue = Number(product.stock) || 0;

    if (stockValue === 0) {
      showAlert({
        title: "Sin stock",
        message: "Este producto no tiene stock disponible",
        type: "error",
      });
      return;
    }

    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem) {
      // Incrementar cantidad si ya existe y mover al frente
      const updatedItem = {
        ...existingItem,
        quantity: existingItem.quantity + 1,
        subtotal: (existingItem.quantity + 1) * existingItem.price,
      };
      const newCart = cart.filter((item) => item.id !== product.id);
      setCart([updatedItem, ...newCart]);
    } else {
      // Agregar nuevo item al frente
      const basePriceUSD =
        Number(product.priceUSD) ||
        (exchangeRate ? (Number(product.priceVES) || 0) / exchangeRate : 0);
      const newItem = {
        id: product.id,
        name: product.name,
        price: product.priceVES || product.priceUSD * exchangeRate,
        priceUSD: basePriceUSD,
        quantity: 1,
        subtotal: product.priceVES || product.priceUSD * exchangeRate,
        iva: Number(product.iva ?? pricingSettings.iva) || 0,
        product: product,
      };
      setCart([newItem, ...cart]);
    }

    // Mostrar feedback visual solo si se solicita
    if (shouldShowAlert) {
      showAlert({
        title: "Producto agregado",
        message: `${product.name} agregado al carrito`,
        type: "success",
      });
    }
  };

  /**
   * Abre el escáner QR
   */
  const openQRScanner = async () => {
    const { status } = await requestPermission();
    if (status !== "granted") {
      showAlert({
        title: "Permiso denegado",
        message: "Se necesita permiso para acceder a la cámara.",
        type: "error",
      });
      return;
    }
    setScanning(true);
  };

  /**
   * Maneja el escaneo de código de barras
   */
  const handleBarCodeScanned = ({ data }) => {
    setScanning(false);
    const product = products.find((p) => p.barcode === data);
    if (product) {
      addToCart(product, { showAlert: false });
    } else {
      showAlert({
        title: "Producto no encontrado",
        message: `Código: ${data}`,
        type: "warning",
      });
    }
  };

  /**
   * Remueve un producto del carrito
   */
  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  /**
   * Actualiza la cantidad de un item en el carrito
   */
  const updateQuantity = (productId, newQuantity) => {
    const normalizedQuantity = Number(newQuantity) || 0;
    if (normalizedQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const updatedCart = cart.map((item) =>
      item.id === productId
        ? {
            ...item,
            quantity: normalizedQuantity,
            subtotal: normalizedQuantity * item.price,
          }
        : item,
    );
    setCart(updatedCart);
  };

  /**
   * Limpia el carrito
   */
  const clearCart = () => {
    showAlert({
      title: "Limpiar carrito",
      message: "¿Estás seguro de que quieres vaciar el carrito?",
      type: "warning",
      buttons: [
        { text: "Cancelar", style: "cancel" },
        { text: "Limpiar", onPress: () => setCart([]) },
      ],
    });
  };

  /**
   * Completa la venta
   */
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

    // Validar que se haya especificado la cédula del cliente
    if (!customerDocument.trim()) {
      showAlert({
        title: "Error",
        message: "Debe especificar la cédula del cliente",
        type: "error",
      });
      return;
    }

    // Validar que el cliente genérico no use método de pago "por_cobrar"
    if (customerDocument === "1" && paymentMethod === "por_cobrar") {
      showAlert({
        title: "Método de Pago No Permitido",
        message:
          "El cliente genérico es solo para ventas rápidas. No se permite el método de pago 'Por Cobrar' para este cliente.",
        buttons: [{ text: "Entendido", style: "default" }],
      });
      return;
    }

    try {
      setProcessingSale(true);
      let customerId = null;
      let customerName = "Cliente";

      // Si se especificó una cédula
      if (customerDocument.trim()) {
        if (customerDocument === "1") {
          // Cliente genérico
          customerId = await ensureGenericCustomer();
          customerName = "Cliente Genérico";
        } else {
          // Buscar cliente por cédula
          const existingCustomer =
            await getCustomerByDocument(customerDocument);
          if (existingCustomer) {
            customerId = existingCustomer.id;
            customerName = existingCustomer.name;
          } else {
            // Cliente no existe, mostrar modal para crear
            setPendingSaleData({
              subtotal: subtotalAmount,
              tax: taxAmount,
              discount: 0,
              total: total,
              currency: "VES",
              exchangeRate: exchangeRate,
              paymentMethod: paymentMethod,
              paid: total,
              change: 0,
              status: "completed",
              notes: `Cliente: ${customerDocument}${
                referenceNumber ? ` - Ref: ${referenceNumber}` : ""
              }`,
              saleItems: cart.map((item) => ({
                productId: item.product.id,
                productName: item.name,
                quantity: item.quantity,
                price: item.price,
                priceUSD:
                  Number(item.priceUSD) ||
                  Number(item.product?.priceUSD) ||
                  (exchangeRate ? Number(item.price) / exchangeRate : 0),
                subtotal: item.subtotal,
              })),
            });
            setShowNewCustomerModal(true);
            setProcessingSale(false);
            return;
          }
        }
      }

      // Preparar datos de la venta
      const saleData = {
        customerId: customerId,
        subtotal: subtotalAmount,
        tax: taxAmount,
        discount: 0,
        total: total,
        currency: "VES",
        exchangeRate: exchangeRate,
        paymentMethod: paymentMethod,
        paid: total,
        change: 0,
        status: "completed",
        notes: `Cliente: ${customerName}${
          referenceNumber ? ` - Ref: ${referenceNumber}` : ""
        }`,
      };

      // Preparar items de la venta
      const saleItems = cart.map((item) => ({
        productId: item.product.id,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
        priceUSD:
          Number(item.priceUSD) ||
          Number(item.product?.priceUSD) ||
          (exchangeRate ? Number(item.price) / exchangeRate : 0),
        subtotal: item.subtotal,
      }));

      // Registrar la venta y obtener el ID/consecutivo visible
      const saleResult = await addSale(saleData, saleItems);
      const saleId = saleResult?.id ?? saleResult;
      const saleNumber =
        saleResult?.saleNumber || `VTA-${String(saleId).padStart(6, "0")}`;

      const customerLabel = (customerName || "Cliente").trim() || "Cliente";
      const paymentLabel = (paymentMethod || "").toString();
      const saleMovementNote = paymentLabel
        ? `${saleNumber} - ${customerLabel} - ${paymentLabel}`
        : `${saleNumber} - ${customerLabel}`;

      // Actualizar stock de productos vendidos
      for (const item of cart) {
        const newStock =
          (Number(item.product.stock) || 0) - (Number(item.quantity) || 0);
        await updateProductStock(item.product.id, newStock);
        await insertInventoryMovement(
          item.product.id,
          "exit",
          item.quantity,
          item.product.stock,
          saleMovementNote,
        );
        console.log(
          `Stock actualizado: ${item.name.toUpperCase()} - Nuevo stock: ${newStock}`,
        );
      }

      // Recargar productos para reflejar el nuevo stock
      await refreshProducts();

      // Si el método de pago es "por_cobrar", crear cuenta por cobrar automáticamente
      if (paymentMethod === "por_cobrar") {
        try {
          const baseAmountUSD = cart.reduce(
            (sum, item) =>
              sum +
              (Number(item.priceUSD) ||
                Number(item.product?.priceUSD) ||
                (exchangeRate ? Number(item.price) / exchangeRate : 0)) *
                (Number(item.quantity) || 0),
            0,
          );
          const accountData = {
            customerId: customerId || null,
            customerName: customerName.trim() || "Cliente",
            documentNumber: customerDocument?.trim() || null,
            amount: total,
            baseCurrency: "USD",
            baseAmountUSD,
            exchangeRateAtCreation: exchangeRate,
            description: `Venta a crédito - ${cart.length} producto(s): ${cart
              .map((item) => item.name.toUpperCase())
              .join(", ")}`,
            dueDate: null, // Sin fecha de vencimiento por defecto
            invoiceNumber: saleNumber,
          };
          await addAccountReceivable(accountData);
          console.log("Cuenta por cobrar creada automáticamente");
        } catch (accountError) {
          console.error("Error creando cuenta por cobrar:", accountError);
          // No fallar la venta por error en cuenta por cobrar
        }
      }

      // Limpiar carrito y cerrar modal primero
      setCart([]);
      setCustomerDocument("");
      setReferenceNumber("");
      setTotal(0);
      setShowCart(false);

      // Mostrar confirmación
      const confirmationMessage =
        paymentMethod === "por_cobrar"
          ? `Total: VES. ${total.toFixed(
              2,
            )}\nCliente: ${customerName}\n\nCuenta por cobrar creada automáticamente`
          : `Total: VES. ${total.toFixed(2)}\nCliente: ${customerName}`;

      showAlert({
        title: "Venta completada",
        message: confirmationMessage,
        type: "success",
      });
    } catch (error) {
      console.error("Error completing sale:", error);
      showAlert({
        title: "Error",
        message: "No se pudo completar la venta",
        type: "error",
      });
    } finally {
      setProcessingSale(false);
    }
  };

  /**
   * Crea un nuevo cliente y completa la venta pendiente
   */
  const createCustomerAndCompleteSale = async () => {
    if (processingSale) return; // Evitar múltiples ejecuciones

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

      // Verificar si el cliente ya existe
      if (customerDocument.trim()) {
        const existingCustomer = await getCustomerByDocument(
          customerDocument.trim(),
        );
        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          // Crear el nuevo cliente
          const customerData = {
            name: newCustomerName.trim(),
            documentNumber: customerDocument,
            documentType: "V", // Venezolano por defecto
          };

          customerId = await addCustomer(customerData);
        }
      } else {
        // Si no hay cédula, usar cliente genérico
        customerId = await ensureGenericCustomer();
      }

      // Completar la venta con el cliente
      const saleData = {
        ...pendingSaleData,
        customerId: customerId,
        notes: customerDocument.trim()
          ? `Cliente: ${newCustomerName.trim()}`
          : "Cliente genérico",
      };

      const saleResult = await addSale(saleData, pendingSaleData.saleItems);
      const saleId = saleResult?.id ?? saleResult;
      const saleNumber =
        saleResult?.saleNumber || `VTA-${String(saleId).padStart(6, "0")}`;

      const pendingCustomerLabel = customerDocument.trim()
        ? newCustomerName.trim() || "Cliente"
        : "Cliente genérico";
      const pendingPaymentLabel = (
        pendingSaleData.paymentMethod || ""
      ).toString();
      const pendingSaleMovementNote = pendingPaymentLabel
        ? `${saleNumber} - ${pendingCustomerLabel} - ${pendingPaymentLabel}`
        : `${saleNumber} - ${pendingCustomerLabel}`;

      // Actualizar stock de productos vendidos
      for (const item of cart) {
        const newStock =
          (Number(item.product.stock) || 0) - (Number(item.quantity) || 0);
        await updateProductStock(item.product.id, newStock);
        await insertInventoryMovement(
          item.product.id,
          "exit",
          item.quantity,
          item.product.stock,
          pendingSaleMovementNote,
        );
        console.log(
          `Stock actualizado: ${item.name.toUpperCase()} - Nuevo stock: ${newStock}`,
        );
      }

      // Recargar productos para reflejar el nuevo stock
      await refreshProducts();

      // Si el método de pago es "por_cobrar", crear cuenta por cobrar automáticamente
      if (pendingSaleData.paymentMethod === "por_cobrar") {
        try {
          const baseAmountUSD = (pendingSaleData.saleItems || []).reduce(
            (sum, item) =>
              sum +
              (Number(item.priceUSD) ||
                Number(item.product?.priceUSD) ||
                (pendingSaleData.exchangeRate
                  ? Number(item.price) / pendingSaleData.exchangeRate
                  : 0)) *
                (Number(item.quantity) || 0),
            0,
          );
          const accountData = {
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
          };
          await addAccountReceivable(accountData);
          console.log("Cuenta por cobrar creada automáticamente");
        } catch (accountError) {
          console.error("Error creando cuenta por cobrar:", accountError);
        }
      }

      // Limpiar estados
      setCart([]);
      setCustomerDocument("");
      setReferenceNumber("");
      setTotal(0);
      setShowCart(false);
      setShowNewCustomerModal(false);
      setNewCustomerName("");
      setPendingSaleData(null);

      // Mostrar confirmación
      const confirmationMessage =
        pendingSaleData.paymentMethod === "por_cobrar"
          ? `Total: VES. ${pendingSaleData.total.toFixed(
              2,
            )}\nCliente: ${newCustomerName.trim()}\n\nCliente creado y cuenta por cobrar generada`
          : `Total: VES. ${pendingSaleData.total.toFixed(
              2,
            )}\nCliente: ${newCustomerName.trim()}\n\nCliente creado exitosamente`;

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

  /**
   * Cancela la creación de cliente y vuelve al carrito
   */
  const cancelNewCustomer = () => {
    setShowNewCustomerModal(false);
    setNewCustomerName("");
    setPendingSaleData(null);
  };

  /**
   * Renderiza un producto
   */
  const renderProduct = ({ item, index }) => {
    const stockValue = Number(item.stock) || 0;
    const isOutOfStock = stockValue === 0;
    const computedPriceVES = item.priceVES || item.priceUSD * exchangeRate;
    const card = (
      <Pressable
        style={({ pressed }) => [
          styles.productCard,
          isOutOfStock && styles.productCardDisabled,
          pressed && !isOutOfStock && styles.cardPressed,
        ]}
        onPress={() => addToCart(item)}
        disabled={isOutOfStock}
      >
        <View style={styles.productTopRow}>
          <View style={styles.productTopCopy}>
            <InfoPill
              text={item.category || "General"}
              tone={isOutOfStock ? "danger" : "info"}
              style={styles.productCategoryPill}
            />
            <Text style={styles.productName} numberOfLines={2}>
              {item.name.toUpperCase()}
            </Text>
            <Text style={styles.productBarcode}>Código: {item.barcode}</Text>
          </View>
          <View style={styles.productStatusColumn}>
            {!isOutOfStock && (
              <Text style={styles.productTapHint}>Tocar para vender</Text>
            )}
            {isOutOfStock && (
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>Sin Stock</Text>
              </View>
            )}
            {!isOutOfStock && (
              <Text style={styles.productMiniPrice}>
                USD. {item.priceUSD.toFixed(2)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.productPricePanel}>
          <Text style={styles.productPriceEyebrow}>Precio actual</Text>
          <Text style={styles.productPrice}>
            VES. {computedPriceVES.toFixed(2)}
          </Text>
        </View>

        <View style={styles.productFooter}>
          <Text style={styles.productFootnote}>
            {isOutOfStock
              ? "Repón existencias para volver a venderlo"
              : "Disponible para venta inmediata"}
          </Text>
          <Text
            style={[
              styles.productStock,
              isOutOfStock && styles.productStockLow,
            ]}
          >
            Stock: {stockValue}
          </Text>
        </View>
      </Pressable>
    );

    if (index !== 0) return card;

    return (
      <TourGuideZone
        tourKey="pos_v3"
        zone={TOUR_ZONE_BASE + 2}
        text={"Presiona un producto para agregarlo al carrito."}
        borderRadius={borderRadius.lg}
      >
        {card}
      </TourGuideZone>
    );
  };

  /**
   * Renderiza un item del carrito
   */
  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
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

      <View style={styles.cartItemRight}>
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
            styles.removeButton,
            pressed && styles.cardPressed,
          ]}
          onPress={() => removeFromCart(item.id)}
        >
          <Text style={styles.removeButtonText}>Eliminar</Text>
        </Pressable>
      </View>
    </View>
  );

  if (productsLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f5ae0" />
        <Text style={styles.loadingText}>Preparando punto de venta...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.container}>
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          style={styles.flatList}
          showsVerticalScrollIndicator={false}
          numColumns={1}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <View style={styles.heroCard}>
                <View style={styles.heroTopRow}>
                  <View style={styles.heroBadge}>
                    <Ionicons
                      name="flash-outline"
                      size={rf(18)}
                      color={POS_COLORS.accent}
                    />
                  </View>
                  <InfoPill
                    text={
                      cart.length > 0
                        ? `${cart.length} en carrito`
                        : "Listo para vender"
                    }
                    tone={cart.length > 0 ? "accent" : "info"}
                  />
                </View>

                <View style={styles.heroCopy}>
                  <Text style={styles.heroEyebrow}>Ventas rápidas</Text>
                  <Text style={styles.heroTitle}>Punto de venta</Text>
                  <Text style={styles.heroSubtitle}>
                    Gestiona tus ventas, clientes y cobros con una lectura más
                    clara del flujo actual.
                  </Text>
                </View>
              </View>

              <TourGuideZone
                tourKey="pos_v3"
                zone={TOUR_ZONE_BASE + 1}
                text={"Busca productos para vender rápidamente."}
                borderRadius={borderRadius.lg}
                style={styles.searchCard}
              >
                <View style={styles.searchCardContent}>
                  <View style={styles.searchHeaderRow}>
                    <View style={styles.searchCopy}>
                      <Text style={styles.searchLabel}>Buscar productos</Text>
                      <Text style={styles.searchHint}>
                        Escribe el nombre o usa el lector QR para una venta más
                        rápida.
                      </Text>
                    </View>
                    <Pressable
                      onPress={openQRScanner}
                      style={({ pressed }) => [
                        styles.searchScanButton,
                        pressed && styles.cardPressed,
                      ]}
                    >
                      <Ionicons
                        name="qr-code-outline"
                        size={rf(18)}
                        color={POS_COLORS.info}
                      />
                    </Pressable>
                  </View>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Escribe para filtrar por nombre"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#8692a6"
                  />
                </View>
              </TourGuideZone>
            </View>
          }
          contentContainerStyle={[
            styles.productsContent,
            cart.length > 0 && styles.productsContentWithSummary,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay productos disponibles</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? "Intenta con otra búsqueda o limpia el filtro."
                  : "Agrega productos desde la sección de Productos."}
              </Text>
            </View>
          }
        />

        <View
          style={[
            styles.cartSummary,
            { bottom: vs(14) + Math.max(insets.bottom, vs(8)) },
          ]}
        >
          <TourGuideZone
            tourKey="pos_v3"
            zone={TOUR_ZONE_BASE + 3}
            text={"Presiona 'Ver carrito' para cobrar y completar la venta."}
            borderRadius={borderRadius.lg}
          >
            <Pressable
              style={({ pressed }) => [
                styles.cartSummaryButton,
                pressed && styles.cardPressed,
              ]}
              onPress={() => setShowCart(true)}
            >
              <View style={styles.cartSummaryInfo}>
                <Text style={styles.cartSummaryLabel}>Carrito activo</Text>
                <Text style={styles.cartSummaryTotal}>
                  VES. {total.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.cartSummaryButtonText}>
                Ver carrito ({cart.length})
              </Text>
            </Pressable>
          </TourGuideZone>
        </View>
        {/* Modal del carrito */}
        <Modal
          visible={showCart}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowCart(false)}
        >
          <TourGuideProvider
            backdropColor="rgba(0,0,0,0.001)"
            tooltipComponent={TourTooltip}
            preventOutsideInteraction={false}
            dismissOnPress
          >
            <CartTourBootstrapper />
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
                    color={POS_COLORS.text}
                  />
                  <Text style={styles.backButtonText}>Volver</Text>
                </Pressable>
                <Text style={styles.modalTitle}>Carrito de Compras</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.qrButton,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={openQRScanner}
                >
                  <Ionicons
                    name="qr-code-outline"
                    size={rf(22)}
                    color={POS_COLORS.info}
                  />
                </Pressable>
              </View>

              <ScrollView style={styles.modalContent} ref={scrollViewRef}>
                {/* Información del cliente */}
                <TourGuideZone
                  tourKey="pos_cart_v2"
                  zone={CART_TOUR_ZONE_BASE + 1}
                  text={
                    "En la sección 'Cliente' puedes usar la cédula 1 para una venta rápida (Cliente genérico). Nota: con ese cliente no se permite pagar 'Por Cobrar'."
                  }
                  borderRadius={borderRadius.lg}
                  style={styles.customerSection}
                >
                  <View>
                    <Text style={styles.sectionTitle}>Cliente</Text>
                    <TextInput
                      style={styles.customerInput}
                      placeholder="Cédula del cliente (obligatorio)*"
                      value={customerDocument}
                      onChangeText={(text) => {
                        // Solo permitir números
                        const numericText = text.replace(/[^0-9]/g, "");
                        setCustomerDocument(numericText);
                      }}
                      keyboardType="numeric"
                      maxLength={10}
                      placeholderTextColor="#999"
                    />
                    {customerDocument === "1" && (
                      <Text style={styles.genericCustomerText}>
                        Cliente genérico para operaciones rápidas
                      </Text>
                    )}
                  </View>
                </TourGuideZone>

                {/* Items del carrito */}
                <View style={styles.cartItemsSection}>
                  <Text style={styles.sectionTitle}>
                    Productos ({cart.length})
                  </Text>
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
                    <FlatList
                      data={cart}
                      renderItem={renderCartItem}
                      keyExtractor={(item) => item.id.toString()}
                      scrollEnabled={false}
                    />
                  )}
                </View>

                {/* Método de pago */}
                {cart.length > 0 && (
                  <View style={styles.paymentSection}>
                    <Text style={styles.sectionTitle}>Método de Pago</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.paymentButtonsScroll}
                      contentContainerStyle={styles.paymentButtons}
                    >
                      <Pressable
                        style={[
                          styles.paymentButton,
                          paymentMethod === "cash" &&
                            styles.paymentButtonActive,
                        ]}
                        onPress={() => setPaymentMethod("cash")}
                      >
                        <Ionicons
                          name="cash-outline"
                          size={rf(20)}
                          color={
                            paymentMethod === "cash" ? "#ffffff" : "#1f2633"
                          }
                          style={styles.paymentButtonIcon}
                        />
                        <Text
                          style={[
                            styles.paymentButtonText,
                            paymentMethod === "cash" &&
                              styles.paymentButtonTextActive,
                          ]}
                        >
                          Efectivo
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.paymentButton,
                          paymentMethod === "card" &&
                            styles.paymentButtonActive,
                        ]}
                        onPress={() => setPaymentMethod("card")}
                      >
                        <Ionicons
                          name="card-outline"
                          size={rf(20)}
                          color={
                            paymentMethod === "card" ? "#ffffff" : "#1f2633"
                          }
                          style={styles.paymentButtonIcon}
                        />
                        <Text
                          style={[
                            styles.paymentButtonText,
                            paymentMethod === "card" &&
                              styles.paymentButtonTextActive,
                          ]}
                        >
                          Tarjeta
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.paymentButton,
                          paymentMethod === "transfer" &&
                            styles.paymentButtonActive,
                        ]}
                        onPress={() => setPaymentMethod("transfer")}
                      >
                        <Ionicons
                          name="business-outline"
                          size={rf(20)}
                          color={
                            paymentMethod === "transfer" ? "#ffffff" : "#1f2633"
                          }
                          style={styles.paymentButtonIcon}
                        />
                        <Text
                          style={[
                            styles.paymentButtonText,
                            paymentMethod === "transfer" &&
                              styles.paymentButtonTextActive,
                          ]}
                        >
                          Transferencia
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.paymentButton,
                          paymentMethod === "pago_movil" &&
                            styles.paymentButtonActive,
                        ]}
                        onPress={() => setPaymentMethod("pago_movil")}
                      >
                        <Ionicons
                          name="phone-portrait-outline"
                          size={rf(20)}
                          color={
                            paymentMethod === "pago_movil"
                              ? "#ffffff"
                              : "#1f2633"
                          }
                          style={styles.paymentButtonIcon}
                        />
                        <Text
                          style={[
                            styles.paymentButtonText,
                            paymentMethod === "pago_movil" &&
                              styles.paymentButtonTextActive,
                          ]}
                        >
                          Pago Móvil
                        </Text>
                      </Pressable>
                      <TourGuideZone
                        tourKey="pos_cart_v2"
                        zone={CART_TOUR_ZONE_BASE + 2}
                        text={
                          "Si deseas crear una cuenta por cobrar, selecciona el tipo de pago 'Por Cobrar'. La app la genera automáticamente al completar la venta."
                        }
                        borderRadius={borderRadius.lg}
                      >
                        <Pressable
                          style={[
                            styles.paymentButton,
                            paymentMethod === "por_cobrar" &&
                              styles.paymentButtonActive,
                          ]}
                          onPress={() => setPaymentMethod("por_cobrar")}
                        >
                          <Ionicons
                            name="time-outline"
                            size={rf(20)}
                            color={
                              paymentMethod === "por_cobrar"
                                ? "#ffffff"
                                : "#1f2633"
                            }
                            style={styles.paymentButtonIcon}
                          />
                          <Text
                            style={[
                              styles.paymentButtonText,
                              paymentMethod === "por_cobrar" &&
                                styles.paymentButtonTextActive,
                            ]}
                          >
                            Por Cobrar
                          </Text>
                        </Pressable>
                      </TourGuideZone>
                    </ScrollView>

                    {(paymentMethod === "transfer" ||
                      paymentMethod === "pago_movil") && (
                      <TextInput
                        style={styles.simpleReferenceInput}
                        value={referenceNumber}
                        onChangeText={setReferenceNumber}
                        placeholder="Número de referencia"
                        keyboardType="default"
                        autoCapitalize="none"
                      />
                    )}
                  </View>
                )}
              </ScrollView>

              <View
                style={[
                  styles.modalFooter,
                  { paddingBottom: vs(10) + Math.max(insets.bottom, vs(6)) },
                ]}
              >
                <View style={styles.totalSection}>
                  <View style={styles.totalVES}>
                    <Text style={styles.totalMetaLabel}>Subtotal</Text>
                    <Text style={styles.totalMetaValue}>
                      {subtotalAmount.toFixed(2)}
                    </Text>
                    {taxAmount > 0 && (
                      <>
                        <Text style={styles.totalMetaLabel}>IVA</Text>
                        <Text style={styles.totalMetaValue}>
                          {taxAmount.toFixed(2)}
                        </Text>
                      </>
                    )}
                    <Text style={styles.totalLabel}>PAGAR VES</Text>
                    <Text style={styles.totalAmount}>{total.toFixed(2)}</Text>
                  </View>
                  <View style={styles.totalUSD}>
                    <Text style={styles.totalLabel}>PAGAR USD</Text>
                    <Text style={styles.totalAmount}>
                      {exchangeRate > 0
                        ? (total / exchangeRate).toFixed(2)
                        : "0.00"}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <Pressable
                    style={[
                      styles.clearButton,
                      cart.length === 0 && styles.buttonDisabled,
                    ]}
                    onPress={clearCart}
                    disabled={cart.length === 0}
                  >
                    <Text style={styles.clearButtonText}>Limpiar</Text>
                  </Pressable>

                  <TourGuideZone
                    tourKey="pos_cart_v2"
                    zone={CART_TOUR_ZONE_BASE + 3}
                    text={
                      "Completa la venta. Si elegiste 'Por Cobrar', se creará la cuenta por cobrar automáticamente."
                    }
                    borderRadius={borderRadius.lg}
                    style={styles.checkoutTourZone}
                  >
                    <Pressable
                      style={[
                        styles.checkoutButton,
                        (cart.length === 0 || processingSale) &&
                          styles.buttonDisabled,
                      ]}
                      onPress={completeSale}
                      disabled={cart.length === 0 || processingSale}
                    >
                      {processingSale ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.checkoutText}>Completar Venta</Text>
                      )}
                    </Pressable>
                  </TourGuideZone>
                </View>
              </View>
            </View>
          </TourGuideProvider>
        </Modal>

        {/* Modal del escáner QR */}
        <Modal
          visible={scanning}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setScanning(false)}
        >
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
          />
          {/* Viewfinder overlay */}
          <View style={styles.viewfinderOverlay}>
            <View style={styles.viewfinderTop} />
            <View style={styles.viewfinderMiddle}>
              <View style={styles.viewfinderLeft} />
              <View style={styles.viewfinderCenter}>
                <View style={styles.viewfinderCorner} />
                <View style={[styles.viewfinderCorner, styles.topRight]} />
                <View style={[styles.viewfinderCorner, styles.bottomLeft]} />
                <View style={[styles.viewfinderCorner, styles.bottomRight]} />
              </View>
              <View style={styles.viewfinderRight} />
            </View>
            <View style={styles.viewfinderBottom} />
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.closeScannerButton,
              pressed && styles.cardPressed,
            ]}
            onPress={() => setScanning(false)}
          >
            <Text style={styles.closeScannerText}>Cerrar</Text>
          </Pressable>
        </Modal>

        {/* Modal para crear nuevo cliente */}
        <Modal
          visible={showNewCustomerModal}
          animationType="slide"
          transparent={true}
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
                autoFocus={true}
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
      </SafeAreaView>
      <CustomAlert />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: POS_COLORS.page,
  },
  flatList: {
    paddingHorizontal: hs(16),
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: POS_COLORS.page,
    alignItems: "center",
    justifyContent: "center",
    gap: vs(16),
  },
  loadingText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: POS_COLORS.muted,
  },
  listHeader: {
    gap: vs(16),
    paddingTop: 0,
    paddingBottom: 0,
    alignItems: "stretch",
  },
  heroCard: {
    backgroundColor: POS_COLORS.surface,
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    padding: spacing.md,
    width: "100%",
    gap: vs(14),
    ...SHADOWS.card,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: hs(12),
  },
  heroBadge: {
    width: s(44),
    height: s(44),
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    backgroundColor: POS_COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCopy: {
    gap: vs(6),
  },
  heroEyebrow: {
    fontSize: rf(12),
    fontWeight: "700",
    color: POS_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: s(0.8),
  },
  heroTitle: {
    fontSize: rf(22),
    fontWeight: "800",
    color: POS_COLORS.text,
  },
  heroSubtitle: {
    fontSize: rf(14),
    color: POS_COLORS.muted,
    lineHeight: vs(20),
  },
  heroPanel: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: POS_COLORS.accent,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    padding: spacing.md,
    gap: hs(14),
  },
  heroRateBlock: {
    flex: 1,
    gap: vs(4),
  },
  heroLabel: {
    fontSize: rf(11),
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.74)",
    textTransform: "uppercase",
    letterSpacing: s(0.8),
  },
  heroRateValue: {
    fontSize: rf(22),
    fontWeight: "800",
    color: "#ffffff",
  },
  heroHelper: {
    fontSize: rf(12),
    color: "rgba(255, 255, 255, 0.82)",
    lineHeight: vs(18),
  },
  heroDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  heroSummaryList: {
    flex: 1,
    gap: vs(10),
    justifyContent: "center",
  },
  heroSummaryItem: {
    gap: vs(2),
  },
  heroSummaryValue: {
    fontSize: rf(16),
    fontWeight: "800",
    color: "#ffffff",
  },
  heroSummaryLabel: {
    fontSize: rf(11),
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.74)",
    textTransform: "uppercase",
    letterSpacing: s(0.6),
  },
  searchCard: {
    backgroundColor: POS_COLORS.surface,
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    padding: spacing.md,
    gap: vs(10),
    width: "100%",
    ...SHADOWS.soft,
  },
  searchCardContent: {
    gap: vs(10),
  },
  searchHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: hs(12),
  },
  searchCopy: {
    flex: 1,
    gap: vs(4),
  },
  searchLabel: {
    fontSize: rf(13),
    fontWeight: "700",
    color: POS_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: s(0.6),
  },
  searchHint: {
    fontSize: rf(13),
    color: POS_COLORS.text,
    lineHeight: vs(18),
  },
  searchScanButton: {
    width: s(42),
    height: s(42),
    borderRadius: s(21),
    borderCurve: "continuous",
    backgroundColor: POS_COLORS.infoSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    backgroundColor: POS_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: vs(13),
    paddingHorizontal: hs(16),
    fontSize: rf(14),
    fontWeight: "500",
    color: POS_COLORS.text,
    borderWidth: 1,
    borderColor: POS_COLORS.border,
  },
  productsContent: {
    paddingTop: vs(8),
    paddingBottom: vs(132),
    gap: vs(10),
  },
  productsContentWithSummary: {
    paddingBottom: vs(212),
  },
  productCard: {
    backgroundColor: POS_COLORS.surface,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    padding: spacing.md,
    gap: vs(10),
    flex: 1,
    marginBottom: vs(8),
    ...SHADOWS.soft,
  },
  productCardDisabled: {
    opacity: 0.76,
  },
  productTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: hs(12),
  },
  productTopCopy: {
    flex: 1,
    gap: vs(8),
  },
  productStatusColumn: {
    alignItems: "flex-end",
    gap: vs(8),
  },
  productCategoryPill: {
    alignSelf: "flex-start",
  },
  productName: {
    fontSize: rf(17),
    fontWeight: "800",
    color: POS_COLORS.text,
  },
  productTapHint: {
    fontSize: rf(11),
    fontWeight: "700",
    color: POS_COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: s(0.7),
  },
  outOfStockBadge: {
    backgroundColor: POS_COLORS.danger,
    borderRadius: borderRadius.sm,
    borderCurve: "continuous",
    paddingHorizontal: hs(10),
    paddingVertical: vs(4),
  },
  outOfStockText: {
    color: "#fff",
    fontSize: rf(11),
    fontWeight: "700",
  },
  productMiniPrice: {
    fontSize: rf(12),
    fontWeight: "700",
    color: POS_COLORS.muted,
  },
  productBarcode: {
    fontSize: rf(12),
    color: POS_COLORS.muted,
    fontWeight: "500",
  },
  productPricePanel: {
    backgroundColor: POS_COLORS.accentSoft,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: hs(14),
    paddingVertical: vs(12),
    gap: vs(2),
  },
  productPriceEyebrow: {
    fontSize: rf(11),
    fontWeight: "700",
    color: POS_COLORS.accentStrong,
    textTransform: "uppercase",
    letterSpacing: s(0.7),
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: hs(12),
  },
  productPrice: {
    fontSize: rf(19),
    fontWeight: "800",
    color: POS_COLORS.accent,
  },
  productPriceSecondary: {
    fontSize: rf(13),
    color: POS_COLORS.accentStrong,
    fontWeight: "600",
  },
  productFootnote: {
    flex: 1,
    fontSize: rf(12),
    color: POS_COLORS.muted,
    lineHeight: vs(18),
  },
  productStock: {
    fontSize: rf(12),
    fontWeight: "600",
    color: POS_COLORS.info,
    backgroundColor: POS_COLORS.infoSoft,
    paddingHorizontal: hs(10),
    paddingVertical: vs(5),
    borderRadius: borderRadius.sm,
    borderCurve: "continuous",
  },
  productStockLow: {
    backgroundColor: POS_COLORS.dangerSoft,
    color: POS_COLORS.danger,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: vs(80),
    paddingHorizontal: hs(32),
    gap: vs(12),
  },
  emptyEmoji: {
    fontSize: rf(60),
  },
  emptyText: {
    fontSize: rf(18),
    fontWeight: "700",
    color: POS_COLORS.text,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: rf(14),
    color: POS_COLORS.muted,
    textAlign: "center",
    lineHeight: vs(20),
  },
  cartSummary: {
    position: "absolute",
    left: hs(16),
    right: hs(16),
    backgroundColor: "transparent",
  },
  cartSummaryInfo: {
    gap: vs(4),
  },
  cartSummaryLabel: {
    fontSize: rf(12),
    fontWeight: "600",
    color: "#7a8796",
    textTransform: "uppercase",
    letterSpacing: s(0.6),
  },
  cartSummaryTotal: {
    fontSize: rf(22),
    fontWeight: "800",
    color: "#ffffff",
  },
  cartSummaryButton: {
    backgroundColor: POS_COLORS.text,
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    paddingHorizontal: hs(18),
    paddingVertical: vs(13),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: hs(12),
    ...SHADOWS.card,
  },
  cartSummaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: rf(14),
  },
  qrButton: {
    backgroundColor: POS_COLORS.infoSoft,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    width: s(44),
    height: s(44),
    alignItems: "center",
    justifyContent: "center",
  },
  qrButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: rf(14),
  },
  modalContainer: {
    flex: 1,
    backgroundColor: POS_COLORS.page,
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
    backgroundColor: POS_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: hs(14),
    paddingVertical: vs(10),
    flexDirection: "row",
    alignItems: "center",
    gap: hs(6),
  },
  backButtonText: {
    color: POS_COLORS.text,
    fontWeight: "700",
    fontSize: rf(14),
  },
  modalTitle: {
    fontSize: rf(20),
    fontWeight: "800",
    color: POS_COLORS.text,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: hs(16),
    paddingBottom: vs(20),
  },
  customerSection: {
    backgroundColor: POS_COLORS.surface,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    padding: spacing.md,
    marginBottom: vs(10),
    gap: vs(12),
    ...SHADOWS.soft,
  },
  sectionTitle: {
    fontSize: rf(14),
    fontWeight: "700",
    color: POS_COLORS.text,
  },
  customerInput: {
    backgroundColor: POS_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: vs(14),
    paddingHorizontal: hs(16),
    fontSize: rf(14),
    color: POS_COLORS.text,
  },
  genericCustomerText: {
    fontSize: rf(12),
    color: POS_COLORS.accent,
    fontStyle: "italic",
  },
  cartItemsSection: {
    backgroundColor: POS_COLORS.surface,
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
  emptyCartEmoji: {
    fontSize: rf(48),
  },
  emptyCartText: {
    fontSize: rf(16),
    fontWeight: "700",
    color: POS_COLORS.text,
  },
  emptyCartSubtext: {
    fontSize: rf(14),
    color: POS_COLORS.muted,
  },
  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: POS_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    padding: spacing.sm + 2,
    gap: hs(12),
  },
  cartItemLeft: {
    flex: 1,
    gap: vs(6),
  },
  cartItemName: {
    fontSize: rf(15),
    fontWeight: "700",
    color: POS_COLORS.text,
  },
  cartItemPrice: {
    fontSize: rf(13),
    color: POS_COLORS.muted,
  },
  cartItemSubtotal: {
    fontSize: rf(13),
    fontWeight: "600",
    color: POS_COLORS.accent,
  },
  cartItemRight: {
    alignItems: "flex-end",
    gap: vs(8),
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: hs(10),
  },
  quantityButton: {
    width: s(34),
    height: s(34),
    borderRadius: borderRadius.sm,
    borderCurve: "continuous",
    backgroundColor: POS_COLORS.info,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButtonText: {
    color: "#fff",
    fontSize: rf(18),
    fontWeight: "700",
  },
  quantityText: {
    fontSize: rf(16),
    fontWeight: "700",
    color: "#1f2633",
    minWidth: s(36),
    textAlign: "center",
  },
  quantityInput: {
    fontSize: rf(16),
    fontWeight: "700",
    color: "#1f2633",
    minWidth: s(52),
    textAlign: "center",
    paddingVertical: vs(6),
    paddingHorizontal: hs(10),
    borderRadius: borderRadius.sm,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: POS_COLORS.border,
    backgroundColor: "#fff",
  },
  removeButton: {
    paddingVertical: vs(6),
    paddingHorizontal: hs(10),
    backgroundColor: POS_COLORS.dangerSoft,
    borderRadius: borderRadius.sm,
    borderCurve: "continuous",
  },
  removeButtonText: {
    fontSize: rf(12),
    fontWeight: "600",
    color: POS_COLORS.danger,
  },
  paymentSection: {
    backgroundColor: POS_COLORS.surface,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    padding: spacing.md,
    marginBottom: vs(16),
    gap: vs(14),
    ...SHADOWS.soft,
  },
  paymentButtonsScroll: {
    marginHorizontal: hs(-4),
  },
  paymentButtons: {
    gap: hs(10),
    paddingVertical: vs(4),
  },
  paymentButton: {
    backgroundColor: POS_COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: POS_COLORS.border,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: vs(9),
    paddingHorizontal: hs(12),
    alignItems: "center",
    minWidth: s(88),
  },
  paymentButtonActive: {
    backgroundColor: POS_COLORS.info,
    borderColor: POS_COLORS.info,
  },
  paymentButtonIcon: {
    fontSize: rf(16),
    marginBottom: vs(4),
  },
  paymentButtonText: {
    fontSize: rf(12),
    fontWeight: "600",
    color: POS_COLORS.muted,
  },
  paymentButtonTextActive: {
    color: "#fff",
  },
  referenceContainer: {
    backgroundColor: "#f3f5fa",
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#e0e5ef",
  },
  referenceSection: {
    gap: vs(10),
  },
  referenceLabel: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#1f2633",
  },
  optionalText: {
    fontSize: rf(12),
    fontWeight: "400",
    color: "#6f7c8c",
    fontStyle: "italic",
  },
  referenceInput: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.sm,
    paddingVertical: vs(12),
    paddingHorizontal: hs(14),
    fontSize: rf(15),
    color: "#1f2633",
    borderWidth: 1,
    borderColor: "#d5dbe7",
  },
  referenceHint: {
    fontSize: rf(12),
    color: "#6f7c8c",
    lineHeight: vs(16),
  },
  simpleReferenceInput: {
    borderWidth: 1,
    borderColor: POS_COLORS.border,
    borderRadius: borderRadius.sm,
    borderCurve: "continuous",
    paddingVertical: vs(11),
    paddingHorizontal: hs(14),
    fontSize: rf(16),
    backgroundColor: POS_COLORS.surfaceAlt,
    color: POS_COLORS.text,
    marginTop: vs(8),
  },
  modalFooter: {
    backgroundColor: POS_COLORS.surface,
    paddingHorizontal: hs(18),
    paddingVertical: vs(10),
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderCurve: "continuous",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(-6) },
    shadowOpacity: 0.08,
    shadowRadius: s(20),
    elevation: 12,
  },
  totalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(10),
    backgroundColor: POS_COLORS.surfaceAlt,
    borderRadius: borderRadius.lg,
    borderCurve: "continuous",
    paddingVertical: vs(9),
    paddingHorizontal: hs(12),
  },
  totalVES: {
    alignItems: "center",
  },
  totalUSD: {
    alignItems: "center",
  },
  totalLabel: {
    fontSize: rf(12),
    fontWeight: "600",
    color: POS_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  totalMetaLabel: {
    fontSize: rf(11),
    fontWeight: "600",
    color: POS_COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  totalMetaValue: {
    fontSize: rf(15),
    fontWeight: "700",
    color: POS_COLORS.text,
    marginBottom: vs(4),
  },
  totalAmount: {
    fontSize: rf(18),
    fontWeight: "800",
    color: POS_COLORS.text,
  },
  actionButtons: {
    flexDirection: "row",
    gap: hs(12),
  },
  checkoutTourZone: {
    flex: 1,
  },
  clearButton: {
    flex: 1,
    backgroundColor: POS_COLORS.warning,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    minHeight: vs(50),
    paddingVertical: vs(12),
  },
  clearButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: rf(14),
  },
  checkoutButton: {
    flex: 1,
    backgroundColor: POS_COLORS.accent,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    minHeight: vs(52),
    paddingVertical: vs(14),
  },
  checkoutText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: rf(15),
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(13, 22, 38, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  newCustomerModalContent: {
    backgroundColor: POS_COLORS.surface,
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    width: "100%",
    maxWidth: s(420),
    padding: spacing.xl,
    gap: vs(18),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(10) },
    shadowOpacity: 0.12,
    shadowRadius: s(18),
    elevation: 10,
  },
  newCustomerInfo: {
    fontSize: rf(14),
    color: POS_COLORS.muted,
    lineHeight: vs(20),
    textAlign: "center",
  },
  newCustomerInput: {
    backgroundColor: POS_COLORS.surfaceAlt,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingVertical: vs(14),
    paddingHorizontal: hs(16),
    fontSize: rf(16),
    color: POS_COLORS.text,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  newCustomerButtons: {
    flexDirection: "row",
    gap: hs(10),
  },
  modalButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    minHeight: vs(50),
    justifyContent: "center",
    paddingVertical: vs(14),
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f3fa",
  },
  cancelButtonText: {
    color: "#5b6472",
    fontWeight: "600",
    fontSize: rf(14),
  },
  saveButton: {
    backgroundColor: "#1f9254",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: rf(14),
  },
  closeScannerButton: {
    position: "absolute",
    top: vs(42),
    right: hs(20),
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: borderRadius.xl,
    borderCurve: "continuous",
    paddingHorizontal: hs(20),
    paddingVertical: vs(10),
  },
  closeScannerText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: rf(16),
  },
  viewfinderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  viewfinderTop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  viewfinderMiddle: {
    flexDirection: "row",
    height: vs(200),
  },
  viewfinderLeft: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  viewfinderCenter: {
    width: s(200),
    height: s(200),
    position: "relative",
  },
  viewfinderRight: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  viewfinderBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  viewfinderCorner: {
    position: "absolute",
    width: s(20),
    height: s(20),
    borderColor: "#fff",
    borderWidth: s(3),
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
});

export default POSScreen;
