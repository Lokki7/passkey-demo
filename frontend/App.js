import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { createAuthClient } from "better-auth/react";
const { expoPasskeyClient: expoPasskeyClient } =
  Platform.OS === "web"
    ? require("expo-passkey/web")
    : require("expo-passkey/native");
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000";
const RP_ID = process.env.EXPO_PUBLIC_RP_ID || "localhost";

let currentUserIdForHeaders = null;

const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  basePath: "/api/passkey",
  plugins: [
    expoPasskeyClient({
      storagePrefix: "passkey_demo",
      rpId: RP_ID,
    }),
  ],
  fetchOptions: {
    onRequest: (context) => {
      if (currentUserIdForHeaders) {
        const headers =
          context.headers instanceof Headers
            ? new Headers(context.headers)
            : new Headers(context.headers || {});
        headers.set("x-user-id", currentUserIdForHeaders);
        context.headers = headers;
      }
      return context;
    },
  },
});

function formatError(error) {
  if (!error) {
    return "Unknown error";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return error.message || error.statusText || "Unknown error";
}


export default function App() {
  const [username, setUsername] = useState("");
  const [logs, setLogs] = useState([]);
  const [isBusy, setIsBusy] = useState(false);

  const log = (message) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${message}`, ...prev].slice(0, 200));
  };

  const ensureSession = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      throw new Error("Введите username.");
    }
    const user = {
      id: trimmed.toLowerCase(),
      name: trimmed,
      displayName: trimmed,
    };
    currentUserIdForHeaders = user.id;
    return user;
  };

  const handleRegisterPasskey = async () => {
    try {
      setIsBusy(true);
      log("Готовим регистрацию passkey...");
      const user = await ensureSession();
      if (!user) {
        throw new Error("Нет пользователя для регистрации.");
      }
      const response = await authClient.registerPasskey({
        userId: user.id,
        userName: user.name,
        displayName: user.displayName,
        rpId: RP_ID,
        rpName: "Passkey Demo",
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          residentKey: "required",
          userVerification: "required",
        },
      });

      if (response.error) {
        throw new Error(formatError(response.error));
      }
      log(`Passkey зарегистрирован (${response.data?.rpId || RP_ID}).`);
    } catch (error) {
      log(`Ошибка регистрации: ${formatError(error)}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirmOperation = async () => {
    try {
      setIsBusy(true);
      log("Подтверждаем операцию через passkey...");
      const user = await ensureSession();
      if (!user) {
        throw new Error("Не удалось получить пользователя.");
      }
      const response = await authClient.authenticateWithPasskey({
        userId: user.id,
        rpId: RP_ID,
      });
      if (response.error) {
        throw new Error(formatError(response.error));
      }
      log("Операция подтверждена через passkey.");
    } catch (error) {
      log(`Ошибка 2FA: ${formatError(error)}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Passkey Demo (Expo + Better Auth)</Text>
      <Text style={styles.subtitle}>
        Backend: {API_BASE_URL} · RP ID: {RP_ID}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        autoCapitalize="none"
        onChangeText={setUsername}
      />

      <View style={styles.actions}>
        <ActionButton
          label="Зарегистрировать passkey"
          onPress={handleRegisterPasskey}
          disabled={isBusy}
        />
        <ActionButton
          label="Подтвердить операцию (2FA)"
          onPress={handleConfirmOperation}
          disabled={isBusy}
        />
      </View>

      <ScrollView style={styles.log} contentContainerStyle={styles.logContent}>
        {logs.map((entry, index) => (
          <Text key={`${entry}-${index}`} style={styles.logLine}>
            {entry}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

function ActionButton({ label, onPress, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, disabled && styles.buttonDisabled]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 64,
    paddingHorizontal: 20,
    backgroundColor: "#0b0c10",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#9aa4b2",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#1d1f27",
    color: "#ffffff",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a2f3a",
    marginBottom: 16,
  },
  actions: {
    gap: 10,
    marginBottom: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#3f7cff",
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  log: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2f3a",
    backgroundColor: "#0f1117",
  },
  logContent: {
    padding: 12,
  },
  logLine: {
    color: "#9aa4b2",
    fontSize: 12,
    marginBottom: 6,
  },
});
