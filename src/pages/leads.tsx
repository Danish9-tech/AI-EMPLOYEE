import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Mail, Phone, Clock, Send, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

function getStatusColor(status: string) {
  switch(status) {
    case 'new': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'contacted': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'qualified': return 'bg-primary/20 text-primary border-primary/30';
    case 'converted': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'lost': return 'bg-destructive/20 text-destructive border-destructive/30';
    default: return 'bg-white/10 text-white/70 border-white/20';
  }
}

export default function Leads() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: assistants } = useQuery({
    queryKey: ["assistants"],
    queryFn: () => api.listAssistants(),
  });

  const [selectedAssistant, setSelectedAssistant] = useState<string>("");
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads", selectedAssistant],
    queryFn: () => api.listLeads(selectedAssistant),
    enabled: !!selectedAssistant,
  });

  const { data: followUps } = useQuery({
    queryKey: ["followUps", selectedAssistant],
    queryFn: () => api.listFollowUps(),
    enabled: !!selectedAssistant,
  });

  const scheduleMutation = useMutation({
    mutationFn: (data: { leadId: string | number; assistantId: string | number; leadName: string; leadEmail: string }) =>
      api.scheduleFollowUps(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followUps"] });
      toast({ title: "Follow-ups scheduled!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const leadFollowUps = (leadId: string | number) =>
    followUps?.filter((f: any) => f.lead_id === leadId) || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Leads CRM</h1>
          <p className="text-muted-foreground">Manage leads captured by your AI assistants and schedule follow-up sequences.</p>
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
          <Users className="h-12 w-12 text-primary opacity-50 mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">Select an assistant</h3>
          <p className="text-muted-foreground">Choose an assistant to view its captured leads.</p>
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="bg-white/5 border-white/10 h-40 animate-pulse" />
          ))}
        </div>
      ) : leads?.length === 0 ? (
        <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-muted-foreground">No leads captured yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {leads?.map((lead: any) => {
            const expanded = expandedLead === lead.id;
            const fups = leadFollowUps(lead.id);
            const hasFups = fups.length > 0;
            return (
              <div key={lead.id}>
                <Card className="bg-white/5 border-white/10 hover:border-primary/30 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold text-lg text-white">{lead.name}</h3>
                      <Badge variant="outline" className={`${getStatusColor(lead.status)} uppercase tracking-wider text-[10px] font-bold`}>{lead.status}</Badge>
                    </div>
                    <div className="space-y-3 mt-4 text-sm">
                      {lead.email && (
                        <div className="flex items-center text-muted-foreground">
                          <Mail className="h-4 w-4 mr-3 text-white/40" />
                          <span className="text-white/80">{lead.email}</span>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center text-muted-foreground">
                          <Phone className="h-4 w-4 mr-3 text-white/40" />
                          <span className="text-white/80">{lead.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-3 text-white/40" />
                        <span className="text-white/60">{format(new Date(lead.created_at || lead.createdAt), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                    {(lead.notes || lead.notes) && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-xs text-white/50 line-clamp-2">{lead.notes}</p>
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-primary/30 text-primary hover:bg-primary/10 text-xs"
                        onClick={() => scheduleMutation.mutate({ leadId: lead.id, assistantId: Number(selectedAssistant), leadName: lead.name || "", leadEmail: lead.email || "" })}
                        disabled={scheduleMutation.isPending}
                      >
                        <Send className="h-3 w-3 mr-1" /> Follow-Up
                      </Button>
                      {hasFups && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground text-xs"
                          onClick={() => setExpandedLead(expanded ? null : lead.id)}
                        >
                          {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                          {fups.length} scheduled
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
                {expanded && hasFups && (
                  <div className="mt-1 ml-6 space-y-1.5">
                    {fups.map((f: any) => (
                      <div key={f.id} className="flex items-center justify-between px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-white/80 truncate">{f.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {f.sent_at ? `Sent ${format(new Date(f.sent_at), "MMM d h:mm a")}` : `Scheduled ${format(new Date(f.scheduled_at), "MMM d h:mm a")}`}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className={`ml-2 text-[10px] font-medium whitespace-nowrap shrink-0 ${
                          f.status === 'sent' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-white/10 text-white/50 border-white/20'
                        }`}>
                          {f.status === 'sent' ? 'Sent' : 'Pending'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}