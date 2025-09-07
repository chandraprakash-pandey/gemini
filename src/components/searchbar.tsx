"use client";
import React, { useState, useRef, useEffect } from "react";
import { Menu, Edit3, Settings, Plus, Send } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import profile from "./PersonalInfo";

const ai = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API!);

let firstMssg: boolean = true;

async function getGeminiResponse(userInput: string) {
  const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
  let fullPrompt = "";

  if (firstMssg) {
    firstMssg = false;
    fullPrompt = `${profile}\n\nUser's Question: ${userInput}`;
  } else {
    fullPrompt = `${profile}\n\nUser's Question: ${userInput}`;
  }

  const result = await model.generateContent(fullPrompt);
  return result.response.text();
}

function Searchbar() {
  const inputRef = useRef<HTMLInputElement | null>(null); // user k input bar ka reference 
  const messagesRef = useRef<HTMLDivElement | null>(null); // jaha par user aur bot ka mssg dikega uska reference 
  const [geminiprompt, setGeminiprompt] = useState(false);
  const [input, setInput] = useState(""); // user ka input
  const [sidebarExpanded, setSidebarExpanded] = useState(false); // user ne sidebar mai hover kia hai ki nhi
  const [firstPrompt, setFirstPrompt] = useState(false); // first prompt user na kia hai ki nhi

  // FSM mode
  type Mode = "command" | "dictation"; // new data type
  const [mode, setMode] = useState<Mode>("command"); // current mode

  // ------------------- SPEECH -------------------
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    let shouldRestart = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      console.log("Heard:", transcript);

      if (mode === "command") {
        // ---- Trigger dictation ----
        if (transcript.includes("start text")) {
          setMode("dictation");
          // setInput("");
          inputRef.current?.focus();
          inputRef.current?.select();
        }

        // ---- Scroll commands ----
        else if (messagesRef.current) {
          if (transcript.includes("scroll up")) {
            messagesRef.current.scrollTo({ top: 0, behavior: "smooth" });
          }
          else if (transcript.includes("scroll down")) {
            messagesRef.current.scrollTo({
              top: messagesRef.current.scrollHeight,
              behavior: "smooth",
            });
          }else if (transcript.includes("clear chat")) {
            deleteMessage();
          }
        }
      } else if (mode === "dictation") {
        // ---- End dictation & submit ----
        if (transcript.toLocaleLowerCase() === "submit") {
          console.log("Submitting:", input);
          setMode("command");
          inputRef.current?.blur();

          // simulate form submit
          const form = document.getElementById("chat-form") as HTMLFormElement;
          form?.requestSubmit();
        } else {
          // keep adding text
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      }
    };

    recognition.onend = () => {
      if (shouldRestart) {
        console.log("Recognition ended → restarting...");
        setTimeout(() => {
          try {
            recognition.start();
          } catch (err) {
            console.error("Restart failed:", err);
          }
        }, 500);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "aborted" || event.error === "no-speech") {
        // Ignore, recognition will restart
        return;
      }
      console.error("Speech recognition error:", event.error);

      switch (event.error) {
        case "no-speech":
        case "aborted":
          // safe to ignore, recognition will restart on `onend`
          break;
        case "not-allowed":
        case "service-not-allowed":
          alert("Microphone access is blocked. Please allow it in browser settings.");
          shouldRestart = false;
          break;
        default:
          console.error("Fatal error:", event.error);
          shouldRestart = false;
          break;
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("Initial start failed:", err);
    }

    return () => {
      shouldRestart = false;
      recognition.stop();
    };
  }, [mode]);

  // ------------------- CHAT -------------------
  const deleteMessage = () => {
    while (messagesRef.current?.lastChild) {
      messagesRef.current.removeChild(messagesRef.current.lastChild);
    }
    setFirstPrompt(false);
  }; // clear 

  const handleSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || geminiprompt) return;

    setFirstPrompt(true);
    setGeminiprompt(true);

    const Userquery = input;
    setInput("");

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
  }; // clear

  // ------------------- UI -------------------
  return (
    <div className="flex w-full h-screen">
      {/* Sidebar */}
      <div
        className={`h-screen bg-[#2b2c2f] flex flex-col justify-between transition-[width] duration-300 ${sidebarExpanded ? "w-38" : "w-14"
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
      </div> {/* clear */}

      {/* Main Chat Area */}
      <div className="w-full h-screen flex flex-col items-center">
        {/* Header */}
        <div className="w-full h-[7%] flex items-center pl-4">
          <p className="text-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-transparent bg-clip-text">
            CPOPANDEY
          </p>
        </div> {/* clear */}

        {/* Messages */}
        <div
          className={`w-full h-[80%] px-[20%] ${!firstPrompt ? "flex items-center justify-center" : ""
            }`}
        >
          {!firstPrompt ? (
            <div>
              <p className=" text-4xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-transparent bg-clip-text">
                Hello! How can I assist you today?
              </p>
            </div>
          ) : null}
          <div
            className={`h-full w-full p-4 overflow-y-auto flex flex-col custom-scrollbar ${!firstPrompt ? "hidden" : null
              }`}
            ref={messagesRef}
          />
        </div>

        {/* Input */}
        <form
          id="chat-form"
          onSubmit={handleSend}
          className={`w-[60%] flex items-center bg-[#202124] text-white rounded-2xl px-3 py-2 shadow-md border-2 4 ${( mode === "dictation" ? `border-green-400` : `border-amber-600`)} mb-6`}
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
              mode === "dictation" ? "Listening... say 'enter' to send" : "Ask Me Anything..."
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
      </div>
    </div>
  );
}

export default Searchbar;
