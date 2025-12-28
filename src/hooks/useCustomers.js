import { useState, useEffect, useCallback } from "react";
import {
  getAllCustomers,
  searchCustomers,
  getCustomerByDocumentNumber,
  createGenericCustomer,
  insertCustomer,
  updateCustomer,
  deleteCustomer,
  cleanDuplicateCustomers,
  recoverDeletedCustomers,
} from "../services/database/customers";

/**
 * Hook para gestionar clientes
 */
export const useCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllCustomers();
      setCustomers(data);
    } catch (err) {
      setError(err.message);
      console.error("Error loading customers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback(
    async (query) => {
      try {
        setError(null);
        if (!query.trim()) {
          await loadCustomers();
          return;
        }
        const data = await searchCustomers(query);
        setCustomers(data);
      } catch (err) {
        setError(err.message);
        console.error("Error searching customers:", err);
      }
    },
    [loadCustomers]
  );

  const getCustomerByDocument = useCallback(async (documentNumber) => {
    try {
      setError(null);
      const customer = await getCustomerByDocumentNumber(documentNumber);
      return customer;
    } catch (err) {
      setError(err.message);
      console.error("Error getting customer by document:", err);
      throw err;
    }
  }, []);

  const ensureGenericCustomer = useCallback(async () => {
    try {
      setError(null);
      const customerId = await createGenericCustomer();
      return customerId;
    } catch (err) {
      setError(err.message);
      console.error("Error creating generic customer:", err);
      throw err;
    }
  }, []);

  const addCustomer = useCallback(
    async (customerData) => {
      try {
        setError(null);

        // Verificar si ya existe un cliente con la misma cédula
        if (customerData.documentNumber && customerData.documentNumber.trim()) {
          const existingCustomer = await getCustomerByDocumentNumber(
            customerData.documentNumber.trim()
          );
          if (existingCustomer) {
            throw new Error(
              `Ya existe un cliente con la cédula ${customerData.documentNumber}`
            );
          }
        }

        const customerId = await insertCustomer(customerData);
        await loadCustomers();
        return customerId;
      } catch (err) {
        setError(err.message);
        console.error("Error adding customer:", err);
        throw err;
      }
    },
    [loadCustomers]
  );

  const editCustomer = useCallback(
    async (id, customerData) => {
      try {
        setError(null);
        await updateCustomer(id, customerData);
        await loadCustomers();
      } catch (err) {
        setError(err.message);
        console.error("Error editing customer:", err);
        throw err;
      }
    },
    [loadCustomers]
  );

  const removeCustomer = useCallback(
    async (id) => {
      try {
        setError(null);
        await deleteCustomer(id);
        await loadCustomers();
      } catch (err) {
        setError(err.message);
        console.error("Error removing customer:", err);
        throw err;
      }
    },
    [loadCustomers]
  );

  const getCustomerStats = useCallback(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.active !== 0).length;
    return { total, active };
  }, [customers]);

  const cleanDuplicates = useCallback(async () => {
    try {
      setError(null);
      const result = await cleanDuplicateCustomers();
      await loadCustomers();
      return result;
    } catch (err) {
      setError(err.message);
      console.error("Error cleaning duplicates:", err);
      throw err;
    }
  }, [loadCustomers]);

  const recoverDeleted = useCallback(async () => {
    try {
      setError(null);
      const recoveredCount = await recoverDeletedCustomers();
      await loadCustomers();
      return recoveredCount;
    } catch (err) {
      setError(err.message);
      console.error("Error recovering deleted customers:", err);
      throw err;
    }
  }, [loadCustomers]);

  return {
    customers,
    loading,
    error,
    loadCustomers,
    search,
    getCustomerByDocument,
    ensureGenericCustomer,
    addCustomer,
    editCustomer,
    removeCustomer,
    getCustomerStats,
    cleanDuplicates,
    recoverDeleted,
    refresh: loadCustomers,
  };
};

export default useCustomers;
