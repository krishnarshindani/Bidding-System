import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ArrowRight, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, logout, loginError } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(email, password);
    setLoading(false);

    if (!success) {
      toast({
        title: "Admin Login Failed",
        description: loginError || "Invalid email or password",
        variant: "destructive",
      });
      return;
    }

    const saved = localStorage.getItem("codebidz_user");
    const userData = saved ? JSON.parse(saved) : null;
    const role = userData?.role;

    if (role !== "admin") {
      // Prevent non-admins from using the admin login entrypoint
      logout();
      toast({
        title: "Access denied",
        description: "This login is only for admin accounts.",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Welcome, Admin!", description: "You are signed in to the admin console." });
    navigate("/admin");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-20 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="flex justify-center mb-6">
            <div className="relative">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-2xl blur-xl opacity-20"
              />
              <div className="relative w-16 h-16 rounded-2xl gradient-gold-bg flex items-center justify-center shadow-lg shadow-primary/40">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Shield className="w-8 h-8 text-primary-foreground" />
                </motion.div>
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2">Admin Console</h1>
          <p className="text-muted-foreground text-lg">Secure access for administrators</p>
        </motion.div>

        {/* Login Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-8 space-y-6 mb-6"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="admin-email" className="text-sm font-semibold">Admin Email</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-secondary/50 border-border/50 focus:border-primary/50 py-2.5 rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-sm font-semibold">Password</Label>
              <Input
                id="admin-password"
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
                  Verifying credentials...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Sign In as Admin <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {loginError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive"
            >
              {loginError}
            </motion.div>
          )}
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6"
        >
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-primary mb-1">Secure Access</p>
              <p className="text-xs text-muted-foreground">This is a restricted area. Only authorized administrators can access this console.</p>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Looking for bidder login?{" "}
          <Link to="/login" className="text-primary font-semibold hover:underline transition-colors">
            Go to standard login
          </Link>
        </p>
      </div>
    </div>
  );
}

