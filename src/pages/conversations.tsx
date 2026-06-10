import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Calendar as CalendarIcon, Smartphone, Monitor, ArrowLeft, Send, Bot, User, UserCog } from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Conversations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedAssistant, setSelectedAssistant] = useState<string>("");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [ownerInput, setOwnerInput] = useState("");

  const { data: assistants } = useQuery({
    queryKey: ["assistants"],
    queryFn: () => api.listAssistants(),
  });

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", selectedAssistant],
    queryFn: () => api.listConversations(selectedAssistant),
    enabled: !!selectedAssistant,
  });

  const { data: conversation } = useQuery({
    queryKey: ["conversation", selectedConvId],
    queryFn: () => api.getConversation(selectedConvId!),
    enabled: !!selectedConvId,
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", selectedConvId],
    queryFn: () => api.listMessages(selectedConvId!),
    enabled: !!selectedConvId,
    refetchInterval: 3000,
  });

  const modeMutation = useMutation({
    mutationFn: (mode: "ai" | "human") => api.setConversationMode(selectedConvId!, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", selectedConvId] });
      toast({ title: "Mode switched" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const replyMutation = useMutation({
    mutationFn: (message: string) => api.sendOwnerReply(selectedConvId!, message),
    onSuccess: () => {
      setOwnerInput("");
      queryClient.invalidateQueries({ queryKey: ["messages", selectedConvId] });
      queryClient.invalidateQueries({ queryKey: ["conversation", selectedConvId] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const currentMode = conversation?.mode || "ai";

  const selectAssistant = (val: string) => {
    setSelectedAssistant(val);
    setSelectedConvId(null);
  };

  const openConversation = (convId: string) => {
    setSelectedConvId(convId);
  };

  if (selectedConvId) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white" onClick={() => setSelectedConvId(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold text-white">{conversation?.visitorName || conversation?.visitor_name || "Conversation"}</h2>
              {(conversation?.visitorEmail || conversation?.visitor_email) && (
                <p className="text-sm text-muted-foreground">{conversation?.visitorEmail || conversation?.visitor_email}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              currentMode === "human" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" : "bg-green-500/20 text-green-400 border border-green-500/30"
            }`}>
              {currentMode === "human" ? "Human Mode" : "AI Mode"}
            </span>
            {currentMode === "ai" ? (
              <Button size="sm" className="bg-orange-500 text-white hover:bg-orange-600" onClick={() => modeMutation.mutate("human")} disabled={modeMutation.isPending}>
                <UserCog className="h-4 w-4 mr-1" /> Take Over
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => modeMutation.mutate("ai")} disabled={modeMutation.isPending}>
                <Bot className="h-4 w-4 mr-1" /> Hand Back to AI
              </Button>
            )}
          </div>
        </div>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {messages?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No messages yet.</p>
            ) : (
              messages?.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "owner"
                      ? "bg-amber-500/20 border border-amber-500/30 text-amber-200 rounded-br-md"
                      : msg.role === "assistant"
                      ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-100 rounded-bl-md"
                      : "bg-white/10 border border-white/10 text-white rounded-br-md"
                  }`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {msg.role === "owner" ? (
                        <UserCog className="h-3 w-3 text-amber-400" />
                      ) : msg.role === "assistant" ? (
                        <Bot className="h-3 w-3 text-cyan-400" />
                      ) : (
                        <User className="h-3 w-3 text-white/70" />
                      )}
                      <span className={`text-[10px] font-medium uppercase tracking-wider ${
                        msg.role === "owner" ? "text-amber-400/70" : msg.role === "assistant" ? "text-cyan-400/70" : "text-white/50"
                      }`}>
                        {msg.role === "owner" ? "Owner" : msg.role === "assistant" ? "AI" : "Visitor"}
                      </span>
                    </div>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {currentMode === "human" && (
          <form
            onSubmit={(e) => { e.preventDefault(); if (ownerInput.trim()) replyMutation.mutate(ownerInput.trim()); }}
            className="flex gap-2"
          >
            <input
              value={ownerInput}
              onChange={(e) => setOwnerInput(e.target.value)}
              placeholder="Type your reply as the business owner..."
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50 transition-colors"
              disabled={replyMutation.isPending}
            />
            <Button type="submit" disabled={!ownerInput.trim() || replyMutation.isPending} className="bg-amber-500 text-black hover:bg-amber-600">
              {replyMutation.isPending ? "..." : <Send className="h-4 w-4" />}
            </Button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Conversations</h1>
          <p className="text-muted-foreground">Review chat histories and take over conversations in real time.</p>
        </div>
        <div className="w-full sm:w-64">
          <Select value={selectedAssistant} onValueChange={selectAssistant}>
            <SelectTrigger className="bg-black/50 border-white/10 text-white">
              <SelectValue placeholder="Select an assistant" />
            </SelectTrigger>
            <SelectContent className="bg-background border-white/10 text-white">
              {assistants?.map((a: any) => (
                <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedAssistant ? (
        <div className="flex flex-col items-center justify-center h-[40vh] bg-white/5 border border-white/10 rounded-2xl">
          <MessageSquare className="h-12 w-12 text-primary opacity-50 mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">Select an assistant</h3>
          <p className="text-muted-foreground">Choose an assistant from the dropdown to view its conversations.</p>
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-white/5 border-white/10 h-24 animate-pulse" />
          ))}
        </div>
      ) : conversations?.length === 0 ? (
        <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-muted-foreground">No conversations found for this assistant.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {conversations?.map((conv: any) => (
            <button
              key={conv.id}
              onClick={() => openConversation(conv.id)}
              className="text-left w-full"
            >
              <Card className="bg-white/5 border-white/10 hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className={`p-3 rounded-xl border ${conv.channel === 'whatsapp' ? 'bg-green-500/20 border-green-500/30' : 'bg-primary/20 border-primary/30'}`}>
                      {conv.channel === 'whatsapp' ? <Smartphone className="h-6 w-6 text-green-400" /> : <Monitor className="h-6 w-6 text-primary" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white text-lg">{conv.visitorName || conv.visitor_name || 'Anonymous Visitor'}</span>
                        {(conv.visitorEmail || conv.visitor_email) && (
                          <span className="text-xs bg-white/10 px-2 py-1 rounded text-white/70">{conv.visitorEmail || conv.visitor_email}</span>
                        )}
                        <span className={`ml-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                          conv.mode === "human" ? "bg-orange-500/20 text-orange-400" : "bg-green-500/20 text-green-400"
                        }`}>
                          {conv.mode === "human" ? "Human" : "AI"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> {format(new Date(conv.createdAt || conv.created_at), "MMM d, yyyy h:mm a")}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {conv.messageCount || conv.message_count || 0} messages</span>
                      </div>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium text-sm">
                    View Chat
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}