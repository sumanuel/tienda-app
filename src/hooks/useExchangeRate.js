import { useState, useEffect, useCallback } from "react";
import {
  getCurrentRate,
  updateExchangeRate,
  autoUpdateRate,
  setManualRate as setManualExchangeRate,
} from "../services/exchange/rateService";
import { updateAllPricesWithExchangeRate } from "../services/database/products";

/**
 * Hook personalizado para gestionar la tasa de cambio
 * @param {object} settings - Configuración de actualización
 * @returns {object} Estado y funciones de tasa de cambio
 */
export const useExchangeRate = (settings = {}) => {
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Cargar tasa inicial
  useEffect(() => {
    loadCurrentRate();
  }, []);

  // Auto-actualización
  useEffect(() => {
    if (!settings.autoUpdate) return;

    const interval = setInterval(() => {
      handleAutoUpdate();
    }, (settings.updateInterval || 30) * 60 * 1000); // Convertir minutos a milisegundos

    return () => clearInterval(interval);
  }, [settings.autoUpdate, settings.updateInterval]);

  /**
   * Carga la tasa actual de la base de datos
   */
  const loadCurrentRate = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentRate = await getCurrentRate();

      if (currentRate) {
        setRate(currentRate.rate);
        setLastUpdate(new Date(currentRate.createdAt));
      }
    } catch (err) {
      setError(err.message);
      console.error("Error loading exchange rate:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Actualiza la tasa manualmente desde una fuente
   */
  const updateRate = useCallback(async (source = "BCV") => {
    try {
      setLoading(true);
      setError(null);

      const updated = await updateExchangeRate(source);
      setRate(updated.rate);
      setLastUpdate(new Date(updated.updatedAt));

      return updated;
    } catch (err) {
      setError(err.message);
      console.error("Error updating exchange rate:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Auto-actualización inteligente
   */
  const handleAutoUpdate = async () => {
    try {
      const updated = await autoUpdateRate(settings);

      if (updated) {
        setRate(updated.rate);
        setLastUpdate(new Date(updated.updatedAt));
      }
    } catch (err) {
      console.error("Error auto-updating rate:", err);
    }
  };

  /**
   * Establece una tasa manual
   */
  const setManualRate = useCallback(async (manualRate) => {
    try {
      setLoading(true);
      setError(null);

      const updated = await setManualExchangeRate(manualRate);
      setRate(updated.rate);
      setLastUpdate(new Date(updated.updatedAt));

      // Actualizar automáticamente todos los precios de productos
      try {
        const updatedProductsCount = await updateAllPricesWithExchangeRate(
          manualRate
        );
        console.log(
          `Precios de ${updatedProductsCount} productos actualizados con nueva tasa`
        );
      } catch (priceUpdateError) {
        console.error(
          "Error actualizando precios de productos:",
          priceUpdateError
        );
        // No fallar la operación completa si hay error en precios
      }

      return updated;
    } catch (err) {
      setError(err.message);
      console.error("Error setting manual rate:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    rate,
    loading,
    error,
    lastUpdate,
    updateRate,
    setManualRate,
    refresh: loadCurrentRate,
  };
};

export default useExchangeRate;
