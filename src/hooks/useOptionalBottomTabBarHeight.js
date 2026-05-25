import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

export const useOptionalBottomTabBarHeight = (fallback = 0) => {
  try {
    return useBottomTabBarHeight();
  } catch {
    return fallback;
  }
};

export default useOptionalBottomTabBarHeight;
