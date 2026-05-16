import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Gavel, User } from "lucide-react";
import { API_SERVICE } from "@/services/api";
import { useSocket } from "@/contexts/SocketContext";

interface LiveBid {
  id: number;
  amount: number;
  bidder_id: number;
  bidderName: string;
  auctionId: number;
  title: string;
  timestamp: string;
}

export default function AdminLiveBids() {
  const [bids, setBids] = useState<LiveBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { socket } = useSocket();

  useEffect(() => {
    let isMounted = true;

    const loadBids = async () => {
      try {
        setError(null);
        const data = await API_SERVICE.analytics.getLiveBids(25);
        if (!isMounted) return;
        if (Array.isArray(data)) {
          setBids(data);
        }
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message || "Failed to load live bids");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadBids();
    const interval = setInterval(loadBids, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handler = (data: any) => {
      setBids((prev) => {
        const next: LiveBid[] = [
          {
            id: data.bidId || Date.now(),
            amount: data.bidAmount,
            bidder_id: data.bidderId,
            bidderName: data.bidderName || "Unknown",
            auctionId: data.auctionId,
            title: data.auctionTitle || "Auction",
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ];
       return next.slice(0, 50);
      });
    };

    socket.on("bid:placed", handler);
    return () => {
      socket.off("bid:placed", handler);
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="glass-card p-6 text-center text-muted-foreground">
        Loading live bids...
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gavel className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm md:text-base">
            Live Bid Stream
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Real time
        </span>
      </div>

      {bids.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground text-sm">
          {error ? (
            <div className="space-y-1">
              <p className="text-destructive font-medium">Could not load live bids</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          ) : (
            "No bids yet."
          )}
        </div>
      ) : (
        <div className="max-h-[360px] overflow-y-auto divide-y divide-border/60">
          {bids.map((bid, index) => (
            <motion.button
              key={`${bid.id}-${bid.timestamp}-${index}`}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.02 }}
              onClick={() => navigate(`/auction/${bid.auctionId}`)}
              className="w-full text-left px-4 py-3 hover:bg-secondary/40 focus:bg-secondary/60 transition-colors flex items-start gap-3"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">
                    {bid.bidderName}{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      on
                    </span>{" "}
                    <span className="truncate text-xs md:text-sm text-foreground">
                      {bid.title}
                    </span>
                  </p>
                  <p className="font-mono font-semibold text-primary text-sm md:text-base">
                    {bid.amount} CR
                  </p>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(bid.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="uppercase tracking-wide">
                    #{bid.auctionId}
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

