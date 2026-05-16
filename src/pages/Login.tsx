import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gavel, ArrowRight, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, loginError } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);
    if (success) {
      // Read the actual user from localStorage to determine role
      const saved = localStorage.getItem("codebidz_user");
      const userData = saved ? JSON.parse(saved) : null;
      const role = userData?.role || "bidder";

      toast({ title: "Welcome back!", description: `Logged in as ${role}` });

      if (role === "admin") navigate("/admin");
      else navigate("/dashboard");
    } else {
      toast({
        title: "Login Failed",
        description: loginError || "Invalid email or password",
        variant: "destructive",
      });
    }
  };

  const demoLogin = async (role: "admin" | "bidder") => {
    const demoEmail = role === "admin" ? "admin@bidbrilliance.com" : "bidder1@bidbrilliance.com";

    setLoading(true);
    const success = await login(demoEmail, "demo123");
    setLoading(false);
    if (success) {
      toast({ title: "Demo login", description: `Signed in as ${role}` });
      if (role === "admin") navigate("/admin");
      else navigate("/dashboard");
    } else {
      toast({
        title: "Demo Login Failed",
        description: "Demo users may not be set up. Please register a new account.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-20 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-2xl blur-xl opacity-30 animate-pulse" />
              <div className="relative w-16 h-16 rounded-2xl gradient-gold-bg flex items-center justify-center shadow-lg shadow-primary/30">
                <Gavel className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2">Welcome Back</h1>
          <p className="text-muted-foreground text-lg">Sign in to your bidder account</p>
        </div>

        {/* Login Form */}
        <div className="glass-card p-8 space-y-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="you@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="bg-secondary/50 border-border/50 focus:border-primary/50 py-2.5 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="bg-secondary/50 border-border/50 focus:border-primary/50 py-2.5 rounded-lg"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full gradient-gold-bg text-primary-foreground py-2.5 font-semibold text-base rounded-lg" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {loginError && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
              {loginError}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-background text-muted-foreground">or continue with demo</span>
          </div>
        </div>

        {/* Demo Buttons */}
        <div className="space-y-3 mb-8">
          <Button 
            type="button"
            onClick={() => demoLogin("bidder")}
            disabled={loading}
            className="w-full bg-secondary/50 hover:bg-secondary/80 text-foreground border border-border/50 py-2.5 font-semibold rounded-lg transition-all"
          >
            <Shield className="w-4 h-4 mr-2" />
            Demo Bidder Account
          </Button>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/register" className="text-primary font-semibold hover:underline transition-colors">
            Create one now
          </Link>
        </p>
      </div>
    </div>
  );
}
