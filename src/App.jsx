import React, { useEffect, useRef, useState } from "react";
import CrosswordGrid from "./components/CrosswordGrid.jsx";
import {
  buildCrossword,
  numberClues,
  buildClueLists,
  isPuzzleComplete,
  isWordCorrect,
} from "./utils/crossword.js";
import { getWordsAndClues } from "./utils/ai.js";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import WordStormStart from "./components/WordStormStart.jsx";

const clueKey = (clue) =>
  clue ? `${clue.dir}:${clue.row}:${clue.col}:${clue.word?.length ?? 0}` : null;

const isValidSavedGame = (data) =>
  !!(data?.grid && data?.numbers && data?.placements && data?.clues);
const isCompletedGame = (data) =>
  !!(data && isValidSavedGame(data) && isPuzzleComplete(data.placements, data.answers || []));
const UNFINISHED_GAMES_KEY = "crossword-progress-list";

const readUnfinishedGames = () => {
  const listRaw = localStorage.getItem(UNFINISHED_GAMES_KEY);
  let list = [];
  if (listRaw) {
    try {
      const parsed = JSON.parse(listRaw);
      if (Array.isArray(parsed)) {
        list = parsed.filter((entry) => isValidSavedGame(entry) && !isCompletedGame(entry));
      }
    } catch {
      list = [];
    }
  }

  // Backward compatibility with older single-save key
  const legacyRaw = localStorage.getItem("crossword-progress");
  if (legacyRaw) {
    try {
      const legacy = JSON.parse(legacyRaw);
      if (
        isValidSavedGame(legacy) &&
        !isCompletedGame(legacy) &&
        !list.some((entry) => entry.saveId && entry.saveId === legacy.saveId)
      ) {
        list.push({
          ...legacy,
          saveId: legacy.saveId || `${Date.now()}-${Math.random()}`,
          updatedAt: legacy.updatedAt || Date.now(),
        });
      }
    } catch {
      // ignore legacy parse failures
    }
  }

  return list.sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
};

const writeUnfinishedGames = (list) => {
  localStorage.setItem(UNFINISHED_GAMES_KEY, JSON.stringify(list));
};

const getAutoWordCount = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const shortSide = Math.min(width, height);

  if (shortSide <= 420) return 8;
  if (shortSide <= 540) return 9;
  if (shortSide <= 700) return 10;
  if (shortSide <= 900) return 12;
  return 14;
};

