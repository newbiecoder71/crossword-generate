import React, { useRef, useEffect, useState } from "react";
import { isPuzzleComplete } from "../utils/crossword.js";
import Keyboard from "./Keyboard";
import ClueBar from "./ClueBar";

export default function CrosswordGrid({
  grid,
  numbers,
  placements,
  answers,
  setAnswers,
  direction,
  setDirection,           // "across" | "down"
  activeClue,
  setActiveClue,
  clues,          // { num, clue, dir, row, col, word }  (represents the current ANSWER span)
  setPuzzleComplete,
  showSolution,
  onWordComplete,
  showClueAnswer,
  onPrevClue,
  onNextClue,
  onRefocusReady,
}) {
  const inputRefs = useRef([]);
  const [activeCell, setActiveCell] = useState(null);        // "r-c"
  const lastClueKeyRef = useRef(null);                       // remember last handled answer span
  const suppressFocusRef = useRef(false);                    // avoid refocus while typing/backspacing
  const [refsReady, setRefsReady] = useState(false);

  // ---- Build refs when grid changes ----
  useEffect(() => {
    if (!grid) return;
    inputRefs.current = grid.map((row) => row.map(() => React.createRef()));
    setRefsReady(true);
  }, [grid]);

  // ---- Helpers ----
  const isWordCorrect = (placement, ans) => {
    const { word, row, col, dir } = placement;
    let typed = "";
    for (let i = 0; i < word.length; i++) {
      typed += (dir === "across") ? (ans[row][col + i] || "") : (ans[row + i][col] || "");
    }
    return typed.toUpperCase() === word.toUpperCase();
  };

  // Is (r,c) inside the current answer span?
  const isCellInClue = (r, c, clue) => {
    if (!clue) return false;
    const { row, col, dir, word } = clue || {};
    if (row == null || col == null || !word) return false;
    if (dir === "across") return r === row && c >= col && c < col + word.length;
    return c === col && r >= row && r < row + word.length;
  };

  // A stable identity key for the current answer span
  const clueKey = React.useMemo(
    () =>
      activeClue
        ? `${activeClue.dir}:${activeClue.row}:${activeClue.col}:${
            activeClue.word?.length ?? 0
          }`
        : null,
    [activeClue]
  );

  // Prev non-block cell (in current direction)
  const findPrevCell = (r, c) => {
    if (direction === "across") {
      let col = c - 1;
      while (col >= 0 && grid[r][col] === "#") col--;
      return col >= 0 ? [r, col] : null;
    } else {
      let row = r - 1;
      while (row >= 0 && grid[row][c] === "#") row--;
      return row >= 0 ? [row, c] : null;
    }
  };

  const deleteWithBackspace = (r, c) => {
    suppressFocusRef.current = true;           // prevent effect from jumping
    const next = answers.map((row) => [...row]);

    if (next[r][c]) {
      next[r][c] = "";
      setAnswers(next);
      inputRefs.current?.[r]?.[c]?.current?.focus();
      setActiveCell(`${r}-${c}`);
      queueMicrotask(() => (suppressFocusRef.current = false));
      return;
    }

    const prev = findPrevCell(r, c);
    if (prev) {
      const [pr, pc] = prev;
      if (next[pr][pc]) next[pr][pc] = "";
      setAnswers(next);
      inputRefs.current?.[pr]?.[pc]?.current?.focus();
      setActiveCell(`${pr}-${pc}`);
    }
    queueMicrotask(() => (suppressFocusRef.current = false));
  };

  const forEachCellInClue = (clue, cb) => {
    if (!clue) return;
    const { row, col, dir, word } = clue;
    for (let i = 0; i < word.length; i++) {
      const r = dir === "across" ? row : row + i;
      const c = dir === "across" ? col + i : col;
      if (grid[r]?.[c] !== "#") cb(r, c);
    }
  };

  const clearCurrentWord = () => {
    if (!activeClue) return;
    suppressFocusRef.current = true;
    const next = answers.map((row) => [...row]);
    forEachCellInClue(activeClue, (r, c) => { next[r][c] = ""; });
    setAnswers(next);

    // refocus first cell of the word
    const { row, col, dir, word } = activeClue;
    for (let i = 0; i < word.length; i++) {
      const r = dir === "across" ? row : row + i;
      const c = dir === "across" ? col + i : col;
      if (grid[r]?.[c] !== "#") {
        inputRefs.current?.[r]?.[c]?.current?.focus();
        setActiveCell(`${r}-${c}`);
        break;
      }
    }
    queueMicrotask(() => (suppressFocusRef.current = false));
  };

  // Keep focus on the current active cell after UI actions
  const refocusActiveCell = React.useCallback(() => {
    if (!activeCell) return;
    const [r, c] = activeCell.split("-").map(Number);
    const el = inputRefs.current?.[r]?.[c]?.current;
    if (el) el.focus();
  }, [activeCell]);

  useEffect(() => {
    // Tell parent what function to call to refocus the active cell
    if (onRefocusReady) onRefocusReady(() => refocusActiveCell());
  }, [onRefocusReady, refocusActiveCell]);  

  const findClueForCell = (r, c, preferDir = direction) => {
    if (!clues) return null;
  
    const inAcross = clues.across.find(({ row, col, word }) =>
      r === row && c >= col && c < col + word.length
    );
    const inDown = clues.down.find(({ row, col, word }) =>
      c === col && r >= row && r < row + word.length
    );
  
    // Prefer the current typing direction if possible, else whichever exists
    if (preferDir === "across" && inAcross) return inAcross;
    if (preferDir === "down"   && inDown)   return inDown;
    return inAcross || inDown || null;
  };
  
  const moveWithinActiveClueWithArrows = (key, r, c) => {
    if (!activeClue) return;

    const { row, col, dir, word } = activeClue;
    let targetR = r;
    let targetC = c;

    if (dir === "across") {
      // only left/right matter for across clues
      if (key === "ArrowLeft") {
        targetC = c - 1;
      } else if (key === "ArrowRight") {
        targetC = c + 1;
      } else {
        return;
      }

      const startC = col;
      const endC = col + word.length - 1;
      if (targetC < startC || targetC > endC) return;
    } else {
      // dir === "down" → only up/down matter
      if (key === "ArrowUp") {
        targetR = r - 1;
      } else if (key === "ArrowDown") {
        targetR = r + 1;
      } else {
        return;
      }

      const startR = row;
      const endR = row + word.length - 1;
      if (targetR < startR || targetR > endR) return;
    }

    // don't move onto blocks
    if (grid[targetR]?.[targetC] === "#") return;

    const el = inputRefs.current?.[targetR]?.[targetC]?.current;
    if (el) {
      el.focus();
      setActiveCell(`${targetR}-${targetC}`);
    }
  };

  // ---- Focus behavior: ONLY on real answer-span change ----
  // * Don’t refocus while typing/backspacing (suppressFocusRef).
  // * If caret already inside the span, do nothing.
  // * If the span is fully filled, do nothing.
  useEffect(() => {
    if (!activeClue || !grid || !answers || !refsReady) return;
    if (suppressFocusRef.current) return;

    // Only react when the identity of the answer span changes
    if (clueKey === lastClueKeyRef.current) return;
    lastClueKeyRef.current = clueKey;

    // Already inside? leave caret alone
    if (activeCell) {
      const [cr, cc] = activeCell.split("-").map(Number);
      if (isCellInClue(cr, cc, activeClue)) return;
    }

    const { row, col, dir, word } = activeClue;
    if (row == null || col == null || !word) return;

    // focus the first *empty* cell
    for (let i = 0; i < word.length; i++) {
      const r = dir === "across" ? row : row + i;
      const c = dir === "across" ? col + i : col;
      if (!answers[r][c]) {
        inputRefs.current?.[r]?.[c]?.current?.focus();
        setActiveCell(`${r}-${c}`);
        return;
      }
    }
    // fully filled: do nothing
  }, [clueKey, refsReady]); // <— depend on the stable key only

  // ---- Input handlers ----
  const handleInput = (r, c, val) => {
    // overwrite with the newest letter
    const char = (val ?? "").toUpperCase().replace(/[^A-Z]/g, "").slice(-1);

    suppressFocusRef.current = true;
    const next = answers.map((row) => [...row]);
    next[r][c] = char || "";
    setAnswers(next);

    // puzzle complete?
    if (isPuzzleComplete(placements, next)) {
      setPuzzleComplete(true);
      localStorage.removeItem("crossword-progress");
    }

    // this answer complete?
    if (activeClue && isWordCorrect(activeClue, next)) {
      setTimeout(() => onWordComplete?.(activeClue), 150);
    }

    // auto-advance only inside the same clue; skip cells already correct
    if (char && activeClue) {
      const expectedAt = (rr, cc) =>
        solutionLetter(rr, cc, placements)?.toUpperCase() || "";

      if (direction === "across") {
        let nextCol = c + 1;

        // advance while we're still in this clue AND either a block OR the letter is already correct
        while (
          nextCol < grid[0].length &&
          isCellInClue(r, nextCol, activeClue) &&
          (
            grid[r][nextCol] === "#" ||
            (answers[r][nextCol] &&
            answers[r][nextCol].toUpperCase() === expectedAt(r, nextCol))
          )
        ) {
          nextCol++;
        }

        if (
          nextCol < grid[0].length &&
          grid[r][nextCol] !== "#" &&
          isCellInClue(r, nextCol, activeClue)
        ) {
          inputRefs.current?.[r]?.[nextCol]?.current?.focus();
          setActiveCell(`${r}-${nextCol}`);
        }
        // else: at end of word or outside clue — stay put
      } else {
        let nextRow = r + 1;

        while (
          nextRow < grid.length &&
          isCellInClue(nextRow, c, activeClue) &&
          (
            grid[nextRow][c] === "#" ||
            (answers[nextRow][c] &&
            answers[nextRow][c].toUpperCase() === expectedAt(nextRow, c))
          )
        ) {
          nextRow++;
        }

        if (
          nextRow < grid.length &&
          grid[nextRow][c] !== "#" &&
          isCellInClue(nextRow, c, activeClue)
        ) {
          inputRefs.current?.[nextRow]?.[c]?.current?.focus();
          setActiveCell(`${nextRow}-${c}`);
        }
      }
    }
    queueMicrotask(() => (suppressFocusRef.current = false));
  };

  const handleKeyDown = (e, r, c) => {
    const key = e.key;

    if (key === "Backspace") {
      e.preventDefault();
      deleteWithBackspace(r, c);
      return;
    }

    // Arrow key navigation within the current active clue
    if (
      key === "ArrowLeft" ||
      key === "ArrowRight" ||
      key === "ArrowUp" ||
      key === "ArrowDown"
    ) {
      e.preventDefault();
      moveWithinActiveClueWithArrows(key, r, c);
      return;
    }

    if (/^[a-z]$/i.test(key)) {
      e.preventDefault();
      handleInput(r, c, key);
      return;
    }

    if (key === " ") {
      e.preventDefault();
      handleInput(r, c, "");
      inputRefs.current?.[r]?.[c]?.current?.focus();
      setActiveCell(`${r}-${c}`);
    }
  };

  const handleVirtualKey = (key) => {
    if (!activeCell) return;
    const [r, c] = activeCell.split("-").map(Number);

    if (key === "BACKSPACE") return deleteWithBackspace(r, c);
    if (key === "CLEAR") return clearCurrentWord();

    handleInput(r, c, key); // letters overwrite + (maybe) advance
  };

  const handleCellClick = (r, c) => {
    const target = findClueForCell(r, c);
  
    if (target) {
      setActiveClue(target);
      setDirection(target.dir);
    }
  
    // keep the clicked cell highlighted immediately
    setActiveCell(`${r}-${c}`);
    // (focus will be handled by your guarded effect and/or typing)
  };  

  // ---- Render a solution letter if needed ----
  function solutionLetter(r, c, placements) {
    for (const p of placements) {
      const { word, row, col, dir } = p;
      for (let i = 0; i < word.length; i++) {
        const rr = dir === "across" ? row : row + i;
        const cc = dir === "across" ? col + i : col;
        if (rr === r && cc === c) return word[i];
      }
    }
    return "";
  }  

  if (!grid || !answers) return <div>⚠️ Grid not ready</div>;

  return (
    <div className="crossword-wrapper">
      {/* GRID */}
      <div className="grid">
        {grid.map((row, r) => (
          <div className="grid-row" key={r}>
            {row.map((ch, c) => {
              const num = numbers?.[r]?.[c];
              const val = answers?.[r]?.[c] || "";
              const isActive = activeCell === `${r}-${c}`;

              const isInActiveClue =
                !!activeClue &&
                (
                  (activeClue.dir === "across" &&
                    activeClue.row === r &&
                    c >= activeClue.col &&
                    c < activeClue.col + activeClue.word.length) ||
                  (activeClue.dir === "down" &&
                    activeClue.col === c &&
                    r >= activeClue.row &&
                    r < activeClue.row + activeClue.word.length)
                );

              const isInCorrectWord = placements?.some((p) => {
                const inThisWord =
                  (p.dir === "across" &&
                    p.row === r &&
                    c >= p.col &&
                    c < p.col + p.word.length) ||
                  (p.dir === "down" &&
                    p.col === c &&
                    r >= p.row &&
                    r < p.row + p.word.length);
                return inThisWord && isWordCorrect(p, answers);
              });

              return (
                <div
                  className={`cell ${ch === "#" ? "block" : ""} ${
                    isActive ? "active-cell" : ""
                  } ${isInActiveClue ? "active-clue-cell" : ""} ${
                    isInCorrectWord ? "correct-word" : ""
                  }`}
                  key={`${r}-${c}`}
                >
                  {num && <span className="cell-num">{num}</span>}
                  {ch !== "#" && (
                    <input
                      data-coord={`${r}-${c}`}
                      ref={inputRefs.current?.[r]?.[c] || null}
                      type="text"
                      maxLength="1"
                      className="cell-input"
                      value={
                        showSolution
                          ? solutionLetter(r, c, placements)
                          : showClueAnswer && isInActiveClue
                          ? solutionLetter(r, c, placements)
                          : val
                      }
                      readOnly={window.innerWidth < 900}
                      inputMode={window.innerWidth < 900 ? "none" : "text"}
                    
                      onFocus={() => setActiveCell(`${r}-${c}`)}
                      onClick={() => handleCellClick(r, c)}
                    
                      // You don't actually need onChange now, since input comes from
                      // your virtual keyboard + handleInput, but leaving it won't break anything.
                      // onChange={(e) => handleInput(r, c, e.target.value)}
                    
                      onKeyDown={(e) => handleKeyDown(e, r, c)}  // desktop keyboard still works
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="characters"
                    />                  
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* CLUE BAR */}
      <ClueBar clue={activeClue} onPrev={onPrevClue} onNext={onNextClue} />

      {/* ON-SCREEN KEYBOARD */}
      <Keyboard onKeyPress={handleVirtualKey} />
    </div>
  );
}
