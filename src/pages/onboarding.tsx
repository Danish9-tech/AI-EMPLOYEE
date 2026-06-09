import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Bot, Building2, Check, Rocket, ArrowRight, ArrowLeft, Activity } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const steps = [
  { id: "welcome", title: "Welcome", icon: Rocket },
  { id: "business", title: "Business Info", icon: Building2 },
  { id: "assistant", title: "First Assistant", icon: Bot },
  { id: "done", title: "All Set", icon: Check },
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [assistantName, setAssistantName] = useState("");

  const { data: hasAssistants } = useQuery({
    queryKey: ["onboardingCheck"],
    queryFn: async () => {
      const list = await api.listAssistants();
      return list.length > 0;
    },
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.createAssistant({
        name: assistantName || "My First Assistant",
        businessName: businessName || "My Business",
        description: "Created during onboarding",
      }),
    onSuccess: () => {
      toast({ title: "Assistant created!", description: "Your AI Employee is ready to go." });
      setStep(3);
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
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
      <Card className="w-full max-w-lg bg-white/5 border-white/10">
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
                  <div className={`w-12 h-0.5 mx-1 transition-colors ${i < step ? "bg-primary" : "bg-white/10"}`} />
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
              <p className="text-muted-foreground text-center">
                Welcome to AI Employee! Let's get your AI sales team up and running in just a few steps.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <label className="text-white/80 text-sm font-medium block">What's your business called?</label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="bg-black/40 border-white/10 text-white"
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <label className="text-white/80 text-sm font-medium block">Name your first assistant</label>
              <Input
                value={assistantName}
                onChange={(e) => setAssistantName(e.target.value)}
                placeholder="e.g. Support Bot"
                className="bg-black/40 border-white/10 text-white"
              />
              <p className="text-xs text-muted-foreground">You can change this anytime.</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="p-4 bg-accent/20 rounded-full border border-accent/30">
                  <Check className="h-12 w-12 text-accent" />
                </div>
              </div>
              <p className="text-muted-foreground">Your AI Employee is ready. Head to the dashboard to configure your assistant.</p>
              <Button onClick={() => setLocation("/dashboard")} className="bg-primary text-black hover:bg-primary/90">
                Go to Dashboard
              </Button>
            </div>
          )}

          {step < 3 && (
            <div className="flex justify-between mt-8">
              <Button
                variant="ghost"
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
                className="text-muted-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => {
                  if (step === 2) {
                    createMutation.mutate();
                  } else {
                    setStep(step + 1);
                  }
                }}
                disabled={createMutation.isPending}
                className="bg-primary text-black hover:bg-primary/90"
              >
                {step === 2 ? (createMutation.isPending ? "Creating..." : "Finish") : "Next"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
