import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, MessageSquare, Calendar, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

export default function Reports() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["reportStats"],
    queryFn: () => api.getDashboardStats(),
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Activity className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Failed to load reports</h2>
        <p className="text-muted-foreground">Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Reports</h1>
        <p className="text-muted-foreground">Analytics and performance metrics for your AI sales team.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <ReportCard title="Total Assistants" value={stats?.totalAssistants} icon={BarChart3} subtitle="Active agents" isLoading={isLoading} />
        <ReportCard title="Total Conversations" value={stats?.totalConversations} icon={MessageSquare} subtitle="All time" isLoading={isLoading} />
        <ReportCard title="Total Leads" value={stats?.totalLeads} icon={Users} subtitle="Captured leads" isLoading={isLoading} />
        <ReportCard title="Conversion Rate" value={stats ? `${stats.conversionRate.toFixed(1)}%` : undefined} icon={TrendingUp} subtitle="Leads / Conversations" isLoading={isLoading} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Weekly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32 bg-white/10" />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-white/5">
                  <span className="text-muted-foreground">Messages this week</span>
                  <span className="text-2xl font-bold text-white">{stats?.messagesThisWeek || 0}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-white/5">
                  <span className="text-muted-foreground">Leads this week</span>
                  <span className="text-2xl font-bold text-accent">{stats?.leadsThisWeek || 0}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32 bg-white/10" />
            ) : (
              <div className="flex items-center justify-center h-32">
                <p className="text-muted-foreground text-sm">Appointment schedule will appear here.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReportCard({ title, value, icon: Icon, subtitle, isLoading }: { title: string; value?: string | number; icon: any; subtitle: string; isLoading: boolean }) {
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
          <div className="text-2xl font-bold text-white">{value ?? "—"}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
