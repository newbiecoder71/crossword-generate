/* eslint-disable no-unused-vars */
// @ts-ignore

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./WordStorm.css";

export default function WordStormStart({ onStart }) {
  const [showInputs, setShowInputs] = useState(false);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(8);

  const letters = [
    ..."CROSSWORD".split(""),
    " ", // <-- manual space between words
    ..."GENERATE".split(""),
    " ", // <-- space before plus sign
    "+"
  ];

  useEffect(() => {
    // Delay input fade-in
    const timer = setTimeout(() => setShowInputs(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <div className="wordstorm-container">
      {/* Floating background letters */}
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.span
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
        </motion.span>
      ))}

      {/* Main assembling title */}
      <div className="wordstorm-title">
        {letters.map((ch, i) => {
          // random starting edge: top, bottom, left, or right
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
            <motion.span
              key={i}
              className={`title-letter${ch === " " ? " space" : ""}`}
              initial={start}
              animate={{
                x: 0,
                y: 0,
                opacity: 1,
                scale: 1,
                rotate: 0,
              }}
              transition={{
                delay: 0.08 * i,
                duration: 1.2,
                type: "spring",
                stiffness: 70,
              }}
            >
              {ch}
            </motion.span>
          );
        })}
      </div>

      {/* Fade in inputs */}
      <AnimatePresence>
        {showInputs && (
          <motion.div
            className="wordstorm-controls"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2 }}
          >
            <input
              type="text"
              placeholder="Type your topic..."
              className="wordstorm-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              autoFocus
            />
            <label className="wordstorm-num">
              Words:
              <input
                type="number"
                min="8"
                max="50"
                value={count}
                onChange={(e) =>
                  setCount(parseInt(e.target.value || 0))
                }
              />
            </label>
            <button
              className={`wordstorm-btn ${isGenerating ? "loading" : ""}`}
              onClick={() => {
                if (!topic.trim()) return;
                setIsGenerating(true);
                onStart(topic, count);
                setTimeout(() => setIsGenerating(false), 3000); // optional short visual delay
              }}
              disabled={isGenerating}
            >
              {isGenerating ? <em>Generating...</em> : "⚡ Generate"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
