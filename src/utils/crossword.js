// Build a crossword grid from a set of raw words
// Try multiple times with fresh grids before giving up.
// - attempts: how many fresh tries
// - minPlacedRatio: % of input words that must be successfully placed
export function buildCrossword(rawWords, { attempts = 6, minPlacedRatio = 0.4 } = {}) {
    for (let i = 0; i < attempts; i++) {
      const result = attemptBuildCrossword(rawWords, minPlacedRatio);
      if (result) return result;
    }
    return null; // after N failed attempts
  }
  
  // A single attempt that reuses your existing build logic.
  function attemptBuildCrossword(rawWords, minPlacedRatio) {
    const words = Array.from(new Set(rawWords.map((w) => normalize(w)))).filter(Boolean);
    if (words.length < 3) return null;
  
    const maxLen = Math.max(...words.map((w) => w.length));
  
    // 🔧 auto-size strategy (tweak as desired)
    let size;
    if (words.length > 80) size = 40;        // really big grid
    else if (words.length > 50) size = 30;   // medium-large
    else if (words.length > 30) size = 25;   // medium
    else size = Math.max(15, maxLen + 2);    // normal case
  
    const empty = () => Array.from({ length: size }, () => Array(size).fill("#"));
    let grid = empty();
  
    const placements = []; // { word, row, col, dir }
  
    // Place first (longest) horizontally in the middle
    const sorted = [...words].sort((a, b) => b.length - a.length);
    const first = sorted[0];
    const mid = Math.floor(size / 2);
    const startCol = Math.floor((size - first.length) / 2);
    placeWord(grid, first, mid, startCol, "across");
    placements.push({ word: first, row: mid, col: startCol, dir: "across" });
  
    // Try to place the rest
    const rest = sorted.slice(1);
    for (const w of rest) {
      if (!tryPlaceWord(grid, w, placements)) continue;
    }
  
    // ✅ more forgiving threshold (configurable)
    const placedWords = new Set(placements.map((p) => p.word));
    const required = Math.max(3, Math.floor(words.length * minPlacedRatio));
    if (placedWords.size < required) return null;
  
    return { grid, placements };
  }
  
  
  // --- Helpers for grid placement ---
  
function normalize(w) {
    return w.toUpperCase().replace(/[^A-Z]/g, "");
}
  
function placeWord(grid, word, row, col, dir) {
    if (dir === "across") {
      for (let i = 0; i < word.length; i++) grid[row][col + i] = word[i];
    } else {
      for (let i = 0; i < word.length; i++) grid[row + i][col] = word[i];
    }
}
  
function canPlace(grid, word, row, col, dir) {
    const N = grid.length;
    if (dir === "across") {
      if (col < 0 || col + word.length > N) return false;
      for (let i = 0; i < word.length; i++) {
        const r = row,
          c = col + i;
        const cell = grid[r][c];
        if (cell !== "#" && cell !== word[i]) return false;
        if (cell === "#") {
          if (i === 0 && c > 0 && grid[r][c - 1] !== "#") return false;
          if (i === word.length - 1 && c + 1 < N && grid[r][c + 1] !== "#")
            return false;
        }
        if (r > 0 && grid[r - 1][c] !== "#" && cell === "#") return false;
        if (r + 1 < N && grid[r + 1][c] !== "#" && cell === "#") return false;
      }
      if (col > 0 && grid[row][col - 1] !== "#") return false;
      if (col + word.length < N && grid[row][col + word.length] !== "#")
        return false;
      return true;
    } else {
      if (row < 0 || row + word.length > N) return false;
      for (let i = 0; i < word.length; i++) {
        const r = row + i,
          c = col;
        const cell = grid[r][c];
        if (cell !== "#" && cell !== word[i]) return false;
        if (cell === "#") {
          if (i === 0 && r > 0 && grid[r - 1][c] !== "#") return false;
          if (i === word.length - 1 && r + 1 < N && grid[r + 1][c] !== "#")
            return false;
        }
        if (c > 0 && grid[r][c - 1] !== "#" && cell === "#") return false;
        if (c + 1 < N && grid[r][c + 1] !== "#" && cell === "#") return false;
      }
      if (row > 0 && grid[row - 1][col] !== "#") return false;
      if (row + word.length < N && grid[row + word.length][col] !== "#")
        return false;
      return true;
    }
}
  
