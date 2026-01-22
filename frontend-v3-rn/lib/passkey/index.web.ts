import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";

export async function isPasskeySupported(): Promise<boolean> {
  if (!browserSupportsWebAuthn()) return false;

  try {
    return await platformAuthenticatorIsAvailable();
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
