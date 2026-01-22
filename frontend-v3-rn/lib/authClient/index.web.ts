import { createAuthClient } from "better-auth/react";
import { expoPasskeyClient } from "expo-passkey/web";
import {
  API_BASE_PATH,
  API_BASE_URL,
  currentUserIdForHeaders,
  RP_ID,
  STORAGE_PREFIX,
} from "../const";

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
    onRequest: (context) => {
      console.log("fetchOptions=", currentUserIdForHeaders);
      if (currentUserIdForHeaders) {
        const headers =
          context.headers instanceof Headers
            ? new Headers(context.headers)
            : new Headers(context.headers || {});
        if (currentUserIdForHeaders) {
          headers.set("x-user-id", currentUserIdForHeaders);
        } else {
          headers.delete("x-user-id");
        }
        context.headers = headers;
      }
      return context;
    },
  },
});

export const {
  isPlatformAuthenticatorAvailable,
  registerPasskey,
  authenticateWithPasskey,
  listPasskeys,
  revokePasskey,
} = authClient;
