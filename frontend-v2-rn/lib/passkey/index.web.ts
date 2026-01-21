import {
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import {
  isPlatformAuthenticatorAvailable,
  isWebAuthnSupportedInBrowser,
} from "expo-passkey/web";

export async function isPasskeySupported(): Promise<boolean> {
  if (!isWebAuthnSupportedInBrowser()) return false;

  try {
    return await isPlatformAuthenticatorAvailable();
  } catch {
    // Some browsers throw; if WebAuthn exists, consider it supported.
    return true;
  }
}

export async function startReg(options: any) {
  return startRegistration(options);
}

export async function startAuth(options: any) {
  return startAuthentication(options);
}
