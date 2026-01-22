import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import { expoPasskeyClient } from "expo-passkey/native";
import * as SecureStore from "expo-secure-store";
import { RP_ID, STORAGE_PREFIX } from "../const";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_AUTH_BASE_URL,
  plugins: [
    expoClient({
      scheme: "frontrn",
      storagePrefix: STORAGE_PREFIX,
      storage: SecureStore,
    }),
    expoPasskeyClient({
      storagePrefix: STORAGE_PREFIX,
      rpId: RP_ID, // Recommended for native - prevents authentication errors
      timeout: 60000, // Optional: WebAuthn operation timeout (default: 60000ms)
    }),
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
