import { useState, useMemo, useEffect } from "react";
import { API_SERVICE } from "@/services/api";
import { useSocket } from "@/contexts/SocketContext";
import AuctionCard from "@/components/AuctionCard";
import InteractiveAuctionList from "@/components/InteractiveAuctionList";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import { motion } from "framer-motion";

const statuses = ["All", "active", "upcoming", "ended"];

interface Auction {
  id: number;
  title: string;
  category: string;
  status: string;
  currentBid?: number;
  current_bid_price?: number;
  totalBids?: number;
  total_bids?: number;
  endTime?: string;
  end_time?: string;
  imageUrl?: string;
  image_url?: string;
  currentBidderName?: string;
}

export default function AuctionsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  // Fetch categories from DB
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await API_SERVICE.categories.getAll();
        if (Array.isArray(data)) {
          const catNames = data.map((c: any) => c.name);
          setCategories(["All", ...catNames]);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch all auctions from API
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
    // Refresh every 60 seconds (Socket.IO provides real-time bid updates)
    const interval = setInterval(fetchAuctions, 60000);
    return () => clearInterval(interval);
  }, []);

  // Listen for real-time auction updates (bid placements)
  useEffect(() => {
    if (!socket) return;

    // Listen for new bids which update auction current price
    socket.on('bid:placed', (data) => {
      setAuctions(prev => prev.map(a => 
        a.id === data.auctionId 
          ? {
              ...a,
              currentBid: data.bidAmount,
              current_bid_price: data.bidAmount,
              totalBids: (a.totalBids || a.total_bids || 0) + 1,
              total_bids: (a.totalBids || a.total_bids || 0) + 1,
            }
          : a
      ));
    });

    socket.on('auction-update', (data) => {
      setAuctions(prev => prev.map(a => 
        a.id === data.auctionId 
          ? {
              ...a,
              currentBid: data.currentBid !== undefined ? data.currentBid : a.currentBid,
              current_bid_price: data.currentBid !== undefined ? data.currentBid : a.current_bid_price,
              currentBidderName: data.currentBidderName !== undefined ? data.currentBidderName : a.currentBidderName,
              totalBids: data.totalBids !== undefined ? data.totalBids : a.totalBids,
              total_bids: data.totalBids !== undefined ? data.totalBids : a.total_bids,
              status: data.status !== undefined ? data.status : a.status,
            }
          : a
      ));
    });

    return () => {
      socket.off('bid:placed');
      socket.off('auction-update');
    };
  }, [socket]);

  const filtered = useMemo(() => {
    return auctions.filter((a) => {
      const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === "All" || (a as any).category_name === category || a.category === category;
      const matchStatus = status === "All" || a.status === status;
      return matchSearch && matchCat && matchStatus;
    });
  }, [search, category, status, auctions]);

  return (
    <div className="min-h-screen pt-20 pb-12 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">Browse <span className="gradient-gold-text">Auctions</span></h1>
              <p className="text-muted-foreground text-lg">Discover premium items and place your bids</p>
            </div>
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="hidden lg:block"
            >
              <Filter className="w-16 h-16 text-primary opacity-10" />
            </motion.div>
          </div>
        </motion.div>

        {/* Live Auctions Showcase */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <InteractiveAuctionList />
        </motion.div>

        {/* Enhanced Filters Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-10"
        >
          {/* Search Bar */}
          <div className="mb-6">
            <motion.div
              whileFocus={{ scale: 1.02 }}
              className="relative"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
              <Input 
                placeholder="Search auctions by name..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="pl-12 py-3 bg-secondary/50 border-border/50 focus:border-primary/50 text-base rounded-xl"
              />
            </motion.div>
          </div>

          {/* Category Filters */}
          <div className="mb-6">
            <p className="text-xs text-muted-foreground font-semibold mb-3 uppercase tracking-wider">Categories</p>
            <div className="flex gap-2 flex-wrap">
              {categories.map((c, i) => (
                <motion.button
                  key={c}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCategory(c)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 ${
                    category === c 
                      ? "gradient-gold-bg text-primary-foreground shadow-lg shadow-primary/30" 
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary/80 hover:text-foreground border border-border/50"
                  }`}
                >
                  {c}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Status Filters */}
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-3 uppercase tracking-wider">Status</p>
            <div className="flex gap-2 flex-wrap">
              {statuses.map((s, i) => (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStatus(s)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                    status === s
                      ? "bg-primary/20 text-primary border border-primary/30 shadow-lg shadow-primary/20"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary/80 hover:text-foreground border border-border/50"
                  }`}
                >
                  {s === "All" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Results Section */}
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary mx-auto mb-4"
            />
            <p className="text-lg text-muted-foreground font-medium">Loading premium auctions...</p>
          </motion.div>
        ) : filtered.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="auction-grid"
          >
            {filtered.map((auction, i) => (
              <AuctionCard key={auction.id} auction={auction} index={i} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-12 text-center"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
            >
              <Search className="w-8 h-8 text-primary/50" />
            </motion.div>
            <p className="text-lg font-semibold mb-2">No auctions found</p>
            <p className="text-muted-foreground">Try adjusting your search filters or check back later</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
