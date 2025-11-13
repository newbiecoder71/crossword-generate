import React from "react";
import "./Keyboard.css";

export default function Keyboard({ onKeyPress }) {
  const rows = [
    "QWERTYUIOP".split(""),
    "ASDFGHJKL".split(""),
    "ZXCVBNM".split(""),
  ];

  return (
    <div className="keyboard-container">
      {rows.map((row, i) => (
        <div className="keyboard-row" key={i}>
          {row.map((ch) => (
            <button
              key={ch}
              className="key"
              onClick={() => onKeyPress(ch)}
            >
              {ch}
            </button>
          ))}
        </div>
      ))}
      <div className="keyboard-row">
        <button className="key special" onClick={() => onKeyPress("BACKSPACE")}>⌫</button>
        <button className="key special" onClick={() => onKeyPress("CLEAR")}>Clear</button>
      </div>
    </div>
  );
}

