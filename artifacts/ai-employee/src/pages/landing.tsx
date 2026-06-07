import { Link } from "wouter";
import { ArrowRight, Bot, Zap, BarChart3, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground overflow-hidden flex flex-col relative">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] mix-blend-screen"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-accent/10 rounded-full blur-[150px] mix-blend-screen"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-2 rounded-xl border border-primary/30">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">AI Employee</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in">
            <Button variant="ghost" className="text-white hover:text-primary hover:bg-primary/10">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(0,212,255,0.3)] border border-primary/50">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 py-20 max-w-5xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Zap className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium text-white/80">The future of customer service is here</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
          Hire a genius employee<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">who never sleeps.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-white/60 max-w-2xl mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
          Deploy AI-powered customer service assistants that know your business inside and out. Convert leads, book appointments, and answer questions 24/7.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
          <Link href="/sign-up">
            <Button size="lg" className="h-14 px-8 text-lg bg-primary text-black hover:bg-primary/90 shadow-[0_0_30px_rgba(0,212,255,0.4)] border border-primary/50 rounded-xl group transition-all">
              Deploy Your First AI
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/10 hover:bg-white/5 text-white rounded-xl">
              View Demo
            </Button>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full animate-in fade-in duration-1000 delay-500">
          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 border border-primary/30">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Omnichannel</h3>
            <p className="text-white/60">Connect to your website, WhatsApp, and social media channels seamlessly.</p>
          </div>
          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center mb-4 border border-accent/30">
              <Bot className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Instant Knowledge</h3>
            <p className="text-white/60">Train your AI on your website, PDFs, and FAQs in seconds.</p>
          </div>
          <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center mb-4 border border-destructive/30">
              <BarChart3 className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Lead Conversion</h3>
            <p className="text-white/60">Automatically qualify leads and book appointments while you sleep.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
