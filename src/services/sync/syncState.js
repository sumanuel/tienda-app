import AsyncStorage from "@react-native-async-storage/async-storage";
import { generateUuidV4 } from "../database/uuid";

const DEVICE_ID_KEY = "sync:deviceId";
const LAST_PULL_SINCE_KEY = "sync:lastPullSince";

export const getOrCreateDeviceId = async () => {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const deviceId = generateUuidV4();
  await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
};

export const getLastPullSince = async () => {
  const value = await AsyncStorage.getItem(LAST_PULL_SINCE_KEY);
  return value || "1970-01-01T00:00:00.000Z";
};

export const setLastPullSince = async (isoString) => {
  await AsyncStorage.setItem(LAST_PULL_SINCE_KEY, String(isoString));
};

export default {
  getOrCreateDeviceId,
  getLastPullSince,
  setLastPullSince,
};
