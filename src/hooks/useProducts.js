import { useState, useEffect, useCallback, useRef } from "react";
import {
  getAllProducts,
  searchProducts,
  insertProduct,
  updateProduct,
  deleteProduct,
} from "../services/database/products";
import { requestCloudSync } from "../services/firebase/firestoreSync";

/**
 * Hook para gestionar productos
 * @returns {object} Estado y funciones de productos
 */
export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  /**
   * Carga todos los productos
   */
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllProducts();
      console.log("Productos cargados:", data.length);

      // Asignar barcodes por defecto si no tienen
      const productsToUpdate = data.filter((p) => !p.barcode);
      if (productsToUpdate.length > 0) {
        console.log("Asignando barcodes a productos sin barcode...");
        for (const product of productsToUpdate) {
          await updateProduct(product.id, {
            ...product,
            barcode: `PROD-${product.id}`,
          });
        }
        // Recargar después de actualizar
        const updatedData = await getAllProducts();
        setProducts(updatedData);
      } else {
        setProducts(data);
      }

      retryCountRef.current = 0;
    } catch (err) {
      console.error("Error loading products:", err);
      setError("Error al cargar productos");

      if (retryCountRef.current === 0) {
        retryCountRef.current = 1;
        console.log("Intentando reinicializar base de datos...");

        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }

        retryTimeoutRef.current = setTimeout(async () => {
          try {
            const { initDatabase } =
              await import("../services/database/products");
            await initDatabase();
            await loadProducts();
          } catch (initError) {
            console.error("Error reinicializando BD:", initError);
          }
        }, 1000);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar productos al montar
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

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
  const addProduct = useCallback(
    async (product) => {
      try {
        setError(null);
        console.log("Agregando producto:", product);
        const id = await insertProduct(product);
        console.log("Producto agregado con ID:", id);
        await loadProducts(); // Recargar lista
        requestCloudSync("products:add");
        return id;
      } catch (err) {
        setError(err.message);
        console.error("Error adding product:", err);
        throw err;
      }
    },
    [loadProducts],
  );

  /**
   * Actualiza un producto existente
   */
  const editProduct = useCallback(
    async (id, product) => {
      try {
        setError(null);
        await updateProduct(id, product);
        await loadProducts(); // Recargar lista
        requestCloudSync("products:edit");
      } catch (err) {
        setError(err.message);
        console.error("Error updating product:", err);
        throw err;
      }
    },
    [loadProducts],
  );

  /**
   * Elimina un producto
   */
  const removeProduct = useCallback(
    async (id) => {
      try {
        setError(null);
        await deleteProduct(id);
        await loadProducts(); // Recargar lista
        requestCloudSync("products:remove");
      } catch (err) {
        setError(err.message);
        console.error("Error deleting product:", err);
        throw err;
      }
    },
    [loadProducts],
  );

  /**
   * Filtra productos por categoría
   */
  const filterByCategory = useCallback(
    (category) => {
      return products.filter((p) => p.category === category);
    },
    [products],
  );

  /**
   * Obtiene un producto por ID
   */
  const getById = useCallback(
    (id) => {
      return products.find((p) => p.id === id);
    },
    [products],
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
