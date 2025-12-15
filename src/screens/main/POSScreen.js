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
  Animated,
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
export const POSScreen = () => {
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
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [showCart, setShowCart] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [pendingSaleData, setPendingSaleData] = useState(null);

  // Animación para el campo de referencia
  const referenceAnimation = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);

  // Calcular total cuando cambie el carrito
  useEffect(() => {
    const newTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    setTotal(newTotal);
  }, [cart]);

  // Animación del campo de referencia
  useEffect(() => {
    const shouldShow =
      paymentMethod === "transfer" || paymentMethod === "pago_movil";
    Animated.timing(referenceAnimation, {
      toValue: shouldShow ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      // Auto-scroll después de que termine la animación
      if (shouldShow && scrollViewRef.current) {
        setTimeout(() => {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }, 100); // Pequeño delay para asegurar que el layout esté listo
      }
    });
  }, [paymentMethod, referenceAnimation]);

  // Obtener categorías únicas
  const categories = [
    "Todos",
    ...new Set(products.map((p) => p.category).filter(Boolean)),
  ];

  // Filtrar productos
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "Todos" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
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

      await addSale(saleData, saleItems);

      // Actualizar stock de productos vendidos
      for (const item of cart) {
        const newStock = item.product.stock - item.quantity;
        await updateProductStock(item.product.id, newStock);
        console.log(
          `Stock actualizado: ${item.name} - Nuevo stock: ${newStock}`
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
              .map((item) => item.name)
              .join(", ")}`,
            dueDate: null, // Sin fecha de vencimiento por defecto
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

      await addSale(saleData, pendingSaleData.saleItems);

      // Actualizar stock de productos vendidos
      for (const item of cart) {
        const newStock = item.product.stock - item.quantity;
        await updateProductStock(item.product.id, newStock);
        console.log(
          `Stock actualizado: ${item.name} - Nuevo stock: ${newStock}`
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
              .map((item) => item.name)
              .join(", ")}`,
            dueDate: null,
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
            {item.name}
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
          {item.name}
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
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>⏳ Cargando productos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con título y carrito */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛒 Punto de Venta</Text>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => setShowCart(true)}
        >
          <Text style={styles.cartButtonText}>🛍️ Carrito ({cart.length})</Text>
          {cart.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cart.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Buscar productos..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      {/* Filtro de categorías */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === category && styles.categoryChipTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lista de productos */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.productsGrid}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyText}>No hay productos disponibles</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? "Intenta con otra búsqueda"
                : "Agrega productos desde la sección de Productos"}
            </Text>
          </View>
        }
      />

      {/* Resumen fijo del carrito en la parte inferior */}
      {cart.length > 0 && (
        <View style={styles.cartSummary}>
          <View style={styles.cartSummaryLeft}>
            <Text style={styles.cartSummaryLabel}>Total:</Text>
            <Text style={styles.cartSummaryTotal}>VES. {total.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={styles.viewCartButton}
            onPress={() => setShowCart(true)}
          >
            <Text style={styles.viewCartButtonText}>
              Ver Carrito ({cart.length})
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

                {/* Número de referencia para transferencias y pago móvil */}
                <Animated.View
                  style={[
                    styles.referenceContainer,
                    {
                      opacity: referenceAnimation,
                      transform: [
                        {
                          scale: referenceAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.95, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
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
                      autoFocus={true}
                    />
                    <Text style={styles.referenceHint}>
                      {paymentMethod === "transfer"
                        ? "Ingrese el número de referencia de la transferencia bancaria"
                        : "Ingrese el número de referencia del pago móvil"}
                    </Text>
                  </View>
                </Animated.View>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    fontSize: 18,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    padding: 16,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  cartButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  cartButtonText: {
    color: "#4CAF50",
    fontWeight: "600",
    fontSize: 14,
  },
  cartBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#f44336",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  searchContainer: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  searchInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  categoriesContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    maxHeight: 60,
  },
  categoriesContent: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  categoryChip: {
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    height: 36,
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  categoryChipText: {
    color: "#666",
    fontWeight: "500",
    fontSize: 14,
  },
  categoryChipTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  productsGrid: {
    padding: 12,
    paddingBottom: 120,
  },
  productCard: {
    backgroundColor: "#fff",
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    minHeight: 85,
  },
  productCardDisabled: {
    opacity: 0.5,
    backgroundColor: "#f9f9f9",
  },
  productHeader: {
    marginBottom: 4,
  },
  productName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 11,
    color: "#666",
    marginBottom: 6,
    fontStyle: "italic",
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
  },
  productPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  productStock: {
    fontSize: 12,
    color: "#666",
    backgroundColor: "#e8f5e8",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  productStockLow: {
    backgroundColor: "#ffebee",
    color: "#c62828",
  },
  outOfStockBadge: {
    backgroundColor: "#f44336",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  outOfStockText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 80,
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
  cartSummary: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    borderTopWidth: 2,
    borderTopColor: "#4CAF50",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  cartSummaryLeft: {
    flex: 1,
  },
  cartSummaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  cartSummaryTotal: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  viewCartButton: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  viewCartButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#4CAF50",
    padding: 16,
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  modalContent: {
    flex: 1,
  },
  customerSection: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  customerInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  cartItemsSection: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 2,
  },
  emptyCartContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyCartEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyCartText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  emptyCartSubtext: {
    fontSize: 14,
    color: "#999",
  },
  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cartItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
  },
  cartItemPrice: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  cartItemSubtotal: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "600",
  },
  cartItemRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  quantityButton: {
    backgroundColor: "#4CAF50",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  quantityText: {
    fontSize: 18,
    fontWeight: "700",
    minWidth: 40,
    textAlign: "center",
    color: "#333",
  },
  removeButton: {
    padding: 4,
  },
  removeButtonText: {
    fontSize: 12,
    color: "#f44336",
    fontWeight: "600",
  },
  paymentSection: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 2,
  },
  paymentButtonsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  paymentButtons: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingRight: 16,
  },
  paymentButton: {
    width: 100,
    padding: 16,
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 12,
    marginHorizontal: 6,
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  paymentButtonActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  paymentButtonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  paymentButtonText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  paymentButtonTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  modalFooter: {
    backgroundColor: "#fff",
    padding: 16,
    borderTopWidth: 2,
    borderTopColor: "#eee",
  },
  totalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  clearButton: {
    flex: 1,
    backgroundColor: "#ff9800",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginRight: 8,
  },
  clearButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  checkoutButton: {
    flex: 2,
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
    opacity: 0.6,
  },
  checkoutText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  newCustomerModalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "90%",
    maxWidth: 400,
    padding: 20,
  },
  newCustomerInfo: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  newCustomerInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  newCustomerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  genericCustomerText: {
    fontSize: 12,
    color: "#4CAF50",
    fontStyle: "italic",
    marginTop: 4,
  },
  referenceSection: {
    marginTop: 15,
  },
  referenceLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  optionalText: {
    fontSize: 12,
    fontWeight: "normal",
    color: "#666",
    fontStyle: "italic",
  },
  referenceInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  referenceHint: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    lineHeight: 16,
  },
  referenceContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e9ecef",
    overflow: "hidden",
  },
});

export default POSScreen;
