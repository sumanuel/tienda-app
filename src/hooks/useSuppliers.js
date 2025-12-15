import { useState, useEffect, useCallback } from "react";
import {
  getAllSuppliers,
  searchSuppliers,
  insertSupplier,
  updateSupplier,
  deleteSupplier,
} from "../services/database/suppliers";

/**
 * Hook para gestionar proveedores
 */
export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllSuppliers();
      setSuppliers(data);
    } catch (err) {
      setError(err.message);
      console.error("Error loading suppliers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback(
    async (query) => {
      try {
        setError(null);
        if (!query.trim()) {
          await loadSuppliers();
          return;
        }
        const data = await searchSuppliers(query);
        setSuppliers(data);
      } catch (err) {
        setError(err.message);
        console.error("Error searching suppliers:", err);
      }
    },
    [loadSuppliers]
  );

  const addSupplier = useCallback(
    async (supplierData) => {
      try {
        setError(null);
        await insertSupplier(supplierData);
        await loadSuppliers();
      } catch (err) {
        setError(err.message);
        console.error("Error adding supplier:", err);
        throw err;
      }
    },
    [loadSuppliers]
  );

  const editSupplier = useCallback(
    async (id, supplierData) => {
      try {
        setError(null);
        await updateSupplier(id, supplierData);
        await loadSuppliers();
      } catch (err) {
        setError(err.message);
        console.error("Error editing supplier:", err);
        throw err;
      }
    },
    [loadSuppliers]
  );

  const removeSupplier = useCallback(
    async (id) => {
      try {
        setError(null);
        await deleteSupplier(id);
        await loadSuppliers();
      } catch (err) {
        setError(err.message);
        console.error("Error removing supplier:", err);
        throw err;
      }
    },
    [loadSuppliers]
  );

  const getSupplierStats = useCallback(() => {
    const total = suppliers.length;
    const active = suppliers.filter((s) => s.active !== 0).length;
    return { total, active };
  }, [suppliers]);

  return {
    suppliers,
    loading,
    error,
    loadSuppliers,
    search,
    addSupplier,
    editSupplier,
    removeSupplier,
    getSupplierStats,
    refresh: loadSuppliers,
  };
};

export default useSuppliers;
