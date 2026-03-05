import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./WordStorm.css";

export default function WordStormStart({
  onStart,
  loading,
  startExiting = false,
  highScore = 0,
  unfinishedGames = [],
  onContinue,
  onNewGame,
}) {
  const [showInputs, setShowInputs] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [topic, setTopic] = useState("");
  const MotionSpan = motion.span;
  const MotionDiv = motion.div;

  const letters = [..."CROSSWORD".split(""), " ", ..."GENERATE".split(""), " ", "+"];

  useEffect(() => {
    const timer = setTimeout(() => setShowInputs(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const moveEyes = (event) => {
      const eyes = document.querySelectorAll(".speech-eyes .eye");
      eyes.forEach((eye) => {
        const pupil = eye.querySelector(".pupil");
        if (!pupil) return;

        const rect = eye.getBoundingClientRect();
        const eyeCenterX = rect.left + rect.width / 2;
        const eyeCenterY = rect.top + rect.height / 2;
        const dx = event.clientX - eyeCenterX;
        const dy = event.clientY - eyeCenterY;
        const angle = Math.atan2(dy, dx);
        const radius = 4;

        pupil.style.transform = `translate(${Math.cos(angle) * radius}px, ${Math.sin(angle) * radius}px)`;
      });
    };

    window.addEventListener("mousemove", moveEyes);
    return () => window.removeEventListener("mousemove", moveEyes);
  }, []);

  const triggerGenerate = () => {
    if (!topic.trim() || loading) return;
    onStart(topic);
  };

  return (
    <div className={`wordstorm-container ${startExiting ? "exit" : ""}`}>
      {Array.from({ length: 30 }).map((_, i) => (
        <MotionSpan
          key={i}
          className="floating-letter"
          initial={{
            x: Math.random() * 1600 - 800,
            y: Math.random() * 1000 - 500,
            opacity: 0,
            scale: 0.3,
          }}
          animate={{
            x: Math.random() * 800 - 400,
            y: Math.random() * 600 - 300,
            opacity: 0.5,
            scale: 0.6,
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            repeatType: "reverse",
            delay: Math.random() * 3,
          }}
        >
          {String.fromCharCode(65 + Math.floor(Math.random() * 26))}
        </MotionSpan>
      ))}

      <div className="wordstorm-title">
        {letters.map((ch, i) => {
          const width = typeof window !== "undefined" ? window.innerWidth : 1000;
          const height = typeof window !== "undefined" ? window.innerHeight : 800;

          const edge = ["top", "bottom", "left", "right"][Math.floor(Math.random() * 4)];
          const start = {
            x: edge === "left" ? -width : edge === "right" ? width : 0,
            y: edge === "top" ? -height : edge === "bottom" ? height : 0,
            opacity: 0,
            scale: 2,
            rotate: Math.random() * 360,
          };

          return (
            <MotionSpan
              key={i}
              className={`title-letter${ch === " " ? " space" : ""}`}
              initial={start}
              animate={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
              transition={{
                delay: 0.08 * i,
                duration: 1.2,
                type: "spring",
                stiffness: 70,
              }}
            >
              {ch}
            </MotionSpan>
          );
        })}
      </div>

      <div className="start-top-row">
        <div className="high-score-panel">Highest Score: {highScore}</div>
        {!showSetup && (
          <button
            className="wordstorm-btn new-game-top-btn"
            onClick={() => {
              onNewGame?.();
              setShowSetup(true);
            }}
          >
            New Game
          </button>
        )}
      </div>

      <AnimatePresence>
        {showInputs && (
          <MotionDiv
            className="wordstorm-controls"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2 }}
          >
            {!showSetup && (
              <div className="unfinished-list">
                <h3>Unfinished Games</h3>
                {unfinishedGames.length === 0 && (
                  <p className="unfinished-empty">No unfinished games yet.</p>
                )}
                {unfinishedGames.map((entry) => (
                  <div className="unfinished-item" key={entry.saveId}>
                    <span className="unfinished-topic">{entry.topic || "Untitled Topic"}</span>
                    <button
                      className="wordstorm-btn continue-btn"
                      onClick={() => onContinue?.(entry.saveId)}
                    >
                      Continue
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showSetup && (
              <>
                <input
                  type="text"
                  placeholder="Type your topic..."
                  className="wordstorm-input"
                  value={topic}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTopic(
                      value ? value.charAt(0).toUpperCase() + value.slice(1) : ""
                    );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      triggerGenerate();
                    }
                  }}
                  autoFocus
                />
                <button
                  className={`wordstorm-btn ${loading ? "loading" : ""}`}
                  onClick={triggerGenerate}
                  disabled={loading || !topic.trim()}
                >
                  {loading ? <em>Generating...</em> : "Generate"}
                </button>
              </>
            )}
          </MotionDiv>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInputs && showSetup && (
          <MotionDiv
            className="speech-bubble-container"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ delay: 1.0, duration: 1.2, ease: "easeOut" }}
          >
            <div className="speech-bubble cloud-bot">
              <div className="speech-eyes">
                <div className="eye left">
                  <div className="pupil"></div>
                </div>
                <div className="eye right">
                  <div className="pupil"></div>
                </div>
              </div>
              <strong>Hey there!</strong> Type a topic, then tap Generate.
              <div className="tail"></div>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}
