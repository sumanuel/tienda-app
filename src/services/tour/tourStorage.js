import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_PREFIX = "tour:";

export async function hasSeenTour(tourId) {
  try {
    const value = await AsyncStorage.getItem(`${KEY_PREFIX}${tourId}`);
    return value === "1";
  } catch {
    return false;
  }
}

export async function markTourSeen(tourId) {
  try {
    await AsyncStorage.setItem(`${KEY_PREFIX}${tourId}`, "1");
  } catch {
    // noop
  }
}

export async function resetTour(tourId) {
  try {
    await AsyncStorage.removeItem(`${KEY_PREFIX}${tourId}`);
  } catch {
    // noop
  }
}
