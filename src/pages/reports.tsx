import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, TrendingDown, Users, MessageSquare, Calendar, Download, Lightbulb, HelpCircle, ArrowRight, Activity, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Link } from "wouter";

export default function Reports() {
  const { data: report, isLoading, error } = useQuery({
    queryKey: ["weeklyReport"],
    queryFn: () => api.getWeeklyReport(),
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Activity className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Failed to load report</h2>
        <p className="text-muted-foreground">Please try again later.</p>
      </div>
    );
  }

  const curr = report?.current || {};
  const prev = report?.previous || {};

  const delta = (currVal: number, prevVal: number) => {
    if (prevVal === 0) return currVal > 0 ? "+100%" : "0%";
    const pct = Math.round(((currVal - prevVal) / prevVal) * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  };

  const deltaIcon = (currVal: number, prevVal: number) => {
    if (currVal >= prevVal) return <TrendingUp className="h-4 w-4 text-green-400" />;
    return <TrendingDown className="h-4 w-4 text-red-400" />;
  };

  const handleExport = () => {
    const data = {
      generated: new Date().toISOString(),
      current: curr,
      previous: prev,
      dailyChart: report?.dailyChart || [],
      unanswered: report?.unanswered || [],
      recommendations: report?.recommendations || [],
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-employee-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Reports</h1>
          <p className="text-muted-foreground">Weekly performance analytics for your AI sales team.</p>
        </div>
        <Button variant="outline" className="border-primary/30 text-white hover:bg-primary/10" onClick={handleExport} disabled={isLoading}>
          <Download className="mr-2 h-4 w-4" /> Export JSON
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Conversations" current={curr.conversations} previous={prev.conversations} delta={delta(curr.conversations, prev.conversations)} deltaIcon={deltaIcon(curr.conversations, prev.conversations)} icon={MessageSquare} isLoading={isLoading} />
        <MetricCard title="Leads" current={curr.leads} previous={prev.leads} delta={delta(curr.leads, prev.leads)} deltaIcon={deltaIcon(curr.leads, prev.leads)} icon={Users} isLoading={isLoading} />
        <MetricCard title="Appointments" current={curr.appointments} previous={prev.appointments} delta={delta(curr.appointments, prev.appointments)} deltaIcon={deltaIcon(curr.appointments, prev.appointments)} icon={Calendar} isLoading={isLoading} />
        <MetricCard title="Conversion Rate" current={curr.conversionRate != null ? `${curr.conversionRate}%` : "—"} previous={prev.conversionRate} delta={delta(curr.conversionRate || 0, prev.conversionRate || 0)} deltaIcon={deltaIcon(curr.conversionRate || 0, prev.conversionRate || 0)} icon={TrendingUp} isLoading={isLoading} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Daily Conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 bg-white/10" />
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report?.dailyChart || []}>
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickFormatter={(v) => v.slice(5)} />
                    <YAxis stroke="#6b7280" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }} />
                    <Bar dataKey="count" fill="#00d4ff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-orange-400" />
              Unanswered Questions
            </CardTitle>
            <CardDescription>Questions your assistant couldn't answer this week</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32 bg-white/10" />
            ) : (report?.unanswered || []).length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No unanswered questions this week.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {(report?.unanswered || []).slice(0, 10).map((item: any, i: number) => (
                  <div key={i} className="p-3 bg-black/40 rounded-lg border border-white/5">
                    <p className="text-sm text-white/80 line-clamp-2 mb-2">{item.content}</p>
                    <div className="flex gap-2">
                      <Link href={`/chat/${item.conversation_id}`}>
                        <Button size="sm" variant="ghost" className="text-xs text-primary hover:text-primary/80 h-7 px-2">View</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-400" />
            Recommendations
          </CardTitle>
          <CardDescription>AI-generated insights based on your data</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 bg-white/10" />
          ) : (
            <div className="space-y-4">
              {(report?.recommendations || []).map((rec: string, i: number) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-lg">
                  <Lightbulb className="h-5 w-5 text-yellow-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-white/80">{rec}</p>
                </div>
              ))}
              {report?.bestDay && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Best performing day: <span className="text-white font-medium">{new Date(report.bestDay).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-red-400" />
            Missed Revenue Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-16 bg-white/10" />
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="p-4 bg-black/40 rounded-lg border border-white/5">
                <p className="text-sm text-muted-foreground mb-1">This Week</p>
                <p className="text-3xl font-bold text-red-400">${(curr.missedRevenue || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-black/40 rounded-lg border border-white/5">
                <p className="text-sm text-muted-foreground mb-1">Previous Week</p>
                <p className="text-3xl font-bold text-white">${(prev.missedRevenue || 0).toLocaleString()}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, current, previous, delta, deltaIcon, icon: Icon, isLoading }: { title: string; current: any; previous: any; delta: string; deltaIcon: any; icon: any; isLoading: boolean }) {
  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20 bg-white/10" />
        ) : (
          <>
            <div className="text-2xl font-bold text-white">{current ?? "—"}</div>
            <div className="flex items-center gap-1 mt-1">
              {deltaIcon}
              <span className={`text-xs ${current >= previous ? 'text-green-400' : 'text-red-400'}`}>{delta} vs last week</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
