import React, { useState } from "react";
import "./Keyboard.css";

export default function Keyboard({ onKeyPress }) {
  const [pressedKey, setPressedKey] = useState(null);
  const [previewKey, setPreviewKey] = useState(null);

  const rows = [
    "QWERTYUIOP".split(""),
    "ASDFGHJKL".split(""),
    "ZXCVBNM".split(""),
  ];

  const isLetterKey = (key) => /^[A-Z]$/.test(key);

  const handlePressStart = (key) => {
    setPressedKey(key);
    if (isLetterKey(key)) {
      setPreviewKey(key);
    }
  };

  const handlePressEnd = () => {
    setPressedKey(null);
    setTimeout(() => setPreviewKey(null), 120);
  };

  const pointerDown = (key) => (e) => {
    e.preventDefault();
    handlePressStart(key);
  };

  return (
    <div className="keyboard-container">
      {rows.map((row, i) => (
        <div className="keyboard-row" key={i}>
          {row.map((ch) => (
            <button
              key={ch}
              className={`key ${pressedKey === ch ? "pressed" : ""}`}
              onPointerDown={pointerDown(ch)}
              onPointerUp={handlePressEnd}
              onPointerCancel={handlePressEnd}
              onPointerLeave={handlePressEnd}
              onClick={() => onKeyPress(ch)}
            >
              {ch}
              {previewKey === ch && <span className="key-preview">{ch}</span>}
            </button>
          ))}
        </div>
      ))}
      <div className="keyboard-row">
        <button
          className={`key special ${pressedKey === "BACKSPACE" ? "pressed" : ""}`}
          onPointerDown={pointerDown("BACKSPACE")}
          onPointerUp={handlePressEnd}
          onPointerCancel={handlePressEnd}
          onPointerLeave={handlePressEnd}
          onClick={() => onKeyPress("BACKSPACE")}
        >
          ?
        </button>
        <button
          className={`key special ${pressedKey === "CLEAR" ? "pressed" : ""}`}
          onPointerDown={pointerDown("CLEAR")}
          onPointerUp={handlePressEnd}
          onPointerCancel={handlePressEnd}
          onPointerLeave={handlePressEnd}
          onClick={() => onKeyPress("CLEAR")}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
