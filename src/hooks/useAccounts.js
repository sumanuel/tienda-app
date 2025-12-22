import { useState, useEffect, useCallback } from "react";
import {
  getAllAccountsReceivable,
  getAllAccountsPayable,
  getAccountsReceivableStats,
  getAccountsPayableStats,
  createAccountReceivable,
  createAccountPayable,
  updateAccountReceivable,
  updateAccountPayable,
  markAccountReceivableAsPaid,
  markAccountPayableAsPaid,
  deleteAccountReceivable,
  deleteAccountPayable,
  searchAccountsReceivable,
  searchAccountsPayable,
  recordAccountPayment,
  getAccountPayments,
  getAccountBalance,
  fixCorruptedAccountData as fixAccountDecimalPrecision,
  fixCorruptedAccountData,
} from "../services/database/accounts";

/**
 * Hook para gestionar cuentas por cobrar y pagar
 */
export const useAccounts = () => {
  const [accountsReceivable, setAccountsReceivable] = useState([]);
  const [accountsPayable, setAccountsPayable] = useState([]);
  const [receivableStats, setReceivableStats] = useState({
    total: 0,
    pending: 0,
    overdue: 0,
    totalAmount: 0,
  });
  const [payableStats, setPayableStats] = useState({
    total: 0,
    pending: 0,
    overdue: 0,
    totalAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Corregir precisión decimal y valores negativos
      try {
        console.log("Corrigiendo precisión decimal en cuentas existentes...");
        await fixAccountDecimalPrecision();

        // También corregir datos potencialmente corruptos
        await fixCorruptedAccountData();
      } catch (fixError) {
        console.warn("Error fixing data:", fixError);
      }

      const [receivable, payable, receivableStatsData, payableStatsData] =
        await Promise.all([
          getAllAccountsReceivable(),
          getAllAccountsPayable(),
          getAccountsReceivableStats(),
          getAccountsPayableStats(),
        ]);

      setAccountsReceivable(receivable);
      setAccountsPayable(payable);
      setReceivableStats(receivableStatsData);
      setPayableStats(payableStatsData);
    } catch (err) {
      setError(err.message);
      console.error("Error loading accounts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadAccounts();
  }, [loadAccounts]);

  // CRUD functions for accounts receivable
  const addAccountReceivable = useCallback(
    async (accountData) => {
      try {
        await createAccountReceivable(accountData);
        await refresh();
      } catch (error) {
        throw error;
      }
    },
    [refresh]
  );

  const editAccountReceivable = useCallback(
    async (id, accountData) => {
      try {
        await updateAccountReceivable(id, accountData);
        await refresh();
      } catch (error) {
        throw error;
      }
    },
    [refresh]
  );

  const removeAccountReceivable = useCallback(
    async (id) => {
      try {
        await deleteAccountReceivable(id);
        await refresh();
      } catch (error) {
        throw error;
      }
    },
    [refresh]
  );

  const markReceivableAsPaid = useCallback(
    async (id) => {
      try {
        await markAccountReceivableAsPaid(id);
        await refresh();
      } catch (error) {
        throw error;
      }
    },
    [refresh]
  );

  const searchReceivable = useCallback(
    async (query) => {
      try {
        setError(null);
        if (!query.trim()) {
          await loadAccounts();
          return;
        }
        const data = await searchAccountsReceivable(query);
        setAccountsReceivable(data);
      } catch (err) {
        setError(err.message);
        console.error("Error searching accounts receivable:", err);
      }
    },
    [loadAccounts]
  );

  const searchPayable = useCallback(
    async (query) => {
      try {
        setError(null);
        if (!query.trim()) {
          await loadAccounts();
          return;
        }
        const data = await searchAccountsPayable(query);
        setAccountsPayable(data);
      } catch (err) {
        setError(err.message);
        console.error("Error searching accounts payable:", err);
      }
    },
    [loadAccounts]
  );

  // CRUD functions for accounts payable
  const addAccountPayable = useCallback(
    async (accountData) => {
      try {
        await createAccountPayable(accountData);
        await refresh();
      } catch (error) {
        throw error;
      }
    },
    [refresh]
  );

  const editAccountPayable = useCallback(
    async (id, accountData) => {
      try {
        await updateAccountPayable(id, accountData);
        await refresh();
      } catch (error) {
        throw error;
      }
    },
    [refresh]
  );

  const removeAccountPayable = useCallback(
    async (id) => {
      try {
        await deleteAccountPayable(id);
        await refresh();
      } catch (error) {
        throw error;
      }
    },
    [refresh]
  );

  const markPayableAsPaid = useCallback(
    async (id) => {
      try {
        await markAccountPayableAsPaid(id);
        await refresh();
      } catch (error) {
        throw error;
      }
    },
    [refresh]
  );

  const recordPayment = useCallback(
    async (accountId, paymentData, accountType = "receivable") => {
      try {
        await recordAccountPayment(accountId, paymentData, accountType);
        await refresh();
      } catch (error) {
        throw error;
      }
    },
    [refresh]
  );

  const getPayments = useCallback(
    async (accountId, accountType = "receivable") => {
      try {
        return await getAccountPayments(accountId, accountType);
      } catch (error) {
        throw error;
      }
    },
    []
  );

  const getBalance = useCallback(
    async (accountId, accountType = "receivable") => {
      try {
        return await getAccountBalance(accountId, accountType);
      } catch (error) {
        throw error;
      }
    },
    []
  );

  return {
    accountsReceivable,
    accountsPayable,
    receivableStats,
    payableStats,
    loading,
    error,
    loadAccounts,
    refresh,
    searchReceivable,
    searchPayable,
    // Accounts receivable CRUD
    addAccountReceivable,
    editAccountReceivable,
    removeAccountReceivable,
    markReceivableAsPaid,
    // Payment management
    recordPayment,
    getPayments,
    getBalance,
    // Accounts payable CRUD
    addAccountPayable,
    editAccountPayable,
    removeAccountPayable,
    markPayableAsPaid,
  };
};

export default useAccounts;
