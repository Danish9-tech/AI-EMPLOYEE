import { createContext, useContext, useEffect, useState, useRef } from "react";
import { Switch, Route, useLocation, Router as WouterRouter } from 'wouter';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { supabase } from "./lib/supabase";
import { useAuth } from "./hooks/useAuth";
import type { Session, User } from "@supabase/supabase-js";

import Landing from "./pages/landing";
import Dashboard from "./pages/dashboard";
import Assistants from "./pages/assistants";
import AssistantNew from "./pages/assistant-new";
import AssistantDetail from "./pages/assistant-detail";
import Conversations from "./pages/conversations";
import Leads from "./pages/leads";
import Appointments from "./pages/appointments";
import WhatsApp from "./pages/whatsapp";
import Subscription from "./pages/subscription";
import Settings from "./pages/settings";
import { AppLayout } from "./components/layout/app-layout";

const basePath = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  signOut: async () => {},
});

export const useAuthContext = () => useContext(AuthContext);

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function SignInPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setLocation("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Sign In</h1>
          <p className="text-muted-foreground mt-2">Welcome back to AI Employee</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/20 border border-destructive/50 text-destructive text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="text-white/80 text-sm font-medium block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="text-white/80 text-sm font-medium block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-black font-bold py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 shadow-[0_0_20px_rgba(0,212,255,0.3)] border border-primary/50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <a href="/sign-up" className="text-primary hover:underline">Sign Up</a>
        </p>
      </div>
    </div>
  );
}

function SignUpPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setConfirmSent(true);
    }
  };

  if (confirmSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <h1 className="text-3xl font-bold text-white">Check your email</h1>
          <p className="text-muted-foreground">We sent a confirmation link to <strong className="text-white">{email}</strong></p>
          <p className="text-sm text-muted-foreground">Click the link to activate your account, then sign in.</p>
          <a href="/sign-in" className="inline-block mt-4 text-primary hover:underline">Go to Sign In</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="text-muted-foreground mt-2">Get started with AI Employee</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/20 border border-destructive/50 text-destructive text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="text-white/80 text-sm font-medium block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="text-white/80 text-sm font-medium block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-black font-bold py-2.5 rounded-lg hover:bg-primary/90 disabled:opacity-50 shadow-[0_0_20px_rgba(0,212,255,0.3)] border border-primary/50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a href="/sign-in" className="text-primary hover:underline">Sign In</a>
        </p>
      </div>
    </div>
  );
}

function AuthQueryClientCacheInvalidator() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const userId = user?.id ?? null;
    if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
      queryClient.clear();
    }
    prevUserIdRef.current = userId;
  }, [user?.id, queryClient]);

  return null;
}

function HomeRedirect() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuthContext();

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/dashboard");
    }
  }, [isLoading, user, setLocation]);

  return <Landing />;
}

function ProtectedRoute({ component: Component }: { component: any }) {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuthContext();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/");
    }
  }, [isLoading, user, setLocation]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-primary animate-pulse text-lg">Loading...</div>
    </div>
  );
  if (!user) return null;
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  return (
    <AuthContext.Provider value={{ session: auth.session, user: auth.user, isLoading: auth.isLoading, signOut: auth.signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/sign-up" component={SignUpPage} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/assistants" component={() => <ProtectedRoute component={Assistants} />} />
      <Route path="/assistants/new" component={() => <ProtectedRoute component={AssistantNew} />} />
      <Route path="/assistants/:id" component={() => <ProtectedRoute component={AssistantDetail} />} />
      <Route path="/conversations" component={() => <ProtectedRoute component={Conversations} />} />
      <Route path="/leads" component={() => <ProtectedRoute component={Leads} />} />
      <Route path="/appointments" component={() => <ProtectedRoute component={Appointments} />} />
      <Route path="/whatsapp" component={() => <ProtectedRoute component={WhatsApp} />} />
      <Route path="/subscription" component={() => <ProtectedRoute component={Subscription} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={basePath}>
        <AuthProvider>
          <AuthQueryClientCacheInvalidator />
          <AppRoutes />
        </AuthProvider>
      </WouterRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
