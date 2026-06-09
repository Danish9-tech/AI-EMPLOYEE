import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, MessageSquare, Users, TrendingUp, Activity, DollarSign, BarChart3, ShoppingCart, ArrowRight, Copy, ExternalLink, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function Dashboard() {
  const { toast } = useToast();
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: () => api.getDashboardStats(),
  });

  const { data: assistants } = useQuery({
    queryKey: ["assistants"],
    queryFn: () => api.listAssistants(),
  });

  const { data: weeklyReport } = useQuery({
    queryKey: ["weeklyReport"],
    queryFn: () => api.getWeeklyReport(),
  });

  const funnelData = useMemo(() => [
    { name: "Conversations", value: stats?.totalConversations || 0, color: "#3b82f6" },
    { name: "Leads", value: stats?.totalLeads || 0, color: "#8b5cf6" },
    { name: "Appointments", value: stats?.totalAppointments || 0, color: "#10b981" },
  ], [stats]);

  const weeklyChartData = useMemo(() => weeklyReport?.dailyChart || [], [weeklyReport]);

  const dropOff = (prev: number, curr: number) => {
    if (prev === 0) return "0%";
    return `${Math.round((1 - curr / prev) * 100)}%`;
  };

  const copyEmbed = async () => {
    const id = assistants?.[0]?.id;
    if (!id) { toast({ title: "No assistant found", variant: "destructive" }); return; }
    await navigator.clipboard.writeText(`<script src="https://${window.location.hostname}/widget.js" data-id="${id}"></script>`);
    toast({ title: "Embed code copied" });
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Activity className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Failed to load stats</h2>
        <p className="text-muted-foreground">Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Mission Control</h1>
        <p className="text-muted-foreground">Overview of your AI sales team's performance.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Assistants" value={stats?.totalAssistants} icon={Bot} trend={null} isLoading={isLoading} />
        <StatCard title="Total Conversations" value={stats?.totalConversations} icon={MessageSquare} trend={`+${stats?.messagesThisWeek || 0} msgs this week`} isLoading={isLoading} />
        <StatCard title="Total Leads" value={stats?.totalLeads} icon={Users} trend={`+${stats?.leadsThisWeek || 0} this week`} isLoading={isLoading} />
        <StatCard title="Conversion Rate" value={stats ? `${stats.conversionRate.toFixed(1)}%` : undefined} icon={TrendingUp} trend="Leads / Conversations" isLoading={isLoading} />
      </div>

      <Card className="bg-white/5 border-white/10 overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-red-400" />
            Missed Revenue
          </CardTitle>
          <span className="text-xs text-muted-foreground">Based on avg sale value: ${stats?.avgSaleValue || 100}</span>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-16 bg-white/10" />
          ) : (
            <div className="space-y-3">
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">This week {stats?.unconvertedConversations || 0} visitors left without converting</p>
                  <p className="text-4xl font-bold text-red-400">${(stats?.missedRevenue || 0).toLocaleString()}</p>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  estimated missed revenue
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{stats?.totalConversations || 0} total conversations</span>
                <span>|</span>
                <span>{stats?.totalLeads || 0} leads captured</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 bg-white/10" />
            ) : (
              <div className="space-y-3">
                {funnelData.map((item, i) => {
                  const prev = funnelData[i - 1]?.value || item.value;
                  const drop = i === 0 ? null : dropOff(prev, item.value);
                  const widthPct = funnelData[0].value > 0 ? (item.value / funnelData[0].value) * 100 : 0;
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-white">{item.name}</span>
                        <span className="text-muted-foreground">{item.value} {drop && <span className="text-red-400 ml-2">-{drop}</span>}</span>
                      </div>
                      <div className="h-3 bg-black/40 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(widthPct, 5)}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Conversations (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 bg-white/10" />
            ) : weeklyChartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No conversations this week
              </div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyChartData}>
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={11} />
                    <YAxis stroke="#6b7280" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }} />
                    <Line type="monotone" dataKey="count" stroke="#00d4ff" strokeWidth={2} dot={{ fill: "#00d4ff" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {assistants?.[0] && (
              <>
                <Link href={`/assistants/${assistants[0].id}`}>
                  <Button variant="outline" className="border-primary/30 text-white hover:bg-primary/10">
                    <BookOpen className="mr-2 h-4 w-4" /> Add Knowledge
                  </Button>
                </Link>
                <Button variant="outline" className="border-primary/30 text-white hover:bg-primary/10" onClick={copyEmbed}>
                  <Copy className="mr-2 h-4 w-4" /> Copy Embed Code
                </Button>
                <a href={`/chat/${assistants[0].id}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="border-primary/30 text-white hover:bg-primary/10">
                    <ExternalLink className="mr-2 h-4 w-4" /> Test Widget
                  </Button>
                </a>
              </>
            )}
            <Link href="/marketplace">
              <Button variant="outline" className="border-primary/30 text-white hover:bg-primary/10">
                <ShoppingCart className="mr-2 h-4 w-4" /> Browse Marketplace
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="outline" className="border-primary/30 text-white hover:bg-primary/10">
                <BarChart3 className="mr-2 h-4 w-4" /> View Reports
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, isLoading }: { title: string; value?: string | number; icon: any; trend: string | null; isLoading: boolean }) {
  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20 bg-white/10" />
        ) : (
          <div className="text-2xl font-bold text-white">{value}</div>
        )}
        {trend && <p className="text-xs text-accent mt-1">{trend}</p>}
      </CardContent>
    </Card>
  );
}
