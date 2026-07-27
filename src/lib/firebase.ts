import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

let cachedAuth: Auth | null = null;
let cachedProvider: GoogleAuthProvider | null = null;

export function getFirebaseAuth() {
  if (cachedAuth && cachedProvider) {
    return {
      auth: cachedAuth,
      provider: cachedProvider,
    };
  }

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const missingValues = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingValues.length > 0) {
    throw new Error(`Missing Firebase config: ${missingValues.join(", ")}`);
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  cachedAuth = getAuth(app);
  cachedProvider = new GoogleAuthProvider();

  return {
    auth: cachedAuth,
    provider: cachedProvider,
  };
}
