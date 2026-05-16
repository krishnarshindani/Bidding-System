import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Clock, Gavel, TrendingUp } from "lucide-react";
import { API_SERVICE } from "@/services/api";
import { useSocket } from "@/contexts/SocketContext";

interface LiveAuction {
  id: string | number;
  title: string;
  highestBid?: number;
  current_bid_price?: number;
  bidderCount?: number;
  total_bids?: number;
  timeLeft?: string;
  status: "hot" | "active" | "ending";
  end_time?: string;
}

export default function InteractiveAuctionList() {
  const [auctions, setAuctions] = useState<LiveAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  // Fetch real auctions from API
  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const data = await API_SERVICE.auctions.getActive(5);
        if (data && Array.isArray(data)) {
          const formattedAuctions = data.map((a: any) => ({
            id: String(a.id),
            title: a.title || "Untitled",
            highestBid: parseFloat(a.current_bid_price) || 0,
            current_bid_price: parseFloat(a.current_bid_price) || 0,
            bidderCount: a.total_bids || 0,
            total_bids: a.total_bids || 0,
            timeLeft: calculateTimeLeft(a.end_time),
            status: getAuctionStatus(a.end_time, a.status),
            end_time: a.end_time,
          }));
          setAuctions(formattedAuctions);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching auctions:", error);
        setLoading(false);
      }
    };

    fetchAuctions();
    
    // Refresh every 30 seconds (Socket.IO provides real-time updates for bids)
    const interval = setInterval(fetchAuctions, 30000);
    return () => clearInterval(interval);
  }, []);

  // Listen for real-time bid updates
  useEffect(() => {
    if (!socket) return;

    socket.on('bid:placed', (data) => {
      setAuctions(prev => prev.map(a => 
        a.id === String(data.auctionId)
          ? {
              ...a,
              highestBid: data.bidAmount,
              current_bid_price: data.bidAmount,
              bidderCount: (a.bidderCount || 0) + 1,
              total_bids: (a.total_bids || 0) + 1,
            }
          : a
      ));
    });

    return () => {
      socket.off('bid:placed');
    };
  }, [socket]);

  const calculateTimeLeft = (endTime?: string) => {
    if (!endTime) return "N/A";
    const end = new Date(endTime).getTime();
    const now = new Date().getTime();
    const diff = end - now;
    
    if (diff <= 0) return "Ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getAuctionStatus = (endTime?: string, status?: string): "hot" | "active" | "ending" => {
    if (status === "ended") return "active";
    if (!endTime) return "active";
    
    const end = new Date(endTime).getTime();
    const now = new Date().getTime();
    const diff = end - now;
    const fiveMinutes = 5 * 60 * 1000;
    const oneHour = 60 * 60 * 1000;
    
    if (diff < fiveMinutes) return "ending";
    if (diff < oneHour) return "hot";
    return "active";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Live Auctions</h3>
        <div className="flex items-center gap-2 text-sm text-primary">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          {loading ? "Loading..." : `${auctions.length} Active`}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading auctions...</div>
      ) : auctions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No active auctions available</div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {auctions.map((auction, idx) => (
              <motion.div
                key={auction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.05 }}
                className="group p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer border border-border/20 hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium truncate text-sm group-hover:text-primary transition-colors">{auction.title}</h4>
                      <Badge className={`${getStatusColor(auction.status)} border flex-shrink-0`}>
                        {getStatusLabel(auction.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Gavel className="w-3 h-3" />
                        <span>{auction.bidderCount || 0} bids</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{auction.timeLeft}</span>
                      </div>
                    </div>
                  </div>

                  <motion.div
                    className="flex items-center gap-2 flex-shrink-0"
                    initial={{ scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="text-right">
                      <motion.div
                        key={`${auction.id}-${auction.highestBid}`}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="text-lg font-bold gradient-gold-text"
                      >
                        {(auction.highestBid || 0).toLocaleString()} CR
                      </motion.div>
                      <div className="text-xs text-green-500 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Live
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );

  function getStatusColor(status: string) {
    switch (status) {
      case "hot":
        return "bg-red-500/20 text-red-500 border-red-500/30";
      case "ending":
        return "bg-orange-500/20 text-orange-500 border-orange-500/30";
      default:
        return "bg-green-500/20 text-green-500 border-green-500/30";
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "hot":
        return "🔥 Hot";
      case "ending":
        return "⏰ Ending Soon";
      default:
        return "✓ Active";
    }
  }
}
