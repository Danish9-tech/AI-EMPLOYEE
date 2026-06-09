import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, Download, Check, Search, Grid3X3, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";

export default function Marketplace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data: templates, isLoading, error } = useQuery({
    queryKey: ["marketplaceTemplates"],
    queryFn: () => api.listMarketplaceTemplates(),
  });

  const installMutation = useMutation({
    mutationFn: (templateId: number) => api.installMarketplaceTemplate(templateId),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["assistants"] });
      if (result?._knowledgeCopied === false) {
        toast({ title: "Template installed", description: "Knowledge base could not be copied. You can add it manually.", variant: "default" });
      } else {
        toast({ title: "Template installed", description: "Your new assistant is ready to configure." });
      }
    },
    onError: (e: any) => {
      toast({ title: "Install failed", description: e.message || "Please try again.", variant: "destructive" });
    },
  });

  const filtered = templates?.filter((t: any) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <Activity className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Failed to load marketplace</h2>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Marketplace</h1>
        <p className="text-muted-foreground">Browse and install pre-built AI assistant templates.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white"
        />
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
      ) : filtered?.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-xl border border-white/10">
          <Store className="h-12 w-12 text-primary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium text-white mb-2">No templates found</h3>
          <p className="text-muted-foreground">{search ? "Try a different search term." : "More templates coming soon."}</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered?.map((template: any) => (
            <Card key={template.id} className="bg-white/5 border-white/10 flex flex-col group hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                    <Grid3X3 className="h-5 w-5 text-primary" />
                  </div>
                  {template.installed ? (
                    <span className="flex items-center gap-1 text-xs text-accent bg-accent/10 px-2 py-1 rounded-full">
                      <Check className="h-3 w-3" /> Installed
                    </span>
                  ) : null}
                </div>
                <CardTitle className="text-xl text-white mt-3">{template.name}</CardTitle>
                <CardDescription className="text-muted-foreground">{template.category}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-white/70 line-clamp-3 mb-6 flex-1">{template.description}</p>
                <Button
                  className="w-full"
                  variant={template.installed ? "outline" : "default"}
                  disabled={template.installed || installMutation.isPending}
                  onClick={() => installMutation.mutate(template.id)}
                >
                  {template.installed ? (
                    <><Check className="mr-2 h-4 w-4" /> Installed</>
                  ) : (
                    <><Download className="mr-2 h-4 w-4" /> Install Template</>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
