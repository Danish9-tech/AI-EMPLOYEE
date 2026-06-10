import { useState, useRef, useEffect } from "react";
import { useParams } from "wouter";
import { Bot, Send, Loader2, AlertTriangle, RefreshCw } from "lucide-react";

export default function ChatPage() {
  const params = useParams();
  const assistantId = params?.id;
  const [assistant, setAssistant] = useState<any>(null);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
        setMessages([{ role: "assistant", content: data.config?.welcomeMessage || `Hi! I'm ${data.name}. How can I help you today?` }]);
      })
      .catch(err => {
        setError(err.message || "Failed to load assistant");
      })
      .finally(() => setLoading(false));
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
        setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        const errData = await res.json().catch(() => ({ error: "Request failed" }));
        setMessages(prev => [...prev, { role: "assistant", content: errData.error || "Sorry, I couldn't process that. Please try again." }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please check your internet and try again." }]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-white/5 border border-red-500/30 rounded-2xl p-8 max-w-md w-full text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Unable to load chat</h2>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <button
            onClick={loadAssistant}
            className="inline-flex items-center gap-2 bg-primary text-black px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 max-w-2xl w-full mx-auto p-4 flex flex-col" style={{ maxHeight: "100dvh" }}>
        <div className="flex items-center gap-3 py-4 border-b border-white/10 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-white font-semibold">{assistant?.name || "AI Assistant"}</h1>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 mb-4 px-1">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-black rounded-br-md"
                  : "bg-white/10 text-white rounded-bl-md"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white/10 rounded-2xl px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex gap-2 pb-4"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-primary/50 transition-colors"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="bg-primary text-black rounded-xl px-4 py-3 hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}