import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Building2, Check, Rocket, ArrowRight, ArrowLeft, Activity, Code } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

const steps = [
  { id: "welcome", title: "Welcome", icon: Rocket },
  { id: "assistant", title: "Create Assistant", icon: Bot },
  { id: "knowledge", title: "Add Knowledge", icon: Building2 },
  { id: "deploy", title: "Deploy", icon: Code },
];

const businessTypes = [
  { value: "Restaurant", label: "Restaurant" },
  { value: "Dental Clinic", label: "Dental Clinic" },
  { value: "Real Estate", label: "Real Estate" },
  { value: "E-commerce", label: "E-commerce" },
  { value: "Law Firm", label: "Law Firm" },
  { value: "SaaS", label: "SaaS" },
  { value: "Retail", label: "Retail" },
  { value: "Other", label: "Other" },
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem("onboardingStep");
    return saved ? parseInt(saved) : 0;
  });
  const [businessType, setBusinessType] = useState(localStorage.getItem("onboardingBizType") || "");
  const [avgSale, setAvgSale] = useState(localStorage.getItem("onboardingAvgSale") || "100");
  const [assistantName, setAssistantName] = useState(localStorage.getItem("onboardingAssName") || "");
  const [businessName, setBusinessName] = useState(localStorage.getItem("onboardingBizName") || "");
  const [description, setDescription] = useState(localStorage.getItem("onboardingDesc") || "");
  const [tone, setTone] = useState(localStorage.getItem("onboardingTone") || "friendly");
  const [services, setServices] = useState(localStorage.getItem("onboardingServices") || "");
  const [pricing, setPricing] = useState(localStorage.getItem("onboardingPricing") || "");
  const [faqs, setFaqs] = useState(localStorage.getItem("onboardingFaqs") || "");

  const saveStep = () => {
    localStorage.setItem("onboardingStep", String(step));
    localStorage.setItem("onboardingBizType", businessType);
    localStorage.setItem("onboardingAvgSale", avgSale);
    localStorage.setItem("onboardingAssName", assistantName);
    localStorage.setItem("onboardingBizName", businessName);
    localStorage.setItem("onboardingDesc", description);
    localStorage.setItem("onboardingTone", tone);
    localStorage.setItem("onboardingServices", services);
    localStorage.setItem("onboardingPricing", pricing);
    localStorage.setItem("onboardingFaqs", faqs);
  };

  const { data: hasAssistants } = useQuery({
    queryKey: ["onboardingCheck"],
    queryFn: async () => {
      const list = await api.listAssistants();
      return list.length > 0;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const a = await api.createAssistant({
        name: assistantName || `${businessType || "Business"} Assistant`,
        businessName: businessName || businessType || "My Business",
        description: description || `AI assistant for ${businessType || "my business"}`,
        tone,
        widget_color: "#00d4ff",
        is_active: true,
      });
      if (services) await api.createAssistantKnowledge(a.id, { title: "Our Services", content: services, type: "manual" });
      if (pricing) await api.createAssistantKnowledge(a.id, { title: "Our Pricing", content: pricing, type: "manual" });
      if (faqs) await api.createAssistantKnowledge(a.id, { title: "Common Questions", content: faqs, type: "manual" });
      if (avgSale) {
        await api.updateProfile({ avg_sale_value: parseFloat(avgSale) || 100 });
      }
      const { error } = await supabase.auth.updateUser({ data: { onboarding_completed: true } });
      if (error) throw error;
      return a;
    },
    onSuccess: () => {
      localStorage.clear();
      setStep(3);
      toast({ title: "All set!", description: "Your AI Employee is ready." });
    },
    onError: (e: any) => {
      toast({ title: "Something went wrong", description: e.message, variant: "destructive" });
    },
  });

  if (hasAssistants === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Activity className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  if (hasAssistants) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md bg-white/5 border-white/10 text-center">
          <CardHeader>
            <Check className="h-12 w-12 text-accent mx-auto mb-2" />
            <CardTitle className="text-2xl text-white">Already Set Up</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">You've already completed onboarding.</p>
            <Button onClick={() => setLocation("/dashboard")} className="bg-primary text-black hover:bg-primary/90">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-xl bg-white/5 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between mb-6">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  i <= step ? "bg-primary border-primary text-black" : "border-white/20 text-muted-foreground"
                }`}>
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-1 transition-colors ${i < step ? "bg-primary" : "bg-white/10"}`} />
                )}
              </div>
            ))}
          </div>
          <CardTitle className="text-2xl text-white">{steps[step].title}</CardTitle>
        </CardHeader>
        <CardContent>
          {step === 0 && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="p-4 bg-primary/20 rounded-full border border-primary/30">
                  <Rocket className="h-12 w-12 text-primary" />
                </div>
              </div>
              <p className="text-muted-foreground text-center">Let's build your first AI Employee in under 5 minutes.</p>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <label className="text-white/80 text-sm font-medium">What kind of business do you run?</label>
                  <Select value={businessType} onValueChange={(v) => { setBusinessType(v); saveStep(); }}>
                    <SelectTrigger className="bg-black/40 border-white/10 text-white"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent className="bg-background border-white/10">
                      {businessTypes.map(bt => (
                        <SelectItem key={bt.value} value={bt.value} className="text-white">{bt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label className="text-white/80 text-sm font-medium">Average sale value ($)</label>
                  <Input type="number" value={avgSale} onChange={(e) => setAvgSale(e.target.value)} className="bg-black/40 border-white/10 text-white" />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-white/80 text-sm font-medium">Assistant Name</label>
                <Input value={assistantName} onChange={(e) => setAssistantName(e.target.value)} placeholder="e.g. Support Bot" className="bg-black/40 border-white/10 text-white" />
              </div>
              <div className="grid gap-2">
                <label className="text-white/80 text-sm font-medium">Business Name</label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Acme Corp" className="bg-black/40 border-white/10 text-white" />
              </div>
              <div className="grid gap-2">
                <label className="text-white/80 text-sm font-medium">Description</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does your assistant do?" rows={3} className="bg-black/40 border-white/10 text-white" />
              </div>
              <div className="grid gap-2">
                <label className="text-white/80 text-sm font-medium">Tone</label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="bg-black/40 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-background border-white/10">
                    <SelectItem value="friendly" className="text-white">Friendly</SelectItem>
                    <SelectItem value="professional" className="text-white">Professional</SelectItem>
                    <SelectItem value="casual" className="text-white">Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm mb-4">Teach your assistant about your business. You can always add more later.</p>
              <div className="grid gap-2">
                <label className="text-white/80 text-sm font-medium">Your Services</label>
                <Textarea value={services} onChange={(e) => setServices(e.target.value)} placeholder="What products or services do you offer?" rows={3} className="bg-black/40 border-white/10 text-white" />
              </div>
              <div className="grid gap-2">
                <label className="text-white/80 text-sm font-medium">Your Pricing</label>
                <Textarea value={pricing} onChange={(e) => setPricing(e.target.value)} placeholder="What are your prices or packages?" rows={3} className="bg-black/40 border-white/10 text-white" />
              </div>
              <div className="grid gap-2">
                <label className="text-white/80 text-sm font-medium">Common Questions & Answers</label>
                <Textarea value={faqs} onChange={(e) => setFaqs(e.target.value)} placeholder="Q: What are your hours?\nA: We're open 9-5 Mon-Fri." rows={3} className="bg-black/40 border-white/10 text-white" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="p-4 bg-accent/20 rounded-full border border-accent/30">
                  <Check className="h-12 w-12 text-accent" />
                </div>
              </div>
              <p className="text-muted-foreground">Your AI Employee is ready. Head to the dashboard to see it in action.</p>
              <div className="bg-black/60 p-4 rounded-lg border border-white/5 text-left">
                <p className="text-sm text-white/80 mb-2 font-medium">Embed on your website:</p>
                <code className="text-primary text-xs whitespace-pre-wrap break-all font-mono">
                  {`<script src="https://${window.location.hostname}/widget.js" data-id="ASSISTANT_ID"></script>`}
                </code>
              </div>
              <Button onClick={() => { setLocation("/dashboard"); localStorage.clear(); }} className="bg-primary text-black hover:bg-primary/90">
                Go to Dashboard
              </Button>
            </div>
          )}

          {step < 3 && (
            <div className="flex justify-between mt-8">
              <Button
                variant="ghost"
                onClick={() => { saveStep(); setStep(Math.max(0, step - 1)); }}
                disabled={step === 0}
                className="text-muted-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <div className="flex gap-2">
                {step < 2 && (
                  <Button variant="ghost" className="text-muted-foreground" onClick={() => { saveStep(); setStep(step + 1); }}>
                    Skip <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                <Button
                  onClick={() => {
                    saveStep();
                    if (step === 2) {
                      createMutation.mutate();
                    } else {
                      setStep(step + 1);
                    }
                  }}
                  disabled={createMutation.isPending}
                  className="bg-primary text-black hover:bg-primary/90"
                >
                  {step === 2 ? (createMutation.isPending ? "Creating..." : "Create & Finish") : "Next"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
