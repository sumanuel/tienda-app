import { useState, useEffect, useCallback } from "react";
import {
  getAllProducts,
  searchProducts,
  insertProduct,
  updateProduct,
  deleteProduct,
} from "../services/database/products";
import { useExchangeRate } from "./useExchangeRate";

/**
 * Hook para gestionar productos
 * @returns {object} Estado y funciones de productos
 */
export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const { rate: exchangeRate } = useExchangeRate();

  // Cargar productos al montar
  useEffect(() => {
    loadProducts();
  }, []); // No incluir loadProducts para evitar loops

  // Recargar productos cuando cambie la tasa de cambio
  useEffect(() => {
    if (exchangeRate && products.length > 0) {
      console.log("Tasa de cambio cambió, recargando productos...");
      loadProducts();
    }
  }, [exchangeRate]);

  /**
   * Carga todos los productos
   */
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllProducts();
      console.log("Productos cargados:", data.length);
      setProducts(data);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error("Error loading products:", err);
      setError("Error al cargar productos");

      // Intentar reinicializar solo una vez
      if (retryCount === 0) {
        setRetryCount(1);
        console.log("Intentando reinicializar base de datos...");
        setTimeout(async () => {
          try {
            // Intentar reinicializar la base de datos
            const { initDatabase } = await import(
              "../services/database/products"
            );
            await initDatabase();
            loadProducts(); // Reintentar cargar
          } catch (initError) {
            console.error("Error reinicializando BD:", initError);
          }
        }, 1000);
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  /**
   * Busca productos por texto
   */
  const search = useCallback(async (query) => {
    try {
      setLoading(true);
      setError(null);
      const results = await searchProducts(query);
      setProducts(results);
    } catch (err) {
      setError(err.message);
      console.error("Error searching products:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Agrega un nuevo producto
   */
  const addProduct = useCallback(async (product) => {
    try {
      setError(null);
      console.log("Agregando producto:", product);
      const id = await insertProduct(product);
      console.log("Producto agregado con ID:", id);
      await loadProducts(); // Recargar lista
      return id;
    } catch (err) {
      setError(err.message);
      console.error("Error adding product:", err);
      throw err;
    }
  }, []);

  /**
   * Actualiza un producto existente
   */
  const editProduct = useCallback(async (id, product) => {
    try {
      setError(null);
      await updateProduct(id, product);
      await loadProducts(); // Recargar lista
    } catch (err) {
      setError(err.message);
      console.error("Error updating product:", err);
      throw err;
    }
  }, []);

  /**
   * Elimina un producto
   */
  const removeProduct = useCallback(async (id) => {
    try {
      setError(null);
      await deleteProduct(id);
      await loadProducts(); // Recargar lista
    } catch (err) {
      setError(err.message);
      console.error("Error deleting product:", err);
      throw err;
    }
  }, []);

  /**
   * Filtra productos por categoría
   */
  const filterByCategory = useCallback(
    (category) => {
      return products.filter((p) => p.category === category);
    },
    [products]
  );

  /**
   * Obtiene un producto por ID
   */
  const getById = useCallback(
    (id) => {
      return products.find((p) => p.id === id);
    },
    [products]
  );

  return {
    products,
    loading,
    error,
    loadProducts,
    search,
    addProduct,
    editProduct,
    removeProduct,
    filterByCategory,
    getById,
  };
};

export default useProducts;
