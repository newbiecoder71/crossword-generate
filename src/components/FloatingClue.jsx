// src/components/FloatingClue.jsx
import React from "react";
import "./FloatingClue.css";

export default function FloatingClue({ activeClue, onPrev, onNext }) {
  // don't show anything if we don't have a clue
  if (!activeClue) return null;

  const { clue, word, number, dir } = activeClue; // adjust to your data shape

  return (
    <div className="floating-clue floating-clue-bottom">
      {onPrev && (
        <button className="arrow-btn" onClick={onPrev}>
          ◀
        </button>
      )}

      <div className="clue-text">
        {number && <span className="bubble-num">{number}</span>}
        <span className="bubble-clue">{clue || word || "Current clue"}</span>
        {dir && (
          <span style={{ fontSize: "0.7rem", opacity: 0.6, marginLeft: 4 }}>
            ({dir})
          </span>
        )}
      </div>

      {onNext && (
        <button className="arrow-btn" onClick={onNext}>
          ▶
        </button>
      )}
    </div>
  );
}
