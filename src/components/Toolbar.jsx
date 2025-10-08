import React, { useEffect, useRef } from "react";

export default function Toolbar({
  topic,
  setTopic,
  count,
  setCount,
  onGenerate,
  loading,
}) {
  const inputRef = useRef(null);

  // ✅ Auto-focus on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="toolbar">
      <input
        ref={inputRef} // 👈 this enables the autofocus
        value={topic}
        placeholder="Category or theme (Example: NASCAR, Quilting, Ocean Animals)"
        onChange={(e) => setTopic(e.target.value)}
      />
      <label className="num">
        Words:
        <input
          type="number"
          min="3"
          max="50"
          value={count}
          onChange={(e) => setCount(parseInt(e.target.value || 0))}
        />
      </label>
      <button className="primary" onClick={onGenerate} disabled={loading}>
        {loading ? "Generating…" : "Generate"}
      </button>
    </div>
  );
}

