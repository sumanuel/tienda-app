import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useProducts } from "../../hooks/useProducts";
import { useSales } from "../../hooks/useSales";
import { useExchangeRate } from "../../contexts/ExchangeRateContext";
import { useAccounts } from "../../hooks/useAccounts";
import { useCustomers } from "../../hooks/useCustomers";
import { useCustomAlert } from "../../components/common/CustomAlert";
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

/**
 * Pantalla de punto de venta (POS)
 */
export const POSScreen = ({ navigation }) => {
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
  const [total, setTotal] = useState(0);
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

  // Calcular total cuando cambie el carrito
  useEffect(() => {
    const newTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    setTotal(newTotal);
  }, [cart]);

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
      });
      return unsubscribe;
    }
  }, [navigation, refreshProducts]);

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

    if (product.stock <= 0) {
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
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const updatedCart = cart.map((item) =>
      item.id === productId
        ? {
            ...item,
            quantity: newQuantity,
            subtotal: newQuantity * item.price,
          }
        : item
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
          const existingCustomer = await getCustomerByDocument(
            customerDocument
          );
          if (existingCustomer) {
            customerId = existingCustomer.id;
            customerName = existingCustomer.name;
          } else {
            // Cliente no existe, mostrar modal para crear
            setPendingSaleData({
              subtotal: total,
              tax: 0,
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
            return;
          }
        }
      }

      // Preparar datos de la venta
      const saleData = {
        customerId: customerId,
        subtotal: total,
        tax: 0,
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

      // Registrar la venta y obtener el ID
      const saleId = await addSale(saleData, saleItems);

      const customerLabel = (customerName || "Cliente").trim() || "Cliente";
      const paymentLabel = (paymentMethod || "").toString();
      const saleMovementNote = paymentLabel
        ? `Venta #${saleId} - ${customerLabel} - ${paymentLabel}`
        : `Venta #${saleId} - ${customerLabel}`;

      // Actualizar stock de productos vendidos
      for (const item of cart) {
        const newStock = item.product.stock - item.quantity;
        await updateProductStock(item.product.id, newStock);
        await insertInventoryMovement(
          item.product.id,
          "exit",
          item.quantity,
          item.product.stock,
          saleMovementNote
        );
        console.log(
          `Stock actualizado: ${item.name.toUpperCase()} - Nuevo stock: ${newStock}`
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
            0
          );
          const accountData = {
            customerName: customerName.trim() || "Cliente",
            amount: total,
            baseCurrency: "USD",
            baseAmountUSD,
            exchangeRateAtCreation: exchangeRate,
            description: `Venta a crédito - ${cart.length} producto(s): ${cart
              .map((item) => item.name.toUpperCase())
              .join(", ")}`,
            dueDate: null, // Sin fecha de vencimiento por defecto
            invoiceNumber: saleId, // Número de la venta
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
              2
            )}\nCliente: ${customerName}\n\n✅ Cuenta por cobrar creada automáticamente`
          : `Total: VES. ${total.toFixed(2)}\nCliente: ${customerName}`;

      showAlert({
        title: "✓ Venta completada",
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
          customerDocument.trim()
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

      const saleId = await addSale(saleData, pendingSaleData.saleItems);

      const pendingCustomerLabel = customerDocument.trim()
        ? newCustomerName.trim() || "Cliente"
        : "Cliente genérico";
      const pendingPaymentLabel = (
        pendingSaleData.paymentMethod || ""
      ).toString();
      const pendingSaleMovementNote = pendingPaymentLabel
        ? `Venta #${saleId} - ${pendingCustomerLabel} - ${pendingPaymentLabel}`
        : `Venta #${saleId} - ${pendingCustomerLabel}`;

      // Actualizar stock de productos vendidos
      for (const item of cart) {
        const newStock = item.product.stock - item.quantity;
        await updateProductStock(item.product.id, newStock);
        await insertInventoryMovement(
          item.product.id,
          "exit",
          item.quantity,
          item.product.stock,
          pendingSaleMovementNote
        );
        console.log(
          `Stock actualizado: ${item.name.toUpperCase()} - Nuevo stock: ${newStock}`
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
            0
          );
          const accountData = {
            customerName: newCustomerName.trim(),
            amount: pendingSaleData.total,
            baseCurrency: "USD",
            baseAmountUSD,
            exchangeRateAtCreation: pendingSaleData.exchangeRate,
            description: `Venta a crédito - ${cart.length} producto(s): ${cart
              .map((item) => item.name.toUpperCase())
              .join(", ")}`,
            dueDate: null,
            invoiceNumber: saleId, // Número de la venta
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
              2
            )}\nCliente: ${newCustomerName.trim()}\n\n✅ Cliente creado y cuenta por cobrar generada`
          : `Total: VES. ${pendingSaleData.total.toFixed(
              2
            )}\nCliente: ${newCustomerName.trim()}\n\n✅ Cliente creado exitosamente`;

      showAlert({
        title: "✓ Venta completada",
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
  const renderProduct = ({ item }) => {
    const isOutOfStock = item.stock <= 0;
    return (
      <TouchableOpacity
        style={[styles.productCard, isOutOfStock && styles.productCardDisabled]}
        onPress={() => addToCart(item)}
        disabled={isOutOfStock}
      >
        <View style={styles.productHeader}>
          <View style={styles.productLeft}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name.toUpperCase()}
            </Text>
            <Text style={styles.productBarcode}>Código: {item.barcode}</Text>
          </View>
          <View style={styles.productRight}>
            <Text style={styles.productCategory}>{item.category}</Text>
            {isOutOfStock && (
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>Sin Stock</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>
            VES. {(item.priceVES || item.priceUSD * exchangeRate).toFixed(2)} /
            USD. {item.priceUSD.toFixed(2)}
          </Text>
          <Text
            style={[
              styles.productStock,
              isOutOfStock && styles.productStockLow,
            ]}
          >
            Stock: {item.stock}
          </Text>
        </View>
      </TouchableOpacity>
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
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, item.quantity - 1)}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, item.quantity + 1)}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromCart(item.id)}
        >
          <Text style={styles.removeButtonText}>🗑️ Eliminar</Text>
        </TouchableOpacity>
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
                <View style={styles.heroHeader}>
                  <View style={styles.heroIcon}>
                    <Text style={styles.heroIconText}>🛒</Text>
                  </View>
                  <View style={styles.heroCopy}>
                    <Text style={styles.heroTitle}>Punto de venta</Text>
                    <Text style={styles.heroSubtitle}>
                      Gestiona tus ventas, clientes y cobros en un solo flujo.
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.searchCard}>
                <Text style={styles.searchLabel}>Buscar productos</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Escribe para filtrar por nombre"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#8692a6"
                />
              </View>
            </View>
          }
          contentContainerStyle={[
            styles.productsContent,
            cart.length > 0 && styles.productsContentWithSummary,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyText}>No hay productos disponibles</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? "Intenta con otra búsqueda o limpia el filtro."
                  : "Agrega productos desde la sección de Productos."}
              </Text>
            </View>
          }
        />

        <View style={styles.cartSummary}>
          <TouchableOpacity
            style={styles.cartSummaryButton}
            onPress={() => setShowCart(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.cartSummaryButtonText}>
              Ver carrito ({cart.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Modal del carrito */}
        <Modal
          visible={showCart}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowCart(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowCart(false)}
              >
                <Text style={styles.backButtonText}>← Volver</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Carrito de Compras</Text>
              <TouchableOpacity
                style={styles.qrButton}
                onPress={openQRScanner}
                activeOpacity={0.85}
              >
                <Text style={styles.qrButtonText}>QR</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} ref={scrollViewRef}>
              {/* Información del cliente */}
              <View style={styles.customerSection}>
                <Text style={styles.sectionTitle}>👤 Cliente</Text>
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

              {/* Items del carrito */}
              <View style={styles.cartItemsSection}>
                <Text style={styles.sectionTitle}>
                  📦 Productos ({cart.length})
                </Text>
                {cart.length === 0 ? (
                  <View style={styles.emptyCartContainer}>
                    <Text style={styles.emptyCartEmoji}>🛒</Text>
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
                  <Text style={styles.sectionTitle}>💳 Método de Pago</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.paymentButtonsScroll}
                    contentContainerStyle={styles.paymentButtons}
                  >
                    <TouchableOpacity
                      style={[
                        styles.paymentButton,
                        paymentMethod === "cash" && styles.paymentButtonActive,
                      ]}
                      onPress={() => setPaymentMethod("cash")}
                    >
                      <Text style={styles.paymentButtonIcon}>💵</Text>
                      <Text
                        style={[
                          styles.paymentButtonText,
                          paymentMethod === "cash" &&
                            styles.paymentButtonTextActive,
                        ]}
                      >
                        Efectivo
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.paymentButton,
                        paymentMethod === "card" && styles.paymentButtonActive,
                      ]}
                      onPress={() => setPaymentMethod("card")}
                    >
                      <Text style={styles.paymentButtonIcon}>💳</Text>
                      <Text
                        style={[
                          styles.paymentButtonText,
                          paymentMethod === "card" &&
                            styles.paymentButtonTextActive,
                        ]}
                      >
                        Tarjeta
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.paymentButton,
                        paymentMethod === "transfer" &&
                          styles.paymentButtonActive,
                      ]}
                      onPress={() => setPaymentMethod("transfer")}
                    >
                      <Text style={styles.paymentButtonIcon}>🏦</Text>
                      <Text
                        style={[
                          styles.paymentButtonText,
                          paymentMethod === "transfer" &&
                            styles.paymentButtonTextActive,
                        ]}
                      >
                        Transferencia
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.paymentButton,
                        paymentMethod === "pago_movil" &&
                          styles.paymentButtonActive,
                      ]}
                      onPress={() => setPaymentMethod("pago_movil")}
                    >
                      <Text style={styles.paymentButtonIcon}>📱</Text>
                      <Text
                        style={[
                          styles.paymentButtonText,
                          paymentMethod === "pago_movil" &&
                            styles.paymentButtonTextActive,
                        ]}
                      >
                        Pago Móvil
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.paymentButton,
                        paymentMethod === "por_cobrar" &&
                          styles.paymentButtonActive,
                      ]}
                      onPress={() => setPaymentMethod("por_cobrar")}
                    >
                      <Text style={styles.paymentButtonIcon}>⏳</Text>
                      <Text
                        style={[
                          styles.paymentButtonText,
                          paymentMethod === "por_cobrar" &&
                            styles.paymentButtonTextActive,
                        ]}
                      >
                        Por Cobrar
                      </Text>
                    </TouchableOpacity>
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

            <View style={styles.modalFooter}>
              <View style={styles.totalSection}>
                <View style={styles.totalVES}>
                  <Text style={styles.totalLabel}>PAGAR VES</Text>
                  <Text style={styles.totalAmount}>{total.toFixed(2)}</Text>
                </View>
                <View style={styles.totalUSD}>
                  <Text style={styles.totalLabel}>PAGAR USD</Text>
                  <Text style={styles.totalAmount}>
                    {(total / exchangeRate).toFixed(2)}
                  </Text>
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[
                    styles.clearButton,
                    cart.length === 0 && styles.buttonDisabled,
                  ]}
                  onPress={clearCart}
                  disabled={cart.length === 0}
                >
                  <Text style={styles.clearButtonText}>🗑️ Limpiar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.checkoutButton,
                    cart.length === 0 && styles.buttonDisabled,
                  ]}
                  onPress={completeSale}
                  disabled={cart.length === 0}
                >
                  <Text style={styles.checkoutText}>✓ Completar Venta</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
          <TouchableOpacity
            style={styles.closeScannerButton}
            onPress={() => setScanning(false)}
          >
            <Text style={styles.closeScannerText}>Cerrar</Text>
          </TouchableOpacity>
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
              <Text style={styles.modalTitle}>👤 Nuevo Cliente</Text>
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
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={cancelNewCustomer}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
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
                </TouchableOpacity>
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
    backgroundColor: "#e8edf2",
  },
  flatList: {
    paddingHorizontal: hs(16),
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#e8edf2",
    alignItems: "center",
    justifyContent: "center",
    gap: vs(16),
  },
  loadingText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "#4c5767",
  },
  listHeader: {
    gap: vs(12),
    paddingTop: 0,
    paddingBottom: 0,
    alignItems: "stretch",
  },
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(10) },
    shadowOpacity: 0.08,
    shadowRadius: s(18),
    elevation: 8,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: vs(18),
  },
  heroIcon: {
    width: s(64),
    height: s(64),
    borderRadius: borderRadius.lg,
    backgroundColor: "#f3f8ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: hs(16),
  },
  heroIconText: {
    fontSize: iconSize.xl,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    fontSize: rf(22),
    fontWeight: "700",
    color: "#1f2633",
  },
  heroSubtitle: {
    fontSize: rf(14),
    color: "#5b6472",
    lineHeight: vs(20),
    marginTop: vs(6),
  },
  heroAction: {
    alignSelf: "flex-start",
    marginTop: vs(4),
    backgroundColor: "#1f9254",
    borderRadius: borderRadius.md,
    paddingHorizontal: hs(20),
    paddingVertical: vs(12),
  },
  heroActionDisabled: {
    backgroundColor: "#d5dbe7",
  },
  heroActionText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: rf(13),
  },
  searchCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: vs(12),
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.05,
    shadowRadius: s(12),
    elevation: 5,
  },
  searchLabel: {
    fontSize: rf(12),
    fontWeight: "600",
    color: "#7a8796",
    textTransform: "uppercase",
    letterSpacing: s(0.6),
  },
  searchInput: {
    backgroundColor: "#f3f5fa",
    borderRadius: borderRadius.md,
    paddingVertical: vs(14),
    paddingHorizontal: hs(16),
    fontSize: rf(14),
    fontWeight: "500",
    color: "#1f2633",
  },
  productsContent: {
    paddingTop: vs(8),
    paddingBottom: vs(140),
    gap: vs(10),
  },
  productsContentWithSummary: {
    paddingBottom: vs(240),
  },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: vs(8),
    flex: 1,
    marginBottom: vs(8),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.05,
    shadowRadius: s(12),
    elevation: 5,
  },
  productCardDisabled: {
    opacity: 0.45,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: hs(12),
  },
  productLeft: {
    flex: 1,
    gap: vs(4),
  },
  productRight: {
    alignItems: "flex-end",
    gap: vs(4),
  },
  productName: {
    flex: 1,
    fontSize: rf(14),
    fontWeight: "700",
    color: "#1f2633",
  },
  outOfStockBadge: {
    backgroundColor: "#f66570",
    borderRadius: borderRadius.sm,
    paddingHorizontal: hs(10),
    paddingVertical: vs(4),
  },
  outOfStockText: {
    color: "#fff",
    fontSize: rf(11),
    fontWeight: "700",
  },
  productCategory: {
    fontSize: rf(12),
    color: "#6f7c8c",
    fontStyle: "italic",
  },
  productBarcode: {
    fontSize: rf(12),
    color: "#7a8796",
    fontWeight: "500",
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productPrice: {
    fontSize: rf(15),
    fontWeight: "700",
    color: "#1f9254",
  },
  productStock: {
    fontSize: rf(12),
    fontWeight: "600",
    color: "#2f5ae0",
    backgroundColor: "#e8f1ff",
    paddingHorizontal: hs(10),
    paddingVertical: vs(5),
    borderRadius: borderRadius.sm,
  },
  productStockLow: {
    backgroundColor: "#ffe8ec",
    color: "#d6455d",
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
    color: "#1f2633",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: rf(14),
    color: "#6f7c8c",
    textAlign: "center",
    lineHeight: vs(20),
  },
  cartSummary: {
    position: "absolute",
    left: hs(24),
    right: 0,
    bottom: vs(24),
    backgroundColor: "transparent",
    paddingVertical: vs(18),
    paddingRight: 0,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
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
    fontWeight: "700",
    color: "#1f2633",
  },
  cartSummaryButton: {
    backgroundColor: "#2f5ae0",
    borderRadius: borderRadius.md,
    paddingHorizontal: hs(20),
    paddingVertical: vs(12),
  },
  cartSummaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: rf(14),
  },
  qrButton: {
    backgroundColor: "#2f5ae0",
    borderRadius: borderRadius.md,
    paddingHorizontal: hs(12),
    paddingVertical: vs(12),
    marginRight: hs(8),
  },
  qrButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: rf(14),
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#e8edf2",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: hs(16),
    paddingTop: vs(20),
    paddingBottom: vs(16),
  },
  backButton: {
    backgroundColor: "#f0f3fa",
    borderRadius: borderRadius.sm,
    paddingHorizontal: hs(16),
    paddingVertical: vs(10),
  },
  backButtonText: {
    color: "#2f5ae0",
    fontWeight: "700",
    fontSize: rf(14),
  },
  modalTitle: {
    fontSize: rf(20),
    fontWeight: "700",
    color: "#1f2633",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: hs(16),
    paddingBottom: vs(40),
  },
  customerSection: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: vs(12),
    gap: vs(14),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.05,
    shadowRadius: s(12),
    elevation: 5,
  },
  sectionTitle: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#1f2633",
  },
  customerInput: {
    backgroundColor: "#f3f5fa",
    borderRadius: borderRadius.md,
    paddingVertical: vs(14),
    paddingHorizontal: hs(16),
    fontSize: rf(14),
    color: "#1f2633",
  },
  genericCustomerText: {
    fontSize: rf(12),
    color: "#1f9254",
    fontStyle: "italic",
  },
  cartItemsSection: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: vs(8),
    gap: vs(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.05,
    shadowRadius: s(12),
    elevation: 5,
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
    color: "#1f2633",
  },
  emptyCartSubtext: {
    fontSize: rf(14),
    color: "#6f7c8c",
  },
  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f3f5fa",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: hs(12),
  },
  cartItemLeft: {
    flex: 1,
    gap: vs(6),
  },
  cartItemName: {
    fontSize: rf(15),
    fontWeight: "700",
    color: "#1f2633",
  },
  cartItemPrice: {
    fontSize: rf(13),
    color: "#6f7c8c",
  },
  cartItemSubtotal: {
    fontSize: rf(13),
    fontWeight: "600",
    color: "#1f9254",
  },
  cartItemRight: {
    alignItems: "flex-end",
    gap: vs(8),
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quantityButton: {
    width: s(34),
    height: s(34),
    borderRadius: borderRadius.sm,
    backgroundColor: "#2f5ae0",
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
  removeButton: {
    paddingVertical: vs(6),
    paddingHorizontal: hs(10),
    backgroundColor: "#ffecef",
    borderRadius: borderRadius.sm,
  },
  removeButtonText: {
    fontSize: rf(12),
    fontWeight: "600",
    color: "#d6455d",
  },
  paymentSection: {
    backgroundColor: "#fff",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: vs(20),
    gap: vs(18),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: s(6) },
    shadowOpacity: 0.05,
    shadowRadius: s(12),
    elevation: 5,
  },
  paymentButtonsScroll: {
    marginHorizontal: hs(-4),
  },
  paymentButtons: {
    gap: vs(8),
    paddingVertical: vs(4),
  },
  paymentButton: {
    backgroundColor: "#f7fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    alignItems: "center",
    minWidth: s(80),
  },
  paymentButtonActive: {
    backgroundColor: "#2f5ae0",
    borderColor: "#2f5ae0",
  },
  paymentButtonIcon: {
    fontSize: rf(16),
    marginBottom: vs(4),
  },
  paymentButtonText: {
    fontSize: rf(12),
    fontWeight: "500",
    color: "#4a5568",
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
    borderColor: "#e2e8f0",
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    fontSize: rf(16),
    backgroundColor: "#f7fafc",
    color: "#2d3748",
    marginTop: vs(8),
  },
  modalFooter: {
    backgroundColor: "#fff",
    paddingHorizontal: hs(24),
    paddingVertical: vs(12),
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
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
    marginBottom: vs(16),
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
    color: "#7a8796",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  totalAmount: {
    fontSize: rf(18),
    fontWeight: "700",
    color: "#1f2633",
  },
  actionButtons: {
    flexDirection: "row",
    gap: hs(12),
  },
  clearButton: {
    flex: 1,
    backgroundColor: "#f0b429",
    borderRadius: borderRadius.md,
    alignItems: "center",
    paddingVertical: vs(14),
  },
  clearButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: rf(14),
  },
  checkoutButton: {
    flex: 1.4,
    backgroundColor: "#1f9254",
    borderRadius: borderRadius.md,
    alignItems: "center",
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
    backgroundColor: "#fff",
    borderRadius: borderRadius.xl,
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
    color: "#5b6472",
    lineHeight: vs(20),
    textAlign: "center",
  },
  newCustomerInput: {
    backgroundColor: "#f3f5fa",
    borderRadius: borderRadius.md,
    paddingVertical: vs(14),
    paddingHorizontal: hs(16),
    fontSize: rf(16),
    color: "#1f2633",
  },
  newCustomerButtons: {
    flexDirection: "row",
    gap: hs(12),
  },
  modalButton: {
    flex: 1,
    borderRadius: borderRadius.md,
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
    top: vs(50),
    right: hs(20),
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: borderRadius.xl,
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
