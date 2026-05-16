import CountdownTimer from "./CountdownTimer";
import ImageCarousel from "./ImageCarousel";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Gavel, TrendingUp, Zap, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface AuctionCardProps {
  auction: any;
  index?: number;
  images?: string[];
}

export default function AuctionCard({ auction, index = 0, images: imagesProp }: AuctionCardProps) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const statusColors: Record<string, string> = {
    active: "status-active",
    upcoming: "status-pending",
    ended: "status-ended",
  };

  // Support both camelCase & snake_case fields from DB
  const image = auction.image || auction.image_url || "https://via.placeholder.com/400x300";
  const endTime = auction.endTime || auction.end_time || auction.auction_end_time;
  const category = auction.category || auction.category_name || "";
  const currentBid = auction.currentBid || auction.current_bid_price || 0;
  const totalBids = auction.totalBids || auction.total_bids || 0;
  const currentBidderName = auction.currentBidderName || auction.current_bidder_name;
  const status = auction.status || "active";

  // Prepare images array for carousel
  const images = imagesProp || (image ? [image] : ["https://via.placeholder.com/400x300"]);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: index * 0.08,
        duration: 0.5,
        type: "spring",
        stiffness: 100,
      },
    },
  };

  const hoverVariants = {
    hover: {
      y: -12,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      whileTap={{ scale: 0.97 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate(`/auction/${auction.id}`)}
      className="glass-card overflow-hidden cursor-pointer group transition-all duration-300"
    >
      {/* Image Container with Overlay */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/5 to-accent/5">
        <ImageCarousel
          images={images}
          className="w-full h-full"
          showThumbnails={false}
          autoPlay={true}
          autoPlayInterval={3000}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />

        {/* Status Badge with Animation */}
        <motion.div
          className="absolute top-3 right-3"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Badge className={`status-badge ${statusColors[status] || ""}`}>
            {status === "active" && <span className="live-dot mr-1" />}
            {status}
          </Badge>
        </motion.div>

        {/* Live Activity Indicator */}
        {status === "active" && totalBids > 0 && (
          <motion.div
            className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/60 backdrop-blur-md px-2.5 py-1.5 rounded-full text-xs font-medium text-success border border-success/30"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Activity className="w-3 h-3" />
            <span>{totalBids} bids</span>
          </motion.div>
        )}

        {/* Countdown Timer */}
        {status === "active" && endTime && (
          <motion.div
            className="absolute bottom-3 left-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <CountdownTimer endTime={endTime} compact />
          </motion.div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Category & Title */}
        <div>
          <motion.p
            className="text-xs text-muted-foreground uppercase tracking-widest font-semibold"
            animate={{ opacity: isHovered ? 1 : 0.7 }}
          >
            {category}
          </motion.p>
          <motion.h3
            className="font-bold text-base mt-1.5 line-clamp-2 group-hover:text-primary transition-colors duration-300"
            animate={{ color: isHovered ? "hsl(43 96% 56%)" : "inherit" }}
          >
            {auction.title}
          </motion.h3>
        </div>

        {/* Bid Information */}
        <motion.div
          className="flex items-center justify-between py-2 px-3 bg-primary/5 rounded-lg border border-primary/10"
          animate={{ borderColor: isHovered ? "hsl(43 96% 56% / 0.3)" : "hsl(var(--border) / 0.1)" }}
        >
          <div>
            <p className="text-xs text-muted-foreground font-medium">Current Bid</p>
            <motion.p
              className="text-lg font-bold text-primary font-mono mt-0.5"
              animate={{ scale: isHovered ? 1.05 : 1 }}
            >
              {currentBid > 0 ? `${currentBid} CR` : "No bids"}
            </motion.p>
          </div>
          <motion.div
            className="flex items-center gap-2 text-muted-foreground"
            animate={{ scale: isHovered ? 1.1 : 1 }}
          >
            <div className="flex items-center gap-1 bg-secondary/50 px-2 py-1 rounded-md">
              <Gavel className="w-3.5 h-3.5" />
              <span className="text-sm font-semibold">{totalBids}</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Leading Bidder */}
        {currentBidderName && (
          <motion.div
            className="flex items-center gap-2 p-2 bg-success/5 rounded-lg border border-success/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <TrendingUp className="w-3.5 h-3.5 text-success flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Leading</p>
              <p className="text-xs font-semibold text-success truncate">{currentBidderName}</p>
            </div>
          </motion.div>
        )}

        {/* CTA Indicator */}
        {status === "active" && (
          <motion.div
            className="flex items-center justify-center gap-1.5 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity"
            animate={{ y: isHovered ? 0 : 5 }}
          >
            <Zap className="w-3 h-3" />
            <span>Click to bid</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
