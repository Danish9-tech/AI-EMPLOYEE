import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateAssistant, getListAssistantsQueryKey } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, Bot, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  businessName: z.string().min(1, "Business name is required"),
  description: z.string().min(10, "Description should be at least 10 characters"),
  tone: z.enum(["professional", "friendly", "formal", "casual"]).default("professional"),
  widgetColor: z.string().min(1, "Widget color is required").default("#00d4ff"),
});

type FormValues = z.infer<typeof schema>;

export default function AssistantNew() {
  const [, setLocation] = useLocation();
  const createAssistant = useCreateAssistant();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      businessName: "",
      description: "",
      tone: "professional",
      widgetColor: "#00d4ff",
    },
  });

  const onSubmit = (data: FormValues) => {
    createAssistant.mutate({ data }, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "Assistant created successfully.",
        });
        queryClient.invalidateQueries({ queryKey: getListAssistantsQueryKey() });
        setLocation("/assistants");
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to create assistant.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Link href="/assistants">
          <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Create Assistant</h1>
          <p className="text-muted-foreground">Configure a new AI agent for your business.</p>
        </div>
      </div>

      <Card className="bg-white/5 border-white/10 backdrop-blur-md">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Assistant Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Sales Bot, Support Agent" className="bg-black/40 border-white/10 text-white" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Business Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your company name" className="bg-black/40 border-white/10 text-white" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">System Prompt / Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what this assistant does and how it should behave..." 
                        className="min-h-[120px] bg-black/40 border-white/10 text-white" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="tone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Conversation Tone</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-black/40 border-white/10 text-white">
                            <SelectValue placeholder="Select a tone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background border-white/10 text-white">
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="friendly">Friendly & Helpful</SelectItem>
                          <SelectItem value="formal">Strictly Formal</SelectItem>
                          <SelectItem value="casual">Casual & Relaxed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="widgetColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Widget Theme Color</FormLabel>
                      <div className="flex gap-4 items-center">
                        <FormControl>
                          <Input type="color" className="w-14 h-10 p-1 bg-black/40 border-white/10 rounded" {...field} />
                        </FormControl>
                        <Input type="text" className="bg-black/40 border-white/10 text-white" {...field} />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-white/10">
                <Button 
                  type="submit" 
                  className="bg-primary text-black hover:bg-primary/90"
                  disabled={createAssistant.isPending}
                >
                  {createAssistant.isPending ? "Creating..." : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Create Assistant
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
