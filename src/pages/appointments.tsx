import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, MapPin, User } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

function getStatusColor(status: string) {
  switch(status) {
    case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'confirmed': return 'bg-primary/20 text-primary border-primary/30';
    case 'cancelled': return 'bg-destructive/20 text-destructive border-destructive/30';
    case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
    default: return 'bg-white/10 text-white/70 border-white/20';
  }
}

export default function Appointments() {
  const { data: assistants } = useQuery({
    queryKey: ["assistants"],
    queryFn: () => api.listAssistants(),
  });

  const [selectedAssistant, setSelectedAssistant] = useState<string>("");

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["appointments", selectedAssistant],
    queryFn: () => api.listAppointments(Number(selectedAssistant)),
    enabled: !!selectedAssistant,
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Appointments</h1>
          <p className="text-muted-foreground">Manage calendar bookings scheduled by your AI.</p>
        </div>
        <div className="w-full sm:w-64">
          <Select value={selectedAssistant} onValueChange={setSelectedAssistant}>
            <SelectTrigger className="bg-black/50 border-white/10 text-white">
              <SelectValue placeholder="Select an assistant" />
            </SelectTrigger>
            <SelectContent className="bg-background border-white/10 text-white">
              {assistants?.map((a: any) => (
                <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedAssistant ? (
        <div className="flex flex-col items-center justify-center h-[40vh] bg-white/5 border border-white/10 rounded-2xl">
          <CalendarIcon className="h-12 w-12 text-primary opacity-50 mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">Select an assistant</h3>
          <p className="text-muted-foreground">Choose an assistant to view its booked appointments.</p>
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (<Card key={i} className="bg-white/5 border-white/10 h-32 animate-pulse" />))}
        </div>
      ) : appointments?.length === 0 ? (
        <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-muted-foreground">No appointments booked yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {appointments?.map((apt: any) => (
            <Card key={apt.id} className="bg-white/5 border-white/10 relative overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                apt.status === 'confirmed' ? 'bg-primary' :
                apt.status === 'pending' ? 'bg-yellow-500' :
                apt.status === 'completed' ? 'bg-green-500' : 'bg-destructive'
              }`} />
              <CardContent className="p-6 pl-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-semibold text-xl text-white mb-1">{apt.service || 'General Consultation'}</h3>
                    <div className="flex items-center text-accent text-sm font-medium">
                      <Clock className="h-4 w-4 mr-2" />
                      {format(new Date(apt.scheduledAt), "EEEE, MMMM d 'at' h:mm a")}
                    </div>
                  </div>
                  <Badge variant="outline" className={`${getStatusColor(apt.status)} uppercase tracking-wider text-[10px] font-bold`}>{apt.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div className="flex items-center text-sm text-white/80">
                    <User className="h-4 w-4 mr-2 text-white/40" />{apt.name}
                  </div>
                  {apt.email && (
                    <div className="flex items-center text-sm text-white/80">
                      <MapPin className="h-4 w-4 mr-2 text-white/40" />{apt.email}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
