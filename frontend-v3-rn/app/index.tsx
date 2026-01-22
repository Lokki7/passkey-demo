import { useState } from "react";
import {
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { RP_ID, setCurrentUserIdForHeaders } from "@/lib/const";
import { authClient } from "@/lib/authClient/index";

function formatError(error: unknown) {
  if (!error) {
    return "Unknown error";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object") {
    const maybe = error as { message?: unknown; statusText?: unknown };
    if (typeof maybe.message === "string" && maybe.message) {
      return maybe.message;
    }
    if (typeof maybe.statusText === "string" && maybe.statusText) {
      return maybe.statusText;
    }
  }
  return "Unknown error";
}
export default function Index() {
  const [username, setUsername] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);

  function log(message: string) {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${message}`, ...prev]);
  }

  const ensureSession = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      throw new Error("Please enter a username.");
    }
    const user = {
      id: trimmed.toLowerCase(),
      name: trimmed,
      displayName: trimmed,
    };
    setCurrentUserIdForHeaders(user.id);
    return user;
  };

  async function handleCheckSupport() {
    try {
      const ok = await authClient.isPasskeySupported();
      setSupported(ok);
      log(ok ? "Passkeys supported." : "Passkeys NOT supported.");
    } catch (e: any) {
      setSupported(false);
      log(`Support check error: ${e?.message ?? String(e)}`);
    }
  }

  const handleRegisterPasskey = async () => {
    try {
      setIsBusy(true);
      log("Requesting registration options...");
      const user = await ensureSession();

      if (!user) {
        throw new Error("No user available for registration.");
      }

      console.log("user=", user);
      console.log("RP_ID=", RP_ID);

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
        console.log("response.error! ", response.error);
        throw new Error(formatError(response.error));
      }
      log(`Passkey registered (${response.data?.rpId || RP_ID}).`);
    } catch (error) {
      log(`Registration error: ${formatError(error)}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleConfirmOperation = async () => {
    try {
      setIsBusy(true);
      log("Confirming operation via passkey...");
      const user = await ensureSession();
      if (!user) {
        throw new Error("Failed to get user.");
      }
      const response = await authClient.authenticateWithPasskey({
        userId: user.id,
        rpId: RP_ID,
      });
      if (response.error) {
        throw new Error(formatError(response.error));
      }
      log("Operation confirmed via passkey.");
    } catch (error) {
      log(`2FA error: ${formatError(error)}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Passkey Demo (Expo)</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="alice"
          style={styles.input}
          editable={!isBusy}
        />

        <View style={styles.row}>
          <Button
            title="Check support"
            disabled={isBusy}
            onPress={handleCheckSupport}
          />
          <Text style={styles.supportText}>
            {supported === null
              ? ""
              : supported
                ? "supported"
                : "not supported"}
          </Text>
        </View>

        <View style={styles.row}>
          <Button
            title="Register"
            disabled={isBusy}
            onPress={handleRegisterPasskey}
          />
          <Button
            title="Login"
            disabled={isBusy}
            onPress={handleConfirmOperation}
          />
        </View>
      </View>

      <View style={styles.logsCard}>
        <Text style={styles.label}>Log</Text>
        <ScrollView
          style={styles.logs}
          contentContainerStyle={styles.logsContent}
        >
          {logs.length === 0 ? (
            <Text style={styles.logLineMuted}>No logs yet.</Text>
          ) : (
            logs.map((line, idx) => (
              <Text key={idx} style={styles.logLine}>
                {line}
              </Text>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 64,
    backgroundColor: "#0b1220",
  },
  title: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
  },
  meta: {
    marginTop: 6,
    color: "#9fb0d0",
    fontSize: 12,
  },
  card: {
    marginTop: 16,
    backgroundColor: "#111b2e",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1c2a46",
  },
  logsCard: {
    marginTop: 12,
    backgroundColor: "#111b2e",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1c2a46",
    flex: 1,
  },
  label: {
    color: "#cfe0ff",
    fontSize: 12,
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#2a3a5f",
    backgroundColor: "#0b1220",
    color: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  supportText: {
    color: "#9fb0d0",
    fontSize: 12,
  },
  logs: {
    flex: 1,
    marginTop: 6,
  },
  logsContent: {
    paddingBottom: 12,
  },
  logLine: {
    color: "#dbeafe",
    fontSize: 12,
    marginBottom: 6,
  },
  logLineMuted: {
    color: "#9fb0d0",
    fontSize: 12,
  },
});
