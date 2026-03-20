import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
} from "react";
import { getRateNotificationsCount } from "../services/database/rateNotifications";

const RateNotificationsContext = createContext(null);

export const RateNotificationsProvider = ({ children }) => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshCount = useCallback(async () => {
    try {
      setLoading(true);
      const next = await getRateNotificationsCount();
      setCount(next);
    } catch (error) {
      console.warn("Error refreshing rate notifications count:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  const value = {
    count,
    loading,
    refreshCount,
  };

  return (
    <RateNotificationsContext.Provider value={value}>
      {children}
    </RateNotificationsContext.Provider>
  );
};

export const useRateNotifications = () => {
  const ctx = useContext(RateNotificationsContext);
  if (!ctx) {
    throw new Error(
      "useRateNotifications must be used within a RateNotificationsProvider",
    );
  }
  return ctx;
};
