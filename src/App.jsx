/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import CrosswordGrid from "./components/CrosswordGrid.jsx";
import VoiceInput from "./components/VoiceInput.jsx";
import { buildCrossword, numberClues, buildClueLists, isWordCorrect } from "./utils/crossword.js";
import { getWordsAndClues } from "./utils/ai.js";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import splashLight from "./assets/splash-light.png";
import splashDark from "./assets/splash-dark.png";
import WordStormStart from "./components/WordStormStart.jsx";
import FloatingClue from "./components/FloatingClue.jsx";

export default function App() {
  // === PHASE CONTROL ===
  const [phase, setPhase] = useState("splash"); // splash → start → game

  // === CROSSWORD STATE ===
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(8);
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

  // === THEME ===
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "system");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    } else if (theme === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.add("dark");
        root.style.colorScheme = "dark";
      } else {
        root.classList.remove("dark");
        root.style.colorScheme = "light";
      }
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  // === SPLASH SCREEN FADE ===
  const [fadeOut, setFadeOut] = useState(false);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const { width, height } = useWindowSize();

  useEffect(() => {
    if (phase !== "splash") return;
    const fadeTimer = setTimeout(() => setFadeOut(true), 2000);
    const hideTimer = setTimeout(() => setPhase("start"), 2800);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [phase]);

  // === SAVE PROGRESS TO LOCALSTORAGE ===
  useEffect(() => {
    if (!puzzle) return;
    localStorage.setItem(
      "crossword-progress",
      JSON.stringify({
        topic: puzzle.topic ?? topic,
        grid: puzzle.grid,
        numbers: puzzle.numbers,
        placements: puzzle.placements,
        clues: puzzle.clues,
        answers,
        activeClue,
        direction,
      })
    );
  }, [puzzle, answers, activeClue, direction, topic]);

  useEffect(() => setShowClueAnswer(false), [activeClue]);

  useEffect(() => {
    // Only do this when we're in the game AND the clue answer is visible
    if (!showClueAnswer) return;
    if (phase !== "game" || !puzzle || !activeClue) return;
  
    const { row, col, dir, word } = activeClue;
    if (row == null || col == null) return;
  
    const timer = setTimeout(() => {
      // Try to focus the first *empty* cell for the current word
      for (let i = 0; i < word.length; i++) {
        const r = dir === "across" ? row : row + i;
        const c = dir === "across" ? col + i : col;
        const el = document.querySelector(`[data-coord="${r}-${c}"]`);
        if (el && !answers?.[r]?.[c]) {
          el.focus();
          return;
        }
      }
      // If everything is filled, focus the starting cell
      const firstEl = document.querySelector(`[data-coord="${row}-${col}"]`);
      firstEl?.focus();
    }, 0); // no need to wait 350ms here
  
    return () => clearTimeout(timer);
  }, [showClueAnswer, phase, puzzle, activeClue, answers]);  
  
  // === GENERATE CROSSWORD ===
  const handleGenerate = async (chosenTopic, chosenCount) => {
    setTopic(chosenTopic);
    setCount(chosenCount);
    setError("");
    setLoading(true);

    try {
      const wordsAndClues = await getWordsAndClues(chosenTopic.trim(), chosenCount);
      if (!wordsAndClues?.words?.length) throw new Error("Couldn't get words for that topic.");

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

      setPhase("game");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Cycle through clues
  const handlePrevClue = () => {
    if (!puzzle) return;

    const allClues = [
      ...puzzle.clues.across.map((c) => ({ ...c, dir: "across" })),
      ...puzzle.clues.down.map((c) => ({ ...c, dir: "down" })),
    ];

    if (!activeClue) {
      setActiveClue(allClues[0]);
      setDirection(allClues[0].dir);
      return;
    }

    const idx = allClues.findIndex(
      (c) => c.num === activeClue.num && c.dir === activeClue.dir
    );
    const prev = (idx - 1 + allClues.length) % allClues.length;

    setActiveClue(allClues[prev]);
    setDirection(allClues[prev].dir);
  };

  const handleNextClue = () => {
    if (!puzzle) return;

    const allClues = [
      ...puzzle.clues.across.map((c) => ({ ...c, dir: "across" })),
      ...puzzle.clues.down.map((c) => ({ ...c, dir: "down" })),
    ];

    if (!activeClue) {
      setActiveClue(allClues[0]);
      setDirection(allClues[0].dir);
      return;
    }

    const idx = allClues.findIndex(
      (c) => c.num === activeClue.num && c.dir === activeClue.dir
    );
    const next = (idx + 1) % allClues.length;

    setActiveClue(allClues[next]);
    setDirection(allClues[next].dir);
  };

  // === SPLASH SCREEN ===
  if (phase === "splash") {
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: prefersDark ? "#001F3F" : "#FFFFFF",
          opacity: fadeOut ? 0 : 1,
          transition: "opacity 0.8s ease-in-out",
        }}
      >
        <img
          src={prefersDark ? splashDark : splashLight}
          alt="Crossword Generate+ Splash"
          style={{
            width: "80%",
            maxWidth: "700px",
            borderRadius: "40px",
            transition: "opacity 0.8s ease-in-out",
          }}
        />
      </div>
    );
  }

  // === WORDSTORM START SCREEN ===
  if (phase === "start") {
    return <WordStormStart onStart={handleGenerate} />;
  }

  // === CROSSWORD GAME PHASE ===
  if (phase === "game" && puzzle) {
    const goToNextClue = (activeClue, clues, answers) => {
      const isAcross = activeClue.dir === "across";
      const currentList = isAcross ? clues.across : clues.down;
      const currentIndex = currentList.findIndex((c) => c.num === activeClue.num);

      for (let i = currentIndex + 1; i < currentList.length; i++) {
        const next = currentList[i];
        if (!isWordCorrect(next, answers)) return next;
      }

      const otherList = isAcross ? clues.down : clues.across;
      for (let i = 0; i < otherList.length; i++) {
        const next = otherList[i];
        if (!isWordCorrect(next, answers)) return next;
      }

      return null;
    };

    // make a flat list in the order you want
    const allClues = [
      ...puzzle.clues.across,
      ...puzzle.clues.down,
    ];

    // find current index
    const currentIndex = allClues.findIndex(
      (c) => c.num === activeClue?.num && c.dir === activeClue?.dir
    );

    // go to previous clue
    const handlePrevClue = () => {
      if (!allClues.length) return;
      // if we didn't find it, just go to first
      if (currentIndex === -1) {
        setActiveClue(allClues[0]);
        setDirection(allClues[0].dir);
        return;
      }
      const prevIndex =
        currentIndex > 0 ? currentIndex - 1 : allClues.length - 1;
      const prevClue = allClues[prevIndex];
      setActiveClue(prevClue);
      setDirection(prevClue.dir);
    };

    // go to next clue
    const handleNextClue = () => {
      if (!allClues.length) return;
      if (currentIndex === -1) {
        setActiveClue(allClues[0]);
        setDirection(allClues[0].dir);
        return;
      }
      const nextIndex =
        currentIndex < allClues.length - 1 ? currentIndex + 1 : 0;
      const nextClue = allClues[nextIndex];
      setActiveClue(nextClue);
      setDirection(nextClue.dir);
    };

    // ✅ Auto-focus first letter of the active clue after grid mounts

    return (
      <div className="app">
        <h1>Crossword Generate+</h1>

        {/* 🌙 / 🌞 Theme Toggle */}
        <div className="theme-toggle">
          <button onClick={toggleTheme} className="theme-btn">
            {theme === "dark"
              ? "🌙 Dark"
              : theme === "light"
              ? "🌞 Light"
              : "🖥 System"}
          </button>
        </div>

        <p className="tag">Topic: <strong>{puzzle.topic}</strong></p>

        {error && <div className="error">{error}</div>}

        <div className="action-buttons">
          <button
            className="btn-small"
            onClick={() => {
              setShowSolution(!showSolution);
              setTimeout(() => refocusGrid(), 0);
            }}
          >
            {showSolution ? "Hide Solution" : "Show Solution"}
          </button>

          <button
            className="btn-small"
            disabled={!activeClue}
            // 🖱️ Desktop: show while held
            onMouseDown={(e) => {
              // Don’t let the button steal focus away from the grid cell
              e.preventDefault();
              setShowClueAnswer(true);
            }}
            onMouseUp={() => {
              setShowClueAnswer(false);
              // just in case focus moved, force it back to the active cell
              refocusGrid();
            }}
            onMouseLeave={() => {
              // if they drag off the button while holding
              setShowClueAnswer(false);
              refocusGrid();
            }}
            // 📱 Touch: show while finger is down
            onTouchStart={(e) => {
              e.preventDefault(); // again, prevent focus steal
              setShowClueAnswer(true);
            }}
            onTouchEnd={() => {
              setShowClueAnswer(false);
              refocusGrid();
            }}
          >
            Show Clue Answer
          </button>

          <button className="btn-small"
            onClick={() => {
              window.print();
              setTimeout(() => refocusGrid(), 0);
            }}
          >
            Print Puzzle
          </button>
        </div>

        <div className="grid-and-clues">
          <CrosswordGrid
            grid={puzzle.grid}
            numbers={puzzle.numbers}
            placements={puzzle.placements}
            answers={answers}
            setAnswers={setAnswers}
            setPuzzleComplete={setPuzzleComplete}
            direction={direction}
            setDirection={setDirection}
            activeClue={activeClue}
            setActiveClue={setActiveClue}
            clues={puzzle.clues}
            showSolution={showSolution}
            showClueAnswer={showClueAnswer}
            onPrevClue={handlePrevClue}
            onNextClue={handleNextClue}
            onRefocusReady={setRefocusGrid}
            onWordComplete={(clue) => {
              const next = goToNextClue(clue, puzzle.clues, answers);
              if (next) {
                setActiveClue(next);
                setDirection(next.dir);
              }
            }}
          />

          <div className="clues">
            <h3>Across</h3>
            <ul className="clue-list">
              {puzzle.clues.across.map((c) => (
                <li
                  key={`across-${c.num}`}
                  onClick={() => {
                    setActiveClue(c);
                    setDirection(c.dir);
                  }}
                  className={`
                    ${activeClue?.num === c.num && activeClue?.dir === "across" ? "active-clue" : ""}
                    ${isWordCorrect(c, answers) ? "solved" : ""}
                  `}
                  style={{ cursor: "pointer" }}
                >
                  <span className="clue-num">{c.num}</span>
                  <span className="clue-text">{c.clue}</span>
                </li>
              ))}
            </ul>

            <h3>Down</h3>
            <ul className="clue-list">
              {puzzle.clues.down.map((c) => (
                <li
                  key={`down-${c.num}`}
                  onClick={() => {
                    setActiveClue(c);
                    setDirection(c.dir);
                  }}
                  className={`
                    ${activeClue?.num === c.num && activeClue?.dir === "down" ? "active-clue" : ""}
                    ${isWordCorrect(c, answers) ? "solved" : ""}
                  `}
                  style={{ cursor: "pointer" }}
                >
                  <span className="clue-num">{c.num}</span>
                  <span className="clue-text">{c.clue}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {puzzleComplete && (
          <>
            <Confetti width={width} height={height} />
            <div className="end-screen">
              <h2>🎉 Congratulations! You Solved it!</h2>
              <div className="end-buttons">
                <button
                  className="btn"
                  onClick={() => {
                    localStorage.removeItem("crossword-progress");
                    setPuzzle(null);
                    setAnswers([]);
                    setPuzzleComplete(false);
                    setActiveClue(null);
                    setShowSolution(false);
                    setPhase("start");
                  }}
                >
                  Play Again
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    localStorage.removeItem("crossword-progress");
                    setPuzzle(null);
                    setAnswers([]);
                    setPuzzleComplete(false);
                    setActiveClue(null);
                    setShowSolution(false);
                    setTopic("");
                    setCount(10);
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
