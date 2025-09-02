"use client"
import React, { useState, useRef, useEffect } from "react";
import { Menu, Edit3, Settings, Plus, Send } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import profile from "./PersonalInfo";
import { log } from "console";

const ai = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API!);

let firstMssg: boolean = true;

const greet = `At the very beginning of the conversation, say exactly this once:
    "Hello! I'm the AI representative for Chandraprakash Pandey. It's a pleasure to connect with you."`;

async function getGeminiResponse(userInput: string) {
  const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
  let fullPrompt = "";

  if (firstMssg) {
    firstMssg = false;
    fullPrompt = `${greet}\n\nUser's Question: ${userInput}`;
  } else {
    fullPrompt = `${profile}\n\nUser's Question: ${userInput}`;
  }

  const result = await model.generateContent(fullPrompt);
  return result.response.text();
}

function Searchbar() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const [geminiprompt, setGeminiprompt] = useState(false);
  const [input, setInput] = useState("");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [firstPrompt, setFirstPrompt] = useState(false);
  const [isListeningForText, setIsListeningForText] = useState(false);
  const [isRecordingMessage, setIsRecordingMessage] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const isRecordingRef = useRef(false);
  const currentInputRef = useRef("");

  // Update refs when state changes
  useEffect(() => {
    isRecordingRef.current = isRecordingMessage;
  }, [isRecordingMessage]);

  useEffect(() => {
    currentInputRef.current = input;
  }, [input]);

  const startRecognition = () => {
    if (!recognitionRef.current || isRecognitionActive) {
      console.log("Recognition not started - already active or no ref");
      return;
    }
    
    try {
      setIsRecognitionActive(true);
      recognitionRef.current.start();
      console.log("Speech recognition started");
    } catch (error:any) {
      console.error("Error starting recognition:", error);
      setIsRecognitionActive(false);
      // If it failed because already started, just update state
      if (error.toString().includes("already started")) {
        setIsRecognitionActive(true);
      }
    }
  };

  const stopRecognition = () => {
    if (recognitionRef.current && isRecognitionActive) {
      try {
        recognitionRef.current.stop();
        setIsRecognitionActive(false);
        console.log("Speech recognition stopped");
      } catch (error) {
        console.error("Error stopping recognition:", error);
      }
    }
  };

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
    recognition.continuous = false;
    recognitionRef.current = recognition;

    let shouldRestart = true;

    recognition.onstart = () => {
      console.log("Speech recognition started successfully");
      setIsRecognitionActive(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      console.log("Transcript:", transcript, "Recording mode:", isRecordingRef.current);

      if (!isRecordingRef.current && transcript.includes("text")) {
        // User said "text" - activate text input mode
        console.log("Activating voice input mode");
        setIsListeningForText(true);
        setIsRecordingMessage(true);
        setInput(""); // Clear any existing input
        
        if (inputRef.current) {
          inputRef.current.focus();
        }
        // Don't stop shouldRestart - keep mic active
        
        // Continue recognition for message input
        setTimeout(() => {
          startRecognition();
        }, 1000);
        return;
      }

      if (isRecordingRef.current) {
        if (transcript.includes("enter") || transcript.includes("submit")) {
          // User said "enter" - submit the current input
          console.log("Submit command received, current input:", currentInputRef.current);
          setIsRecordingMessage(false);
          setIsListeningForText(false);
          // KEEP shouldRestart = true so mic stays active
          
          // Trigger form submission with current input
          setTimeout(() => {
            if (currentInputRef.current.trim()) {
              const form = inputRef.current?.closest('form');
              if (form) {
                const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                form.dispatchEvent(submitEvent);
              }
            }
          }, 100);
          
          // Restart recognition immediately for regular commands
          setTimeout(() => {
            startRecognition();
          }, 1500);
          return;
        } else {
          // User is dictating their message
          console.log("Adding to input:", transcript);
          setInput(prevInput => {
            const newInput = prevInput ? `${prevInput} ${transcript}` : transcript;
            console.log("New input value:", newInput);
            return newInput;
          });
          
          // Continue listening for more input
          setTimeout(() => {
            startRecognition();
          }, 1000);
          return;
        }
      }

      // Handle other voice commands (scroll, etc.)
      if (messagesRef.current) {
        if (transcript.includes("scroll up")) {
          messagesRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
        if (transcript.includes("scroll down")) {
          messagesRef.current.scrollTo({
            top: messagesRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }
    };

    recognition.onend = () => {
      setIsRecognitionActive(false);
      console.log("Speech recognition ended, shouldRestart:", shouldRestart, "geminiprompt:", geminiprompt);
      
      if (shouldRestart && !geminiprompt) {
        console.log("Restarting recognition for command listening...");
        setTimeout(() => {
          startRecognition();
        }, 1000);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsRecognitionActive(false);

      switch (event.error) {
        case "no-speech":
          console.warn("No speech detected. Waiting for user...");
          break;

        case "aborted":
          console.log("Recognition aborted by app/user.");
          break;

        case "audio-capture":
          alert("No microphone available. Please check your device.");
          shouldRestart = false;
          break;

        case "network":
          alert("Network error. Please check your connection.");
          shouldRestart = false;
          break;

        case "not-allowed":
        case "service-not-allowed":
          alert("Microphone access denied. Please enable permissions.");
          shouldRestart = false;
          break;

        case "bad-grammar":
          console.error("Bad grammar definition in recognition.");
          shouldRestart = false;
          break;

        case "language-not-supported":
          alert("Selected language not supported by speech recognition.");
          shouldRestart = false;
          break;

        default:
          console.error("Unknown error:", event.error);
          break;
      }
    };

    // Initial start
    startRecognition();

    return () => {
      shouldRestart = false;
      stopRecognition();
    };
  }, []);

  const deleteMessage = () => {
    while (messagesRef.current?.lastChild) {
      messagesRef.current.removeChild(messagesRef.current.lastChild);
    }
    setFirstPrompt(false);
    setIsListeningForText(false);
    setIsRecordingMessage(false);
    setInput("");
    // Restart recognition after clearing
    setTimeout(() => {
      startRecognition();
    }, 500);
  };

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    setFirstPrompt(true);
    e.preventDefault();
    
    let Userquery = input;
    if (!Userquery.trim() || geminiprompt) return;
    
    setInput("");
    setIsListeningForText(false);
    setIsRecordingMessage(false);
    setGeminiprompt(true);

    // Don't stop recognition here - let it continue

    const UserInput = document.createElement("div");
    UserInput.className =
      "bg-[#2c2d30] px-4 py-2 rounded-lg text-white mb-2 w-fit max-w-[70%] self-end";
    UserInput.innerText = Userquery;

    const BotOutput = document.createElement("div");
    BotOutput.className =
      "px-4 py-2 rounded-lg text-white mb-2 w-fit max-w-[70%] self-start";
    BotOutput.innerText = "Loading...";

    if (messagesRef.current) {
      messagesRef.current.appendChild(UserInput);
      messagesRef.current.appendChild(BotOutput);
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }

    const res = await getGeminiResponse(Userquery);
    BotOutput.innerHTML = res;
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
    setGeminiprompt(false);
    
    // Recognition should already be running for regular commands
    // Only restart if it's not active
    if (!isRecognitionActive) {
      setTimeout(() => {
        startRecognition();
      }, 500);
    }
  };

  return (
    <div className="flex w-full h-screen">
      {/* Sidebar */}
      <div
        className={`h-screen bg-[#2b2c2f] flex flex-col justify-between transition-[width] duration-300 ${
          sidebarExpanded ? "w-38" : "w-14"
        }`}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        {/* Top Icons */}
        <div className="flex flex-col items-start gap-4 mt-4">
          <button className="flex items-center gap-4 p-2 hover:bg-[#3a3b3f] rounded-md">
            <Menu size={20} className="text-gray-300" />
            {sidebarExpanded && <span className="text-gray-300">Menu</span>}
          </button>
          <button
            onClick={deleteMessage}
            className="flex items-center gap-4 p-2 hover:bg-[#3a3b3f] rounded-md"
          >
            <Edit3 size={20} className="text-gray-300" />
            {sidebarExpanded && <span className="text-gray-300">New Chat</span>}
          </button>
        </div>

        {/* Bottom Icon */}
        <div className="mb-4">
          <button className="flex items-center gap-4 p-2 hover:bg-[#3a3b3f] rounded-md">
            <Settings size={20} className="text-gray-300" />
            {sidebarExpanded && <span className="text-gray-300">Settings</span>}
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="w-full h-screen flex flex-col items-center border-2">
        {/* Header */}
        <div className="w-full h-[7%] flex items-center pl-4">
          <p className="text-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-transparent bg-clip-text">
            CPOPANDEY
          </p>
        </div>

        {/* Messages */}
        <div className={`w-full h-[80%] border-2 px-[20%] ${!firstPrompt ? "flex items-center justify-center" : ""}`}>
          {!firstPrompt ? (
            <div className="">
              <p className="text-4xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-transparent bg-clip-text">
                Hello! How can I assist you today?
              </p>
              {isListeningForText && (
                <p className="text-lg text-gray-400 mt-4 text-center">
                  🎤 Listening... Say your message, then say "enter" to submit
                </p>
              )}
            </div>
          ) : null}
          <div
            className={`h-full w-full p-4 overflow-y-auto flex flex-col ${!firstPrompt ? "hidden" : null}`}
            ref={messagesRef}
          />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className={`w-[60%] flex items-center bg-[#202124] text-white rounded-2xl px-3 py-2 shadow-md border-2 mb-6 ${
            isListeningForText ? "border-green-500" : "border-amber-600"
          }`}
        >
          <button
            type="button"
            className="p-2 hover:bg-[#2c2d30] rounded-full cursor-pointer"
          >
            <Plus size={20} />
          </button>

          <input
            ref={inputRef}
            type="text"
            placeholder={
              isListeningForText 
                ? "🎤 Listening for your message..." 
                : "Ask Me Anything... (Say 'text' to use voice input)"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent outline-none px-3 text-sm"
          />

          <button
            type="submit"
            className="p-2 hover:bg-[#2c2d30] rounded-full cursor-pointer"
          >
            <Send size={20} />
          </button>
        </form>

        {/* Voice Status Indicator */}
        {isListeningForText && (
          <div className="fixed bottom-20 right-6 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
            🎤 Voice input active - Say "enter" to submit
          </div>
        )}
      </div>
    </div>
  );
}

export default Searchbar;