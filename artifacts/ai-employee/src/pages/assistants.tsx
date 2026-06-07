import { useState } from "react";
import { useListAssistants, useUpdateAssistant, getListAssistantsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Plus, Bot, Power, PowerOff, Settings, Code, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Assistants() {
  const { data: assistants, isLoading, error } = useListAssistants({
    query: {
      queryKey: getListAssistantsQueryKey()
    }
  });

  const updateAssistant = useUpdateAssistant();
  const { toast } = useToast();
  const [embedOpen, setEmbedOpen] = useState(false);
  const [selectedAssistant, setSelectedAssistant] = useState<any>(null);

  const toggleStatus = (id: number, currentStatus: boolean) => {
    updateAssistant.mutate({ id, data: { isActive: !currentStatus } }, {
      onSuccess: () => {
        toast({
          title: "Status updated",
          description: "Assistant status has been updated successfully.",
        });
        queryClient.invalidateQueries({ queryKey: getListAssistantsQueryKey() });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to update status. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  const showEmbed = (assistant: any) => {
    setSelectedAssistant(assistant);
    setEmbedOpen(true);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <Activity className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Failed to load assistants</h2>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">AI Assistants</h1>
          <p className="text-muted-foreground">Manage and deploy your customer service agents.</p>
        </div>
        <Link href="/assistants/new">
          <Button className="bg-primary text-black hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" /> New Assistant
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-white/5 border-white/10">
              <CardHeader><Skeleton className="h-6 w-32 bg-white/10" /></CardHeader>
              <CardContent><Skeleton className="h-20 bg-white/10" /></CardContent>
            </Card>
          ))}
        </div>
      ) : assistants?.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-xl border border-white/10">
          <Bot className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium text-white mb-2">No assistants yet</h3>
          <p className="text-muted-foreground mb-6">Create your first AI assistant to start automating your customer service.</p>
          <Link href="/assistants/new">
            <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
              Create Assistant
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {assistants?.map((assistant) => (
            <Card key={assistant.id} className="bg-white/5 border-white/10 flex flex-col group hover:border-primary/50 transition-colors">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-xl text-white flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: assistant.isActive ? '#00d4ff' : '#6b7280' }} />
                    {assistant.name}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">{assistant.businessName}</CardDescription>
                </div>
                <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-white/70 line-clamp-2 mb-6 flex-1">
                  {assistant.description}
                </p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                    <p className="text-xs text-muted-foreground mb-1">Messages</p>
                    <p className="text-lg font-bold text-white">{assistant.totalMessages}</p>
                  </div>
                  <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                    <p className="text-xs text-muted-foreground mb-1">Leads</p>
                    <p className="text-lg font-bold text-white">{assistant.totalLeads}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-auto pt-4 border-t border-white/10">
                  <Link href={`/assistants/${assistant.id}`}>
                    <Button variant="ghost" size="sm" className="text-white hover:text-primary hover:bg-primary/10 flex-1">
                      <Settings className="h-4 w-4 mr-2" /> Manage
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-white hover:text-accent hover:bg-accent/10"
                    onClick={() => showEmbed(assistant)}
                  >
                    <Code className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={assistant.isActive ? "text-destructive hover:text-destructive hover:bg-destructive/10" : "text-green-500 hover:text-green-500 hover:bg-green-500/10"}
                    onClick={() => toggleStatus(assistant.id, assistant.isActive)}
                    disabled={updateAssistant.isPending}
                  >
                    {assistant.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={embedOpen} onOpenChange={setEmbedOpen}>
        <DialogContent className="bg-background border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Embed Assistant</DialogTitle>
            <DialogDescription>
              Copy this code and paste it just before the closing &lt;/body&gt; tag of your website.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-black p-4 rounded-lg border border-white/10 mt-4 overflow-x-auto">
            <code className="text-primary text-sm whitespace-pre-wrap">
              {`<script src="https://${window.location.hostname}/widget.js" data-id="${selectedAssistant?.id}"></script>`}
            </code>
          </div>
          <Button 
            className="w-full mt-4 bg-primary text-black hover:bg-primary/90"
            onClick={() => {
              navigator.clipboard.writeText(`<script src="https://${window.location.hostname}/widget.js" data-id="${selectedAssistant?.id}"></script>`);
              toast({ title: "Copied to clipboard" });
              setEmbedOpen(false);
            }}
          >
            Copy Code
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
