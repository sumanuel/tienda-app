import React, { createContext, useContext, useState, useEffect } from "react";
import {
  getCurrentRate,
  updateExchangeRate,
  autoUpdateRate,
  setManualRate as setManualExchangeRate,
} from "../services/exchange/rateService";
import { updateReceivableAmountsOnRateChange } from "../services/database/accounts";

// Crear el contexto
const ExchangeRateContext = createContext();

// Provider del contexto
export const ExchangeRateProvider = ({ children }) => {
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Cargar tasa inicial con un pequeño delay para asegurar que las tablas existan
  useEffect(() => {
    const timer = setTimeout(() => {
      loadCurrentRate();
    }, 100);
    return () => clearTimeout(timer);
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
        // console.log("Loaded rate from DB:", currentRate.rate);
        setRate(currentRate.rate);
        setLastUpdate(new Date(currentRate.createdAt));
      } else {
        console.log("No rate found in DB, using default");
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

      // Recalcular cuentas por cobrar originadas en ventas
      try {
        await updateReceivableAmountsOnRateChange(Number(updated.rate) || 0);
      } catch (recalcError) {
        console.warn(
          "Error recalculating receivables on rate update:",
          recalcError
        );
      }

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

      // Recalcular cuentas por cobrar originadas en ventas
      try {
        await updateReceivableAmountsOnRateChange(Number(updated.rate) || 0);
      } catch (recalcError) {
        console.warn(
          "Error recalculating receivables on manual rate:",
          recalcError
        );
      }

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
