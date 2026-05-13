import { useLocation, Link, useParams } from "wouter";
import { ArrowLeft, BookOpen, MessageSquare, Users, Calendar, Settings, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useGetAssistant, getGetAssistantQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AssistantDetail() {
  const params = useParams();
  const id = Number(params.id);
  const { data: assistant, isLoading, error } = useGetAssistant(id, {
    query: {
      enabled: !!id,
      queryKey: getGetAssistantQueryKey(id)
    }
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Activity className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Assistant Not Found</h2>
        <Link href="/assistants">
          <Button variant="link" className="text-primary">Return to Assistants</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/assistants">
            <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            {isLoading ? (
              <Skeleton className="h-8 w-48 bg-white/10 mb-2" />
            ) : (
              <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: assistant?.isActive ? '#00d4ff' : '#6b7280' }} />
                {assistant?.name}
              </h1>
            )}
            <p className="text-muted-foreground">{assistant?.businessName}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-black/50 border border-white/10 p-1 w-full justify-start overflow-x-auto h-auto rounded-xl">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg">Overview</TabsTrigger>
          <TabsTrigger value="knowledge" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg"><BookOpen className="h-4 w-4 mr-2" />Knowledge</TabsTrigger>
          <TabsTrigger value="conversations" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg"><MessageSquare className="h-4 w-4 mr-2" />Conversations</TabsTrigger>
          <TabsTrigger value="leads" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg"><Users className="h-4 w-4 mr-2" />Leads</TabsTrigger>
          <TabsTrigger value="appointments" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg"><Calendar className="h-4 w-4 mr-2" />Appointments</TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg"><Settings className="h-4 w-4 mr-2" />Settings</TabsTrigger>
        </TabsList>
        
        <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-6 min-h-[500px]">
          <TabsContent value="overview" className="mt-0">
            <h2 className="text-xl font-semibold text-white mb-4">Performance Overview</h2>
            <div className="text-muted-foreground">Select a tab to view specific details for this assistant. (Charts to be implemented)</div>
          </TabsContent>
          <TabsContent value="knowledge" className="mt-0">
            <h2 className="text-xl font-semibold text-white mb-4">Knowledge Base</h2>
            <div className="text-muted-foreground">Train your assistant. (Knowledge management to be implemented)</div>
          </TabsContent>
          <TabsContent value="conversations" className="mt-0">
            <h2 className="text-xl font-semibold text-white mb-4">Conversation History</h2>
            <div className="text-muted-foreground">(Conversations list to be implemented)</div>
          </TabsContent>
          <TabsContent value="leads" className="mt-0">
            <h2 className="text-xl font-semibold text-white mb-4">Captured Leads</h2>
            <div className="text-muted-foreground">(Leads board to be implemented)</div>
          </TabsContent>
          <TabsContent value="appointments" className="mt-0">
            <h2 className="text-xl font-semibold text-white mb-4">Scheduled Appointments</h2>
            <div className="text-muted-foreground">(Calendar view to be implemented)</div>
          </TabsContent>
          <TabsContent value="settings" className="mt-0">
            <h2 className="text-xl font-semibold text-white mb-4">Assistant Settings</h2>
            <div className="text-muted-foreground">(Settings form to be implemented)</div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