export default function App() {
  const [phase, setPhase] = useState("start"); // start -> game

  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [puzzle, setPuzzle] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [direction, setDirection] = useState("across");
  const [activeClue, setActiveClue] = useState(null);
  const [puzzleComplete, setPuzzleComplete] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showClueAnswer, setShowClueAnswer] = useState(false);
  const [refocusGrid, setRefocusGrid] = useState(() => () => {});

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(
    () => Number(localStorage.getItem("crossword-high-score") || 0)
  );
  const [scoreBursts, setScoreBursts] = useState([]);
  const [scoreBurstPath, setScoreBurstPath] = useState({
    dx70: "0px",
    dy70: "0px",
    dx100: "0px",
    dy100: "0px",
  });
  const [flashClue, setFlashClue] = useState(null);
  const [scoredClueKeys, setScoredClueKeys] = useState([]);
  const [freeClueUses, setFreeClueUses] = useState(
    () => Number(localStorage.getItem("crossword-free-clue-uses") || 0)
  );
  const [unfinishedGames, setUnfinishedGames] = useState([]);
  const [currentSaveId, setCurrentSaveId] = useState(null);
  const [startExiting, setStartExiting] = useState(false);
  const puzzleBonusAwardedRef = useRef(false);
  const scoreBoardRef = useRef(null);

  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "system"
  );

  const { width, height } = useWindowSize();

  useEffect(() => {
    if (phase === "start" || phase === "game") {
      document.documentElement.classList.remove("boot-dark");
    }
  }, [phase]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    } else if (theme === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      const systemPrefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      root.classList.toggle("dark", systemPrefersDark);
      root.style.colorScheme = systemPrefersDark ? "dark" : "light";
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  useEffect(() => {
    if (score <= highScore) return;
    setHighScore(score);
    localStorage.setItem("crossword-high-score", String(score));
  }, [score, highScore]);

  useEffect(() => {
    localStorage.setItem("crossword-free-clue-uses", String(freeClueUses));
  }, [freeClueUses]);

  useEffect(() => {
    if (phase !== "start" && phase !== "game") return;
    setUnfinishedGames(readUnfinishedGames());
  }, [phase]);

  useEffect(() => {
    if (!puzzle || !currentSaveId) return;
    const snapshot = {
      saveId: currentSaveId,
      updatedAt: Date.now(),
      topic: puzzle.topic ?? topic,
      grid: puzzle.grid,
      numbers: puzzle.numbers,
      placements: puzzle.placements,
      clues: puzzle.clues,
      answers,
      activeClue,
      direction,
      score,
      scoredClueKeys,
      freeClueUses,
      puzzleComplete,
    };

    setUnfinishedGames((prev) => {
      const next = prev.filter((entry) => entry.saveId !== currentSaveId);
      next.push(snapshot);
      const sorted = next.sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
      writeUnfinishedGames(sorted);
      localStorage.setItem("crossword-progress", JSON.stringify(snapshot));
      return sorted;
    });
  }, [puzzle, answers, activeClue, direction, topic, score, scoredClueKeys, freeClueUses, puzzleComplete, currentSaveId]);

  useEffect(() => setShowClueAnswer(false), [activeClue]);

  useEffect(() => {
    if (!puzzleComplete || !currentSaveId) return;
    setUnfinishedGames((prev) => {
      const next = prev.filter((entry) => entry.saveId !== currentSaveId);
      writeUnfinishedGames(next);
      return next;
    });
  }, [puzzleComplete, currentSaveId]);

  useEffect(() => {
    if (!puzzleComplete || puzzleBonusAwardedRef.current) return;
    setFreeClueUses((prev) => prev + 1);
    puzzleBonusAwardedRef.current = true;
  }, [puzzleComplete]);

  useEffect(() => {
    if (!showClueAnswer) return;
    if (phase !== "game" || !puzzle || !activeClue) return;

    const { row, col, dir, word } = activeClue;
    if (row == null || col == null) return;

    const timer = setTimeout(() => {
      for (let i = 0; i < word.length; i++) {
        const r = dir === "across" ? row : row + i;
        const c = dir === "across" ? col + i : col;
        const el = document.querySelector(`[data-coord="${r}-${c}"]`);
        if (el && !answers?.[r]?.[c]) {
          el.focus();
          return;
        }
      }
      const firstEl = document.querySelector(`[data-coord="${row}-${col}"]`);
      firstEl?.focus();
    }, 0);

    return () => clearTimeout(timer);
  }, [showClueAnswer, phase, puzzle, activeClue, answers]);

  useEffect(() => {
    const updateScoreBurstPath = () => {
      const scoreEl = scoreBoardRef.current;
      if (!scoreEl) return;

      const rect = scoreEl.getBoundingClientRect();
      const startX = window.innerWidth * 0.5;
      const startY = window.innerHeight * 0.58;
      const targetX = rect.left + rect.width / 2;
      const targetY = rect.top + rect.height / 2;

      const dx = targetX - startX;
      const dy = targetY - startY;

      setScoreBurstPath({
        dx70: `${dx * 0.92}px`,
        dy70: `${dy * 0.92}px`,
        dx100: `${dx}px`,
        dy100: `${dy}px`,
      });
    };

    updateScoreBurstPath();
    window.addEventListener("resize", updateScoreBurstPath);
    return () => window.removeEventListener("resize", updateScoreBurstPath);
  }, [phase]);

  const spawnScoreBurst = (delta) => {
    const id = `${Date.now()}-${Math.random()}`;
    setScoreBursts((prev) => [...prev, { id, delta }]);
    setTimeout(() => {
      setScoreBursts((prev) => prev.filter((entry) => entry.id !== id));
    }, 1200);
  };

  const restoreGame = (data) => {
    if (!isValidSavedGame(data)) return;
    const completed = Boolean(data.puzzleComplete) || isCompletedGame(data);

    setPuzzle({
      grid: data.grid,
      numbers: data.numbers,
      placements: data.placements,
      clues: data.clues,
      topic: data.topic ?? "",
    });
    setAnswers(Array.isArray(data.answers) ? data.answers : []);
    setActiveClue(data.activeClue ?? null);
    setDirection(data.direction ?? "across");
    setTopic(data.topic ?? "");
    setScore(Number(data.score || 0));
    setScoredClueKeys(Array.isArray(data.scoredClueKeys) ? data.scoredClueKeys : []);
    setPuzzleComplete(completed);
    setShowSolution(false);
    setShowClueAnswer(false);
    setFlashClue(null);
    puzzleBonusAwardedRef.current = false;
    setCurrentSaveId(data.saveId || `${Date.now()}-${Math.random()}`);
    setPhase("game");
  };

  const handleContinueGame = (saveId) => {
    const selected = unfinishedGames.find((entry) => entry.saveId === saveId);
    if (!selected) return;
    restoreGame(selected);
  };

  const handleNewGame = () => {
    localStorage.removeItem("crossword-progress");
    setPuzzle(null);
    setAnswers([]);
    setActiveClue(null);
    setCurrentSaveId(null);
    setScore(0);
    setScoredClueKeys([]);
    setFlashClue(null);
    setPuzzleComplete(false);
    setShowSolution(false);
    setShowClueAnswer(false);
    setStartExiting(false);
    puzzleBonusAwardedRef.current = false;
  };

  const handleGenerate = async (chosenTopic) => {
    handleNewGame();
    const saveId = `${Date.now()}-${Math.random()}`;

    setTopic(chosenTopic);
    setError("");
    setLoading(true);
    const autoWordCount = getAutoWordCount();

    try {
      const wordsAndClues = await getWordsAndClues(
        chosenTopic.trim(),
        autoWordCount
      );
      if (!wordsAndClues?.words?.length) {
        throw new Error("Couldn't get words for that topic.");
      }

      const result = buildCrossword(wordsAndClues.words);
      if (!result?.grid) throw new Error("Failed to place enough words.");

      const numbered = numberClues(result.grid, result.placements);
      const clues = buildClueLists(numbered, wordsAndClues.clues);

      setPuzzle({
        grid: result.grid,
        numbers: numbered.numbers,
        placements: result.placements,
        clues,
        topic: chosenTopic.trim(),
      });
      setCurrentSaveId(saveId);

      setAnswers(
        Array.from({ length: result.grid.length }, () =>
          Array(result.grid[0].length).fill("")
        )
      );

      const firstClue = clues.across[0] || clues.down[0] || null;
      if (firstClue) {
        setActiveClue(firstClue);
        setDirection(firstClue.dir);
      }

      setStartExiting(true);
      await new Promise((resolve) => setTimeout(resolve, 350));
      setPhase("game");
    } catch (e) {
      setError(e.message);
      setStartExiting(false);
    } finally {
      setLoading(false);
    }
  };

  const handleWordCompleteScore = (clue) => {
    const key = clueKey(clue);
    if (!key || scoredClueKeys.includes(key)) return;

    const gained = Math.max(3, clue.word?.length || 0);
    setScoredClueKeys((prev) => [...prev, key]);
    setScore((prev) => prev + gained);
    spawnScoreBurst(gained);

    setFlashClue(clue);
    setTimeout(() => setFlashClue(null), 550);
  };

  const handleWordMisspelledScore = () => {
    setScore((prev) => prev - 1);
    spawnScoreBurst(-1);
  };

  const handleQuitGame = () => {
    const snapshot = puzzle
      ? {
          saveId: currentSaveId || `${Date.now()}-${Math.random()}`,
          updatedAt: Date.now(),
          topic: puzzle.topic ?? topic,
          grid: puzzle.grid,
          numbers: puzzle.numbers,
          placements: puzzle.placements,
          clues: puzzle.clues,
          answers,
          activeClue,
          direction,
          score,
          scoredClueKeys,
          freeClueUses,
          puzzleComplete,
        }
      : null;

    if (snapshot) {
      localStorage.setItem("crossword-progress", JSON.stringify(snapshot));
      setUnfinishedGames((prev) => {
        const next = prev.filter((entry) => entry.saveId !== snapshot.saveId);
        next.push(snapshot);
        const sorted = next.sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
        writeUnfinishedGames(sorted);
        return sorted;
      });
    }

    setStartExiting(false);
    setPhase("start");
  };

  if (phase === "start") {
    return (
      <WordStormStart
        onStart={handleGenerate}
        loading={loading}
        startExiting={startExiting}
        highScore={highScore}
        unfinishedGames={unfinishedGames}
        onContinue={handleContinueGame}
        onNewGame={handleNewGame}
      />
    );
  }

  if (phase === "game" && puzzle) {
    const allClues = [...puzzle.clues.across, ...puzzle.clues.down];
    const goToNextClue = (currentClue, currentAnswers) => {
      if (!currentClue || !allClues.length) return null;

      const startIndex = allClues.findIndex(
        (c) => c.num === currentClue.num && c.dir === currentClue.dir
      );
      if (startIndex === -1) return null;

      for (let i = 1; i <= allClues.length; i++) {
        const idx = (startIndex + i) % allClues.length;
        const candidate = allClues[idx];
        if (!isWordCorrect(candidate, currentAnswers)) return candidate;
      }

      return null;
    };
    const isClueSolved = (clue) => isWordCorrect(clue, answers);
    const currentIndex = allClues.findIndex(
      (c) => c.num === activeClue?.num && c.dir === activeClue?.dir
    );

    const handlePrevClue = () => {
      if (!allClues.length) return;

      if (currentIndex === -1) {
        const lastUnsolved = [...allClues].reverse().find((c) => !isClueSolved(c));
        if (lastUnsolved) {
          setActiveClue(lastUnsolved);
          setDirection(lastUnsolved.dir);
        }
        return;
      }

      let idx = currentIndex;
      for (let i = 0; i < allClues.length; i++) {
        idx = (idx - 1 + allClues.length) % allClues.length;
        const candidate = allClues[idx];
        if (!isClueSolved(candidate)) {
          setActiveClue(candidate);
          setDirection(candidate.dir);
          return;
        }
      }
    };

    const handleNextClue = () => {
      if (!allClues.length) return;

      if (currentIndex === -1) {
        const firstUnsolved = allClues.find((c) => !isClueSolved(c));
        if (firstUnsolved) {
          setActiveClue(firstUnsolved);
          setDirection(firstUnsolved.dir);
        }
        return;
      }

      let idx = currentIndex;
      for (let i = 0; i < allClues.length; i++) {
        idx = (idx + 1) % allClues.length;
        const candidate = allClues[idx];
        if (!isClueSolved(candidate)) {
          setActiveClue(candidate);
          setDirection(candidate.dir);
          return;
        }
      }
    };

    const scheduleRefocus = () => {
      setTimeout(() => refocusGrid(), 0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => refocusGrid());
      });
    };

    const handleClueAnswerPressStart = (e) => {
      e.preventDefault();
      if (!activeClue) return;

      if (freeClueUses > 0) {
        setFreeClueUses((prev) => Math.max(0, prev - 1));
      } else {
        setScore((prev) => prev - 1);
        spawnScoreBurst(-1);
      }
      setShowClueAnswer(true);
    };

    const handleClueAnswerPressEnd = () => {
      setShowClueAnswer(false);
      scheduleRefocus();
    };

    return (
      <div className="app">
        <div className="theme-toggle">
          <button onClick={toggleTheme} className="theme-btn">
            {theme === "dark"
              ? "Dark"
              : theme === "light"
              ? "Light"
              : "System"}
          </button>
        </div>

        <div
          className="score-burst-layer"
          style={{
            "--score-dx-70": scoreBurstPath.dx70,
            "--score-dy-70": scoreBurstPath.dy70,
            "--score-dx-100": scoreBurstPath.dx100,
            "--score-dy-100": scoreBurstPath.dy100,
          }}
        >
          {scoreBursts.map((burst) => (
            <div
              key={burst.id}
              className={`score-burst ${burst.delta > 0 ? "plus" : "minus"}`}
            >
              {burst.delta > 0 ? `+${burst.delta}` : burst.delta}
            </div>
          ))}
        </div>

        <div className="grid-and-clues">
          <div className="game-main">
            <h1>Crossword Generate+</h1>
            <div className="score-inline-row">
              <div className="score-board" ref={scoreBoardRef}>
                Score: {score}
              </div>
            </div>

            <p className="tag">
              Topic: <strong>{puzzle.topic}</strong>
            </p>

            {error && <div className="error">{error}</div>}

            <div className="action-buttons">
              <button
                className="btn-small"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={() => {
                  setShowSolution(!showSolution);
                  scheduleRefocus();
                }}
              >
                {showSolution ? "Hide Solution" : "Show Solution"}
              </button>

              <button
                className="btn-small clue-answer-btn"
                disabled={!activeClue}
                onPointerDown={handleClueAnswerPressStart}
                onPointerUp={handleClueAnswerPressEnd}
                onPointerLeave={handleClueAnswerPressEnd}
                onPointerCancel={handleClueAnswerPressEnd}
              >
                {freeClueUses > 0 && (
                  <span className="clue-answer-badge">{freeClueUses}</span>
                )}
                Show Clue Answer
              </button>

              <button
                className="btn-small"
                onClick={() => {
                  window.print();
                  setTimeout(() => refocusGrid(), 0);
                }}
              >
                Print Puzzle
              </button>

              <button className="btn-small quit-btn" onClick={handleQuitGame}>
                Quit Game
              </button>
            </div>

            <CrosswordGrid
              grid={puzzle.grid}
              numbers={puzzle.numbers}
              placements={puzzle.placements}
              answers={answers}
              setAnswers={setAnswers}
              setPuzzleComplete={setPuzzleComplete}
              direction={direction}
              activeClue={activeClue}
              showSolution={showSolution}
              showClueAnswer={showClueAnswer}
              flashClue={flashClue}
              onPrevClue={handlePrevClue}
              onNextClue={handleNextClue}
              onWordMisspelled={handleWordMisspelledScore}
              onRefocusReady={setRefocusGrid}
              onWordComplete={(clue) => {
                handleWordCompleteScore(clue);
                const next = goToNextClue(clue, answers);
                if (next) {
                  setActiveClue(next);
                  setDirection(next.dir);
                }
              }}
            />
          </div>
        </div>

        {puzzleComplete && (
          <>
            <Confetti width={width} height={height} />
            <div className="end-screen">
              <h2>Congratulations! You solved it!</h2>
              <div className="end-buttons">
                <button
                  className="btn"
                  onClick={() => {
                    localStorage.removeItem("crossword-progress");
                    if (currentSaveId) {
                      setUnfinishedGames((prev) => {
                        const next = prev.filter((entry) => entry.saveId !== currentSaveId);
                        writeUnfinishedGames(next);
                        return next;
                      });
                    }
                    setPuzzle(null);
                    setAnswers([]);
                    setPuzzleComplete(false);
                    setActiveClue(null);
                    setCurrentSaveId(null);
                    setShowSolution(false);
                    setScore(0);
                    setScoredClueKeys([]);
                    setStartExiting(false);
                    setPhase("start");
                  }}
                >
                  Play Again
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    localStorage.removeItem("crossword-progress");
                    if (currentSaveId) {
                      setUnfinishedGames((prev) => {
                        const next = prev.filter((entry) => entry.saveId !== currentSaveId);
                        writeUnfinishedGames(next);
                        return next;
                      });
                    }
                    setPuzzle(null);
                    setAnswers([]);
                    setPuzzleComplete(false);
                    setActiveClue(null);
                    setCurrentSaveId(null);
                    setShowSolution(false);
                    setTopic("");
                    setScore(0);
                    setScoredClueKeys([]);
                    setStartExiting(false);
                    setPhase("start");
                  }}
                >
                  Exit
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}
