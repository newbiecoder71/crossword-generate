import React, { useState } from "react";
import "./Keyboard.css";

export default function Keyboard({ onKeyPress }) {
  const [pressedKey, setPressedKey] = useState(null);
  const [preview, setPreview] = useState(null);

  const rows = [
    "QWERTYUIOP".split(""),
    "ASDFGHJKL".split(""),
    "ZXCVBNM".split(""),
  ];

  const isLetterKey = (key) => /^[A-Z]$/.test(key);

  const handlePressStart = (key) => {
    setPressedKey(key);

    if (isLetterKey(key)) {
      const id = `${Date.now()}-${Math.random()}`;
      setPreview({ key, id });
      setTimeout(() => {
        setPreview((prev) => (prev?.id === id ? null : prev));
      }, 180);
    }

    onKeyPress(key);

    // Safety release in case pointerup is missed on some mobile browsers.
    setTimeout(() => {
      setPressedKey((prev) => (prev === key ? null : prev));
    }, 120);
  };

  const handlePressEnd = () => {
    setPressedKey(null);
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
            >
              {ch}
              {preview?.key === ch && <span className="key-preview">{ch}</span>}
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
        >
          ?
        </button>

        <button
          className={`key special ${pressedKey === "CLEAR" ? "pressed" : ""}`}
          onPointerDown={pointerDown("CLEAR")}
          onPointerUp={handlePressEnd}
          onPointerCancel={handlePressEnd}
          onPointerLeave={handlePressEnd}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
