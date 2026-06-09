import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Code, Copy, Key, MessageCircle, CheckCircle, Loader2, DollarSign, Palette, Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/App";
import { api } from "@/lib/api";
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

  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [avgSaleValue, setAvgSaleValue] = useState("100");
  const [savingProfile, setSavingProfile] = useState(false);

  const [brandName, setBrandName] = useState("");
  const [brandLogo, setBrandLogo] = useState("");
  const [brandColor, setBrandColor] = useState("#00d4ff");
  const [showPoweredBy, setShowPoweredBy] = useState(true);

  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [waPhoneNumberId, setWaPhoneNumberId] = useState("");
  const [waBusinessAccountId, setWaBusinessAccountId] = useState("");
  const [waAccessToken, setWaAccessToken] = useState("");
  const [waPhoneNumber, setWaPhoneNumber] = useState("");

  useEffect(() => {
    fetchWhatsAppConfig();
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await api.getProfile();
      setProfile(data);
      setAvgSaleValue(String(data.avg_sale_value || 100));
      const branding = data.agency_branding || {};
      setBrandName(branding.brandName || "");
      setBrandLogo(branding.brandLogo || "");
      setBrandColor(branding.brandColor || "#00d4ff");
      setShowPoweredBy(branding.showPoweredBy !== false);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const data = await api.updateProfile({
        avg_sale_value: parseFloat(avgSaleValue) || 100,
        agency_branding: { brandName, brandLogo, brandColor, showPoweredBy },
      });
      setProfile(data);
      toast({ title: "Settings saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account and platform integrations.</p>
        </div>
        <Button onClick={saveProfile} disabled={savingProfile || profileLoading} className="bg-primary text-black hover:bg-primary/90">
          {savingProfile ? "Saving..." : "Save Settings"}
        </Button>
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
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-400" /> Average Sale Value
            </CardTitle>
            <CardDescription>Used to calculate missed revenue on your dashboard and reports.</CardDescription>
          </CardHeader>
          <CardContent>
            {profileLoading ? (
              <Skeleton className="h-10 w-40 bg-white/10" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="relative w-40">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={avgSaleValue}
                    onChange={(e) => setAvgSaleValue(e.target.value)}
                    min={1}
                    className="pl-8 bg-black/40 border-white/10 text-white"
                  />
                </div>
                <p className="text-sm text-muted-foreground">per conversion</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Palette className="h-5 w-5 text-purple-400" /> Branding
            </CardTitle>
            <CardDescription>Customize the appearance of your AI Employee widget.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label className="text-white/80">Business Name</Label>
              <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Your Company Name" className="bg-black/40 border-white/10 text-white" />
            </div>
            <div className="grid gap-2">
              <Label className="text-white/80">Logo URL (optional)</Label>
              <Input value={brandLogo} onChange={(e) => setBrandLogo(e.target.value)} placeholder="https://example.com/logo.png" className="bg-black/40 border-white/10 text-white" />
            </div>
            <div className="grid gap-2">
              <Label className="text-white/80">Primary Color</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer bg-transparent border border-white/10" />
                <Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="w-32 bg-black/40 border-white/10 text-white font-mono" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="poweredBy" checked={showPoweredBy} onChange={(e) => setShowPoweredBy(e.target.checked)} className="rounded border-white/20" />
              <Label htmlFor="poweredBy" className="text-white/80">Show "Powered by AI Employee" badge</Label>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" /> WhatsApp Business
            </CardTitle>
            <CardDescription>Connect your WhatsApp Business account.</CardDescription>
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
              To load a specific assistant, add the <code className="text-white bg-white/10 px-1 rounded">data-id="ASSISTANT_ID"</code> attribute to the script tag.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
