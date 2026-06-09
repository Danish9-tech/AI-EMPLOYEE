import { useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowLeft, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export default function ChatDetail() {
  const params = useParams();
  const id = params?.id;
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: conversation, isLoading, error } = useQuery({
    queryKey: ["conversation", id],
    queryFn: () => api.getConversation(Number(id)),
    enabled: !!id,
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => api.listMessages(Number(id)),
    enabled: !!id,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <Activity className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Conversation not found</h2>
        <Link href="/conversations">
          <Button variant="outline" className="border-primary text-primary">Back to Conversations</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Link href="/conversations">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isLoading ? <Skeleton className="h-8 w-48 bg-white/10" /> : conversation?.assistantName || "Conversation"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {conversation?.userEmail || "Chat history"}
          </p>
        </div>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                  <Skeleton className={`h-16 bg-white/10 ${i % 2 === 0 ? "w-2/3" : "w-1/2"}`} />
                </div>
              ))}
            </div>
          ) : messages?.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No messages in this conversation.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {messages?.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[75%] rounded-xl px-4 py-3 ${
                    msg.role === "assistant"
                      ? "bg-primary/10 border border-primary/20 text-white"
                      : "bg-white/10 border border-white/10 text-white"
                  }`}>
                    <p className="text-xs text-muted-foreground mb-1">
                      {msg.role === "assistant" ? "AI Assistant" : "User"}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
