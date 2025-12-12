import { useState, useEffect, useCallback } from "react";
import {
  getAllProducts,
  searchProducts,
  insertProduct,
  updateProduct,
  deleteProduct,
} from "../services/database/products";

/**
 * Hook para gestionar productos
 * @returns {object} Estado y funciones de productos
 */
export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar productos al montar
  useEffect(() => {
    loadProducts();
  }, []);

  /**
   * Carga todos los productos
   */
  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllProducts();
      setProducts(data);
    } catch (err) {
      setError(err.message);
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  };

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
      const id = await insertProduct(product);
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
