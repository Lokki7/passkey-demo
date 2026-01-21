type ExpoPasskeyModuleType = {
  isPasskeySupported(): boolean;
  createPasskey(options: { requestJson: string }): Promise<string>;
  authenticateWithPasskey(options: { requestJson: string }): Promise<string>;
};

async function getNativeModule(): Promise<ExpoPasskeyModuleType> {
  try {
    const mod = await import("expo-passkey/native");
    return mod.default as ExpoPasskeyModuleType;
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    throw new Error(
      `ExpoPasskey native module is unavailable. ` +
        `This usually means you're running in Expo Go or haven't built a dev client. ` +
        `Original error: ${msg}`,
    );
  }
}

export async function isPasskeySupported(): Promise<boolean> {
  try {
    const m = await getNativeModule();
    return m.isPasskeySupported();
  } catch {
    return false;
  }
}

export async function startReg(options: any) {
  const m = await getNativeModule();
  const credentialJson = await m.createPasskey({
    requestJson: JSON.stringify(options),
  });
  return JSON.parse(credentialJson);
}

export async function startAuth(options: any) {
  const m = await getNativeModule();
  const credentialJson = await m.authenticateWithPasskey({
    requestJson: JSON.stringify(options),
  });
  return JSON.parse(credentialJson);
}
