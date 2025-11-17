import React from "react";
import "./ClueBar.css";

export default function ClueBar({ clue, onPrev, onNext }) {
  if (!clue) return null;
  const { number, clue: clueText, dir } = clue;

  const dirLabel =
    dir === "across" ? "Across" : dir === "down" ? "Down" : dir;

  return (
    <div className="clue-bar">
      <button className="clue-btn" onClick={onPrev}>◀</button>

      <div className="clue-content">
        {number && <span className="clue-num">{number}</span>}
        {dir && <span className="clue-dir">{dirLabel}</span>}

        {/* 🔥 marquee wrapper */}
        <div className="clue-marquee">
          <span className="clue-text">
            {clueText}
          </span>
        </div>
      </div>

      <button className="clue-btn" onClick={onNext}>▶</button>
    </div>
  );
}
