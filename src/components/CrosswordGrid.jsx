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
  activeClue,
  setPuzzleComplete,
  showSolution,
  onWordComplete,
  onWordMisspelled,
  onWrongLetterPenalty,
  wrongAttemptsByClue = {},
  showClueAnswer,
  flashClue,
  onPrevClue,
  onNextClue,
  onRefocusReady,
  minGridWidth = 0,
}) {
  const AUTO_ZOOM_SCALE = 1.65;
  const inputRefs = useRef([]);
  const [activeCell, setActiveCell] = useState(null);        // "r-c"
  const lastClueKeyRef = useRef(null);                       // remember last handled answer span
  const suppressFocusRef = useRef(false);                    // avoid refocus while typing/backspacing
  const [refsReady, setRefsReady] = useState(false);
  const gridFrameRef = useRef(null);
  const gridLayerRef = useRef(null);
  const [gridZoomStyle, setGridZoomStyle] = useState({});
  const [desktopCellSize, setDesktopCellSize] = useState(null);
  const [manualZoomOut, setManualZoomOut] = useState(false);
  const [manualScale, setManualScale] = useState(1);
  const pinchRef = useRef({ active: false, startDistance: 0, startScale: 1 });

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

  const buildClueKey = (clue) =>
    clue ? `${clue.dir}:${clue.row}:${clue.col}:${clue.word?.length ?? 0}` : null;

  const touchDistance = (touches) => {
    if (!touches || touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

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

  const isCellLockedBySolvedWord = (r, c, ans) => {
    if (grid[r]?.[c] === "#") return false;
    return placements?.some((p) => {
      const inThisWord =
        (p.dir === "across" &&
          p.row === r &&
          c >= p.col &&
          c < p.col + p.word.length) ||
        (p.dir === "down" &&
          p.col === c &&
          r >= p.row &&
          r < p.row + p.word.length);
      return inThisWord && isWordCorrect(p, ans);
    });
  };

  const findPrevEditableCell = (r, c, ans) => {
    let prev = findPrevCell(r, c);
    while (prev) {
      const [pr, pc] = prev;
      if (!isCellLockedBySolvedWord(pr, pc, ans)) return prev;
      prev = findPrevCell(pr, pc);
    }
    return null;
  };

  const deleteWithBackspace = (r, c) => {
    suppressFocusRef.current = true;           // prevent effect from jumping
    const next = answers.map((row) => [...row]);

    if (next[r][c] && !isCellLockedBySolvedWord(r, c, next)) {
      next[r][c] = "";
      setAnswers(next);
      inputRefs.current?.[r]?.[c]?.current?.focus();
      setActiveCell(`${r}-${c}`);
      queueMicrotask(() => (suppressFocusRef.current = false));
      return;
    }

    const prev = findPrevEditableCell(r, c, next);
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

  const isClueFilled = (clue, ans) => {
    if (!clue) return false;
    let filled = true;
    forEachCellInClue(clue, (r, c) => {
      if (!ans?.[r]?.[c]) filled = false;
    });
    return filled;
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

  useEffect(() => {
    const updateZoom = () => {
      const frame = gridFrameRef.current;
      const layer = gridLayerRef.current;
      if (!frame || !layer || !activeClue) {
        setGridZoomStyle({});
        return;
      }

      const isSmallScreen = window.innerWidth <= 900;
      if (!isSmallScreen) {
        setGridZoomStyle({});
        return;
      }

      if (manualZoomOut) {
        setGridZoomStyle({
          transform: `scale(${manualScale})`,
          transformOrigin: "center top",
        });
        return;
      }

      const probeCell = layer.querySelector(".cell:not(.block)");
      if (!probeCell) {
        setGridZoomStyle({});
        return;
      }

      const frameWidth = frame.clientWidth;
      const frameHeight = frame.clientHeight;
      const layerWidth = layer.scrollWidth;
      const layerHeight = layer.scrollHeight;
      const cellSize = probeCell.offsetWidth;
      if (!cellSize) {
        setGridZoomStyle({});
        return;
      }

      const { row, col, dir, word } = activeClue;
      const len = Math.max(1, word?.length || 1);

      const centerRow = dir === "down" ? row + (len - 1) / 2 : row;
      const centerCol = dir === "across" ? col + (len - 1) / 2 : col;

      const zoom = AUTO_ZOOM_SCALE;
      const focusX = (centerCol + 0.5) * cellSize;
      const focusY = (centerRow + 0.5) * cellSize;

      let tx = frameWidth / 2 - focusX * zoom;
      let ty = frameHeight / 2 - focusY * zoom;

      const minTx = frameWidth - layerWidth * zoom;
      const minTy = frameHeight - layerHeight * zoom;
      tx = Math.min(0, Math.max(minTx, tx));
      ty = Math.min(0, Math.max(minTy, ty));

      setGridZoomStyle({
        transform: `translate(${tx}px, ${ty}px) scale(${zoom})`,
      });
    };

    updateZoom();
    window.addEventListener("resize", updateZoom);
    return () => window.removeEventListener("resize", updateZoom);
  }, [activeClue, grid, refsReady, manualZoomOut, manualScale]);

  useEffect(() => {
    const updateDesktopCellSize = () => {
      if (!grid?.length || !grid?.[0]?.length) {
        setDesktopCellSize(null);
        return;
      }

      if (window.innerWidth <= 900) {
        setDesktopCellSize(null);
        return;
      }

      const rows = grid.length;
      const cols = grid[0].length;

      // Keep room for title/buttons/clue bar so puzzle fits without pushing clues off-screen.
      const widthBudget = Math.max(420, window.innerWidth * 0.83);
      const heightBudget = Math.max(300, window.innerHeight * 0.6);
      const byWidth = (widthBudget - 16) / cols;
      const byHeight = (heightBudget - 16) / rows;

      const size = Math.floor(Math.min(byWidth, byHeight));
      setDesktopCellSize(Math.max(34, Math.min(56, size)));
    };

    updateDesktopCellSize();
    window.addEventListener("resize", updateDesktopCellSize);
    return () => window.removeEventListener("resize", updateDesktopCellSize);
  }, [grid]);

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

    // Handle clue completion/misspelling transitions.
    if (activeClue) {
      const currentClueKey = buildClueKey(activeClue);
      const attemptCount = currentClueKey ? Number(wrongAttemptsByClue?.[currentClueKey] || 0) : 0;
      const expectedLetterAtCell =
        solutionLetter(r, c, placements)?.toUpperCase() || "";
      if (char && attemptCount >= 3 && char !== expectedLetterAtCell) {
        onWrongLetterPenalty?.(activeClue);
      }

      const wasCorrect = isWordCorrect(activeClue, answers);
      const nowCorrect = isWordCorrect(activeClue, next);
      const wasFilled = isClueFilled(activeClue, answers);
      const nowFilled = isClueFilled(activeClue, next);

      // If user fixes a previously incorrect clue, award and advance.
      if (!wasCorrect && nowCorrect) {
        if (manualZoomOut) {
          setManualZoomOut(false);
          setManualScale(1);
        }
        const firstTry = attemptCount === 0;
        setTimeout(() => onWordComplete?.(activeClue, { firstTry }), 150);
      } else if (!wasFilled && nowFilled && !nowCorrect) {
        // Track misspelled full-word attempts; per-letter penalties apply after 3 attempts.
        onWordMisspelled?.(activeClue);
      }
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

  // Make sure you have activeCell / setActiveCell and inputRefs in scope
  // and that inputRefs.current[r][c] is a ref object (it is, from your input code)

  const handleCellClick = (r, c) => {
    const id = `${r}-${c}`;
    setActiveCell(id);

    // Only do the scroll/zoom on small screens (phones/tablets)
    if (window.innerWidth <= 900) {
      // Get the actual input element from your ref grid
      const refObj = inputRefs.current?.[r]?.[c];
      const el = refObj?.current ?? refObj; // depending on how you created refs

      if (el && el.scrollIntoView) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center",
        });
      }
    }
  };

  const handleGridTouchStart = (e) => {
    if (window.innerWidth > 900) return;
    if (e.touches.length !== 2) return;
    const dist = touchDistance(e.touches);
    if (!dist) return;

    pinchRef.current = {
      active: true,
      startDistance: dist,
      startScale: manualZoomOut ? manualScale : AUTO_ZOOM_SCALE,
    };
  };

  const handleGridTouchMove = (e) => {
    if (window.innerWidth > 900) return;
    if (!pinchRef.current.active || e.touches.length !== 2) return;
    e.preventDefault();

    const dist = touchDistance(e.touches);
    if (!dist || !pinchRef.current.startDistance) return;
    const rawScale = pinchRef.current.startScale * (dist / pinchRef.current.startDistance);
    // Do not allow zooming out smaller than full-grid fit (scale 1).
    const nextScale = Math.max(1, Math.min(AUTO_ZOOM_SCALE, rawScale));

    setManualScale(nextScale);
    setManualZoomOut(nextScale < AUTO_ZOOM_SCALE - 0.01);
  };

  const handleGridTouchEnd = () => {
    pinchRef.current.active = false;

    // Restore focus to the active cell so typing can continue immediately.
    if (activeCell) {
      const [r, c] = activeCell.split("-").map(Number);
      const el = inputRefs.current?.[r]?.[c]?.current;
      if (el) {
        setTimeout(() => el.focus(), 0);
      }
    }
  };

  const handlePrevClueClick = () => {
    if (manualZoomOut) {
      setManualZoomOut(false);
      setManualScale(1);
    }
    onPrevClue?.();
  };

  const handleNextClueClick = () => {
    if (manualZoomOut) {
      setManualZoomOut(false);
      setManualScale(1);
    }
    onNextClue?.();
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

  const isDesktop = typeof window !== "undefined" && window.innerWidth > 900;
  const safeMinGridWidth =
    isDesktop && minGridWidth
      ? Math.max(0, Math.min(minGridWidth, window.innerWidth * 0.92))
      : 0;

  if (!grid || !answers) return <div>⚠️ Grid not ready</div>;

  return (
    <div
      className="crossword-wrapper"
      style={desktopCellSize ? { "--cell-size": `${desktopCellSize}px` } : undefined}
    >
      {/* GRID */}
      <div
        className="grid"
        ref={gridFrameRef}
        style={safeMinGridWidth ? { minWidth: `${safeMinGridWidth}px` } : undefined}
        onTouchStart={handleGridTouchStart}
        onTouchMove={handleGridTouchMove}
        onTouchEnd={handleGridTouchEnd}
        onTouchCancel={handleGridTouchEnd}
      >
        <div className="grid-zoom-layer" ref={gridLayerRef} style={gridZoomStyle}>
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
              const isInFlashWord = !!flashClue && isCellInClue(r, c, flashClue);

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

              const displayChar =
                showSolution
                  ? solutionLetter(r, c, placements)
                  : showClueAnswer && isInActiveClue
                  ? solutionLetter(r, c, placements)
                  : val;

                return (
                  <div
                    className={`cell ${ch === "#" ? "block" : ""} ${
                      isActive ? "active-cell" : ""
                    } ${isInActiveClue ? "active-clue-cell" : ""} ${
                      isInCorrectWord ? "correct-word" : ""
                    } ${isInFlashWord ? "flash-word-cell" : ""}`}
                    key={`${r}-${c}`}
                  >
                    {num && !isInCorrectWord && <span className="cell-num">{num}</span>}
                    {ch !== "#" && (
                      <input
                        data-coord={`${r}-${c}`}
                        ref={inputRefs.current?.[r]?.[c] || null}
                        type="text"
                        maxLength="1"
                        className="cell-input"
                        value={displayChar}
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
                    {ch !== "#" && <span className="cell-letter">{displayChar}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* CLUE BAR */}
      <ClueBar
        clue={activeClue}
        onPrev={handlePrevClueClick}
        onNext={handleNextClueClick}
      />

      {/* ON-SCREEN KEYBOARD */}
      <Keyboard onKeyPress={handleVirtualKey} />
    </div>
  );
}
