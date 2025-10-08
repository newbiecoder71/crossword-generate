import React, { useRef, useEffect } from "react";
import { isPuzzleComplete } from "../utils/crossword.js";

export default function CrosswordGrid({ grid, numbers, placements, answers, setAnswers, direction, activeClue, setPuzzleComplete, showSolution, onWordComplete, showClueAnswer }) {
  const inputRefs = useRef([]);

  function isWordCorrect(placement, answers) {
    const { word, row, col, dir } = placement;
    let typed = "";
  
    for (let i = 0; i < word.length; i++) {
      if (dir === "across") {
        typed += answers[row][col + i] || "";
      } else {
        typed += answers[row + i][col] || "";
      }
    }
  
    return typed.toUpperCase() === word.toUpperCase();
  }
  
  useEffect(() => {
    if (!grid) return;
    inputRefs.current = grid.map((row) =>
      row.map(() => React.createRef())
    );
  }, [grid]);

  // When activeClue changes, focus first letter of that word
  useEffect(() => {
    if (!activeClue) return;
  
    const { row, col, dir, word } = activeClue;
    if (!row && row !== 0) return; // guard
    if (!col && col !== 0) return;
  
    // walk through the word to find first empty cell
    for (let i = 0; i < word.length; i++) {
      const r = dir === "across" ? row : row + i;
      const c = dir === "across" ? col + i : col;
  
      if (!answers[r][c]) {
        inputRefs.current?.[r]?.[c]?.current?.focus();
        return;
      }
    }
  
    // if all filled, just focus first letter
    inputRefs.current?.[row]?.[col]?.current?.focus();
  }, [activeClue, answers]);
  
  const handleInput = (r, c, val) => {
    const char = val.toUpperCase().slice(0, 1);
    const next = answers.map((row) => [...row]);
    next[r][c] = char;
    setAnswers(next);
  
    // ✅ Check if entire puzzle is complete
    if (isPuzzleComplete(placements, next)) {
      setPuzzleComplete(true);
      localStorage.removeItem("crossword-progress");
    }
  
    // ✅ If user filled in the current active word correctly, move to next
    if (activeClue && isWordCorrect(activeClue, next)) {
      setTimeout(() => {
        if (onWordComplete) onWordComplete(activeClue);
      }, 150); // short delay for smoother UX
    }
  
    if (!char) return; // nothing typed, don’t move focus
  
    if (direction === "across") {
      let nextCol = c + 1;
      // keep moving right while inside grid, not a block, and already filled
      while (
        nextCol < grid[0].length &&
        grid[r][nextCol] !== "#" &&
        answers[r][nextCol]
      ) {
        nextCol++;
      }
      if (nextCol < grid[0].length && grid[r][nextCol] !== "#") {
        inputRefs.current?.[r]?.[nextCol]?.current?.focus();
      }
    } else if (direction === "down") {
      let nextRow = r + 1;
      // keep moving down while inside grid, not a block, and already filled
      while (
        nextRow < grid.length &&
        grid[nextRow][c] !== "#" &&
        answers[nextRow][c]
      ) {
        nextRow++;
      }
      if (nextRow < grid.length && grid[nextRow][c] !== "#") {
        inputRefs.current?.[nextRow]?.[c]?.current?.focus();
      }
    }
  };  

  const handleKeyDown = (e, r, c) => {
    if (e.key === "Backspace") {
      // if current cell is empty, move focus backwards
      if (!answers[r][c]) {
        if (direction === "across") {
          let prevCol = c - 1;
          while (
            prevCol >= 0 &&
            grid[r][prevCol] !== "#" &&
            !answers[r][prevCol] // skip empties until a letter or start
          ) {
            prevCol--;
          }
          if (prevCol >= 0 && grid[r][prevCol] !== "#") {
            inputRefs.current?.[r]?.[prevCol]?.current?.focus();
          }
        } else if (direction === "down") {
          let prevRow = r - 1;
          while (
            prevRow >= 0 &&
            grid[prevRow][c] !== "#" &&
            !answers[prevRow][c]
          ) {
            prevRow--;
          }
          if (prevRow >= 0 && grid[prevRow][c] !== "#") {
            inputRefs.current?.[prevRow]?.[c]?.current?.focus();
          }
        }
      }
    }
  };
  
  function solutionLetter(r, c, placements) {
    for (const p of placements) {
      const { word, row, col, dir } = p;
      for (let i = 0; i < word.length; i++) {
        const rr = dir === "across" ? row : row + i;
        const cc = dir === "across" ? col + i : col;
        if (rr === r && cc === c) {
          return word[i]; // correct letter
        }
      }
    }
    return "";
  }  

  if (!grid || !answers) return <div>⚠️ Grid not ready</div>;

  return (
    <div className="grid">
      {grid.map((row, r) => (
        <div className="grid-row" key={r}>
          {row.map((ch, c) => {
            const num = numbers?.[r]?.[c];
            const val = answers?.[r]?.[c] || "";

            return (
              <div className={`cell ${ch === "#" ? "block" : ""}`} key={`${r}-${c}`}>
                {num && <span className="cell-num">{num}</span>}
                    {ch !== "#" && (
                        <input
                            data-coord={`${r}-${c}`} 
                            ref={inputRefs.current?.[r]?.[c] || null}
                            type="text"
                            maxLength="1"
                            className={`cell-input
                                ${placements.some((p) =>
                                  p.dir === "across" &&
                                  p.row === r &&
                                  p.col <= c &&
                                  c < p.col + p.word.length &&
                                  isWordCorrect(p, answers)
                                ) || placements.some((p) =>
                                  p.dir === "down" &&
                                  p.col === c &&
                                  p.row <= r &&
                                  r < p.row + p.word.length &&
                                  isWordCorrect(p, answers)
                                )
                                  ? "correct"
                                  : ""}
                              
                                ${activeClue &&
                                  ((activeClue.dir === "across" &&
                                    activeClue.row === r &&
                                    c >= activeClue.col &&
                                    c < activeClue.col + activeClue.word.length) ||
                                  (activeClue.dir === "down" &&
                                    activeClue.col === c &&
                                    r >= activeClue.row &&
                                    r < activeClue.row + activeClue.word.length))
                                  ? "active"
                                  : ""}
                              `}                              
                            value={
                              showSolution
                                ? solutionLetter(r, c, placements)
                                : showClueAnswer && activeClue &&
                                  ((activeClue.dir === "across" &&
                                    activeClue.row === r &&
                                    c >= activeClue.col &&
                                    c < activeClue.col + activeClue.word.length) ||
                                  (activeClue.dir === "down" &&
                                    activeClue.col === c &&
                                    r >= activeClue.row &&
                                    r < activeClue.row + activeClue.word.length))
                                ? solutionLetter(r, c, placements)
                                : val
                            }
                            onChange={(e) => handleInput(r, c, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, r, c)}
                        />
                    )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
