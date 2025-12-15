import { useState, useEffect, useCallback } from "react";
import {
  getAllAccountsReceivable,
  getAllAccountsPayable,
  getAccountsReceivableStats,
  getAccountsPayableStats,
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

  return {
    accountsReceivable,
    accountsPayable,
    receivableStats,
    payableStats,
    loading,
    error,
    loadAccounts,
    refresh,
  };
};

export default useAccounts;
