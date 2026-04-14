function getApiBaseUrl() {
  const explicitBase = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  if (explicitBase) {
    return explicitBase.replace(/\/+$/, "");
  }

  if (
    typeof window !== "undefined" &&
    typeof window.location?.origin === "string" &&
    /^https?:\/\//i.test(window.location.origin)
  ) {
    return window.location.origin.replace(/\/+$/, "");
  }

  throw new Error(
    "No API base URL found. Add VITE_API_BASE_URL to your .env for mobile builds."
  );
}

export async function getWordsAndClues(topic, count) {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic,
      count,
    }),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.error || "Failed to generate crossword.");
  }

  if (!data?.words?.length || !data?.clues) {
    throw new Error("Server returned an unexpected puzzle payload.");
  }

  return data;
}
