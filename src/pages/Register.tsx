import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gavel, ArrowRight, Shield, User } from "lucide-react";
import { UserRole } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("bidder");
  const [loading, setLoading] = useState(false);
  const { register, loginError } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await register(name, email, password, role);
    setLoading(false);
    if (success) {
      toast({ title: "Account created!", description: `Welcome to Bid Brilliance, ${name}` });
      if (role === "admin") navigate("/admin");
      else navigate("/dashboard");
    } else {
      toast({
        title: "Registration Failed",
        description: loginError || "Could not create account. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl gradient-gold-bg flex items-center justify-center mx-auto mb-4">
            <Gavel className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="text-muted-foreground mt-2">Join Bid Brilliance and start your auction journey</p>
        </div>

        <div className="glass-card p-6 space-y-6">
          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3">
            {([
              { value: "bidder" as UserRole, icon: User, label: "Bidder", desc: "Place bids on auctions" },
              { value: "admin" as UserRole, icon: Shield, label: "Admin", desc: "Manage the platform" },
            ]).map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`p-3 rounded-xl border text-left transition-all ${role === r.value ? "border-primary bg-primary/10" : "border-border bg-secondary hover:border-muted-foreground/30"}`}
              >
                <r.icon className={`w-5 h-5 mb-2 ${role === r.value ? "text-primary" : "text-muted-foreground"}`} />
                <p className="font-semibold text-sm">{r.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{r.desc}</p>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email">Email</Label>
              <Input id="reg-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Password</Label>
              <Input id="reg-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-secondary border-border" />
            </div>
            <Button type="submit" className="w-full gradient-gold-bg text-primary-foreground" disabled={loading}>
              {loading ? "Creating..." : "Create Account"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
