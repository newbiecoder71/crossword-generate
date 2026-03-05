import React, { useEffect, useRef, useState } from "react";
import "./ClueBar.css";

export default function ClueBar({ clue, onPrev, onNext }) {
  const marqueeRef = useRef(null);
  const textRef = useRef(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const { number, clue: clueText = "", dir } = clue || {};

  const dirLabel =
    dir === "across" ? "Across" : dir === "down" ? "Down" : dir;

  useEffect(() => {
    if (!clue) return;

    const checkOverflow = () => {
      const container = marqueeRef.current;
      const text = textRef.current;
      if (!container || !text) return;
      setShouldScroll(text.scrollWidth > container.clientWidth);
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [clue, clueText]);

  if (!clue) return null;

  return (
    <div className="clue-bar">
      <button className="clue-btn" onClick={onPrev}>◀</button>

      <div className="clue-content">
        {number && <span className="clue-num">{number}</span>}
        {dir && <span className="clue-dir">{dirLabel}</span>}

        {/* 🔥 marquee wrapper */}
        <div className="clue-marquee" ref={marqueeRef}>
          <span
            ref={textRef}
            className={`clue-text ${shouldScroll ? "scrolling" : ""}`}
          >
            {clueText}
          </span>
        </div>
      </div>

      <button className="clue-btn" onClick={onNext}>▶</button>
    </div>
  );
}
