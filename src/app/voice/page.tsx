"use client";
import { useEffect, useState } from "react";

export default function VoiceToText() {
  const [text, setText] = useState("");

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false; // capture one phrase, then stop automatically

    // Runs when speech is captured
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setText(transcript);
    };

    // Runs when user stops talking
    recognition.onend = () => {
      console.log("User stopped speaking → restarting...");
      recognition.start(); // restart automatically
    };

    recognition.onerror = (event:any) => {
      console.error("Speech recognition error:", event.error);
    };

    recognition.start(); // start immediately when page loads

    // cleanup on unmount
    return () => {
      recognition.stop();
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <h1 className="text-lg font-bold">🎤 Speak anytime</h1>
      <p className="text-lg font-mono">Last phrase: {text}</p>
    </div>
  );
}
