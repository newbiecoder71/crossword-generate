import React from "react";
import "./ClueBar.css";

export default function ClueBar({ clue, onPrev, onNext }) {
  if (!clue) return null;
  const { number, clue: clueText, dir } = clue;

  return (
    <div className="clue-bar">
      <button className="clue-btn" onClick={onPrev}>◀</button>
      <div className="clue-content">
        {number && <span className="clue-num">{number}</span>}
        <span className="clue-text">{clueText}</span>
        {dir && <span className="clue-dir">({dir})</span>}
      </div>
      <button className="clue-btn" onClick={onNext}>▶</button>
    </div>
  );
}
