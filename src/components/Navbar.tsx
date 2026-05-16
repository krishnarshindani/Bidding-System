import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, Gavel, Bell, Coins, Menu, X, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { API_SERVICE } from "@/services/api";
import { useTheme } from "@/contexts/ThemeContext";

export default function Navbar() {
  const { user, logout, isAuthenticated, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [displayCredits, setDisplayCredits] = useState(user?.credits || 0);
  const { theme, toggleTheme } = useTheme();
  const [creditPulse, setCreditPulse] = useState(false);

  const isLanding = location.pathname === "/";

  // Fetch live credits from DB
  useEffect(() => {
    if (isAuthenticated && user && token && user.role === "bidder") {
      const fetchCredits = async () => {
        try {
          const data = await API_SERVICE.auth.me(token);
          if (data && data.credits !== undefined) {
            setDisplayCredits(data.credits);
          }
        } catch {
          // Use cached value
        }
      };
      fetchCredits();
      // Refresh credits every 30 seconds
      const interval = setInterval(fetchCredits, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user, token]);

  // Listen for credit updates from socket
  useEffect(() => {
    if (user) {
      // Refresh credits when user changes
      setDisplayCredits(user.credits);
    }
  }, [user?.credits]);

  const getDashboardPath = () => {
    if (user?.role === "admin") return "/admin";
    return "/dashboard";
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/40 backdrop-blur-2xl shadow-soft">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate("/")}>
          <div className="w-9 h-9 rounded-xl gradient-gold-bg flex items-center justify-center shadow-glow group-hover:shadow-lg transition-all duration-300">
            <Gavel className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-none">Bid<span className="gradient-gold-text">Brilliance</span></span>
            <span className="text-[10px] text-muted-foreground font-medium">Premium Auctions</span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          {isAuthenticated ? (
            <>
              {user?.role === "bidder" && (
                <div className="flex items-center gap-2 bg-primary/10 backdrop-blur-md rounded-full px-4 py-2 border border-primary/20 hover:border-primary/40 transition-all duration-300 group">
                  <Coins className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                  <span className="font-mono font-bold text-sm text-primary">{displayCredits} CR</span>
                </div>
              )}
              <button
                onClick={() => navigate(getDashboardPath())}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate("/auctions")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Auctions
              </button>
              <div className="relative">
                <Bell className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{user?.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-1" /> Logout
              </Button>
            </>
          ) : (
            <>
              {!isLanding && (
                <button onClick={() => navigate("/")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Home
                </button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/login")}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Bidder Login
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin/login")}
                className="text-sm font-medium flex items-center gap-1"
              >
                <Gavel className="w-3 h-3" /> Admin
              </Button>
              <Button size="sm" className="gradient-gold-bg text-primary-foreground" onClick={() => navigate("/register")}>
                Get Started
              </Button>
            </>
          )}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-secondary text-muted-foreground hover:text-primary transition-colors ml-2"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Mobile toggle */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-secondary text-muted-foreground hover:text-primary transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl p-4 space-y-3">
          {isAuthenticated ? (
            <>
              {user?.role === "bidder" && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Coins className="w-4 h-4 text-primary" />
                  <span className="font-mono font-semibold">{displayCredits} CR</span>
                </div>
              )}
              <button onClick={() => { navigate(getDashboardPath()); setMobileMenuOpen(false); }} className="block text-sm">Dashboard</button>
              <button onClick={() => { navigate("/auctions"); setMobileMenuOpen(false); }} className="block text-sm">Auctions</button>
              <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="block text-sm text-destructive">Logout</button>
            </>
          ) : (
            <>
              <button
                onClick={() => { navigate("/login"); setMobileMenuOpen(false); }}
                className="block text-sm font-medium hover:text-primary transition-colors"
              >
                Bidder Login
              </button>
              <button
                onClick={() => { navigate("/admin/login"); setMobileMenuOpen(false); }}
                className="block text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Admin Login
              </button>
              <Button
                onClick={() => { navigate("/register"); setMobileMenuOpen(false); }}
                size="sm"
                className="gradient-gold-bg text-primary-foreground"
              >
                Get Started
              </Button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
