import ExpoPasskeyModule from "expo-passkey/native";

export async function isPasskeySupported(): Promise<boolean> {
  try {
    return ExpoPasskeyModule.isPasskeySupported();
  } catch {
    return false;
  }
}

export async function startReg(options: unknown) {
  const credentialJson = await ExpoPasskeyModule.createPasskey({
    requestJson: JSON.stringify(options),
  });
  return JSON.parse(credentialJson);
}

export async function startAuth(options: unknown) {
  const credentialJson = await ExpoPasskeyModule.authenticateWithPasskey({
    requestJson: JSON.stringify(options),
  });
  return JSON.parse(credentialJson);
}
