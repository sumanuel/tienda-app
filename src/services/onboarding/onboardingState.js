import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firestore } from "../firebase/firebase";

const LEGACY_ONBOARDING_COMPLETED_KEY = "onboardingCompleted";
const LEGACY_ONBOARDING_SLIDES_SEEN_KEY = "onboardingSlidesSeen";

export const getOnboardingCompletedKey = (uid) =>
  `onboardingCompleted:${String(uid || "anon").trim() || "anon"}`;

export const getOnboardingSlidesSeenKey = (uid) =>
  `onboardingSlidesSeen:${String(uid || "anon").trim() || "anon"}`;

const toBool = (value) =>
  String(value || "")
    .trim()
    .toLowerCase() === "true";

const getUserOnboardingDoc = async (uid) => {
  const normalizedUid = String(uid || "").trim();
  if (!normalizedUid) {
    return null;
  }

  try {
    const snapshot = await getDoc(doc(firestore, "users", normalizedUid));
    return snapshot.exists() ? snapshot.data() || {} : null;
  } catch (error) {
    console.warn("Error reading onboarding state from Firestore:", error);
    return null;
  }
};

export const getOnboardingState = async (uid) => {
  const [completedLocal, slidesSeenLocal, completedLegacy, slidesSeenLegacy] =
    await Promise.all([
      AsyncStorage.getItem(getOnboardingCompletedKey(uid)),
      AsyncStorage.getItem(getOnboardingSlidesSeenKey(uid)),
      AsyncStorage.getItem(LEGACY_ONBOARDING_COMPLETED_KEY),
      AsyncStorage.getItem(LEGACY_ONBOARDING_SLIDES_SEEN_KEY),
    ]);

  const cloudData = await getUserOnboardingDoc(uid);
  const cloudOnboarding = cloudData?.onboarding || {};

  const completed =
    toBool(completedLocal) ||
    toBool(completedLegacy) ||
    Boolean(cloudOnboarding.completed);
  const slidesSeen =
    toBool(slidesSeenLocal) ||
    toBool(slidesSeenLegacy) ||
    Boolean(cloudOnboarding.slidesSeen);

  return {
    completed,
    slidesSeen,
    hasLocalCompleted: toBool(completedLocal),
    hasLocalSlidesSeen: toBool(slidesSeenLocal),
    hasLegacyCompleted: toBool(completedLegacy),
    hasLegacySlidesSeen: toBool(slidesSeenLegacy),
    hasCloudCompleted: Boolean(cloudOnboarding.completed),
    hasCloudSlidesSeen: Boolean(cloudOnboarding.slidesSeen),
  };
};

export const saveOnboardingState = async (
  uid,
  { completed, slidesSeen } = {},
) => {
  const completedValue = completed ? "true" : "false";
  const slidesSeenValue = slidesSeen ? "true" : "false";

  await Promise.all([
    AsyncStorage.setItem(getOnboardingCompletedKey(uid), completedValue),
    AsyncStorage.setItem(getOnboardingSlidesSeenKey(uid), slidesSeenValue),
    AsyncStorage.setItem(LEGACY_ONBOARDING_COMPLETED_KEY, completedValue),
    AsyncStorage.setItem(LEGACY_ONBOARDING_SLIDES_SEEN_KEY, slidesSeenValue),
  ]);

  const normalizedUid = String(uid || "").trim();
  if (!normalizedUid) {
    return;
  }

  try {
    await setDoc(
      doc(firestore, "users", normalizedUid),
      {
        onboarding: {
          completed: Boolean(completed),
          slidesSeen: Boolean(slidesSeen),
          updatedAt: serverTimestamp(),
        },
      },
      { merge: true },
    );
  } catch (error) {
    console.warn("Error writing onboarding state to Firestore:", error);
  }
};

export const clearOnboardingState = async (uid) => {
  await Promise.all([
    AsyncStorage.removeItem(getOnboardingCompletedKey(uid)),
    AsyncStorage.removeItem(getOnboardingSlidesSeenKey(uid)),
    AsyncStorage.removeItem(LEGACY_ONBOARDING_COMPLETED_KEY),
    AsyncStorage.removeItem(LEGACY_ONBOARDING_SLIDES_SEEN_KEY),
  ]);

  const normalizedUid = String(uid || "").trim();
  if (!normalizedUid) {
    return;
  }

  try {
    await setDoc(
      doc(firestore, "users", normalizedUid),
      {
        onboarding: {
          completed: false,
          slidesSeen: false,
          updatedAt: serverTimestamp(),
        },
      },
      { merge: true },
    );
  } catch (error) {
    console.warn("Error clearing onboarding state in Firestore:", error);
  }
};
