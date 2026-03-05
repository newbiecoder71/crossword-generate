export async function getWordsAndClues(topic, count) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("No API key found. Add VITE_OPENAI_API_KEY in your .env.");
  }

  const initialPrompt = `You are a professional crossword constructor.
Give me ${count} distinct SHORT single-word answers (3-12 letters) that fit the theme: "${topic}".

For each word:
- The clue must be fun and concise (<= 10 words).
- The clue MUST NOT contain the answer word itself or any direct form of it.
- The clue MUST NOT describe only the length, such as "7 letters", "nine letters", "7-letter word", or similar patterns.
- The clue MUST be an actual hint or definition.

Return ONLY valid JSON (no code fences, no explanations) with shape:
{
  "words": string[],
  "clues": Record<string,string>
}`;

  const initialText = await requestResponseText(initialPrompt, apiKey);
  let parsed;
  try {
    parsed = JSON.parse(extractJson(initialText));
  } catch {
    throw new Error("AI returned an unexpected format. Try again.");
  }

  const rawWords = normalizeWords(parsed.words || [], count);
  const clueMap = normalizeClueMap(parsed.clues || {});

  let validWords = [];
  let validClues = {};
  let missingWords = [];

  for (const w of rawWords) {
    const key = w.toLowerCase();
    const clueText = clueMap[key];
    if (!clueText || isBadClue(clueText, w)) {
      missingWords.push(w);
      continue;
    }
    validWords.push(w);
    validClues[key] = clueText.trim();
  }

  if (missingWords.length) {
    const regenerated = await regenerateClues(topic, missingWords, apiKey);
    for (const w of missingWords) {
      const key = w.toLowerCase();
      const clueText = regenerated[key];
      if (!clueText || isBadClue(clueText, w)) continue;
      validWords.push(w);
      validClues[key] = clueText.trim();
    }
  }

  if (validWords.length < 3) {
    throw new Error("Could not generate enough valid clues. Please try again.");
  }

  for (const w of validWords) {
    const clueText = validClues[w.toLowerCase()];
    if (!clueText || isBadClue(clueText, w)) {
      throw new Error("Generated puzzle had invalid clues. Please try again.");
    }
  }

  return { words: validWords, clues: validClues };
}

async function regenerateClues(topic, words, apiKey) {
  const output = {};
  let pending = [...words];

  for (let attempt = 0; attempt < 3 && pending.length; attempt++) {
    const regenPrompt = `You are fixing crossword clues.
Theme: "${topic}"
Generate one concise clue for each answer below.

Rules:
- Do NOT include the answer word in its clue.
- Do NOT use length-only clues like "7 letters", "7-letter word", "nine letters".
- Keep each clue <= 10 words.
- Return ONLY JSON like {"clues":{"answer":"clue"}}.

Answers: ${pending.join(", ")}`;

    let text;
    try {
      text = await requestResponseText(regenPrompt, apiKey);
    } catch {
      continue;
    }

    let parsed;
    try {
      parsed = JSON.parse(extractJson(text));
    } catch {
      continue;
    }

    const parsedMap = normalizeClueMap(parsed.clues || {});
    const nextPending = [];
    for (const w of pending) {
      const key = w.toLowerCase();
      const clueText = parsedMap[key];
      if (!clueText || isBadClue(clueText, w)) {
        nextPending.push(w);
      } else {
        output[key] = clueText.trim();
      }
    }
    pending = nextPending;
  }

  return output;
}

async function requestResponseText(prompt, apiKey) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: prompt,
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI error: ${t}`);
  }

  const data = await res.json();
  let text = "";
  if (data.output && data.output.length > 0) {
    const content = data.output[0].content;
    if (content && content.length > 0) {
      text = content[0].text || "";
    }
  }

  return text || data.output_text || JSON.stringify(data);
}

function normalizeWords(words, count) {
  const seen = new Set();
  const result = [];

  for (const w of words) {
    const normalized = String(w || "")
      .toUpperCase()
      .replace(/[^A-Z]/g, "");
    if (!normalized) continue;
    if (normalized.length < 3 || normalized.length > 12) continue;
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    result.push(normalized);
    if (result.length >= count) break;
  }

  return result;
}

function normalizeClueMap(input) {
  const map = {};
  for (const [k, v] of Object.entries(input)) {
    map[String(k).toLowerCase()] = String(v || "").trim();
  }
  return map;
}

function extractJson(s) {
  const clean = String(s || "").replace(/```json|```/gi, "").trim();
  const i = clean.indexOf("{");
  const j = clean.lastIndexOf("}");
  if (i >= 0 && j >= i) return clean.slice(i, j + 1);
  throw new Error("No JSON in AI output");
}

function isBadClue(clueText, answer) {
  if (!clueText) return true;

  const t = clueText.trim();
  const lower = t.toLowerCase();

  if (/^\d+\s+letters?$/i.test(t)) return true;
  if (
    /^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+letters?$/i.test(
      lower
    )
  ) {
    return true;
  }
  if (/^\d+-letter\s+word$/i.test(t)) return true;
  if (t.split(/\s+/).length <= 3 && /letters?/i.test(t)) return true;

  if (answer) {
    const ans = answer.toLowerCase();
    if (lower === ans) return true;
    if (lower.includes(ans)) return true;
  }

  return false;
}
