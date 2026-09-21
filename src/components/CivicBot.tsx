import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { MessageSquare, X, Send, Mic, Bot, User } from "lucide-react";
import { toast } from "react-hot-toast";

interface Message {
  role: "user" | "model";
  text: string;
}

export default function CivicBot({ user }: { user?: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      if (messages.length === 0) {
        setMessages([
          {
            role: "model",
            text: "Hello! I am CivicBot, your AI Assistant. How can I help you today? You can ask me to track your complaints or help you register a new one!",
          },
        ]);
      }
    }
  }, [isOpen, messages]);

  // Handle Speech Recognition
  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice input is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN"; // Default to Indian English, can detect others depending on browser
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      toast("Listening...", { icon: "🎙️" });
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      toast.error("Voice recognition failed. Please try again.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userText = input.trim();
    setInput("");
    const newHistory = [...messages, { role: "user" as const, text: userText }];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      const payload = {
        message: userText,
        history: messages,
        userId: user?.id,
      };

      const response = await axios.post("/api/chat", payload);
      let replyText = response.data.reply;

      // Intercept JSON actions
      const jsonMatch = replyText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          const actionData = JSON.parse(jsonMatch[1]);
          if (actionData.action === "register") {
            replyText = replyText.replace(jsonMatch[0], ""); // Remove JSON from visible text
            if (!replyText.trim()) {
              replyText =
                "I've prepared the details for your new complaint! Please navigate to the 'File a Complaint' section to submit this.";
            }
            toast.success(
              "Complaint details prepared! Go to your dashboard to file it.",
              { duration: 5000 },
            );
            // In a fully integrated version, this could open a global context modal or dispatch a custom event
            window.dispatchEvent(
              new CustomEvent("CIVICBOT_REGISTER", {
                detail: actionData.details,
              }),
            );
          }
        } catch (e) {
          console.error("Failed to parse JSON action from CivicBot", e);
        }
      }

      setMessages([...newHistory, { role: "model", text: replyText.trim() }]);
    } catch (error) {
      console.error("CivicBot Error:", error);
      toast.error("Failed to get a response from CivicBot.");
      setMessages([
        ...newHistory,
        {
          role: "model",
          text: "Sorry, I am having trouble connecting to my servers right now.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 sm:w-96 h-[500px] max-h-[80vh] bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center shadow-md z-10">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm">CivicBot AI</h3>
                <p className="text-[10px] text-blue-100 font-mono flex items-center">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1 animate-pulse"></span>{" "}
                  ONLINE
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-blue-100 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white border border-slate-200 text-slate-700 rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {msg.text}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center space-x-1">
                  <div
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center space-x-2">
            <button
              onClick={handleVoiceInput}
              className={`p-2 rounded-full transition-colors ${isListening ? "bg-red-100 text-red-600 animate-pulse" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
              title="Speak to CivicBot"
            >
              <Mic className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md flex-shrink-0"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 ${isOpen ? "bg-rose-500 rotate-90" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/50"}`}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageSquare className="w-6 h-6 text-white" />
        )}
      </button>
    </div>
  );
}
