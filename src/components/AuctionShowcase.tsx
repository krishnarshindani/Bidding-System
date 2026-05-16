import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gavel, TrendingUp, Users } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { API_SERVICE } from "@/services/api";
import { useSocket } from "@/contexts/SocketContext";

interface Auction {
  id: string;
  title: string;
  current_bid_price?: number;
  currentBid?: number;
  total_bids?: number;
  bids?: number;
  current_highest_bidder_id?: string;
  bidders?: number;
}

export default function AuctionShowcase() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  // Fetch real auctions from API
  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const data = await API_SERVICE.auctions.getActive(3);
        if (data && Array.isArray(data) && data.length > 0) {
          setAuctions(
            data.map((a: any) => ({
              id: String(a.id),
              title: a.title || "Untitled",
              currentBid: parseFloat(a.current_bid_price) || 0,
              bids: a.total_bids || 0,
              bidders: 0, // Will be populated from websocket
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching auctions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAuctions();

    // Refresh every 30 seconds (Socket.IO provides real-time updates)
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
              currentBid: data.bidAmount,
              bids: (a.bids || 0) + 1,
            }
          : a
      ));
    });

    return () => {
      socket.off('bid:placed');
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading live auctions...</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {auctions.length > 0 ? (
        <Swiper
          modules={[Autoplay, Pagination]}
          spaceBetween={24}
          slidesPerView={1}
          breakpoints={{
            768: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
          }}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          className="pb-8"
        >
          {auctions.map((auction, idx) => (
            <SwiperSlide key={auction.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="glass-card p-6 overflow-hidden group hover:border-primary/50 transition-all duration-300 h-full"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100"
                  transition={{ duration: 0.3 }}
                />

                <div className="relative z-10 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base md:text-lg line-clamp-2">{auction.title}</h3>
                      <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full text-xs font-medium mt-2">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        Live
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 ml-2">
                      <Gavel className="w-4 h-4 text-primary" />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/30">
                    <p className="text-xs text-muted-foreground mb-1.5">Current Bid</p>
                    <motion.div
                      key={`bid-${auction.id}-${auction.currentBid}`}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="text-2xl md:text-3xl font-bold gradient-gold-text"
                    >
                      {auction.currentBid ? auction.currentBid.toLocaleString() : "0"} CR
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 group/stat hover:bg-secondary/70 transition-colors">
                      <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Bids</p>
                        <motion.p
                          key={`bids-${auction.id}-${auction.bids}`}
                          initial={{ y: -8, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="font-bold text-sm"
                        >
                          {auction.bids}
                        </motion.p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 group/stat hover:bg-secondary/70 transition-colors">
                      <Users className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Active</p>
                        <motion.p
                          key={`bidders-${auction.id}-${auction.bidders}`}
                          initial={{ y: -8, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="font-bold text-sm"
                        >
                          {auction.bidders || 0}
                        </motion.p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="relative h-1.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary via-primary/70 to-primary/40"
                        initial={{ width: "30%" }}
                        animate={{ width: "90%" }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </SwiperSlide>
          ))}
        </Swiper>
      ) : (
        <div className="text-center py-10 text-muted-foreground">
          No active auctions at the moment
        </div>
      )}
    </div>
  );
}
