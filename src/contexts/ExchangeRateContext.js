import React, { createContext, useContext, useState, useEffect } from "react";
import {
  getCurrentRate,
  updateExchangeRate,
  autoUpdateRate,
  setManualRate as setManualExchangeRate,
} from "../services/exchange/rateService";

// Crear el contexto
const ExchangeRateContext = createContext();

// Provider del contexto
export const ExchangeRateProvider = ({ children }) => {
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Cargar tasa inicial
  useEffect(() => {
    loadCurrentRate();
  }, []);

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
      console.error("Error loading current rate:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Actualiza la tasa desde una fuente externa
   */
  const updateRate = async (source = "BCV") => {
    try {
      setLoading(true);
      setError(null);

      const updated = await updateExchangeRate(source);
      setRate(updated.rate);
      setLastUpdate(new Date(updated.updatedAt));

      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Establece una tasa manual
   */
  const setManualRate = async (manualRate) => {
    try {
      setLoading(true);
      setError(null);

      const updated = await setManualExchangeRate(manualRate);
      setRate(updated.rate);
      setLastUpdate(new Date(updated.updatedAt));

      console.log("Context updated - New rate:", updated.rate);

      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Actualiza el rate localmente sin tocar la BD
   */
  const updateRateLocal = (newRate) => {
    console.log("Updating rate locally:", newRate);
    setRate(newRate);
    setLastUpdate(new Date());
  };

  const value = {
    rate,
    loading,
    error,
    lastUpdate,
    updateRate,
    setManualRate,
    updateRateLocal,
    loadCurrentRate,
  };

  return (
    <ExchangeRateContext.Provider value={value}>
      {children}
    </ExchangeRateContext.Provider>
  );
};

// Hook para usar el contexto
export const useExchangeRateContext = () => {
  const context = useContext(ExchangeRateContext);
  if (!context) {
    throw new Error(
      "useExchangeRateContext must be used within an ExchangeRateProvider"
    );
  }
  return context;
};

// Mantener compatibilidad con el hook anterior
export const useExchangeRate = (settings = {}) => {
  const context = useExchangeRateContext();

  // Auto-actualización si está configurada
  useEffect(() => {
    if (!settings.autoUpdate) return;

    const interval = setInterval(() => {
      context.updateRate("BCV");
    }, (settings.updateInterval || 30) * 60 * 1000);

    return () => clearInterval(interval);
  }, [settings.autoUpdate, settings.updateInterval, context]);

  return context;
};
