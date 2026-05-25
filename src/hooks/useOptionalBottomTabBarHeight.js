import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { vs } from "../utils/responsive";

export const useOptionalBottomTabBarHeight = (fallback = 0) => {
  const insets = useSafeAreaInsets();
  const minimumFabClearanceBase = vs(56) + Math.max(insets.bottom, vs(16));

  try {
    return Math.max(useBottomTabBarHeight(), minimumFabClearanceBase, fallback);
  } catch {
    return Math.max(minimumFabClearanceBase, fallback);
  }
};

export default useOptionalBottomTabBarHeight;
