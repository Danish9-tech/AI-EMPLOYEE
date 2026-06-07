import { useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, MessageSquare, Users, Calendar, TrendingUp, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading, error } = useGetDashboardStats({
    query: {
      queryKey: ["dashboardStats"]
    }
  });

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
        <StatCard
          title="Total Assistants"
          value={stats?.totalAssistants}
          icon={Bot}
          trend={null}
          isLoading={isLoading}
        />
        <StatCard
          title="Total Conversations"
          value={stats?.totalConversations}
          icon={MessageSquare}
          trend={`+${stats?.messagesThisWeek || 0} this week`}
          isLoading={isLoading}
        />
        <StatCard
          title="Total Leads"
          value={stats?.totalLeads}
          icon={Users}
          trend={`+${stats?.leadsThisWeek || 0} this week`}
          isLoading={isLoading}
        />
        <StatCard
          title="Conversion Rate"
          value={stats ? `${stats.conversionRate.toFixed(1)}%` : undefined}
          icon={TrendingUp}
          trend="Leads / Conversations"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  isLoading
}: { 
  title: string; 
  value?: string | number; 
  icon: any; 
  trend: string | null;
  isLoading: boolean;
}) {
  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20 bg-white/10" />
        ) : (
          <div className="text-2xl font-bold text-white">{value}</div>
        )}
        {trend && (
          <p className="text-xs text-accent mt-1">
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
