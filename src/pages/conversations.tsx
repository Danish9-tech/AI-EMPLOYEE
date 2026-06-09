import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Calendar as CalendarIcon, Smartphone, Monitor, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";

export default function Conversations() {
  const { data: assistants } = useQuery({
    queryKey: ["assistants"],
    queryFn: () => api.listAssistants(),
  });

  const [selectedAssistant, setSelectedAssistant] = useState<string>("");

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", selectedAssistant],
    queryFn: () => api.listConversations(Number(selectedAssistant)),
    enabled: !!selectedAssistant,
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Conversations</h1>
          <p className="text-muted-foreground">Review chat histories across your deployed assistants.</p>
        </div>
        <div className="w-full sm:w-64">
          <Select value={selectedAssistant} onValueChange={setSelectedAssistant}>
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
            <Link key={conv.id} href={`/conversations/${conv.id}`}>
              <Card className="bg-white/5 border-white/10 hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className={`p-3 rounded-xl border ${conv.channel === 'whatsapp' ? 'bg-green-500/20 border-green-500/30' : 'bg-primary/20 border-primary/30'}`}>
                      {conv.channel === 'whatsapp' ? <Smartphone className="h-6 w-6 text-green-400" /> : <Monitor className="h-6 w-6 text-primary" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white text-lg">{conv.visitor_name || conv.visitorName || 'Anonymous Visitor'}</span>
                        {(conv.visitor_email || conv.visitorEmail) && (<span className="text-xs bg-white/10 px-2 py-1 rounded text-white/70">{conv.visitor_email || conv.visitorEmail}</span>)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> {format(new Date(conv.created_at || conv.createdAt), "MMM d, yyyy h:mm a")}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {conv.message_count || conv.messageCount || 0} messages</span>
                      </div>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium text-sm">
                    View Chat <ArrowRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
