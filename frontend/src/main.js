import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import "./style.css";

const apiBase = "http://localhost:3000";

const usernameInput = document.querySelector("#username");
const registerButton = document.querySelector("#register");
const loginButton = document.querySelector("#login");
const loginUsernamelessButton = document.querySelector("#login-usernameless");
const logEl = document.querySelector("#log");

function log(message) {
  const time = new Date().toLocaleTimeString();
  logEl.textContent = `[${time}] ${message}\n` + logEl.textContent;
}

async function postJson(path, body) {
  const response = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

async function handleRegister() {
  const username = usernameInput.value.trim();
  if (!username) {
    log("Enter a username first.");
    return;
  }

  try {
    log("Requesting registration options...");
    const options = await postJson("/register/options", {
      username,
      displayName: username,
    });

    const attestation = await startRegistration(options);

    log("Verifying registration...");
    const result = await postJson("/register/verify", {
      username,
      attestation,
    });

    log(result.verified ? "Passkey registered." : "Registration failed.");
  } catch (error) {
    log(`Registration error: ${error.message}`);
  }
}

async function handleLogin() {
  const username = usernameInput.value.trim();
  if (!username) {
    log("Enter a username first.");
    return;
  }

  try {
    log("Requesting authentication options...");
    const options = await postJson("/auth/options", { username });

    const assertion = await startAuthentication(options);

    log("Verifying authentication...");
    const result = await postJson("/auth/verify", {
      username,
      assertion,
    });

    log(result.verified ? "Authentication OK." : "Authentication failed.");
  } catch (error) {
    log(`Authentication error: ${error.message}`);
  }
}

registerButton.addEventListener("click", handleRegister);
loginButton.addEventListener("click", handleLogin);
loginUsernamelessButton.addEventListener("click", async () => {
  try {
    log("Requesting authentication options (usernameless)...");
    const options = await postJson("/auth/options", {});

    const assertion = await startAuthentication(options);

    log("Verifying authentication...");
    const result = await postJson("/auth/verify", { assertion });

    log(result.verified ? "Authentication OK." : "Authentication failed.");
  } catch (error) {
    log(`Authentication error: ${error.message}`);
  }
});