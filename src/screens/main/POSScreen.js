import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
} from "react-native";
import { useProducts } from "../../hooks/useProducts";
import { useSales } from "../../hooks/useSales";
import { useExchangeRate } from "../../contexts/ExchangeRateContext";

/**
 * Pantalla de punto de venta (POS)
 */
export const POSScreen = () => {
  const { products, loading: productsLoading } = useProducts();
  const { registerSale: addSale } = useSales();
  const { rate: exchangeRate } = useExchangeRate();

  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerName, setCustomerName] = useState("");

  // Calcular total cuando cambie el carrito
  useEffect(() => {
    const newTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    setTotal(newTotal);
  }, [cart]);

  /**
   * Agrega un producto al carrito
   */
  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
      // Incrementar cantidad si ya existe
      const updatedCart = cart.map(item =>
        item.id === product.id
          ? {
              ...item,
              quantity: item.quantity + 1,
              subtotal: (item.quantity + 1) * item.price
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
        product: product
      };
      setCart([...cart, newItem]);
    }
  };

  /**
   * Remueve un producto del carrito
   */
  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  /**
   * Actualiza la cantidad de un item en el carrito
   */
  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const updatedCart = cart.map(item =>
      item.id === productId
        ? {
            ...item,
            quantity: newQuantity,
            subtotal: newQuantity * item.price
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
        { text: "Limpiar", onPress: () => setCart([]) }
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

    try {
      // Preparar datos de la venta
      const saleData = {
        customerId: null, // Por ahora no tenemos clientes
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
        notes: `Cliente: ${customerName.trim() || "Cliente"}`
      };

      // Preparar items de la venta
      const saleItems = cart.map(item => ({
        productId: item.product.id,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal
      }));

      await addSale(saleData, saleItems);

      Alert.alert(
        "Venta completada",
        `Total: Bs. ${total.toFixed(2)}\nCliente: ${customerName.trim() || "Cliente"}`,
        [
          {
            text: "OK",
            onPress: () => {
              setCart([]);
              setCustomerName("");
              setTotal(0);
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error completing sale:", error);
      Alert.alert("Error", "No se pudo completar la venta");
    }
  };

  /**
   * Renderiza un producto en la grilla
   */
  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => addToCart(item)}
      disabled={item.stock <= 0}
    >
      <Text style={styles.productName}>{item.name}</Text>
      <Text style={styles.productPrice}>
        Bs. {(item.priceVES || item.priceUSD * exchangeRate).toFixed(2)}
      </Text>
      <Text style={styles.productStock}>
        Stock: {item.stock}
      </Text>
    </TouchableOpacity>
  );

  /**
   * Renderiza un item del carrito
   */
  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.name}</Text>
        <Text style={styles.cartItemPrice}>
          Bs. {item.price.toFixed(2)} x {item.quantity}
        </Text>
      </View>

      <View style={styles.cartItemControls}>
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

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromCart(item.id)}
        >
          <Text style={styles.removeButtonText}>×</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.leftPanel}>
        <Text style={styles.title}>Productos</Text>

        {productsLoading ? (
          <Text style={styles.loadingText}>Cargando productos...</Text>
        ) : (
          <FlatList
            data={products.filter(p => p.active)}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            contentContainerStyle={styles.productsGrid}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No hay productos disponibles</Text>
            }
          />
        )}
      </View>

      <View style={styles.rightPanel}>
        <Text style={styles.title}>Carrito de Compras</Text>

        {/* Información del cliente */}
        <View style={styles.customerSection}>
          <Text style={styles.sectionLabel}>Cliente:</Text>
          <TextInput
            style={styles.customerInput}
            placeholder="Nombre del cliente"
            value={customerName}
            onChangeText={setCustomerName}
          />
        </View>

        {/* Lista del carrito */}
        <FlatList
          data={cart}
          renderItem={renderCartItem}
          keyExtractor={(item, index) => index.toString()}
          style={styles.cartList}
          ListEmptyComponent={
            <Text style={styles.emptyCart}>Carrito vacío</Text>
          }
        />

        {/* Método de pago */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionLabel}>Método de pago:</Text>
          <View style={styles.paymentButtons}>
            <TouchableOpacity
              style={[
                styles.paymentButton,
                paymentMethod === "cash" && styles.paymentButtonActive
              ]}
              onPress={() => setPaymentMethod("cash")}
            >
              <Text style={[
                styles.paymentButtonText,
                paymentMethod === "cash" && styles.paymentButtonTextActive
              ]}>
                Efectivo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentButton,
                paymentMethod === "card" && styles.paymentButtonActive
              ]}
              onPress={() => setPaymentMethod("card")}
            >
              <Text style={[
                styles.paymentButtonText,
                paymentMethod === "card" && styles.paymentButtonTextActive
              ]}>
                Tarjeta
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Total y botones */}
        <View style={styles.bottomSection}>
          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalAmount}>Bs. {total.toFixed(2)}</Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearCart}
              disabled={cart.length === 0}
            >
              <Text style={styles.clearButtonText}>Limpiar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkoutButton, cart.length === 0 && styles.checkoutButtonDisabled]}
              onPress={completeSale}
              disabled={cart.length === 0}
            >
              <Text style={styles.checkoutButtonText}>Completar Venta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};
          <Text style={styles.checkoutText}>Procesar Pago</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
  },
  leftPanel: {
    flex: 2,
    padding: 16,
    paddingTop: 40,
  },
  rightPanel: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    paddingTop: 40,
    borderLeftWidth: 1,
    borderLeftColor: "#eee",
    paddingBottom: 100,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  loadingText: {
    textAlign: "center",
    color: "#999",
    marginTop: 40,
  },
  productsGrid: {
    paddingBottom: 20,
  },
  productCard: {
    flex: 1,
    backgroundColor: "#fff",
    margin: 4,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    minHeight: 80,
    justifyContent: "center",
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  productStock: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  customerSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  customerInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
  },
  cartList: {
    flex: 1,
    marginBottom: 16,
  },
  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 12,
    color: "#666",
  },
  cartItemControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  quantityText: {
    fontSize: 14,
    fontWeight: "600",
    minWidth: 30,
    textAlign: "center",
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ff4444",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  removeButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  emptyCart: {
    textAlign: "center",
    color: "#999",
    marginTop: 20,
  },
  paymentSection: {
    marginBottom: 16,
  },
  paymentButtons: {
    flexDirection: "row",
    gap: 8,
  },
  paymentButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  paymentButtonActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  paymentButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  paymentButtonTextActive: {
    color: "#fff",
  },
  bottomSection: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 16,
  },
  totalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  clearButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  checkoutButton: {
    flex: 2,
    backgroundColor: "#4CAF50",
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
  },
  checkoutButtonDisabled: {
    backgroundColor: "#ccc",
  },
  checkoutButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 40,
  },
});

export default POSScreen;
