import ExpoPasskeyModule from "expo-passkey/native";

export async function isPasskeySupported(): Promise<boolean> {
  return ExpoPasskeyModule.isPasskeySupported();
}

export async function startReg(options: any) {
  const credentialJson = await ExpoPasskeyModule.createPasskey({
    requestJson: JSON.stringify(options),
  });
  return JSON.parse(credentialJson);
}

export async function startAuth(options: any) {
  const credentialJson = await ExpoPasskeyModule.authenticateWithPasskey({
    requestJson: JSON.stringify(options),
  });
  return JSON.parse(credentialJson);
}