function tryPlaceWord(grid, word, placements) {
    const N = grid.length;
  
    // Try to cross with existing letters first
    const letterPositions = new Map();
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const ch = grid[r][c];
        if (ch !== "#") {
          if (!letterPositions.has(ch)) letterPositions.set(ch, []);
          letterPositions.get(ch).push([r, c]);
        }
      }
    }
  
    const indices = [...word].map((_, i) => i).sort(() => Math.random() - 0.5);
    for (const i of indices) {
      const ch = word[i];
      const positions = letterPositions.get(ch) || [];
      for (const [r, c] of shuffle(positions)) {
        const startCol = c - i;
        if (canPlace(grid, word, r, startCol, "across")) {
          placeWord(grid, word, r, startCol, "across");
          placements.push({ word, row: r, col: startCol, dir: "across" });
          return true;
        }
        const startRow = r - i;
        if (canPlace(grid, word, startRow, c, "down")) {
          placeWord(grid, word, startRow, c, "down");
          placements.push({ word, row: startRow, col: c, dir: "down" });
          return true;
        }
      }
    }
  
    // Fallback: random placement
    for (let attempt = 0; attempt < 600; attempt++) {
      const dir = Math.random() < 0.5 ? "across" : "down";
      const r = Math.floor(Math.random() * N);
      const c = Math.floor(Math.random() * N);
      if (canPlace(grid, word, r, c, dir)) {
        placeWord(grid, word, r, c, dir);
        placements.push({ word, row: r, col: c, dir });
        return true;
      }
    }
    return false;
}
  
// --- Clue numbering & lists ---
  
export function numberClues(grid, placements) {
    const rows = grid.length;
    const cols = grid[0].length;
    const numbers = Array.from({ length: rows }, () => Array(cols).fill(null));
  
    let count = 1;
  
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === "#") continue;
  
        const startOfAcross =
          (c === 0 || grid[r][c - 1] === "#") &&
          c + 1 < cols &&
          grid[r][c + 1] !== "#";
  
        const startOfDown =
          (r === 0 || grid[r - 1][c] === "#") &&
          r + 1 < rows &&
          grid[r + 1][c] !== "#";
  
        if (startOfAcross || startOfDown) {
          numbers[r][c] = count++;
        }
      }
    }
  
    return { grid, numbers, placements };
}
  
export function buildClueLists(numbered, clueMap) {
    const across = [];
    const down = [];
  
    const { grid, numbers } = numbered;
    const rows = grid.length;
    const cols = grid[0].length;
  
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!numbers[r][c]) continue;
  
        const num = numbers[r][c];
  
        // Across clue
        if (
          (c === 0 || grid[r][c - 1] === "#") &&
          c + 1 < cols &&
          grid[r][c + 1] !== "#"
        ) {
          const word = collectWord(grid, r, c, "across");
          across.push({
            num,
            word,
            clue:
                clueMap[word.toLowerCase()] || 
                clueMap[word.toUpperCase()] || 
                clueMap[word] || 
                `(${word.length} letters)`,
            dir: "across",
            row: r,
            col: c,
          });
        }
  
        // Down clue
        if (
          (r === 0 || grid[r - 1][c] === "#") &&
          r + 1 < rows &&
          grid[r + 1][c] !== "#"
        ) {
          const word = collectWord(grid, r, c, "down");
          down.push({
            num,
            word,
            clue: 
                clueMap[word.toLowerCase()] || 
                clueMap[word.toUpperCase()] || 
                clueMap[word] || 
                `(${word.length} letters)`,
            dir: "down",
            row: r,
            col: c,
          });
        }
      }
    }
  
    return { across, down };
}
  
function collectWord(grid, r, c, dir) {
    let chars = [];
    if (dir === "across") {
      while (c < grid[0].length && grid[r][c] !== "#") {
        chars.push(grid[r][c]);
        c++;
      }
    } else {
      while (r < grid.length && grid[r][c] !== "#") {
        chars.push(grid[r][c]);
        r++;
      }
    }
    return chars.join("");
}
  
// --- Utility ---
// Returns true only if every placed word matches what's typed in `answers`
export function isPuzzleComplete(placements, answers) {
    if (!placements || !answers) return false;
  
    for (const p of placements) {
      const { word, row, col, dir } = p; // word is already UPPERCASE
      for (let i = 0; i < word.length; i++) {
        const r = dir === "across" ? row : row + i;
        const c = dir === "across" ? col + i : col;
        const typed = (answers[r]?.[c] || "").toUpperCase();
        if (typed !== word[i]) return false;
      }
    }
    return true;
}

export function isWordCorrect(placement, answers) {
    const { word, row, col, dir } = placement;
    for (let i = 0; i < word.length; i++) {
      const r = dir === "across" ? row : row + i;
      const c = dir === "across" ? col + i : col;
      const typed = (answers[r]?.[c] || "").toUpperCase();
      if (typed !== word[i]) return false;
    }
    return true;
}

function shuffle(a) {
    return [...a].sort(() => Math.random() - 0.5);
}
  