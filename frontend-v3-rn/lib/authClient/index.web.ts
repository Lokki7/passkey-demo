import { createAuthClient } from "better-auth/react";
import { expoPasskeyClient } from "expo-passkey/web";
import { API_BASE_PATH, API_BASE_URL, RP_ID, STORAGE_PREFIX } from "../const";
import { onRequest } from "./utils";

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  basePath: API_BASE_PATH,
  plugins: [
    expoPasskeyClient({
      rpId: RP_ID, // Optional - auto-detected from window.location.hostname
      timeout: 60000, // Optional: WebAuthn operation timeout (default: 60000ms)
      storagePrefix: STORAGE_PREFIX,
    }),
  ],
  fetchOptions: {
    onRequest,
  },
});

export const {
  isPlatformAuthenticatorAvailable,
  registerPasskey,
  authenticateWithPasskey,
  listPasskeys,
  revokePasskey,
} = authClient;
