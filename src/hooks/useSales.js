import { useState, useEffect, useCallback } from "react";
import {
  getAllSales,
  getSaleById,
  insertSale,
  getTodaySales,
} from "../services/database/sales";

/**
 * Hook para gestionar ventas
 * @returns {object} Estado y funciones de ventas
 */
export const useSales = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [todayStats, setTodayStats] = useState({ count: 0, total: 0 });

  // Cargar ventas al montar
  useEffect(() => {
    loadSales();
    loadTodayStats();
  }, []);

  /**
   * Carga todas las ventas
   */
  const loadSales = async (limit = 100) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllSales(limit);
      setSales(data);
    } catch (err) {
      setError(err.message);
      console.error("Error loading sales:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Carga estadísticas del día
   */
  const loadTodayStats = async () => {
    try {
      const stats = await getTodaySales();
      setTodayStats(stats);
    } catch (err) {
      console.error("Error loading today stats:", err);
    }
  };

  /**
   * Registra una nueva venta
   */
  const registerSale = useCallback(async (sale, items) => {
    try {
      setError(null);
      const id = await insertSale(sale, items);
      await loadSales(); // Recargar lista
      await loadTodayStats(); // Actualizar estadísticas
      return id;
    } catch (err) {
      setError(err.message);
      console.error("Error registering sale:", err);
      throw err;
    }
  }, []);

  /**
   * Obtiene detalles de una venta
   */
  const getSaleDetails = useCallback(async (saleId) => {
    try {
      setError(null);
      return await getSaleById(saleId);
    } catch (err) {
      setError(err.message);
      console.error("Error getting sale details:", err);
      throw err;
    }
  }, []);

  /**
   * Calcula totales del período
   */
  const getPeriodTotals = useCallback(() => {
    const total = sales.reduce((sum, sale) => sum + sale.total, 0);
    const count = sales.length;
    const average = count > 0 ? total / count : 0;

    return { total, count, average };
  }, [sales]);

  return {
    sales,
    loading,
    error,
    todayStats,
    loadSales,
    loadTodayStats,
    registerSale,
    getSaleDetails,
    getPeriodTotals,
    refresh: loadSales,
  };
};

export default useSales;
