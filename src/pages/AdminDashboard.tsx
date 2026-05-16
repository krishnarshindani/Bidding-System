import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_SERVICE } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BidDistribution from "@/components/analytics/BidDistribution";
import AuctionTrends from "@/components/analytics/AuctionTrends";
import LiveMetrics from "@/components/analytics/LiveMetrics";
import RevenueLineChart from "@/components/analytics/RevenueLineChart";
import TopAuctionsBar from "@/components/analytics/TopAuctionsBar";
import PriceHistoryChart from "@/components/analytics/PriceHistoryChart";
import AdminLiveBids from "@/components/analytics/AdminLiveBids";
import InteractiveAuctionList from "@/components/InteractiveAuctionList";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, Package, Users, BarChart3, Plus, Coins,
  Gavel, Trophy, Sparkles
} from "lucide-react";

interface Auction {
  id: number | string;
  title: string;
  category: string;
  status: string;
  image?: string;
  image_url?: string;
  currentBid?: number;
  current_bid_price?: number;
  totalBids?: number;
  total_bids?: number;
  current_bidder_name?: string;
}

interface User {
  id: number | string;
  name: string;
  email: string;
  role: string;
  credits: number;
}

interface Stats {
  totalAuctions?: number;
  activeAuctions?: number;
  totalBids?: number;
  totalCreditsDistributed?: number;
}

