import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
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
import { updateProductStock } from "../../services/database/products";

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

  // Filtrar productos (ordenados alfabéticamente)
  const filteredProducts = products
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

  /**
   * Agrega un producto al carrito
   */
  const addToCart = (product) => {
    if (product.stock <= 0) {
      Alert.alert("Sin stock", "Este producto no tiene stock disponible");
      return;
    }

    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem) {
      // Incrementar cantidad si ya existe
      const updatedCart = cart.map((item) =>
        item.id === product.id
          ? {
              ...item,
              quantity: item.quantity + 1,
              subtotal: (item.quantity + 1) * item.price,
            }
          : item
      );
      setCart(updatedCart);
    } else {
      // Agregar nuevo item
      const newItem = {
        id: product.id,
        name: product.name,
        price: product.priceVES || product.priceUSD * exchangeRate,
        quantity: 1,
        subtotal: product.priceVES || product.priceUSD * exchangeRate,
        product: product,
      };
      setCart([...cart, newItem]);
    }

    // Mostrar feedback visual
    Alert.alert("✓", `${product.name} agregado al carrito`, [{ text: "OK" }], {
      cancelable: true,
    });
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
    Alert.alert(
      "Limpiar carrito",
      "¿Estás seguro de que quieres vaciar el carrito?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Limpiar", onPress: () => setCart([]) },
      ]
    );
  };

  /**
   * Completa la venta
   */
  const completeSale = async () => {
    if (cart.length === 0) {
      Alert.alert("Error", "El carrito está vacío");
      return;
    }

    // Validar que se haya especificado la cédula del cliente
    if (!customerDocument.trim()) {
      Alert.alert("Error", "Debe especificar la cédula del cliente");
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
        subtotal: item.subtotal,
      }));

      // Registrar la venta y obtener el ID
      const saleId = await addSale(saleData, saleItems);

      // Actualizar stock de productos vendidos
      for (const item of cart) {
        const newStock = item.product.stock - item.quantity;
        await updateProductStock(item.product.id, newStock);
        console.log(
          `Stock actualizado: ${item.name.toUpperCase()} - Nuevo stock: ${newStock}`
        );
      }

      // Recargar productos para reflejar el nuevo stock
      await refreshProducts();

      // Si el método de pago es "por_cobrar", crear cuenta por cobrar automáticamente
      if (paymentMethod === "por_cobrar") {
        try {
          const accountData = {
            customerName: customerName.trim() || "Cliente",
            amount: total,
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

      Alert.alert("✓ Venta completada", confirmationMessage);
    } catch (error) {
      console.error("Error completing sale:", error);
      Alert.alert("Error", "No se pudo completar la venta");
    }
  };

  /**
   * Crea un nuevo cliente y completa la venta pendiente
   */
  const createCustomerAndCompleteSale = async () => {
    if (!newCustomerName.trim()) {
      Alert.alert("Error", "El nombre del cliente es obligatorio");
      return;
    }

    try {
      // Crear el nuevo cliente
      const customerData = {
        name: newCustomerName.trim(),
        documentNumber: customerDocument,
        documentType: "V", // Venezolano por defecto
      };

      const newCustomerId = await addCustomer(customerData);

      // Completar la venta con el nuevo cliente
      const saleData = {
        ...pendingSaleData,
        customerId: newCustomerId,
        notes: `Cliente: ${newCustomerName.trim()}`,
      };

      const saleId = await addSale(saleData, pendingSaleData.saleItems);

      // Actualizar stock de productos vendidos
      for (const item of cart) {
        const newStock = item.product.stock - item.quantity;
        await updateProductStock(item.product.id, newStock);
        console.log(
          `Stock actualizado: ${item.name.toUpperCase()} - Nuevo stock: ${newStock}`
        );
      }

      // Recargar productos para reflejar el nuevo stock
      await refreshProducts();

      // Si el método de pago es "por_cobrar", crear cuenta por cobrar automáticamente
      if (pendingSaleData.paymentMethod === "por_cobrar") {
        try {
          const accountData = {
            customerName: newCustomerName.trim(),
            amount: pendingSaleData.total,
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

      Alert.alert("✓ Venta completada", confirmationMessage);
    } catch (error) {
      console.error("Error creating customer and completing sale:", error);
      Alert.alert("Error", "No se pudo crear el cliente y completar la venta");
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
          <Text style={styles.productName} numberOfLines={2}>
            {item.name.toUpperCase()}
          </Text>
          {isOutOfStock && (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockText}>Sin Stock</Text>
            </View>
          )}
        </View>
        <Text style={styles.productCategory}>{item.category}</Text>
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>
            VES. {(item.priceVES || item.priceUSD * exchangeRate).toFixed(2)}
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

      {cart.length > 0 && (
        <View style={styles.cartSummary}>
          <View style={styles.cartSummaryInfo}>
            <Text style={styles.cartSummaryLabel}>Total actual</Text>
            <Text style={styles.cartSummaryTotal}>VES. {total.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={styles.cartSummaryButton}
            onPress={() => setShowCart(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.cartSummaryButtonText}>
              Revisar carrito ({cart.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
            <View style={{ width: 80 }} />
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
                  <View style={styles.referenceContainer}>
                    <View style={styles.referenceSection}>
                      <Text style={styles.referenceLabel}>
                        📄 Número de Referencia
                        <Text style={styles.optionalText}> (opcional)</Text>
                      </Text>
                      <TextInput
                        style={styles.referenceInput}
                        placeholder={`Ingrese referencia de ${
                          paymentMethod === "transfer"
                            ? "transferencia"
                            : "pago móvil"
                        }`}
                        value={referenceNumber}
                        onChangeText={setReferenceNumber}
                        keyboardType="numeric"
                        maxLength={20}
                        placeholderTextColor="#999"
                      />
                      <Text style={styles.referenceHint}>
                        {paymentMethod === "transfer"
                          ? "Ingrese el número de referencia de la transferencia bancaria"
                          : "Ingrese el número de referencia del pago móvil"}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer con total y botones */}
          <View style={styles.modalFooter}>
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total a Pagar:</Text>
              <Text style={styles.totalAmount}>VES. {total.toFixed(2)}</Text>
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
                style={[styles.modalButton, styles.saveButton]}
                onPress={createCustomerAndCompleteSale}
              >
                <Text style={styles.saveButtonText}>Crear y Vender</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#e8edf2",
  },
  flatList: {
    paddingHorizontal: 16,
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
  listHeader: {
    gap: 20,
    paddingTop: 0,
    paddingBottom: 12,
    alignItems: "stretch",
  },
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 10,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 8,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#f3f8ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  heroIconText: {
    fontSize: 30,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
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
    marginTop: 6,
  },
  heroAction: {
    alignSelf: "flex-start",
    marginTop: 4,
    backgroundColor: "#1f9254",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  heroActionDisabled: {
    backgroundColor: "#d5dbe7",
  },
  heroActionText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  searchCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 20,
    gap: 12,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
  },
  searchLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7a8796",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  searchInput: {
    backgroundColor: "#f3f5fa",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "500",
    color: "#1f2633",
  },
  productsContent: {
    paddingTop: 16,
    paddingBottom: 140,
    gap: 10,
  },
  productsContentWithSummary: {
    paddingBottom: 240,
  },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 12,
    gap: 8,
    flex: 1,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
  },
  productCardDisabled: {
    opacity: 0.45,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  productName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2633",
  },
  outOfStockBadge: {
    backgroundColor: "#f66570",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  outOfStockText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  productCategory: {
    fontSize: 12,
    color: "#6f7c8c",
    fontStyle: "italic",
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f9254",
  },
  productStock: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2f5ae0",
    backgroundColor: "#e8f1ff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  productStockLow: {
    backgroundColor: "#ffe8ec",
    color: "#d6455d",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2633",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6f7c8c",
    textAlign: "center",
    lineHeight: 20,
  },
  cartSummary: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 24,
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  cartSummaryInfo: {
    gap: 4,
  },
  cartSummaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7a8796",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  cartSummaryTotal: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2633",
  },
  cartSummaryButton: {
    backgroundColor: "#2f5ae0",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cartSummaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#e8edf2",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 16,
  },
  backButton: {
    backgroundColor: "#f0f3fa",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButtonText: {
    color: "#2f5ae0",
    fontWeight: "700",
    fontSize: 14,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2633",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  customerSection: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2633",
  },
  customerInput: {
    backgroundColor: "#f3f5fa",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1f2633",
  },
  genericCustomerText: {
    fontSize: 12,
    color: "#1f9254",
    fontStyle: "italic",
  },
  cartItemsSection: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
  },
  emptyCartContainer: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 32,
  },
  emptyCartEmoji: {
    fontSize: 48,
  },
  emptyCartText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2633",
  },
  emptyCartSubtext: {
    fontSize: 14,
    color: "#6f7c8c",
  },
  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f3f5fa",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cartItemLeft: {
    flex: 1,
    gap: 6,
  },
  cartItemName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2633",
  },
  cartItemPrice: {
    fontSize: 13,
    color: "#6f7c8c",
  },
  cartItemSubtotal: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f9254",
  },
  cartItemRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quantityButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#2f5ae0",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2633",
    minWidth: 36,
    textAlign: "center",
  },
  removeButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#ffecef",
    borderRadius: 10,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#d6455d",
  },
  paymentSection: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
    gap: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
  },
  paymentButtonsScroll: {
    marginHorizontal: -4,
  },
  paymentButtons: {
    flexDirection: "row",
    gap: 12,
  },
  paymentButton: {
    width: 110,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#f3f5fa",
    alignItems: "center",
    gap: 8,
  },
  paymentButtonActive: {
    backgroundColor: "#2f5ae0",
  },
  paymentButtonIcon: {
    fontSize: 26,
  },
  paymentButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5b6472",
  },
  paymentButtonTextActive: {
    color: "#fff",
  },
  referenceContainer: {
    backgroundColor: "#f3f5fa",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e0e5ef",
  },
  referenceSection: {
    gap: 10,
  },
  referenceLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2633",
  },
  optionalText: {
    fontSize: 12,
    fontWeight: "400",
    color: "#6f7c8c",
    fontStyle: "italic",
  },
  referenceInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#1f2633",
    borderWidth: 1,
    borderColor: "#d5dbe7",
  },
  referenceHint: {
    fontSize: 12,
    color: "#6f7c8c",
    lineHeight: 16,
  },
  modalFooter: {
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 12,
  },
  totalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7a8796",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  totalAmount: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1f2633",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  clearButton: {
    flex: 1,
    backgroundColor: "#f0b429",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 14,
  },
  clearButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  checkoutButton: {
    flex: 1.4,
    backgroundColor: "#1f9254",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 14,
  },
  checkoutText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(13, 22, 38, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  newCustomerModalContent: {
    backgroundColor: "#fff",
    borderRadius: 22,
    width: "100%",
    maxWidth: 420,
    padding: 24,
    gap: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 10,
  },
  newCustomerInfo: {
    fontSize: 14,
    color: "#5b6472",
    lineHeight: 20,
    textAlign: "center",
  },
  newCustomerInput: {
    backgroundColor: "#f3f5fa",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1f2633",
  },
  newCustomerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f3fa",
  },
  cancelButtonText: {
    color: "#5b6472",
    fontWeight: "600",
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: "#1f9254",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});

export default POSScreen;
