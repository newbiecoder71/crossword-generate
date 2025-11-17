export async function getWordsAndClues(topic, count) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) throw new Error("No API key found. Add VITE_OPENAI_API_KEY in your .env or turn off AI.");
    
    console.log("API key present?", !!import.meta.env.VITE_OPENAI_API_KEY);
  
    // 💬 Stronger instructions to avoid "7 letters" style clues
    const prompt = `You are a professional crossword constructor.
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
  
    // Try to extract the model’s actual text output
    let text = "";
    if (data.output && data.output.length > 0) {
      const content = data.output[0].content;
      if (content && content.length > 0) {
        text = content[0].text; // 👈 real JSON lives here
      }
    }
  
    // Fallback in case structure changes
    if (!text) {
      text = data.output_text || JSON.stringify(data);
    }
  
    console.log("AI extracted text:", text);
    console.log("AI raw response text:", text);
  
    let parsed;
    try {
      parsed = JSON.parse(extractJson(text));
    } catch (err) {
      console.error("JSON parse failed:", err);
      throw new Error("AI returned an unexpected format. Try again.");
    }
  
    // Raw words from the model
    const rawWords = (parsed.words || []).slice(0, count);
  
    // Normalize clueMap keys to lowercase
    const rawClueMap = {};
    for (const [k, v] of Object.entries(parsed.clues || {})) {
      rawClueMap[k.toLowerCase()] = v;
    }
  
    // 🧹 Filter out bad clues like "7 letters" or clues that contain the answer
    const filteredWords = [];
    const filteredClues = {};
  
    for (const w of rawWords) {
      const key = w.toLowerCase();
      const clueText = rawClueMap[key];
  
      if (!clueText) {
        console.warn("Skipping word with missing clue:", w);
        continue;
      }
  
      if (isBadClue(clueText, w)) {
        console.warn("Skipping word due to bad clue:", { word: w, clue: clueText });
        continue;
      }
  
      filteredWords.push(w);
      filteredClues[key] = clueText;
    }
  
    // You may end up with fewer than `count` words, but they’ll all be usable
    return { words: filteredWords, clues: filteredClues };
  }
  
  function extractJson(s) {
    // Remove markdown-style code fences if present
    s = s.replace(/```json|```/gi, "").trim();
  
    const i = s.indexOf("{");
    const j = s.lastIndexOf("}");
    if (i >= 0 && j >= i) return s.slice(i, j + 1);
  
    throw new Error("No JSON in AI output");
  }
  
  /**
   * Decide whether a clue is "bad" and should be dropped.
   * Examples:
   * - "7 letters"
   * - "seven letters"
   * - "7-letter word"
   * - clue that literally contains the answer word
   */
  function isBadClue(clueText, answer) {
    if (!clueText) return true;
  
    const t = clueText.trim();
    const lower = t.toLowerCase();
  
    // 1) Exact patterns like "7 letters" or "seven letters"
    if (/^\d+\s+letters?$/i.test(t)) return true;
    if (/^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+letters?$/i.test(lower)) {
      return true;
    }
  
    // 2) Patterns like "7-letter word"
    if (/^\d+-letter\s+word$/i.test(t)) return true;
  
    // 3) Very short clues that only talk about letters
    const wordCount = t.split(/\s+/).length;
    if (wordCount <= 3 && /letters?/i.test(t)) return true;
  
    // 4) Clue contains the answer word itself
    if (answer) {
      const ans = answer.toLowerCase();
      if (lower === ans) return true;
      if (lower.includes(ans)) return true;
    }
  
    return false;
  }
  