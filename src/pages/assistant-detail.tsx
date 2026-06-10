import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { ArrowLeft, BookOpen, MessageSquare, Users, Calendar, Settings, Activity, Plus, Trash2, Copy, Upload, ExternalLink, Store, Bot, Power, PowerOff, Loader2, FileText, Globe, Code2, QrCode, Download } from "lucide-react";
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

  const [crawlUrl, setCrawlUrl] = useState("");
  const [crawlLoading, setCrawlLoading] = useState(false);
  const [crawlError, setCrawlError] = useState("");
  const [crawlCharCount, setCrawlCharCount] = useState(0);
  const [crawlSuccess, setCrawlSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [embedPlatform, setEmbedPlatform] = useState("html");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrLoading, setQrLoading] = useState(false);

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

  const uploadFileToServer = async (file: File) => {
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = () => reject();
        reader.readAsDataURL(file);
      });
      await api.uploadKnowledge({ assistantId: id, fileName: file.name, fileData: base64, fileType: file.type });
      queryClient.invalidateQueries({ queryKey: ["assistantKnowledge", id] });
      toast({ title: "File uploaded", description: `${file.name} imported successfully.` });
    } catch {
      toast({ title: "Upload failed", description: "Could not read file. Try pasting the content manually.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFileToServer(file);
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await uploadFileToServer(file);
  };

  const handleCrawl = async () => {
    if (!crawlUrl) return;
    setCrawlLoading(true);
    setCrawlError("");
    setCrawlSuccess(false);
    setCrawlCharCount(0);
    try {
      const result = await api.crawlKnowledge({ assistantId: id, url: crawlUrl });
      queryClient.invalidateQueries({ queryKey: ["assistantKnowledge", id] });
      setCrawlCharCount(result.charCount || result.content?.length || 0);
      setCrawlSuccess(true);
      toast({ title: "Website crawled", description: `Content from ${crawlUrl} saved.` });
      setCrawlUrl("");
    } catch (e: any) {
      setCrawlError(e.message || "This site blocked crawling. Try copying the text manually.");
    } finally {
      setCrawlLoading(false);
    }
  };

  const copyText = (text: string, label = "Copied") => {
    navigator.clipboard.writeText(text);
    toast({ title: label });
  };

  const generateQR = async () => {
    setQrLoading(true);
    try {
      const QRCode = await import("qrcode");
      const url = `https://ai-employee-rho.vercel.app/chat/${id}`;
      const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: "#ffffff", light: "#00000000" } });
      setQrDataUrl(dataUrl);
    } catch {
      toast({ title: "QR generation failed", variant: "destructive" });
    } finally {
      setQrLoading(false);
    }
  };

  const platforms: Record<string, { name: string; icon: string; code: string; instructions: string; language: string }> = {
    html: {
      name: "HTML",
      icon: "🌐",
      language: "html",
      code: `<!-- Paste before </body> tag -->\n<script src="https://ai-employee-rho.vercel.app/widget.js" \n  data-id="${id}"></script>`,
      instructions: "Open your HTML file, find the closing </body> tag, paste this code just before it.",
    },
    react: {
      name: "React",
      icon: "⚛️",
      language: "jsx",
      code: `// In your App.jsx or index.jsx, add inside useEffect:\nuseEffect(() => {\n  const script = document.createElement('script');\n  script.src = 'https://ai-employee-rho.vercel.app/widget.js';\n  script.setAttribute('data-id', '${id}');\n  document.body.appendChild(script);\n}, []);`,
      instructions: "Paste this in your root App.jsx component.",
    },
    nextjs: {
      name: "Next.js",
      icon: "▲",
      language: "jsx",
      code: `// In app/layout.tsx or pages/_app.tsx\nimport Script from 'next/script'\n\n<Script \n  src="https://ai-employee-rho.vercel.app/widget.js"\n  data-id="${id}"\n  strategy="afterInteractive"\n/>`,
      instructions: "Add this to your root layout file. Requires next/script import.",
    },
    wordpress: {
      name: "WordPress",
      icon: "🔷",
      language: "html",
      code: `<script src="https://ai-employee-rho.vercel.app/widget.js" \n  data-id="${id}"></script>`,
      instructions: 'Go to Appearance → Theme Editor → footer.php. Paste this code before </body>. Alternatively, install the plugin "Insert Headers and Footers" and paste in the Footer section.',
    },
    shopify: {
      name: "Shopify",
      icon: "🛒",
      language: "html",
      code: `<script src="https://ai-employee-rho.vercel.app/widget.js" \n  data-id="${id}"></script>`,
      instructions: "Go to Online Store → Themes → Edit Code → theme.liquid. Paste before </body>.",
    },
    webflow: {
      name: "Webflow",
      icon: "🌀",
      language: "html",
      code: `<script src="https://ai-employee-rho.vercel.app/widget.js" \n  data-id="${id}"></script>`,
      instructions: "Go to Project Settings → Custom Code → Footer Code. Paste this.",
    },
    wix: {
      name: "Wix",
      icon: "🔶",
      language: "html",
      code: `<script src="https://ai-employee-rho.vercel.app/widget.js" \n  data-id="${id}"></script>`,
      instructions: "Go to Settings → Advanced → Custom Code → Add Code → Body. Paste this.",
    },
    vue: {
      name: "Vue.js",
      icon: "💚",
      language: "js",
      code: `// In main.js or App.vue mounted():\nmounted() {\n  const script = document.createElement('script');\n  script.src = 'https://ai-employee-rho.vercel.app/widget.js';\n  script.setAttribute('data-id', '${id}');\n  document.body.appendChild(script);\n}`,
      instructions: "Paste this in your main.js or App.vue mounted() hook.",
    },
  };

  const plat = platforms[embedPlatform];

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
          <TabsTrigger value="embed" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg"><Code2 className="h-4 w-4 mr-2" />Embed Code</TabsTrigger>
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

            <Tabs defaultValue="paste" className="mb-8">
              <TabsList className="bg-black/50 border border-white/10 p-1 w-full justify-start overflow-x-auto h-auto rounded-xl mb-6">
                <TabsTrigger value="paste" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg">
                  <FileText className="h-4 w-4 mr-2" />Paste Text
                </TabsTrigger>
                <TabsTrigger value="upload" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg">
                  <Upload className="h-4 w-4 mr-2" />Upload File
                </TabsTrigger>
                <TabsTrigger value="crawl" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-lg">
                  <Globe className="h-4 w-4 mr-2" />Crawl URL
                </TabsTrigger>
              </TabsList>

              <TabsContent value="paste">
                <div className="space-y-4">
                  <div className="grid gap-3">
                    <Label className="text-white/80">Title</Label>
                    <Input value={knowledgeTitle} onChange={(e) => setKnowledgeTitle(e.target.value)} placeholder="e.g. Pricing Information" className="bg-black/40 border-white/10 text-white" />
                  </div>
                  <div className="grid gap-3">
                    <Label className="text-white/80">Content</Label>
                    <Textarea value={knowledgeContent} onChange={(e) => setKnowledgeContent(e.target.value)} placeholder="What should your assistant know?" rows={6} className="bg-black/40 border-white/10 text-white" />
                  </div>
                  <Button onClick={() => addKnowledge.mutate()} disabled={!knowledgeTitle || !knowledgeContent || addKnowledge.isPending} className="bg-primary text-black hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" /> Save
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="upload">
                <div
                  className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${dragOver ? "border-primary border-solid bg-primary/5" : "border-white/20 hover:border-primary/50"}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept=".txt,.pdf,.docx" onChange={handleFileUpload} className="hidden" />
                  {uploading ? (
                    <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-4 animate-spin" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
                  )}
                  <p className="text-white mb-2">{uploading ? "Uploading..." : "Drop a file here, or click to browse"}</p>
                  <p className="text-sm text-muted-foreground">Supports .txt, .pdf, .docx</p>
                </div>
              </TabsContent>

              <TabsContent value="crawl">
                <div className="space-y-4">
                  <div className="grid gap-3">
                    <Label className="text-white/80">Website URL</Label>
                    <div className="flex gap-2">
                      <Input value={crawlUrl} onChange={(e) => setCrawlUrl(e.target.value)} placeholder="https://example.com" className="bg-black/40 border-white/10 text-white flex-1" />
                      <Button onClick={handleCrawl} disabled={!crawlUrl || crawlLoading} className="bg-primary text-black hover:bg-primary/90 shrink-0">
                        {crawlLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
                        {crawlLoading ? "Crawling..." : "Crawl Website"}
                      </Button>
                    </div>
                  </div>
                  {crawlError && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <span className="text-red-400 text-sm">{crawlError}</span>
                    </div>
                  )}
                  {crawlSuccess && (
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <span className="text-green-400 text-sm">Extracted {crawlCharCount.toLocaleString()} characters</span>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {loadingKnow ? (
              <Skeleton className="h-32 bg-white/10" />
            ) : knowledge?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No knowledge items yet. Add documents above.</p>
            ) : (
              <div className="space-y-3">
                {knowledge?.map((item: any) => (
                  <div key={item.id} className="flex items-start justify-between p-4 bg-black/40 rounded-lg border border-white/5">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium flex items-center gap-2">
                        {item.type === "crawl" && <Globe className="h-3 w-3 text-muted-foreground" />}
                        {item.type === "file" && <FileText className="h-3 w-3 text-muted-foreground" />}
                        {item.title}
                      </p>
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

          <TabsContent value="embed" className="mt-0">
            <h2 className="text-xl font-semibold text-white mb-4">Embed Code</h2>
            <p className="text-muted-foreground mb-6">Choose your platform and paste the code to add this assistant to your website.</p>

            <div className="flex flex-wrap gap-2 mb-6">
              {Object.entries(platforms).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => setEmbedPlatform(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    embedPlatform === key
                      ? "bg-primary text-black"
                      : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>{p.icon}</span>
                  {p.name}
                </button>
              ))}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{plat.icon} {plat.name}</h3>
                <button
                  onClick={() => copyText(plat.code, `${plat.name} code copied`)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
                >
                  <Copy className="h-4 w-4" /> Copy Code
                </button>
              </div>

              <pre className="bg-black/60 text-green-400 p-4 rounded-lg overflow-x-auto text-sm leading-relaxed font-mono whitespace-pre-wrap">{plat.code}</pre>

              <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <BookOpen className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white mb-1">Instructions</p>
                  <p className="text-sm text-muted-foreground">{plat.instructions}</p>
                </div>
              </div>

              <button
                onClick={() => window.open(`https://ai-employee-rho.vercel.app/chat/${id}`, "_blank")}
                className="flex items-center gap-2 w-full justify-center py-2.5 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors text-sm font-medium"
              >
                <ExternalLink className="h-4 w-4" /> Test your widget
              </button>
            </div>

            <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Share Direct Link</h3>
              <div className="flex items-center gap-2 mb-4">
                <input
                  readOnly
                  value={`https://ai-employee-rho.vercel.app/chat/${id}`}
                  className="flex-1 bg-black/40 border border-white/10 text-white text-sm px-3 py-2 rounded-lg font-mono"
                />
                <button
                  onClick={() => copyText(`https://ai-employee-rho.vercel.app/chat/${id}`, "Link copied")}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors text-sm font-medium shrink-0"
                >
                  <Copy className="h-4 w-4" /> Copy Link
                </button>
                <button
                  onClick={() => window.open(`https://ai-employee-rho.vercel.app/chat/${id}`, "_blank")}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors text-sm font-medium shrink-0"
                >
                  <ExternalLink className="h-4 w-4" /> Open
                </button>
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-white">QR Code</p>
                  <button
                    onClick={generateQR}
                    disabled={qrLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    <QrCode className="h-4 w-4" /> {qrLoading ? "Generating..." : qrDataUrl ? "Regenerate" : "Generate QR"}
                  </button>
                </div>
                {qrDataUrl && (
                  <div className="flex flex-col items-center gap-3">
                    <img src={qrDataUrl} alt="QR Code" className="w-40 h-40 rounded-lg" />
                    <a
                      href={qrDataUrl}
                      download={`qr-${id}.png`}
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Download className="h-4 w-4" /> Download PNG
                    </a>
                  </div>
                )}
              </div>
            </div>
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
