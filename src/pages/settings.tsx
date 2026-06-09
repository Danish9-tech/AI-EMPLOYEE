import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Code, Copy, Key, MessageCircle, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/App";
import { supabase } from "@/lib/supabase";

interface WhatsAppConfig {
  enabled: boolean;
  phoneNumber: string | null;
  phoneNumberId: string | null;
  webhookUrl: string;
}

export default function Settings() {
  const { user } = useAuthContext();
  const { toast } = useToast();

  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [waPhoneNumberId, setWaPhoneNumberId] = useState("");
  const [waBusinessAccountId, setWaBusinessAccountId] = useState("");
  const [waAccessToken, setWaAccessToken] = useState("");
  const [waPhoneNumber, setWaPhoneNumber] = useState("");

  useEffect(() => {
    fetchWhatsAppConfig();
  }, []);

  const fetchWhatsAppConfig = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/whatsapp/config", {
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWhatsappConfig(data);
      }
    } catch (err) {
      console.error("Failed to fetch WhatsApp config:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveWhatsAppConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/whatsapp/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ phoneNumberId: waPhoneNumberId, businessAccountId: waBusinessAccountId, accessToken: waAccessToken, phoneNumber: waPhoneNumber }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      const data = await res.json();
      setWhatsappConfig(data);
      toast({ title: "WhatsApp connected successfully!" });
      setWaPhoneNumberId(""); setWaBusinessAccountId(""); setWaAccessToken(""); setWaPhoneNumber("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const disconnectWhatsApp = async () => {
    if (!confirm("Are you sure you want to disconnect WhatsApp?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/whatsapp/config", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      });
      if (res.ok) {
        setWhatsappConfig({ enabled: false, phoneNumber: null, phoneNumberId: null, webhookUrl: "" });
        toast({ title: "WhatsApp disconnected" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to disconnect", variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${title} copied to clipboard` });
  };

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account and platform integrations.</p>
      </div>

      <div className="grid gap-8">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Account Profile</CardTitle>
            <CardDescription>Your account details from Supabase Auth.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label className="text-white/80">Email Address</Label>
              <Input disabled value={user?.email || ""} className="bg-black/40 border-white/10 text-white/50" />
            </div>
            <div className="grid gap-2">
              <Label className="text-white/80">User ID</Label>
              <Input disabled value={user?.id || ""} className="bg-black/40 border-white/10 text-white/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" /> WhatsApp Business
            </CardTitle>
            <CardDescription>Connect your WhatsApp Business account to receive and send messages.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading configuration...
              </div>
            ) : whatsappConfig?.enabled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-green-400 font-medium">Connected</p>
                    <p className="text-sm text-muted-foreground">Phone: {whatsappConfig.phoneNumber || "Not set"}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Your Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={whatsappConfig.webhookUrl} className="bg-black/40 border-white/10 text-white font-mono text-sm" />
                    <Button variant="secondary" onClick={() => copyToClipboard(whatsappConfig.webhookUrl, "Webhook URL")}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Add this URL in your Meta Developer Portal → WhatsApp → Webhooks</p>
                </div>
                <Button variant="destructive" onClick={disconnectWhatsApp}>Disconnect WhatsApp</Button>
              </div>
            ) : (
              <form onSubmit={saveWhatsAppConfig} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-white/80">Phone Number ID</Label>
                    <Input placeholder="123456789012345" value={waPhoneNumberId} onChange={(e) => setWaPhoneNumberId(e.target.value)} required className="bg-black/40 border-white/10 text-white" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-white/80">Business Account ID</Label>
                    <Input placeholder="987654321098765" value={waBusinessAccountId} onChange={(e) => setWaBusinessAccountId(e.target.value)} required className="bg-black/40 border-white/10 text-white" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-white/80">Access Token</Label>
                  <Input type="password" placeholder="Enter your WhatsApp API access token" value={waAccessToken} onChange={(e) => setWaAccessToken(e.target.value)} required className="bg-black/40 border-white/10 text-white" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-white/80">WhatsApp Phone Number</Label>
                  <Input placeholder="+1234567890" value={waPhoneNumber} onChange={(e) => setWaPhoneNumber(e.target.value)} className="bg-black/40 border-white/10 text-white" />
                </div>
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <h4 className="text-blue-400 font-medium mb-2">How to get these credentials:</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Go to <a href="https://developers.facebook.com/" target="_blank" className="text-primary hover:underline">Meta Developers</a> and create an app</li>
                    <li>Add WhatsApp product to your app</li>
                    <li>Copy Phone Number ID and Business Account ID from API Setup</li>
                    <li>Get a temporary or permanent access token</li>
                    <li>Add your webhook URL in WhatsApp → Configuration → Webhooks</li>
                  </ol>
                </div>
                <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {saving ? "Connecting..." : "Connect WhatsApp"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Key className="h-5 w-5 text-accent" /> API Keys
            </CardTitle>
            <CardDescription>For developers integrating via backend.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label className="text-white/80">Public API Key</Label>
              <div className="flex gap-2">
                <Input disabled value="pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="bg-black/40 border-white/10 text-white font-mono" />
                <Button variant="secondary" onClick={() => copyToClipboard("pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "API Key")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" /> Global Embed Code
            </CardTitle>
            <CardDescription>Include this script once on your site to enable widget rendering.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-black/60 p-4 rounded-lg border border-white/5 relative group">
              <code className="text-primary text-sm whitespace-pre-wrap font-mono">
                {`<script src="https://${window.location.hostname}/widget.js"></script>`}
              </code>
              <Button size="sm" variant="ghost" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white hover:text-primary hover:bg-black"
                onClick={() => copyToClipboard(`<script src="https://${window.location.hostname}/widget.js"></script>`, "Embed Script")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              To load a specific assistant, add the <code className="text-white bg-white/10 px-1 rounded">data-id="ASSISTANT_ID"</code> attribute to the script tag, which you can find in the Assistants page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
