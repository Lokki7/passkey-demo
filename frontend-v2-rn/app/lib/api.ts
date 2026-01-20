export async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data &&
        typeof data === "object" &&
        "error" in data &&
        (data as any).error) ||
      `Request failed (${response.status})`;
    throw new Error(String(message));
  }

  return data;
}
