import { useState } from "react";
import { Send, Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function WhatsApp() {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: 'Hi there! I am the AI assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    const currentInput = input;
    setInput("");

    // Simulate response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: `This is a simulated response to: "${currentInput}". Wire this up to the real API to test actual AI interactions over the WhatsApp channel.` }]);
    }, 1000);
  };

  return (
    <div className="h-[calc(100vh-8rem)] max-h-[800px] flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">WhatsApp Preview</h1>
        <p className="text-muted-foreground">Test how your assistant interacts on WhatsApp.</p>
      </div>

      {/* Phone Frame */}
      <div className="w-full max-w-sm h-[600px] bg-black rounded-[3rem] border-[8px] border-[#1f2937] overflow-hidden flex flex-col relative shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        
        {/* Notch */}
        <div className="absolute top-0 inset-x-0 h-6 bg-[#1f2937] rounded-b-xl w-1/2 mx-auto z-20"></div>

        {/* WhatsApp Header */}
        <div className="bg-[#075e54] text-white p-4 pt-8 flex items-center gap-3 z-10 shadow-md">
          <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold leading-tight">AI Employee</p>
            <p className="text-[10px] text-white/80">online</p>
          </div>
        </div>

        {/* Chat Area - WhatsApp Background Pattern */}
        <div className="flex-1 bg-[#ece5dd] p-4 overflow-y-auto flex flex-col gap-3 relative">
          <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
          
          <div className="text-center my-2">
            <span className="bg-[#d1d7db] text-[#556369] text-xs px-3 py-1 rounded-lg uppercase tracking-wider font-medium">Today</span>
          </div>

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-3 text-sm relative shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-[#dcf8c6] text-black rounded-tr-none' 
                  : 'bg-white text-black rounded-tl-none'
              }`}>
                {msg.content}
                <span className="text-[10px] text-gray-500 float-right mt-2 ml-2">12:00</span>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="bg-[#f0f0f0] p-3 flex items-end gap-2">
          <div className="flex-1 bg-white rounded-full px-4 py-2 min-h-[44px] flex items-center shadow-sm">
            <form onSubmit={handleSend} className="w-full">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message"
                className="w-full bg-transparent border-none outline-none text-black placeholder:text-gray-500 text-sm"
              />
            </form>
          </div>
          <button 
            onClick={handleSend}
            className="h-11 w-11 bg-[#128c7e] rounded-full flex items-center justify-center text-white shrink-0 hover:bg-[#075e54] transition-colors"
          >
            <Send className="h-5 w-5 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