export default function AdminDashboard() {
  const { user, token: authToken } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [categories, setCategories] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [closingId, setClosingId] = useState<string | number | null>(null);
  const [assigningCredits, setAssigningCredits] = useState<string | number | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [winners, setWinners] = useState<any[]>([]);
  const [winnersLoading, setWinnersLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    categoryId: "1",
    startingPrice: "",
    reservePrice: "",
    auctionEndTime: "",
    imageUrl: "",
  });
  const [aiDesc, setAiDesc] = useState("");
  const [generating, setGenerating] = useState(false);
  const [creditForm, setCreditForm] = useState({
    userId: null as string | number | null,
    amount: "",
    reason: "",
    operation: "assign" as "assign" | "deduct",
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 3); // Max 3 images
      setImageFiles(files);
      
      // Generate previews
      const previews: string[] = [];
      let loadedCount = 0;
      
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          previews.push(reader.result as string);
          loadedCount++;
          if (loadedCount === files.length) {
            setImagePreviews(previews);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Fetch data on mount
  useEffect(() => {
    if (!user || user.role !== "admin") return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const token = authToken || localStorage.getItem("auth_token");
        const [auctionData, statsData, catData] = await Promise.all([
          token ? API_SERVICE.auctions.getAllAdmin(token) : API_SERVICE.auctions.getActive(100, 0),
          API_SERVICE.analytics.getStats(),
          API_SERVICE.categories.getAll(),
        ]);
        
        if (Array.isArray(auctionData)) {
          setAuctions(auctionData);
        }
        if (statsData) {
          setStats(statsData);
        }
        if (Array.isArray(catData)) {
          setCategories(catData);
          if (catData.length > 0 && formData.categoryId === "1") {
            setFormData(prev => ({ ...prev, categoryId: String(catData[0].id) }));
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [authToken, user?.role]);

  // Socket integration for real-time auction auto-close updates
  const { socket } = useSocket();
  
  useEffect(() => {
    if (!socket) return;

    // When any auction ends (via sweeper auto-close or manual), refresh the list
    const handleAuctionEnded = async (data: any) => {
      console.log(`[ADMIN] Auction ${data.auctionId} ended, refreshing list...`);
      
      // Update the local auctions list immediately
      setAuctions(prev => prev.map(a => 
        String(a.id) === String(data.auctionId) 
          ? { ...a, status: 'ended', current_bidder_name: data.winner?.username || a.current_bidder_name }
          : a
      ));

      toast({
        title: "🔨 Auction Auto-Closed",
        description: data.message || `Auction #${data.auctionId} has ended.`,
      });
    };

    socket.on('auction:ended', handleAuctionEnded);

    return () => {
      socket.off('auction:ended', handleAuctionEnded);
    };
  }, [socket, toast]);

  // Early returns AFTER all hooks (React Rules of Hooks)
  if (!user) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p className="text-muted-foreground">Please log in as an admin</p>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive font-semibold">Access Denied</p>
          <p className="text-muted-foreground">Only admins can access this dashboard</p>
        </div>
      </div>
    );
  }

  const handleCreateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || (!formData.description && !aiDesc) || !formData.startingPrice || !formData.auctionEndTime) {
      toast({
        title: "Validation Error",
        description: "All required fields must be filled",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      const token = authToken || localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No auth token found");
      }

      let finalImageUrl = formData.imageUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400";
      let imageUrls: string[] = [];
      
      // Upload multiple images if provided
      if (imageFiles.length > 0) {
        toast({ title: "Uploading...", description: `Uploading ${imageFiles.length} image(s)...` });
        const uploadResponse = await API_SERVICE.auctions.uploadMultipleImages(imageFiles);
        if (uploadResponse.imageUrls && Array.isArray(uploadResponse.imageUrls)) {
          imageUrls = uploadResponse.imageUrls.map((url: string) => `http://localhost:3000${url}`);
          finalImageUrl = imageUrls[0]; // Use first image as primary
        }
      }

      const auctionData = {
        title: formData.title,
        description: aiDesc || formData.description,
        categoryId: parseInt(formData.categoryId),
        startingPrice: parseFloat(formData.startingPrice),
        reservePrice: formData.reservePrice ? parseFloat(formData.reservePrice) : parseFloat(formData.startingPrice),
        auctionEndTime: formData.auctionEndTime,
        imageUrl: finalImageUrl,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      };

      const result = await API_SERVICE.auctions.create(auctionData, token);
      
      toast({
        title: "Success!",
        description: `Auction created successfully with ${imageUrls.length} image(s)!`,
      });

      setFormData({
        title: "",
        description: "",
        categoryId: categories[0]?.id ? String(categories[0].id) : "1",
        startingPrice: "",
        reservePrice: "",
        auctionEndTime: "",
        imageUrl: "",
      });
      setAiDesc("");
      setImageFiles([]);
      setImagePreviews([]);

      const updatedAuctions = await API_SERVICE.auctions.getActive(100, 0);
      if (Array.isArray(updatedAuctions)) {
        setAuctions(updatedAuctions);
      }

      setActiveTab("auctions");
    } catch (error: any) {
      console.error("Error creating auction:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create auction",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCloseAuction = async (auctionId: string | number) => {
    if (!confirm("Are you sure you want to close this auction?")) {
      return;
    }

    setClosingId(auctionId);
    try {
      const token = authToken || localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No auth token found");
      }

      await API_SERVICE.auctions.updateStatus(
        typeof auctionId === "string" ? parseInt(auctionId) : auctionId,
        "ended",
        token
      );

      toast({
        title: "Success!",
        description: "Auction closed successfully",
      });

      const updatedAuctions = await API_SERVICE.auctions.getAllAdmin(token);
      if (Array.isArray(updatedAuctions)) {
        setAuctions(updatedAuctions);
      }
    } catch (error: any) {
      console.error("Error closing auction:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to close auction",
        variant: "destructive"
      });
    } finally {
      setClosingId(null);
    }
  };

  const loadUsers = async () => {
    setUserLoading(true);
    try {
      const token = authToken || localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No auth token found");
      }

      const userData = await API_SERVICE.users.getAllUsers(token);
      if (Array.isArray(userData)) {
        setUsers(userData.map((u: any) => ({
          id: u.id,
          name: u.username,
          email: u.email,
          role: u.user_type,
          credits: u.credits
        })));
      }
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setUserLoading(false);
    }
  };

  const handleCreditOperation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!creditForm.userId || !creditForm.amount || !creditForm.reason) {
      toast({
        title: "Validation Error",
        description: "All fields are required",
        variant: "destructive"
      });
      return;
    }

    setAssigningCredits(creditForm.userId);
    try {
      const token = authToken || localStorage.getItem("auth_token");
      if (!token) {
        throw new Error("No auth token found");
      }

      const amount = parseFloat(creditForm.amount);
      if (creditForm.operation === "assign") {
        await API_SERVICE.users.assignCredits(
          typeof creditForm.userId === "string" ? parseInt(creditForm.userId) : creditForm.userId,
          amount,
          creditForm.reason,
          token
        );
      } else {
        await API_SERVICE.users.deductCredits(
          typeof creditForm.userId === "string" ? parseInt(creditForm.userId) : creditForm.userId,
          amount,
          creditForm.reason,
          token
        );
      }

      toast({
        title: "Success!",
        description: `${creditForm.amount} credits ${creditForm.operation === "assign" ? "assigned" : "deducted"}`,
      });

      await loadUsers();

      setCreditForm({
        userId: null,
        amount: "",
        reason: "",
        operation: "assign"
      });
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process operation",
        variant: "destructive"
      });
    } finally {
      setAssigningCredits(null);
    }
  };

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (newTab === "users" && users.length === 0) {
      loadUsers();
    }
    if (newTab === "winners" && winners.length === 0) {
      loadWinners();
    }
  };

  const loadWinners = async () => {
    setWinnersLoading(true);
    try {
      const token = authToken || localStorage.getItem("auth_token");
      if (!token) throw new Error("No auth token found");
      const data = await API_SERVICE.users.getAdminWinners(token);
      if (data && Array.isArray(data.winners)) {
        setWinners(data.winners);
      }
    } catch (error: any) {
      console.error("Error loading winners:", error);
      toast({ title: "Error", description: "Failed to load winners", variant: "destructive" });
    } finally {
      setWinnersLoading(false);
    }
  };

  const generateDescription = async () => {
    if (!formData.title) {
      toast({
        title: "Title Required",
        description: "Please enter a title to generate a description.",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    try {
      const token = authToken || localStorage.getItem("auth_token");
      if (!token) throw new Error("No auth token");

      const catName = categories.find(c => String(c.id) === formData.categoryId)?.name || "General";
      const result = await API_SERVICE.ai.generateDescription(formData.title, catName, token);

      if (result && result.description) {
        setAiDesc(result.description);
        toast({ title: "AI Description Generated" });
      }
    } catch (error: any) {
      console.error("AI Gen Error:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate description",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mb-10"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Admin <span className="gradient-gold-text">Dashboard</span></h1>
              <p className="text-muted-foreground text-lg">Welcome back, <span className="font-semibold text-foreground">{user?.name}</span></p>
            </div>
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="hidden md:block"
            >
              <LayoutDashboard className="w-12 h-12 text-primary opacity-20" />
            </motion.div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10"
        >
          <div className="glass-card p-6 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 space-y-3">
              <p className="text-xs text-muted-foreground font-medium">Total Auctions</p>
              <p className="text-3xl font-bold text-primary">
                {auctions.length}
              </p>
            </div>
          </div>
          <div className="glass-card p-6 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-success/20 to-success/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 space-y-3">
              <p className="text-xs text-muted-foreground font-medium">Active Auctions</p>
              <p className="text-3xl font-bold text-success">
                {auctions.filter(a => a.status === 'active').length}
              </p>
            </div>
          </div>
          <div className="glass-card p-6 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-info/20 to-info/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 space-y-3">
              <p className="text-xs text-muted-foreground font-medium">Total Users</p>
              <p className="text-3xl font-bold text-info">
                {users.length}
              </p>
            </div>
          </div>
          <div className="glass-card p-6 group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-warning/20 to-warning/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 space-y-3">
              <p className="text-xs text-muted-foreground font-medium">Total Bids</p>
              <p className="text-3xl font-bold text-warning">
                {auctions.reduce((sum, a) => sum + (a.total_bids || 0), 0)}
              </p>
            </div>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="bg-secondary/50 mb-8 flex-wrap h-auto gap-1 p-1 border border-border/50 rounded-lg">
            <TabsTrigger value="overview" className="gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"><LayoutDashboard className="w-4 h-4" />Overview</TabsTrigger>
            <TabsTrigger value="auctions" className="gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"><Package className="w-4 h-4" />Auctions</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"><Users className="w-4 h-4" />Users</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"><BarChart3 className="w-4 h-4" />Analytics</TabsTrigger>
            <TabsTrigger value="winners" className="gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"><Trophy className="w-4 h-4" />Winners</TabsTrigger>
            <TabsTrigger value="create" className="gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary"><Plus className="w-4 h-4" />Create</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6">
            <LiveMetrics />
            <InteractiveAuctionList />
            <div className="grid lg:grid-cols-2 gap-6">
              <AuctionTrends />
              <BidDistribution />
            </div>
          </TabsContent>

          {/* Auctions */}
          <TabsContent value="auctions" className="space-y-4">
            {loading ? (
              <div className="text-center py-10 text-muted-foreground">Loading auctions...</div>
            ) : (
              <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        <th className="text-left p-4 font-medium">Auction</th>
                        <th className="text-left p-4 font-medium">Status</th>
                        <th className="text-left p-4 font-medium">Bid</th>
                        <th className="text-left p-4 font-medium">Bids</th>
                        <th className="text-left p-4 font-medium">Winner</th>
                        <th className="text-left p-4 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auctions.map((a) => (
                        <tr
                          key={a.id}
                          className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer"
                          onClick={() => navigate(`/auction/${a.id}`)}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img src={a.image || a.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                              <div>
                                <p className="font-medium text-sm">{a.title}</p>
                                <p className="text-xs text-muted-foreground">{a.category}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4"><Badge>{a.status}</Badge></td>
                          <td className="p-4">{a.current_bid_price || 0} CR</td>
                          <td className="p-4">{a.total_bids || 0}</td>
                          <td className="p-4">
                            {a.status === "ended" ? (
                              <span className="text-sm font-medium text-primary">
                                {a.current_bidder_name || "No bids"}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            {a.status === "active" && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCloseAuction(a.id);
                                }}
                                disabled={closingId === a.id}
                              >
                                {closingId === a.id ? "Closing..." : "Close"}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="space-y-4">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-card overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h3 className="font-semibold">All Users</h3>
                </div>
                {userLoading ? (
                  <div className="text-center py-10 text-muted-foreground">Loading...</div>
                ) : users.length === 0 ? (
                  <div className="text-center py-10">No users found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-secondary/30">
                          <th className="text-left p-4 font-medium">User</th>
                          <th className="text-left p-4 font-medium">Email</th>
                          <th className="text-left p-4 font-medium">Role</th>
                          <th className="text-left p-4 font-medium">Credits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer" onClick={() => setCreditForm({...creditForm, userId: u.id})}>
                            <td className="p-4 font-medium">{u.name}</td>
                            <td className="p-4 text-sm">{u.email}</td>
                            <td className="p-4"><Badge variant="outline">{u.role}</Badge></td>
                            <td className="p-4 font-mono text-primary">{u.credits} CR</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="glass-card p-6 h-fit">
                <h3 className="font-semibold mb-4">Manage Credits</h3>
                <form onSubmit={handleCreditOperation} className="space-y-4">
                  <div>
                    <Label htmlFor="user">User</Label>
                    <select 
                      id="user"
                      className="w-full bg-secondary border border-border rounded p-2 text-sm mt-1"
                      value={creditForm.userId || ""}
                      onChange={(e) => setCreditForm({...creditForm, userId: e.target.value ? parseInt(e.target.value) : null})}
                      required
                    >
                      <option value="">Choose...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Operation</Label>
                    <div className="flex gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setCreditForm({...creditForm, operation: "assign"})}
                        className={`flex-1 py-2 px-3 rounded text-xs font-medium ${
                          creditForm.operation === "assign"
                            ? "bg-green-500/20 text-green-600 border border-green-500/30"
                            : "bg-secondary"
                        }`}
                      >
                        Assign
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreditForm({...creditForm, operation: "deduct"})}
                        className={`flex-1 py-2 px-3 rounded text-xs font-medium ${
                          creditForm.operation === "deduct"
                            ? "bg-red-500/20 text-red-600 border border-red-500/30"
                            : "bg-secondary"
                        }`}
                      >
                        Deduct
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount (CR)</Label>
                    <Input 
                      id="amount"
                      type="number"
                      placeholder="100" 
                      className="bg-secondary border-border mt-1"
                      value={creditForm.amount}
                      onChange={(e) => setCreditForm({...creditForm, amount: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reason">Reason</Label>
                    <Input 
                      id="reason"
                      placeholder="Weekly bonus" 
                      className="bg-secondary border-border mt-1"
                      value={creditForm.reason}
                      onChange={(e) => setCreditForm({...creditForm, reason: e.target.value})}
                      required
                    />
                  </div>
                  <Button type="submit" className="gradient-gold-bg w-full" disabled={assigningCredits !== null}>
                    {assigningCredits ? "Processing..." : creditForm.operation === "assign" ? "Assign" : "Deduct"}
                  </Button>
                </form>
              </div>
            </div>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Core performance charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              <RevenueLineChart />
              <TopAuctionsBar />
            </div>

            {/* Bid trends overview */}
            <div className="grid lg:grid-cols-2 gap-6">
              <PriceHistoryChart />
              <BidDistribution />
            </div>


            {/* High‑level auction trend + live stream */}
            <div className="grid lg:grid-cols-2 gap-6">
              <AuctionTrends />
              <AdminLiveBids />
            </div>


          </TabsContent>

          {/* Create Auction */}

          {/* Winners Tab */}
          <TabsContent value="winners" className="space-y-4">
            {winnersLoading ? (
              <div className="text-center py-10 text-muted-foreground">Loading winners...</div>
            ) : winners.length === 0 ? (
              <div className="glass-card p-6 text-center text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No auction winners yet</p>
              </div>
            ) : (
              <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold flex items-center gap-2"><Trophy className="w-4 h-4 text-primary" /> All Auction Winners ({winners.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        <th className="text-left p-4 font-medium">Auction</th>
                        <th className="text-left p-4 font-medium">Winner</th>
                        <th className="text-left p-4 font-medium">Winning Bid</th>
                        <th className="text-left p-4 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {winners.map((w: any) => (
                        <tr key={w.id} className="border-b border-border/50 hover:bg-secondary/30">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img src={w.image_url || "https://via.placeholder.com/40"} alt="" className="w-10 h-10 rounded object-cover" />
                              <div>
                                <p className="font-medium text-sm">{w.title}</p>
                                <p className="text-xs text-muted-foreground">{w.category_name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-success/20 flex items-center justify-center text-xs font-bold text-success">
                                {(w.winner_name || "?").charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium">{w.winner_name || "N/A"}</span>
                            </div>
                          </td>
                          <td className="p-4 font-mono font-bold text-primary">{w.bid_amount || w.current_bid_price || 0} CR</td>
                          <td className="p-4 text-xs text-muted-foreground">{w.bid_time ? new Date(w.bid_time).toLocaleDateString() : w.updated_at ? new Date(w.updated_at).toLocaleDateString() : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="create">
            <div className="glass-card p-6 max-w-2xl">
              <h3 className="text-xl font-bold mb-6">Create Auction</h3>
              <form className="space-y-4" onSubmit={handleCreateAuction}>
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input 
                    id="title"
                    placeholder="Auction title" 
                    className="bg-secondary border-border mt-1"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="desc">Description *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={generateDescription} disabled={generating} className="mb-2">
                    <Sparkles className="w-3 h-3 mr-1" /> {generating ? "Generating..." : "AI Generate"}
                  </Button>
                  <Textarea 
                    id="desc"
                    placeholder="Describe item..." 
                    className="bg-secondary border-border min-h-[80px]" 
                    value={aiDesc || formData.description}
                    onChange={(e) => setAiDesc(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="price">Price (CR) *</Label>
                  <Input 
                    id="price"
                    type="number" 
                    placeholder="50" 
                    className="bg-secondary border-border mt-1"
                    value={formData.startingPrice}
                    onChange={(e) => setFormData({...formData, startingPrice: e.target.value})}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reserve">Reserve (CR)</Label>
                    <Input 
                      id="reserve"
                      type="number" 
                      placeholder="100" 
                      className="bg-secondary border-border mt-1"
                      value={formData.reservePrice}
                      onChange={(e) => setFormData({...formData, reservePrice: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end">End Time *</Label>
                    <Input 
                      id="end"
                      type="datetime-local" 
                      className="bg-secondary border-border mt-1"
                      value={formData.auctionEndTime}
                      onChange={(e) => setFormData({...formData, auctionEndTime: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="image">Auction Images (Up to 3)</Label>
                  <div className="mt-1">
                    <Input 
                      id="image" 
                      type="file" 
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="bg-secondary border-border file:bg-primary file:text-primary-foreground file:border-0 file:rounded-md file:px-4 file:py-1 file:mr-4 file:hover:bg-primary/90 cursor-pointer" 
                    />
                  </div>
                  {imagePreviews.length > 0 && (
                    <div className="mt-3 flex gap-3 flex-wrap">
                      {imagePreviews.map((preview, idx) => (
                        <div key={idx} className="w-20 h-20 rounded-md overflow-hidden border border-border">
                          <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">Upload up to 3 high-quality images of your item (Max 5MB each)</p>
                </div>
                <Button type="submit" className="gradient-gold-bg w-full" disabled={creating}>
                  {creating ? "Creating..." : "Create Auction"}
                </Button>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
