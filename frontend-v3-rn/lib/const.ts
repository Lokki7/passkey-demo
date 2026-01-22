export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";
export const API_BASE_PATH = "/api/passkey";
export const RP_ID = process.env.EXPO_PUBLIC_RP_ID || "localhost";
export const STORAGE_PREFIX = "passkey_demo";

// заглушка
export let currentUserIdForHeaders: string | null = null;
export function setCurrentUserIdForHeaders(userId: string | null) {
  currentUserIdForHeaders = userId;
}
