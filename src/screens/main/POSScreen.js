import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from "react-native";

/**
 * Pantalla de punto de venta (POS)
 */
export const POSScreen = () => {
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);

  return (
    <View style={styles.container}>
      <View style={styles.leftPanel}>
        <Text style={styles.title}>Productos</Text>
        <ScrollView style={styles.productsGrid}>
          <Text style={styles.emptyText}>Productos aparecerán aquí</Text>
        </ScrollView>
      </View>

      <View style={styles.rightPanel}>
        <Text style={styles.title}>Carrito</Text>
        <FlatList
          data={cart}
          renderItem={({ item }) => (
            <View style={styles.cartItem}>
              <Text>{item.name}</Text>
              <Text>
                {item.quantity} x ${item.price}
              </Text>
            </View>
          )}
          keyExtractor={(item, index) => index.toString()}
          ListEmptyComponent={
            <Text style={styles.emptyCart}>Carrito vacío</Text>
          }
        />

        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalAmount}>Bs. {total.toFixed(2)}</Text>
        </View>

        <TouchableOpacity style={styles.checkoutButton}>
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
  },
  rightPanel: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderLeftWidth: 1,
    borderLeftColor: "#eee",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  productsGrid: {
    flex: 1,
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 40,
  },
  cartItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  emptyCart: {
    textAlign: "center",
    color: "#999",
    marginTop: 20,
  },
  totalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 2,
    borderTopColor: "#eee",
    marginTop: "auto",
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: "600",
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  checkoutButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
  },
  checkoutText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default POSScreen;
