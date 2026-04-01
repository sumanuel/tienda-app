import { getApp, getApps, initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCYjQTcuAtwF4BEc2S42SWw9kgSTvNVJic",
  authDomain: "t-suma.firebaseapp.com",
  projectId: "t-suma",
  storageBucket: "t-suma.firebasestorage.app",
  messagingSenderId: "509329688513",
  appId: "1:509329688513:android:83de432c8325419603d140",
};

export const firebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(firebaseApp, {
    experimentalAutoDetectLongPolling: true,
    ignoreUndefinedProperties: true,
  });
} catch (error) {
  firestoreInstance = getFirestore(firebaseApp);
}

export const firestore = firestoreInstance;

let authInstance;
try {
  authInstance = initializeAuth(firebaseApp, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  const { getAuth } = require("firebase/auth");
  authInstance = getAuth(firebaseApp);
}

export const auth = authInstance;
