import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Smartphone, Instagram, Facebook, Send, Globe, Check, Bell, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api, apiFetch } from "@/lib/api";

interface Channel {
  id: string;
  name: string;
  icon: any;
  description: string;
  status: "connected" | "active" | "coming_soon";
  badge?: string;
  action?: () => void;
  actionLabel?: string;
}

export default function Channels() {
  const { toast } = useToast();
  const [notifyChannel, setNotifyChannel] = useState<string | null>(null);
  const [notifyEmail, setNotifyEmail] = useState("");

  const notifyMutation = useMutation({
    mutationFn: async () => {
      await apiFetch("/api/channel-waitlist", {
        method: "POST",
        body: JSON.stringify({ channel: notifyChannel, email: notifyEmail }),
      });
    },
    onSuccess: () => {
      toast({ title: "You're on the list!", description: `We'll notify you when ${notifyChannel} is available.` });
      setNotifyChannel(null);
      setNotifyEmail("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const copyWidgetEmbed = () => {
    navigator.clipboard.writeText(`<script src="https://${window.location.hostname}/widget.js" data-id="YOUR_ASSISTANT_ID"></script>`);
    toast({ title: "Embed code copied" });
  };

  const channels: Channel[] = [
    {
      id: "widget",
      name: "Website Widget",
      icon: Globe,
      description: "Embed your AI assistant on any website with a single script tag.",
      status: "active",
      action: copyWidgetEmbed,
      actionLabel: "Copy Embed Code",
    },
    {
      id: "whatsapp",
      name: "WhatsApp",
      icon: Smartphone,
      description: "Two-way WhatsApp messaging with your AI assistant.",
      status: "connected",
      badge: "Connected",
    },
    {
      id: "instagram",
      name: "Instagram DM",
      icon: Instagram,
      description: "Automate Instagram direct messages with your AI assistant.",
      status: "coming_soon",
      action: () => setNotifyChannel("Instagram DM"),
      actionLabel: "Notify Me",
    },
    {
      id: "facebook",
      name: "Facebook Messenger",
      icon: Facebook,
      description: "Respond to Facebook messages automatically.",
      status: "coming_soon",
      action: () => setNotifyChannel("Facebook Messenger"),
      actionLabel: "Notify Me",
    },
    {
      id: "telegram",
      name: "Telegram",
      icon: Send,
      description: "Connect your assistant to Telegram for instant messaging.",
      status: "coming_soon",
      action: () => setNotifyChannel("Telegram"),
      actionLabel: "Notify Me",
    },
    {
      id: "sms",
      name: "SMS",
      icon: MessageSquare,
      description: "Send and receive SMS messages through your assistant.",
      status: "coming_soon",
      action: () => setNotifyChannel("SMS"),
      actionLabel: "Notify Me",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Channels</h1>
        <p className="text-muted-foreground">Connect your AI assistant to multiple platforms and channels.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {channels.map((channel) => (
          <Card
            key={channel.id}
            className={`bg-white/5 border-white/10 flex flex-col ${
              channel.status === "coming_soon" ? "opacity-60" : "hover:border-primary/50"
            } transition-colors`}
          >
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className={`p-3 rounded-xl border ${
                  channel.status === "active" ? "bg-primary/20 border-primary/30" :
                  channel.status === "connected" ? "bg-green-500/20 border-green-500/30" :
                  "bg-white/5 border-white/10"
                }`}>
                  <channel.icon className={`h-6 w-6 ${
                    channel.status === "active" ? "text-primary" :
                    channel.status === "connected" ? "text-green-400" :
                    "text-muted-foreground"
                  }`} />
                </div>
                {channel.badge && (
                  <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                    <Check className="h-3 w-3" /> {channel.badge}
                  </span>
                )}
                {channel.status === "coming_soon" && (
                  <span className="text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-full">
                    Coming Soon
                  </span>
                )}
              </div>
              <CardTitle className="text-xl text-white mt-2">{channel.name}</CardTitle>
              <CardDescription className="text-muted-foreground">{channel.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1" />
            <CardFooter>
              {channel.status === "active" && channel.action && (
                <Button
                  variant="outline"
                  className="w-full border-primary/30 text-white hover:bg-primary/10"
                  onClick={channel.action}
                >
                  <Copy className="mr-2 h-4 w-4" /> {channel.actionLabel}
                </Button>
              )}
              {channel.status === "connected" && (
                <Button
                  variant="outline"
                  className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10"
                  asChild
                >
                  <a href="/settings">Configure</a>
                </Button>
              )}
              {channel.status === "coming_soon" && channel.action && (
                <Button
                  variant="outline"
                  className="w-full border-white/10 text-muted-foreground hover:text-white hover:bg-white/5"
                  onClick={channel.action}
                >
                  <Bell className="mr-2 h-4 w-4" /> {channel.actionLabel}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={!!notifyChannel} onOpenChange={(o) => { if (!o) setNotifyChannel(null); }}>
        <DialogContent className="bg-background border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Get notified</DialogTitle>
            <DialogDescription>We'll email you when {notifyChannel} integration is ready.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-black/40 border-white/10 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNotifyChannel(null)} className="text-muted-foreground">Cancel</Button>
            <Button
              onClick={() => notifyMutation.mutate()}
              disabled={!notifyEmail || notifyMutation.isPending}
              className="bg-primary text-black hover:bg-primary/90"
            >
              {notifyMutation.isPending ? "Subscribing..." : "Notify Me"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
