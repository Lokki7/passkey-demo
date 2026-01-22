import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import { expoPasskeyClient } from "expo-passkey/native";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_AUTH_BASE_URL,
  plugins: [
    expoClient({
      scheme: "your-app",
      storagePrefix: "your_app",
      storage: SecureStore,
    }),
    expoPasskeyClient({
      storagePrefix: "your_app",
      rpId: "example.com", // Recommended for native - prevents authentication errors
      timeout: 60000, // Optional: WebAuthn operation timeout (default: 60000ms)
    }),
    // ... other plugins
  ],
});

export const {
  registerPasskey,
  authenticateWithPasskey,
  listPasskeys,
  revokePasskey,
  isPasskeySupported,
  getBiometricInfo,
  getDeviceInfo,
} = authClient;
