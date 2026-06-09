import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { ArrowLeft, BookOpen, MessageSquare, Users, Calendar, Settings, Activity, Plus, Trash2, Copy, Upload, ExternalLink, Store, Bot, Power, PowerOff, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api, apiFetch } from "@/lib/api";

export default function AssistantDetail() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [knowledgeTitle, setKnowledgeTitle] = useState("");
  const [knowledgeContent, setKnowledgeContent] = useState("");
  const [showPublish, setShowPublish] = useState(false);
  const [pubTitle, setPubTitle] = useState("");
  const [pubDesc, setPubDesc] = useState("");
  const [pubCategory, setPubCategory] = useState("General");
  const [pubIndustry, setPubIndustry] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [editName, setEditName] = useState("");
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTone, setEditTone] = useState("friendly");
  const [editWidgetColor, setEditWidgetColor] = useState("#00d4ff");

  const { data: assistant, isLoading: loadingAss, error } = useQuery({
    queryKey: ["assistant", id],
    queryFn: () => api.getAssistant(id),
    enabled: !!id,
  });

  const { data: knowledge, isLoading: loadingKnow } = useQuery({
    queryKey: ["assistantKnowledge", id],
    queryFn: () => api.listAssistantKnowledge(id),
    enabled: !!id,
  });

  const { data: conversations } = useQuery({
    queryKey: ["assistantConversations", id],
    queryFn: () => api.listConversations(id),
    enabled: !!id,
  });

  const { data: leads } = useQuery({
    queryKey: ["assistantLeads", id],
    queryFn: () => api.listLeads(id),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.updateAssistant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistant", id] });
      queryClient.invalidateQueries({ queryKey: ["assistants"] });
      toast({ title: "Assistant updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addKnowledge = useMutation({
    mutationFn: () => api.createAssistantKnowledge(id, { title: knowledgeTitle, content: knowledgeContent, type: "manual" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistantKnowledge", id] });
      setKnowledgeTitle(""); setKnowledgeContent("");
      toast({ title: "Knowledge added" });
    },
    onError: () => toast({ title: "Error", description: "Failed to add knowledge", variant: "destructive" }),
  });

  const deleteKnowledge = useMutation({
    mutationFn: (kid: number) => api.deleteKnowledge(kid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistantKnowledge", id] });
      toast({ title: "Knowledge removed" });
    },
  });

  const deleteAssistant = useMutation({
    mutationFn: () => apiFetch(`/api/assistants/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistants"] });
      toast({ title: "Assistant deleted" });
      setLocation("/assistants");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const publishMutation = useMutation({
    mutationFn: () => api.publishMarketplaceTemplate({ assistantId: id, title: pubTitle, description: pubDesc, category: pubCategory, industry: pubIndustry }),
    onSuccess: () => {
      setShowPublish(false);
      toast({ title: "Published to Marketplace!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const copyEmbed = () => {
    navigator.clipboard.writeText(`<script src="https://${window.location.hostname}/widget.js" data-id="${id}"></script>`);
    toast({ title: "Embed code copied" });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      let text = "";
      if (file.name.endsWith(".txt")) {
        text = await file.text();
      } else if (file.name.endsWith(".pdf")) {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
        text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").slice(0, 50000);
      } else if (file.name.endsWith(".docx")) {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
        const match = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
        if (match) {
          text = match.map((m: string) => m.replace(/<\/?w:t[^>]*>/g, "")).join(" ");
        } else {
          text = text.replace(/[^\x20-\x7E\n]/g, " ").replace(/\s+/g, " ").trim();
        }
        text = text.slice(0, 50000);
      }
      const title = file.name.replace(/\.[^.]+$/, "");
      await api.createAssistantKnowledge(id, { title, content: text || "(empty file)", type: "manual" });
      queryClient.invalidateQueries({ queryKey: ["assistantKnowledge", id] });
      toast({ title: "File uploaded", description: `${file.name} imported successfully.` });
    } catch {
      toast({ title: "Upload failed", description: "Could not read file. Try pasting the content manually.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
            {loadingAss ? (
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
        <div className="flex gap-2">
          <Button variant="outline" className="border-primary/30 text-white hover:bg-primary/10" onClick={copyEmbed}>
            <Copy className="mr-2 h-4 w-4" /> Embed
          </Button>
          <Button className="bg-primary text-black hover:bg-primary/90" onClick={() => { setPubTitle(assistant?.name || ""); setPubDesc(assistant?.description || ""); setShowPublish(true); }}>
            <Upload className="mr-2 h-4 w-4" /> Publish
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatBox label="Conversations" value={conversations?.length || 0} icon={MessageSquare} />
        <StatBox label="Leads Captured" value={leads?.length || 0} icon={Users} />
        <StatBox label="Knowledge Items" value={knowledge?.length || 0} icon={BookOpen} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-black/50 border border-white/10 p-1 w-full justify-start overflow-x-auto h-auto rounded-xl">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg">Overview</TabsTrigger>
          <TabsTrigger value="knowledge" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg"><BookOpen className="h-4 w-4 mr-2" />Knowledge</TabsTrigger>
          <TabsTrigger value="conversations" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg"><MessageSquare className="h-4 w-4 mr-2" />Conversations</TabsTrigger>
          <TabsTrigger value="leads" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg"><Users className="h-4 w-4 mr-2" />Leads</TabsTrigger>
          <TabsTrigger value="appointments" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg"><Calendar className="h-4 w-4 mr-2" />Appointments</TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg"><Settings className="h-4 w-4 mr-2" />Settings</TabsTrigger>
        </TabsList>

        <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-6 min-h-[400px]">
          <TabsContent value="overview" className="mt-0">
            <h2 className="text-xl font-semibold text-white mb-4">Performance Overview</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-black/40 rounded-lg border border-white/5">
                <p className="text-sm text-muted-foreground mb-1">Total Conversations</p>
                <p className="text-3xl font-bold text-white">{conversations?.length || 0}</p>
              </div>
              <div className="p-4 bg-black/40 rounded-lg border border-white/5">
                <p className="text-sm text-muted-foreground mb-1">Total Leads</p>
                <p className="text-3xl font-bold text-white">{leads?.length || 0}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="knowledge" className="mt-0">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Knowledge Base</h2>
            </div>
            <div className="space-y-4 mb-8">
              <div className="grid gap-3">
                <Label className="text-white/80">Title</Label>
                <Input value={knowledgeTitle} onChange={(e) => setKnowledgeTitle(e.target.value)} placeholder="e.g. Pricing Information" className="bg-black/40 border-white/10 text-white" />
              </div>
              <div className="grid gap-3">
                <Label className="text-white/80">Content</Label>
                <Textarea value={knowledgeContent} onChange={(e) => setKnowledgeContent(e.target.value)} placeholder="What should your assistant know?" rows={4} className="bg-black/40 border-white/10 text-white" />
              </div>
              <div className="flex gap-3">
                <Button onClick={() => addKnowledge.mutate()} disabled={!knowledgeTitle || !knowledgeContent || addKnowledge.isPending} className="bg-primary text-black hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" /> Add Knowledge
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button variant="outline" className="border-primary/30 text-white hover:bg-primary/10" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {uploading ? "Uploading..." : "Import File"}
                </Button>
              </div>
            </div>
            {loadingKnow ? (
              <Skeleton className="h-32 bg-white/10" />
            ) : knowledge?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No knowledge items yet. Add documents above.</p>
            ) : (
              <div className="space-y-3">
                {knowledge?.map((item: any) => (
                  <div key={item.id} className="flex items-start justify-between p-4 bg-black/40 rounded-lg border border-white/5">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.content}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 shrink-0 ml-4" onClick={() => deleteKnowledge.mutate(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="conversations" className="mt-0">
            <h2 className="text-xl font-semibold text-white mb-4">Conversations</h2>
            {(!conversations || conversations.length === 0) ? (
              <p className="text-muted-foreground text-center py-8">No conversations yet.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {conversations.map((c: any) => (
                  <Link key={c.id} href={`/chat/${c.id}`}>
                    <div className="p-4 bg-black/40 rounded-lg border border-white/5 hover:border-primary/30 transition-colors cursor-pointer">
                      <p className="text-white font-medium">{c.visitor_name || c.visitor_email || `Conversation #${c.id}`}</p>
                      <p className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="leads" className="mt-0">
            <h2 className="text-xl font-semibold text-white mb-4">Leads</h2>
            {(!leads || leads.length === 0) ? (
              <p className="text-muted-foreground text-center py-8">No leads captured yet.</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {leads.map((l: any) => (
                  <div key={l.id} className="p-4 bg-black/40 rounded-lg border border-white/5">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-medium">{l.name || "Unknown"}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${l.status === 'new' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>{l.status}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{l.email}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="appointments" className="mt-0">
            <h2 className="text-xl font-semibold text-white mb-4">Appointments</h2>
            <p className="text-muted-foreground text-center py-8">Appointments will appear here once scheduled.</p>
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <h2 className="text-xl font-semibold text-white mb-6">Settings</h2>
            {!loadingAss && assistant && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label className="text-white/80">Assistant Name</Label>
                    <Input defaultValue={assistant.name} onChange={(e) => setEditName(e.target.value)} onFocus={(e) => setEditName(e.target.value)} className="bg-black/40 border-white/10 text-white" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-white/80">Business Name</Label>
                    <Input defaultValue={assistant.businessName || assistant.business_name} onChange={(e) => setEditBusinessName(e.target.value)} onFocus={(e) => setEditBusinessName(e.target.value)} className="bg-black/40 border-white/10 text-white" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-white/80">Description</Label>
                  <Textarea defaultValue={assistant.description} onChange={(e) => setEditDescription(e.target.value)} onFocus={(e) => setEditDescription(e.target.value)} rows={3} className="bg-black/40 border-white/10 text-white" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label className="text-white/80">Tone</Label>
                    <Select defaultValue={assistant.tone || "friendly"} onValueChange={setEditTone}>
                      <SelectTrigger className="bg-black/40 border-white/10 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-background border-white/10">
                        <SelectItem value="friendly" className="text-white">Friendly</SelectItem>
                        <SelectItem value="professional" className="text-white">Professional</SelectItem>
                        <SelectItem value="casual" className="text-white">Casual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-white/80">Widget Color</Label>
                    <div className="flex gap-2 items-center">
                      <Input type="color" defaultValue={assistant.widget_color || "#00d4ff"} onChange={(e) => setEditWidgetColor(e.target.value)} className="w-12 h-10 p-1 bg-black/40 border-white/10 cursor-pointer" />
                      <Input value={editWidgetColor} onChange={(e) => setEditWidgetColor(e.target.value)} className="flex-1 bg-black/40 border-white/10 text-white font-mono" />
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    const data: any = {};
                    if (editName) data.name = editName;
                    if (editBusinessName) data.businessName = editBusinessName;
                    if (editDescription) data.description = editDescription;
                    data.tone = editTone;
                    data.widget_color = editWidgetColor;
                    updateMutation.mutate(data);
                  }}
                  disabled={updateMutation.isPending}
                  className="bg-primary text-black hover:bg-primary/90"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
            {loadingAss && <Skeleton className="h-48 bg-white/10" />}

            <div className="mt-12 pt-8 border-t border-white/10">
              <h3 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h3>
              <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                <div>
                  <p className="text-white font-medium">Delete this assistant</p>
                  <p className="text-sm text-muted-foreground">This action cannot be undone. All conversations and data will be permanently removed.</p>
                </div>
                <Button variant="destructive" className="shrink-0 ml-4" onClick={() => setShowDelete(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={showPublish} onOpenChange={setShowPublish}>
        <DialogContent className="bg-background border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Publish to Marketplace</DialogTitle>
            <DialogDescription>Share this assistant as a template for other users.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={pubTitle} onChange={(e) => setPubTitle(e.target.value)} className="bg-black/40 border-white/10 text-white" />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={pubDesc} onChange={(e) => setPubDesc(e.target.value)} rows={3} className="bg-black/40 border-white/10 text-white" />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={pubCategory} onValueChange={setPubCategory}>
                <SelectTrigger className="bg-black/40 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-background border-white/10">
                  {["General", "Sales", "Support", "Healthcare", "Real Estate", "E-commerce", "Legal", "Restaurant", "Productivity"].map(c => (
                    <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Industry (optional)</Label>
              <Input value={pubIndustry} onChange={(e) => setPubIndustry(e.target.value)} placeholder="e.g. Dental, SaaS, Retail" className="bg-black/40 border-white/10 text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPublish(false)} className="text-muted-foreground">Cancel</Button>
            <Button onClick={() => publishMutation.mutate()} disabled={!pubTitle || publishMutation.isPending} className="bg-primary text-black hover:bg-primary/90">
              {publishMutation.isPending ? "Publishing..." : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="bg-background border-red-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Assistant</DialogTitle>
            <DialogDescription>Are you sure you want to delete "{assistant?.name}"? This action cannot be undone. All conversations, leads, and knowledge associated with this assistant will be permanently deleted.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDelete(false)} className="text-muted-foreground">Cancel</Button>
            <Button variant="destructive" onClick={() => { setShowDelete(false); deleteAssistant.mutate(); }} disabled={deleteAssistant.isPending}>
              {deleteAssistant.isPending ? "Deleting..." : "Delete Forever"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatBox({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
