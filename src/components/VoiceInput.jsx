import React, { useEffect, useRef, useState } from "react";

export default function VoiceInput({ onTranscript }) {
    const [supported, setSupported] = useState(false);
    const [listening, setListening] = useState(false);
    const recRef = useRef(null);


    useEffect(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SR) {
            setSupported(true);
            const rec = new SR();
            rec.lang = "en-US";
            rec.continuous = false;
            rec.interimResults = false;
            rec.onresult = (e) => {
                const t = Array.from(e.results).map(r => r[0].transcript).join(" ").trim();
                if (t) onTranscript(t);
                setListening(false);
            };
            rec.onend = () => setListening(false);
            rec.onerror = () => setListening(false);
            recRef.current = rec;
        }
    }, [onTranscript]);

    const start = () => {
        if (!recRef.current) return;
        try {
          setListening(true);
          recRef.current.start();
        } catch (err) {
          console.error("Speech recognition failed to start:", err);
          setListening(false); // reset so button re-enables
          // optional: show a message to the user
          // alert("Could not access microphone. Please check permissions.");
        }
    };
      

    if (!supported) return null;

    return (
        <div className="voice">
            <button className="ghost" onClick={start} disabled={listening}>{listening ? "Listening…" : "🎤 Speak topic"}</button>
        </div>
    );
}