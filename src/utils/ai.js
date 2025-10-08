export async function getWordsAndClues(topic, count) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) throw new Error("No API key found. Add VITE_OPENAI_API_KEY in your .env or turn off AI.");
    
    console.log("API key present?", !!import.meta.env.VITE_OPENAI_API_KEY);

    // Use the Responses API style prompt; you can swap to any provider.
    const prompt = `You are a crossword constructor. 
    Give me ${count} distinct SHORT single-word answers (3-12 letters) that fit the theme: "${topic}".
    For each word, provide a fun, concise clue (<=10 words) that is not the word itself.
    Return ONLY valid JSON (no code fences, no explanations) with shape:
    { "words": string[], "clues": Record<string,string> }`;

    
    
    const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",   // ✅ updated model
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
            text = content[0].text;   // 👈 real JSON lives here
        }
    }

    // Fallback in case structure changes
    if (!text) {
        text = data.output_text || JSON.stringify(data);
    }

    // Debug log
    console.log("AI extracted text:", text);

    // Debug log to see exactly what AI sent back
    console.log("AI raw response text:", text);

    let parsed;
    try {
        parsed = JSON.parse(extractJson(text));
    } catch (err) {
        console.error("JSON parse failed:", err);
        throw new Error("AI returned an unexpected format. Try again.");
    }
       
    const words = (parsed.words || []).slice(0, count);
    // Normalize clueMap keys to lowercase
    const clues = {};
    for (const [k, v] of Object.entries(parsed.clues || {})) {
        clues[k.toLowerCase()] = v;
    }

    return { words, clues };
}

function extractJson(s) {
    // Remove markdown-style code fences if present
    s = s.replace(/```json|```/gi, "").trim();
  
    const i = s.indexOf("{");
    const j = s.lastIndexOf("}");
    if (i >= 0 && j >= i) return s.slice(i, j + 1);
  
    throw new Error("No JSON in AI output");
}
  