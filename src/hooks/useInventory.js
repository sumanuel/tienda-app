import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getAllProducts,
  updateProductStock,
  getLowStockProducts,
} from "../services/database/products";
import {
  getLowStockProducts as getLowStock,
  getOutOfStockProducts,
  calculateInventoryValue,
} from "../utils/inventoryAlerts";

/**
 * Hook para gestionar inventario
 * @returns {object} Estado y funciones de inventario
 */
export const useInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [outOfStockItems, setOutOfStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const products = await getAllProducts();
      setInventory(products);

      const lowStock = getLowStock(products, 10);
      const outOfStock = getOutOfStockProducts(products);

      setLowStockItems(lowStock);
      setOutOfStockItems(outOfStock);
    } catch (err) {
      setError(err.message);
      console.error("Error loading inventory:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar inventario al montar
  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  /**
   * Carga todo el inventario
   */
  const stats = useMemo(() => {
    const totalValue = calculateInventoryValue(inventory);
    const totalItems = inventory.reduce((sum, p) => sum + p.stock, 0);

    return {
      totalValue,
      totalItems,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
    };
  }, [inventory, lowStockItems, outOfStockItems]);

  /**
   * Actualiza el stock de un producto
   */
  const updateStock = useCallback(
    async (productId, newStock) => {
      try {
        setError(null);
        await updateProductStock(productId, newStock);
        await loadInventory(); // Recargar inventario
      } catch (err) {
        setError(err.message);
        console.error("Error updating stock:", err);
        throw err;
      }
    },
    [loadInventory],
  );

  /**
   * Ajusta el stock (suma o resta)
   */
  const adjustStock = useCallback(
    async (productId, adjustment) => {
      try {
        const product = inventory.find((p) => p.id === productId);
        if (!product) throw new Error("Product not found");

        const newStock = product.stock + adjustment;
        if (newStock < 0) throw new Error("Stock cannot be negative");

        await updateStock(productId, newStock);
      } catch (err) {
        setError(err.message);
        console.error("Error adjusting stock:", err);
        throw err;
      }
    },
    [inventory, updateStock],
  );

  /**
   * Reduce el stock después de una venta
   */
  const reduceStock = useCallback(
    async (items) => {
      try {
        setError(null);

        for (const item of items) {
          await adjustStock(item.productId, -item.quantity);
        }
      } catch (err) {
        setError(err.message);
        console.error("Error reducing stock:", err);
        throw err;
      }
    },
    [adjustStock],
  );

  /**
   * Obtiene alertas de inventario
   */
  const getAlerts = useCallback(() => {
    return {
      lowStock: lowStockItems,
      outOfStock: outOfStockItems,
      total: lowStockItems.length + outOfStockItems.length,
    };
  }, [lowStockItems, outOfStockItems]);

  return {
    inventory,
    lowStockItems,
    outOfStockItems,
    loading,
    error,
    stats,
    loadInventory,
    updateStock,
    adjustStock,
    reduceStock,
    getAlerts,
    refresh: loadInventory,
  };
};

export default useInventory;
