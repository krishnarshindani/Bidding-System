import { useAuth } from "@/contexts/AuthContext";
import { API_SERVICE } from "@/services/api";
import { useState, useEffect } from "react";
import AuctionCard from "@/components/AuctionCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Coins, Gavel, Trophy, Clock, Bell, BarChart3, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
}

interface BidHistory {
  id: number;
  auction_id: number;
  bid_amount: number;
  bid_status: string;
  auction_title: string;
  auction_image: string;
  auction_status: string;
  category_name: string;
  created_at: string;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_auction_id?: number;
}

export default function BidderDashboard() {
  const { user, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [bidHistory, setBidHistory] = useState<BidHistory[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [wonAuctions, setWonAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");

  // Fetch auctions from API
  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        setLoading(true);
        const data = await API_SERVICE.auctions.getActive(100, 0);
        if (Array.isArray(data)) {
          setAuctions(data);
        }
      } catch (error) {
        console.error("Error fetching auctions:", error);
        setAuctions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAuctions();
    const interval = setInterval(fetchAuctions, 60000);
    return () => clearInterval(interval);
  }, []);

  // Refresh user credits on mount
  useEffect(() => {
    if (refreshUser) refreshUser();
  }, []);

  // Fetch notifications and bid history when switching tabs
  const fetchNotifications = async () => {
    if (!user || !token) return;
    try {
      const data = await API_SERVICE.users.getNotifications(user.id, token);
      if (Array.isArray(data)) setNotifications(data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const fetchBidHistory = async () => {
    if (!user || !token) return;
    try {
      const data = await API_SERVICE.users.getBidHistory(user.id, token);
      if (Array.isArray(data)) setBidHistory(data);
    } catch (error) {
      console.error("Error fetching bid history:", error);
    }
  };

  const fetchWonAuctions = async () => {
    if (!user || !token) return;
    try {
      const data = await API_SERVICE.users.getWonAuctions(token);
      if (data && Array.isArray(data.auctions)) setWonAuctions(data.auctions);
    } catch (error) {
      console.error("Error fetching won auctions:", error);
    }
  };

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (newTab === "notifications") fetchNotifications();
    if (newTab === "history" || newTab === "mybids") fetchBidHistory();
    if (newTab === "won" && wonAuctions.length === 0) fetchWonAuctions();
  };

  const activeAuctions = auctions.filter((a) => a.status === "active");

  const stats = [
    { label: "Credit Balance", value: `${user?.credits || 0} CR`, icon: Coins, color: "text-primary", bgColor: "from-primary/20 to-primary/10" },
    { label: "Active Auctions", value: activeAuctions.length, icon: Gavel, color: "text-success", bgColor: "from-success/20 to-success/10" },
  ];

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
              <h1 className="text-4xl font-bold mb-2">Welcome, <span className="gradient-gold-text">{user?.name || "Bidder"}</span></h1>
              <p className="text-muted-foreground text-lg">Your premium bidding command center</p>
            </div>
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="hidden md:block"
            >
              <Gavel className="w-12 h-12 text-primary opacity-20" />
            </motion.div>
          </div>
        </motion.div>

        {/* Enhanced Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15, type: "spring", stiffness: 100 }}
              whileHover={{ scale: 1.02 }}
              className={`glass-card p-8 cursor-pointer group relative overflow-hidden`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${s.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground font-medium">{s.label}</p>
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                    className={`w-10 h-10 rounded-lg bg-${s.color.split('-')[1]}/20 flex items-center justify-center flex-shrink-0`}
                  >
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </motion.div>
                </div>
                <p className="text-3xl font-bold font-mono gradient-gold-text">
                  {s.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-secondary mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="active" className="gap-1.5"><Gavel className="w-4 h-4" />Active Auctions</TabsTrigger>
            <TabsTrigger value="mybids" className="gap-1.5"><BarChart3 className="w-4 h-4" />My Bids</TabsTrigger>
            <TabsTrigger value="won" className="gap-1.5"><Trophy className="w-4 h-4" />Won Auctions</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5"><Bell className="w-4 h-4" />Notifications</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5"><Clock className="w-4 h-4" />History</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {loading ? (
              <div className="text-center py-10 text-muted-foreground">Loading auctions...</div>
            ) : activeAuctions.length > 0 ? (
              <div className="auction-grid">
                {activeAuctions.map((a, i) => <AuctionCard key={a.id} auction={a} index={i} />)}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">No active auctions at the moment</div>
            )}
          </TabsContent>

          <TabsContent value="mybids" className="space-y-6">
            {bidHistory.length > 0 ? (
              <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold">Your Bid Activity</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="text-left p-4 font-medium">Auction</th>
                        <th className="text-left p-4 font-medium">Bid</th>
                        <th className="text-left p-4 font-medium">Status</th>
                        <th className="text-left p-4 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bidHistory.map((bid) => (
                        <tr key={bid.id} className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer" onClick={() => navigate(`/auction/${bid.auction_id}`)}>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img src={bid.auction_image || "https://via.placeholder.com/40"} alt="" className="w-10 h-10 rounded object-cover" />
                              <div>
                                <p className="font-medium text-sm">{bid.auction_title}</p>
                                <p className="text-xs text-muted-foreground">{bid.category_name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-mono font-bold text-primary">{bid.bid_amount} CR</td>
                          <td className="p-4">
                            <Badge className={
                              bid.bid_status === "active" ? "bg-success/20 text-success" :
                              bid.bid_status === "won" ? "bg-primary/20 text-primary" :
                              "bg-muted text-muted-foreground"
                            }>{bid.bid_status}</Badge>
                          </td>
                          <td className="p-4 text-xs text-muted-foreground">{new Date(bid.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="glass-card p-6 text-center text-muted-foreground">
                <Gavel className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No bids placed yet. Start bidding on active auctions!</p>
              </div>
            )}
          </TabsContent>

          {/* Won Auctions Tab */}
          <TabsContent value="won" className="space-y-4">
            {wonAuctions.length > 0 ? (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-success/30 bg-success/10 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                        className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center"
                      >
                        <Trophy className="w-5 h-5 text-success" />
                      </motion.div>
                      <div>
                        <p className="font-semibold">Congratulations — you won!</p>
                        <p className="text-xs text-muted-foreground">
                          Your winning auctions are listed below. Tap any auction to view details.
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-success/20 text-success border-success/30">
                      {wonAuctions.length} WON
                    </Badge>
                  </div>
                </motion.div>

                <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold flex items-center gap-2"><Trophy className="w-4 h-4 text-success" /> Your Winning Auctions ({wonAuctions.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="text-left p-4 font-medium">Auction</th>
                        <th className="text-left p-4 font-medium">Winning Bid</th>
                        <th className="text-left p-4 font-medium">Seller</th>
                        <th className="text-left p-4 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wonAuctions.map((a: any) => (
                        <tr key={a.id} className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer" onClick={() => navigate(`/auction/${a.id}`)}>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img src={a.image_url || "https://via.placeholder.com/40"} alt="" className="w-10 h-10 rounded object-cover" />
                              <div>
                                <p className="font-medium text-sm">{a.title}</p>
                                <p className="text-xs text-muted-foreground">{a.category_name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-mono font-bold text-success">{a.winning_bid_amount || a.current_bid_price || 0} CR</td>
                          <td className="p-4 text-sm">{a.seller_name || "-"}</td>
                          <td className="p-4 text-xs text-muted-foreground">{a.bid_time ? new Date(a.bid_time).toLocaleDateString() : a.updated_at ? new Date(a.updated_at).toLocaleDateString() : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>
              </>
            ) : (
              <div className="glass-card p-6 text-center text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No winning auctions yet. Keep bidding!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notifications" className="space-y-3">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div key={n.id} className={`glass-card p-4 flex items-start gap-3 ${!n.is_read ? "border-l-2 border-primary" : ""}`}>
                  <Bell className={`w-5 h-5 mt-0.5 ${!n.is_read ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  {n.related_auction_id && (
                    <button onClick={() => navigate(`/auction/${n.related_auction_id}`)} className="text-xs text-primary hover:underline">View</button>
                  )}
                </div>
              ))
            ) : (
              <div className="glass-card p-6 text-center text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No notifications yet. Start bidding to get updates!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3">
            {bidHistory.length > 0 ? (
              <div className="glass-card overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold">Complete Bid History</h3>
                </div>
                <div className="space-y-2 p-4">
                  {bidHistory.map((bid) => (
                    <div key={bid.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 cursor-pointer" onClick={() => navigate(`/auction/${bid.auction_id}`)}>
                      <div className="flex items-center gap-3">
                        <img src={bid.auction_image || "https://via.placeholder.com/32"} alt="" className="w-8 h-8 rounded object-cover" />
                        <div>
                          <p className="text-sm font-medium">{bid.auction_title}</p>
                          <p className="text-xs text-muted-foreground">{new Date(bid.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-sm">{bid.bid_amount} CR</p>
                        <Badge variant="outline" className="text-[10px]">{bid.bid_status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass-card p-6 text-center text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No bid history yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
