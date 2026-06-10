import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "wouter";
import { Bot, Send, X, Loader2, AlertTriangle, RefreshCw, Mic, MicOff, Volume2 } from "lucide-react";

export default function WidgetPage() {
  const params = useParams();
  const assistantId = params?.id;
  const [assistant, setAssistant] = useState<any>(null);
  const [plan, setPlan] = useState("free");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const speechSupported = useRef(false);
  const [speakingId, setSpeakingId] = useState<number | null>(null);

  useEffect(() => {
    speechSupported.current = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }, []);

  const speak = useCallback((text: string, index: number) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(index);
    utterance.rate = 1.1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  const toggleRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsRecording(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording]);

  const loadAssistant = () => {
    if (!assistantId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/widget?assistantId=${assistantId}`)
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load assistant (${r.status})`);
        return r.json();
      })
      .then(data => {
        setAssistant(data);
        setPlan(data.plan || "free");
        setMessages([{ role: "assistant", content: data.config?.welcomeMessage || `Hi! I'm ${data.name}. How can I help you today?` }]);
      })
      .catch(err => {
        setError(err.message || 'Failed to load assistant');
      })
      .finally(() => setLoading(false));

    fetch("/api/referral_clicks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assistantId, referrer: "widget", pageUrl: window.location.href }),
    }).catch(() => {});
  };

  useEffect(() => {
    loadAssistant();
  }, [assistantId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistantId, message: msg }),
      });
      if (res.ok) {
        const data = await res.json();
        const reply = data.reply;
        setMessages(prev => {
          const idx = prev.length + 1;
          setTimeout(() => speak(reply, idx), 100);
          return [...prev, { role: "assistant", content: reply }];
        });
      } else {
        const errData = await res.json().catch(() => ({ error: 'Request failed' }));
        setMessages(prev => [...prev, { role: "assistant", content: errData.error || "Sorry, I couldn't process that. Please try again." }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please check your internet and try again." }]);
    } finally {
      setSending(false);
    }
  };

  const showBadge = plan === "free";

  if (loading) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999]">
        <div className="w-14 h-14 rounded-full bg-primary/20 animate-pulse flex items-center justify-center">
          <Bot className="h-6 w-6 text-primary/50" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999]">
        <div className="bg-[#1a1a2e] border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden w-80 sm:w-96">
          <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-[#0f0f23]">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </div>
            <p className="text-white text-sm font-medium">Unable to load</p>
          </div>
          <div className="p-6 text-center">
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <button
              onClick={loadAssistant}
              className="inline-flex items-center gap-2 bg-primary text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-[9999]">
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-primary text-black shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center"
        >
          <Bot className="h-6 w-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] w-80 sm:w-96" style={{ direction: "ltr" }}>
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 120px)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0f0f23]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">{assistant?.name || "AI Assistant"}</p>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 300, maxHeight: 400 }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm relative group ${
                msg.role === "user" ? "bg-primary text-black" : "bg-white/10 text-white"
              }`}>
                {msg.content}
                {msg.role === "assistant" && speechSupported.current && (
                  <button
                    onClick={() => speak(msg.content, i)}
                    className="absolute -bottom-5 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded bg-white/10 hover:bg-white/20"
                    title={speakingId === i ? "Speaking..." : "Read aloud"}
                  >
                    {speakingId === i ? (
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    ) : (
                      <Volume2 className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white/10 rounded-xl px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-white/10 p-3">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            className="flex gap-2"
          >
            {speechSupported.current && (
              <button
                type="button"
                onClick={toggleRecording}
                disabled={sending}
                className={`rounded-lg px-2 py-2 transition-colors ${
                  isRecording
                    ? "bg-red-500/20 text-red-400 mic-pulse"
                    : "bg-black/40 border border-white/10 text-muted-foreground hover:text-white hover:border-white/30"
                }`}
                title={isRecording ? "Stop recording" : "Voice input"}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-primary/50"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="bg-primary text-black rounded-lg px-3 py-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

        <style>{`
          @keyframes mic-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
            50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          }
          .mic-pulse {
            animation: mic-pulse 1.2s ease-in-out infinite;
            border-color: rgba(239, 68, 68, 0.5);
          }
        `}</style>

        {showBadge && (
          <a
            href={`/?ref=widget&from=${assistantId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center py-1.5 text-xs text-muted-foreground hover:text-primary transition-colors border-t border-white/5 bg-[#0f0f23]"
          >
            Powered by AI Employee
          </a>
        )}
      </div>
    </div>
  );
}
