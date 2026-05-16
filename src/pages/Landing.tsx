import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AuctionShowcase from "@/components/AuctionShowcase";
import { motion } from "framer-motion";
import { Gavel, Shield, Zap, BarChart3, Coins, Users, ArrowRight, TrendingUp } from "lucide-react";

const features = [
  { icon: Gavel, title: "Live Auctions", desc: "Real-time bidding with instant updates and countdown timers." },
  { icon: Coins, title: "Credit System", desc: "Transparent credit management with automatic refunds for outbid participants." },
  { icon: Shield, title: "Secure Platform", desc: "Role-based access control with admin and bidder authentication." },
  { icon: Zap, title: "Instant Notifications", desc: "Get alerted when you're outbid or win an auction." },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "Comprehensive auction analytics with real-time visualizations." },
  { icon: Users, title: "Multi-Role System", desc: "Dedicated panels for admins and bidders with tailored experiences." },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <motion.div
            className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl"
            animate={{ x: [0, 30, 0], y: [0, 40, 0] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl"
            animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
        </div>

        <div className="relative z-10 container mx-auto px-4">
          {/* Hero Text Content */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-16 md:mb-20">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-8">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-primary font-medium">Live Auctions Running Now</span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight mb-6">
              Bid. Win.
              <br />
              <span className="gradient-gold-text">Dominate.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              The next-generation auction platform with real-time bidding, smart credit systems, and powerful analytics.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="gradient-gold-bg text-primary-foreground text-lg px-8 gold-glow" onClick={() => navigate("/register")}>
                Start Bidding <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 border-border hover:bg-secondary" onClick={() => navigate("/login")}>
                Sign In
              </Button>
            </div>
          </motion.div>

          {/* Live Auctions Display */}
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="max-w-6xl mx-auto">
            <AuctionShowcase />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Everything You Need to <span className="gradient-gold-text">Auction</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              A complete platform built for serious bidders and auction managers.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 group hover:border-primary/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="glass-card p-12 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Ready to Start Bidding?</h2>
              <p className="text-muted-foreground max-w-lg mx-auto mb-8">
                Join thousands of bidders and start winning auctions today.
              </p>
              <Button size="lg" className="gradient-gold-bg text-primary-foreground text-lg px-10 gold-glow" onClick={() => navigate("/register")}>
                Create Your Account <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Gavel className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">Bid Brilliance</span>
          </div>
          <p className="text-sm text-muted-foreground">&copy; 2026 Bid Brilliance. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Privacy
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Terms
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
