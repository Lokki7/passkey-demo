import Constants from "expo-constants";
import { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { postJson } from "../lib/api";
import { isPasskeySupported, startAuth, startReg } from "../lib/passkeyClient";

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Platform.OS === "android"
    ? "http://10.0.2.2:3000"
    : "http://localhost:3000");

export default function Index() {
  const [username, setUsername] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);

  const runtime = useMemo(() => {
    return {
      platform: Platform.OS,
      apiBase: API_BASE,
      appOwnership: Constants.appOwnership ?? null,
    };
  }, []);

  function log(message: string) {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${message}`, ...prev]);
  }

  async function handleCheckSupport() {
    try {
      const ok = await isPasskeySupported();
      setSupported(ok);
      log(ok ? "Passkeys supported." : "Passkeys NOT supported.");
    } catch (e: any) {
      setSupported(false);
      log(`Support check error: ${e?.message ?? String(e)}`);
    }
  }

  async function handleRegister() {
    const u = username.trim();
    if (!u) {
      log("Enter a username first.");
      return;
    }

    setBusy(true);
    try {
      log("Requesting registration options...");
      const options = await postJson(`${API_BASE}/register/options`, {
        username: u,
        displayName: u,
      });

      log("Creating passkey...");
      const attestation = await startReg(options);

      log("Verifying registration...");
      const result = await postJson(`${API_BASE}/register/verify`, {
        username: u,
        attestation,
      });

      log(result.verified ? "Passkey registered." : "Registration failed.");
    } catch (e: any) {
      log(`Registration error: ${e?.message ?? String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleLogin({ usernameless }: { usernameless: boolean }) {
    const u = username.trim();
    if (!usernameless && !u) {
      log("Enter a username first.");
      return;
    }

    setBusy(true);
    try {
      log(
        usernameless
          ? "Requesting authentication options (usernameless)..."
          : "Requesting authentication options...",
      );
      const options = await postJson(
        `${API_BASE}/auth/options`,
        usernameless ? {} : { username: u },
      );

      log("Authenticating with passkey...");
      const assertion = await startAuth(options);

      log("Verifying authentication...");
      const result = await postJson(
        `${API_BASE}/auth/verify`,
        usernameless ? { assertion } : { username: u, assertion },
      );

      log(result.verified ? "Authentication OK." : "Authentication failed.");
    } catch (e: any) {
      log(`Authentication error: ${e?.message ?? String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Passkey Demo (Expo)</Text>
      <Text style={styles.meta}>
        Platform: {runtime.platform} • API: {runtime.apiBase}
      </Text>
      <Text style={styles.meta}>App ownership: {runtime.appOwnership}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="alice"
          style={styles.input}
          editable={!busy}
        />

        <View style={styles.row}>
          <Button
            title="Check support"
            disabled={busy}
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
          <Button title="Register" disabled={busy} onPress={handleRegister} />
          <Button
            title="Login"
            disabled={busy}
            onPress={() => handleLogin({ usernameless: false })}
          />
        </View>

        <View style={styles.row}>
          <Button
            title="Login (usernameless)"
            disabled={busy}
            onPress={() => handleLogin({ usernameless: true })}
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

function Button({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[styles.button, disabled && styles.buttonDisabled]}
      accessibilityRole="button"
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
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
