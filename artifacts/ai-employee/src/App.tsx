import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, useClerk, useAuth } from '@clerk/react';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter } from 'wouter';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

// Pages
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

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(190 100% 50%)",
    colorForeground: "hsl(0 0% 100%)",
    colorMutedForeground: "hsl(240 5% 65%)",
    colorDanger: "hsl(0 62.8% 30.6%)",
    colorBackground: "hsl(240 20% 8%)",
    colorInput: "hsl(240 20% 18%)",
    colorInputForeground: "hsl(0 0% 100%)",
    colorNeutral: "hsl(240 20% 15%)",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#0c0c12] border border-white/10 rounded-2xl w-[440px] max-w-full overflow-hidden shadow-[0_0_40px_rgba(0,212,255,0.1)]",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-white font-bold tracking-tight",
    headerSubtitle: "text-white/60",
    socialButtonsBlockButtonText: "text-white font-medium",
    formFieldLabel: "text-white/80 font-medium",
    footerActionLink: "text-primary hover:text-primary/80 font-medium",
    footerActionText: "text-white/60",
    dividerText: "text-white/40",
    identityPreviewEditButton: "text-primary hover:text-primary/80",
    formFieldSuccessText: "text-green-400",
    alertText: "text-white",
    logoBox: "mb-6",
    logoImage: "w-16 h-16",
    socialButtonsBlockButton: "border-white/10 hover:bg-white/5 bg-transparent",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-black font-bold shadow-[0_0_20px_rgba(0,212,255,0.3)] border border-primary/50",
    formFieldInput: "bg-white/5 border-white/10 text-white focus:border-primary focus:ring-1 focus:ring-primary",
    footerAction: "mt-6",
    dividerLine: "bg-white/10",
    alert: "bg-destructive/20 border border-destructive/50",
    otpCodeFieldInput: "bg-white/5 border-white/10 text-white",
    formFieldRow: "mb-4",
    main: "gap-6",
  },
};

function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SignIn routing="path" path="/sign-in" />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SignUp routing="path" path="/sign-up" />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);
  return null;
}

function HomeRedirect() {
  const [, setLocation] = useLocation();
  const { isSignedIn, isLoaded } = useAuth();
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setLocation("/dashboard");
    }
  }, [isLoaded, isSignedIn, setLocation]);
  if (!isLoaded) return null;
  if (isSignedIn) return null;
  return <Landing />;
}

function ProtectedRoute({ component: Component }: { component: any }) {
  const [, setLocation] = useLocation();
  const { isSignedIn, isLoaded } = useAuth();
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLocation("/");
    }
  }, [isLoaded, isSignedIn, setLocation]);
  if (!isLoaded) return null;
  if (!isSignedIn) return null;
  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      navigate={(to) => setLocation(stripBase(to))}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkQueryClientCacheInvalidator />
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
    </ClerkProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
