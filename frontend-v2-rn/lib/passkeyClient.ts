import { Platform } from "react-native";

export async function isPasskeySupported(): Promise<boolean> {
  if (Platform.OS === "web") {
    const mod = await import("./passkey.web");
    return mod.isPasskeySupported();
  }
  const mod = await import("./passkey.native");
  return mod.isPasskeySupported();
}

export async function startReg(options: any) {
  if (Platform.OS === "web") {
    const mod = await import("./passkey.web");
    return mod.startReg(options);
  }
  const mod = await import("./passkey.native");
  return mod.startReg(options);
}

export async function startAuth(options: any) {
  if (Platform.OS === "web") {
    const mod = await import("./passkey.web");
    return mod.startAuth(options);
  }
  const mod = await import("./passkey.native");
  return mod.startAuth(options);
}
