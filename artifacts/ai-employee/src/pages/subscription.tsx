import { useGetSubscription } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Subscription() {
  const { data: sub, isLoading } = useGetSubscription({
    query: { queryKey: ["subscription"] }
  });

  const usagePercent = sub ? Math.min((sub.messagesUsed / sub.messagesLimit) * 100, 100) : 0;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">Pricing that scales with you</h1>
        <p className="text-lg text-muted-foreground">Upgrade your plan to unlock more assistants, unlimited messages, and advanced channels.</p>
      </div>

      {isLoading ? (
        <Card className="bg-white/5 border-white/10 animate-pulse h-32" />
      ) : sub ? (
        <Card className="bg-[#1a1a24] border-primary/30 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px]"></div>
          <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
            <div className="flex-1 w-full">
              <h3 className="text-lg font-medium text-white mb-2">Current Usage ({sub.plan.toUpperCase()} Plan)</h3>
              <div className="flex justify-between text-sm mb-2 text-white/70">
                <span>{sub.messagesUsed} messages used</span>
                <span>{sub.messagesLimit} limit</span>
              </div>
              <Progress value={usagePercent} className="h-2 bg-white/10" indicatorClassName={usagePercent > 80 ? "bg-destructive" : "bg-primary"} />
            </div>
            <div className="shrink-0 text-center md:text-right w-full md:w-auto">
              <p className="text-sm text-muted-foreground mb-2">Renews on {sub.renewsAt ? new Date(sub.renewsAt).toLocaleDateString() : 'N/A'}</p>
              {sub.plan === 'free' && (
                <Button className="bg-primary text-black hover:bg-primary/90">Upgrade Now</Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid md:grid-cols-3 gap-8">
        <PlanCard 
          name="Free"
          price="$0"
          description="Perfect for testing and small personal projects."
          features={["100 messages/mo", "1 AI Assistant", "50 Leads/mo", "Web Widget only", "Community Support"]}
          current={sub?.plan === 'free'}
        />
        <PlanCard 
          name="Pro"
          price="$49"
          period="/mo"
          description="For growing businesses needing serious automation."
          features={["Unlimited messages", "Up to 5 AI Assistants", "Unlimited Leads", "WhatsApp Integration", "Priority Support"]}
          highlight
          current={sub?.plan === 'pro'}
        />
        <PlanCard 
          name="Enterprise"
          price="$199"
          period="/mo"
          description="Custom solutions for high-volume operations."
          features={["Unlimited everything", "Custom Domain", "Full API Access", "White-labeling", "Dedicated Account Manager"]}
          current={sub?.plan === 'enterprise'}
        />
      </div>
    </div>
  );
}

function PlanCard({ name, price, period = "", description, features, highlight = false, current = false }: any) {
  return (
    <Card className={`relative flex flex-col ${highlight ? 'bg-[#0a0a0f] border-primary/50 shadow-[0_0_30px_rgba(0,212,255,0.15)] transform md:-translate-y-4' : 'bg-white/5 border-white/10'}`}>
      {highlight && (
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-accent"></div>
      )}
      <CardHeader>
        <CardTitle className="text-xl text-white">{name}</CardTitle>
        <p className="text-sm text-muted-foreground h-10">{description}</p>
        <div className="mt-4 flex items-baseline text-4xl font-extrabold text-white">
          {price}
          <span className="ml-1 text-xl font-medium text-muted-foreground">{period}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-4">
          {features.map((feature: string, i: number) => (
            <li key={i} className="flex items-start">
              <Check className="h-5 w-5 text-primary shrink-0 mr-3" />
              <span className="text-white/80">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button 
          className={`w-full ${current ? 'bg-white/10 text-white hover:bg-white/20' : highlight ? 'bg-primary text-black hover:bg-primary/90' : 'bg-white text-black hover:bg-white/90'}`}
          disabled={current}
          variant={current ? "outline" : "default"}
        >
          {current ? "Current Plan" : "Upgrade"}
        </Button>
      </CardFooter>
    </Card>
  );
}
