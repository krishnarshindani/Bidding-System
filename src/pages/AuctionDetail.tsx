import { useParams, useNavigate } from "react-router-dom";
import { API_SERVICE } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { useState, useEffect, useMemo } from "react";
import CountdownTimer from "@/components/CountdownTimer";
import ImageCarousel from "@/components/ImageCarousel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Gavel, TrendingUp, Clock, User, Zap, Lightbulb, Trophy, Volume2, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Auction {
  id: number | string;
  title: string;
  description: string;
  image?: string;
  image_url?: string;
  category: string;
  status: string;
  currentBid?: number;
  current_bid_price?: number;
  currentBidderName?: string;
  current_bidder_name?: string;
  totalBids?: number;
  total_bids?: number;
  minimumBid?: number;
  starting_price?: number;
  endTime?: string;
  end_time?: string;
  auction_end_time?: string;
}

interface Bid {
  id: number;
  auctionId: number | string;
  bidderName: string;
  amount: number;
  timestamp: string;
  isProxy?: boolean;
  maxProxyAmount?: number;
}

interface ChatMessage {
  auctionId: number | string;
  senderId: string | null;
  senderName: string;
  messageText: string;
  timestamp: string;
}

export default function AuctionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, refreshUser } = useAuth();
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBidding, setIsBidding] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [maxProxy, setMaxProxy] = useState("");
  const [showProxyInput, setShowProxyInput] = useState(false);
  const [auctionAnalysis, setAuctionAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [currentBidProxy, setCurrentBidProxy] = useState<{ isProxy: boolean; maxProxyAmount?: number } | null>(null);

  // Images
  const [images, setImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);

  // Live chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const isLiveAuction = useMemo(() => auction?.status === "active", [auction?.status]);

  // Track whether proxy bidding is allowed (> 10 minutes remaining)
  const [proxyAllowed, setProxyAllowed] = useState(true);

  useEffect(() => {
    if (!auction || auction.status !== 'active') {
      setProxyAllowed(false);
      return;
    }
    const checkProxyTime = () => {
      const endMs = new Date(auction.endTime || auction.end_time || auction.auction_end_time || '').getTime();
      const remaining = endMs - Date.now();
      const tenMinMs = 10 * 60 * 1000;
      setProxyAllowed(remaining > tenMinMs);
    };
    checkProxyTime();
    const interval = setInterval(checkProxyTime, 1000);
    return () => clearInterval(interval);
  }, [auction?.endTime, auction?.end_time, auction?.auction_end_time, auction?.status]);

  const currentDisplayBid =
    (auction?.currentBid || auction?.current_bid_price || 0) > 0
      ? (auction?.currentBid || auction?.current_bid_price || 0)
      : (auction?.minimumBid || auction?.starting_price || 0 || 0);

  const effectiveNextMinBid = useMemo(() => {
    if (!auction) return null;
    const base = currentDisplayBid || 0;
    const increment = base >= 25 ? 5 : 1;
    if (base === 0) {
      // IPL-style start at 10 CR
      return 10;
    }
    return base + increment;
  }, [auction, currentDisplayBid]);

  // Ensure chat isn't visible when auction isn't live
  useEffect(() => {
    if (!isLiveAuction) setChatOpen(false);
  }, [isLiveAuction]);

  const sanitizeIntegerInput = (raw: string) => {
    // Keep only digits; disallow decimals/negative.
    const digitsOnly = raw.replace(/[^\d]/g, "");
    if (!digitsOnly) return "";
    // Avoid huge strings; parse int safely.
    const n = Number.parseInt(digitsOnly, 10);
    return Number.isFinite(n) ? String(n) : "";
  };

  const getQuickBidOptions = (baseBid: number | null) => {
    if (!baseBid || !Number.isFinite(baseBid)) return [];
    if (baseBid < 20) {
      return [baseBid + 1];
    }
    return [baseBid + 5, baseBid + 10, baseBid + 15];
  };


  // Fetch auction, bids, and images from API (only once on mount)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!id || isNaN(Number(id))) {
          console.warn('Invalid auction ID:', id);
          navigate('/auctions');
          return;
        }
        
        const auctionData = await API_SERVICE.auctions.getById(Number(id));
        setAuction(auctionData);
        
        // Fetch bids for this auction
        const bidsData = await API_SERVICE.bids.getByAuction(Number(id));
        if (Array.isArray(bidsData)) {
          // Map API response to component interface
          const mappedBids = bidsData.map((bid: any) => ({
            id: bid.id,
            auctionId: bid.auction_id,
            bidderName: bid.bidder_name || 'Unknown Bidder',
            amount: bid.bid_amount || 0,
            timestamp: bid.created_at || new Date().toISOString(),
          }));
          setBids(mappedBids);
        } else {
          setBids([]);
        }

        // Fetch images for this auction
        setLoadingImages(true);
        const imagesData = await API_SERVICE.auctions.getImages(Number(id));
        if (imagesData && Array.isArray(imagesData.images)) {
          const imageUrls = imagesData.images
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map(img => img.imageUrl);
          setImages(imageUrls);
        } else {
          // Fallback to single image if no multiple images
          const fallbackImage = auctionData.image || auctionData.image_url || "https://via.placeholder.com/600x400";
          setImages([fallbackImage]);
        }
        setLoadingImages(false);

      } catch (error) {
        console.error("Error fetching auction:", error);
        toast({
          title: "Error",
          description: "Failed to load auction details",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Only fetch once on component mount, real-time updates via Socket.IO
    return () => {};
  }, [id, toast]);

  const suggestedBid = auction 
    ? (auction.currentBid || auction.current_bid_price || 0) + Math.ceil(((auction.currentBid || auction.current_bid_price || 0) * 0.1)) || (auction.minimumBid || auction.starting_price || 0)
    : 0;


  const handleAnalyzeAuction = async () => {
    if (!auction || !user || !token) return;
    
    setAnalyzing(true);
    try {
      const currentPrice = auction.currentBid || auction.current_bid_price || 0;
      
      // Determine what the user's intended bid is for analysis
      const intendedBid = bidAmount 
        ? Number.parseInt(bidAmount, 10) 
        : (showProxyInput && maxProxy ? Number.parseInt(maxProxy, 10) : currentPrice);

      // Use the new pure LLM-based winning probability analysis
      const llmData = {
        auctionTitle: auction.title,
        currentBid: currentPrice,
        userBid: intendedBid,
        startingPrice: auction.minimumBid || auction.starting_price || 0,
        totalBids: auction.totalBids || auction.total_bids || 0,
        activeBidders: bids.length,
        remainingTime: new Date(auction.endTime || auction.end_time || auction.auction_end_time || "").getTime() - Date.now(),
        userCredits: user.credits || 0,
        recentBids: bids.slice(0, 5).map(b => ({ 
          amount: b.amount, 
          timestamp: b.timestamp,
          bidderName: b.bidderName
        }))
      };
      
      const llmAnalysis = await API_SERVICE.ai.getWinningProbabilityLLM(llmData, token);
      
      // Also get ML-based price prediction for comprehensive analysis
      const mlData = {
        auctionId: auction.id,
        auctionTitle: auction.title,
        currentBid: currentPrice,
        startingPrice: auction.minimumBid || auction.starting_price || 0,
        totalBids: auction.totalBids || auction.total_bids || 0,
        activeBidders: bids.length,
        remainingTime: new Date(auction.endTime || auction.end_time || auction.auction_end_time || "").getTime() - Date.now(),
        userCredits: user.credits || 0,
        userIntendedBid: intendedBid,
        recentBids: bids.slice(0, 5).map(b => ({ amount: b.amount, timestamp: b.timestamp })),
        // Enhanced data for comprehensive analysis
        auctionDetails: {
          category: auction.category,
          status: auction.status,
          image: auction.image || auction.image_url,
          description: auction.description,
          endTime: auction.endTime || auction.end_time || auction.auction_end_time,
          minimumBid: auction.minimumBid || auction.starting_price || 0,
          totalBids: auction.totalBids || auction.total_bids || 0,
          currentBidder: auction.currentBidderName || auction.current_bidder_name,
          currentBid: currentPrice
        },
        bidHistory: bids.map(b => ({
          amount: b.amount,
          timestamp: b.timestamp,
          bidderName: b.bidderName,
          isProxy: b.isProxy,
          maxProxyAmount: b.maxProxyAmount
        })),
        userContext: {
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          userCredits: user.credits || 0,
          isCurrentLeader: user.name === (auction.currentBidderName || auction.current_bidder_name)
        },
        marketContext: {
          averageBidIncrement: bids.length > 1 
            ? bids.slice(0, 5).reduce((sum, curr, i, arr) => sum + (i > 0 ? curr.amount - arr[i-1].amount : 0), 0) / Math.max(1, bids.slice(0, 5).length - 1)
            : 1,
          competitionLevel: bids.length,
          timePressure: new Date(auction.endTime || auction.end_time || auction.auction_end_time || "").getTime() - Date.now(),
          phase: 'unknown'
        }
      };
      
      const mlAnalysis = await API_SERVICE.ai.getBiddingAnalysis(mlData, token);
      
      // Combine both analyses
      const combinedAnalysis = {
        ...mlAnalysis,
        llmWinningProbability: llmAnalysis.winningProbability,
        llmExplanation: llmAnalysis.explanation,
        llmActionableTip: llmAnalysis.actionableTip,
        llmAnalysis: llmAnalysis.analysis,
        source: "Combined ML Price Prediction + LLM Winning Probability"
      };
      
      setAuctionAnalysis(combinedAnalysis);
      toast({ 
        title: "Auction Analysis Complete", 
        description: "Comprehensive bidding insights generated using ML price prediction and LLM winning probability analysis.", 
        variant: "default" 
      });
    } catch (error) {
      toast({ 
        title: "Analysis Failed", 
        description: "Could not analyze auction. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // Socket.IO event listeners
  useEffect(() => {
    if (!socket || !auction) return;

    // Join auction room
    socket.emit('join-auction', auction.id);

    // Listen for new bids
    socket.on('new-bid', (data) => {
      if (data.auctionId === auction.id) {
        // Update auction data in real-time
        setAuction(prev => prev ? {
          ...prev,
          currentBid: data.amount,
          current_bid_price: data.amount,
          currentBidderName: data.bidderName,
          current_bidder_name: data.bidderName,
          totalBids: (prev.totalBids || prev.total_bids || 0) + 1,
          total_bids: (prev.totalBids || prev.total_bids || 0) + 1,
        } : null);
        
        
        // Track if this bid is a proxy bid
        if (data.isProxy) {
          setCurrentBidProxy({
            isProxy: true,
            maxProxyAmount: data.maxProxyAmount
          });
        } else {
          setCurrentBidProxy({ isProxy: false });
        }
        
        // Add to bids list
        setBids(prev => [{
          id: Math.random(),
          auctionId: auction.id,
          bidderName: data.bidderName,
          amount: data.amount,
          timestamp: new Date().toISOString(),
          isProxy: data.isProxy,
          maxProxyAmount: data.maxProxyAmount
        }, ...prev]);
        
        toast({
          title: "New bid!",
          description: `${data.bidderName} bid ${data.amount} CR${data.isProxy ? ` (Proxy: Max ${data.maxProxyAmount} CR)` : ''}`,
        });
      }
    });

    // Listen for auction updates
    socket.on('auction-update', (data) => {
      if (data.auctionId === auction.id) {
        setAuction(prev => prev ? {
          ...prev,
          status: data.status !== undefined ? data.status : prev.status,
          endTime: data.endTime !== undefined ? data.endTime : prev.endTime,
          end_time: data.endTime !== undefined ? data.endTime : prev.end_time,
          auction_end_time: data.endTime !== undefined ? data.endTime : prev.auction_end_time,
        } : null);
      }
    });

    // Listen for bid placement confirmation
    socket.on('bid:placed', (data) => {
      if (data.auctionId === auction.id && data.bidderId === user?.id) {
        setIsBidding(false);
        setBidAmount("");
        // Refresh user credits from server
        if (refreshUser) refreshUser();
      }
    });

    // Listen for bid errors
    socket.on('bid:error', (data) => {
      setIsBidding(false);
      
      // Check if this is the "already highest bidder" error
      if (data.isCurrentLeader) {
        toast({
          title: "Already Leading",
          description: `You are already the highest bidder with ${data.currentBid} CR. You cannot place another bid on this auction.`,
          variant: "default"
        });
      } else {
        toast({
          title: "Bid Failed",
          description: data.message || "Unable to place bid. Please try again.",
          variant: "destructive"
        });
      }
    });

    // Listen for credits update
    socket.on('credits:updated', (data) => {
      if (data && user) {
        // Update user context with new credits
        // This will be picked up by AuthContext if implemented
      }
    });

    // Listen for auction time extension (anti-sniping)
    socket.on('auction:extended', (data: any) => {
      if (String(data.auctionId) === String(auction.id)) {
        setAuction(prev => prev ? {
          ...prev,
          endTime: data.newEndTime,
          end_time: data.newEndTime,
          auction_end_time: data.newEndTime,
        } : null);
        toast({
          title: "⏰ Auction Extended!",
          description: data.message || "30 seconds added due to last-second bid!",
        });
      }
    });

    // Listen for auction ended (auto-close / admin close)
    socket.on('auction:ended', (data: any) => {
      if (String(data.auctionId) === String(auction.id)) {
        setAuction(prev => prev ? { ...prev, status: 'ended' } : null);
        const winnerMsg = data.winner
          ? `Winner: ${data.winner.username} with ${data.finalPrice} CR`
          : 'No bids were placed.';
        toast({
          title: "🔨 Auction Ended!",
          description: data.message || winnerMsg,
        });
      }
    });

    const onChatNew = (msg: ChatMessage) => {
      if (!msg || String(msg.auctionId) !== String(auction.id)) return;
      setChatMessages((prev) => [msg, ...prev].slice(0, 100));
    };
    socket.on('chat:new', onChatNew);

    return () => {
      socket.off('new-bid');
      socket.off('auction-update');
      socket.off('bid:placed');
      socket.off('bid:error');
      socket.off('credits:updated');
      socket.off('auction:extended');
      socket.off('auction:ended');
      socket.off('chat:new', onChatNew);
      socket.emit('leave-auction', auction.id);
    };
  }, [socket, auction, user, toast, refreshUser]);

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p className="text-muted-foreground">Loading auction details...</p>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p className="text-muted-foreground">Auction not found</p>
      </div>
    );
  }

  const handleBid = (amount: number, isProxy: boolean = false, maxProxyAmount?: number) => {
    // Validation checks
    if (!user) {
      console.warn('No user logged in');
      navigate("/login");
      return;
    }

    // Check user role/type
    if (user.role !== "bidder") {
      console.warn(`User role is '${user.role}', but only 'bidder' can place bids`);
      toast({ 
        title: "Not Allowed", 
        description: `Your account type is '${user.role}'. Only bidders can place bids. Please log in as a bidder.`, 
        variant: "destructive" 
      });
      return;
    }

    // Check credits
    const normalizedAmount = Math.floor(Number(amount));
    const normalizedMaxProxy = maxProxyAmount !== undefined ? Math.floor(Number(maxProxyAmount)) : undefined;
    const requiredCredits = isProxy && normalizedMaxProxy ? normalizedMaxProxy : normalizedAmount;
    if (requiredCredits > user.credits) {
      console.warn(`Insufficient credits: need ${requiredCredits} CR but have ${user.credits} CR`);
      toast({ 
        title: "Insufficient Credits", 
        description: `You need ${requiredCredits} CR but only have ${user.credits} CR`, 
        variant: "destructive" 
      });
      return;
    }

    // Check socket connection
    if (!socket || !isConnected) {
      console.warn('Socket not connected or unavailable');
      toast({ 
        title: "Connection Error", 
        description: "Unable to connect to bidding server. Please refresh and try again.", 
        variant: "destructive" 
      });
      return;
    }

    // All validations passed
    console.log(`[BID ATTEMPT] User: ${user.id} (${user.name}, role: ${user.role}), Amount: ${normalizedAmount} CR, Proxy: ${isProxy}, Max: ${normalizedMaxProxy}, Auction: ${auction.id}`);
    setIsBidding(true);

    // Emit bid event using Socket.IO
    socket.emit('bid:place', {
      auctionId: auction.id,
      bidderId: user.id,
      bidAmount: normalizedAmount,
      bidderName: user.name,
      isProxy,
      maxProxyAmount: normalizedMaxProxy
    });

    // Wait for response from server (success or error)
    // Listeners will handle the response and reset isBidding state
  };

  const sendChat = () => {
    if (!socket || !isConnected || !auction) return;
    if (auction.status !== "active") return;
    const text = chatInput.trim();
    if (!text) return;
    socket.emit('chat:send', {
      auctionId: auction.id,
      messageText: text,
      senderId: user?.id ? String(user.id) : null,
      senderName: user?.name || "Bidder",
    });
    setChatInput("");
  };

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4">
        <motion.button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          whileHover={{ x: -5 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </motion.button>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Image + Details */}
          <div className="lg:col-span-3 space-y-6">
            <ImageCarousel
              images={images}
              className="h-[400px] rounded-2xl overflow-hidden relative group"
              showThumbnails={true}
              autoPlay={false}
              autoPlayInterval={4000}
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="outline" className="text-xs">{auction.category}</Badge>
                <Badge className={auction.status === "active" ? "bg-success/20 text-success border-success/30" : "bg-muted text-muted-foreground"}>{auction.status}</Badge>
              </div>
              <h1 className="text-3xl font-bold mb-3">{auction.title}</h1>
              <p className="text-muted-foreground">{auction.description}</p>
            </motion.div>

            {/* Bid History with Enhanced UI */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> 
                  Bid History
                </h3>
                <motion.span 
                  className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/20 text-primary"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {bids.length} bids
                </motion.span>
              </div>

              {bids.length > 0 ? (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {bids.slice(0, 8).map((bid, i) => (
                      <motion.div
                        key={bid.id}
                        initial={{ opacity: 0, x: -30, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 30 }}
                        transition={{ delay: i * 0.05, type: "spring", stiffness: 200 }}
                        whileHover={{ scale: 1.02, x: 8 }}
                        className={`flex items-center justify-between p-3.5 rounded-xl transition-all duration-300 group cursor-pointer ${
                          i === 0 
                            ? "bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 shadow-lg shadow-primary/10" 
                            : "bg-secondary/50 hover:bg-secondary/80 border border-border/50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <motion.div
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              i === 0 
                                ? "bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30" 
                                : "bg-muted text-muted-foreground"
                            }`}
                            animate={i === 0 ? { 
                              scale: [1, 1.15, 1],
                              boxShadow: ["0 0 0 0 rgba(229,169,25,0.4)", "0 0 0 12px rgba(229,169,25,0)", "0 0 0 0 rgba(229,169,25,0)"]
                            } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            {(bid.bidderName || "?").charAt(0).toUpperCase()}
                          </motion.div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{bid.bidderName || "Unknown Bidder"}</p>
                            <p className="text-xs text-muted-foreground">{bid.timestamp ? new Date(bid.timestamp).toLocaleTimeString() : "N/A"}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <motion.p
                            className="font-mono font-bold text-lg text-primary"
                            animate={i === 0 ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ duration: 0.5 }}
                          >
                            {bid.amount} CR
                          </motion.p>
                          <div className="flex flex-col items-end gap-1 mt-1">
                            {i === 0 && (
                              <motion.span
                                className="text-xs font-bold text-success flex items-center gap-1"
                                animate={{ opacity: [1, 0.6, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                Leading
                              </motion.span>
                            )}
                            {bid.isProxy && (
                              <motion.span 
                                className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold flex items-center gap-1"
                                whileHover={{ scale: 1.05 }}
                              >
                                <Zap className="w-3 h-3" /> Auto (Max: {bid.maxProxyAmount})
                              </motion.span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {bids.length > 8 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center pt-2"
                    >
                      <p className="text-xs text-muted-foreground">+{bids.length - 8} more bids</p>
                    </motion.div>
                  )}
                </div>
              ) : (
                <motion.div
                  className="text-center py-8"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Gavel className="w-6 h-6 text-primary/50" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">No bids yet</p>
                  <p className="text-xs text-muted-foreground">Be the first to bid!</p>
                </motion.div>
              )}
            </motion.div>

          </div>

        {/* Bid Panel - hidden for admins (view-only) */}
        {user?.role !== "admin" && (
          <div className="lg:col-span-2">
            <div className="glass-card p-6 sticky top-24 space-y-6">
              {/* Live Chat (active auctions only) */}
              {isLiveAuction && (
                <div className="rounded-2xl border border-border bg-secondary/20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-secondary/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-semibold leading-tight">Live chat</p>
                        <p className="text-[11px] text-muted-foreground leading-tight">Chat is available only while this auction is live</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setChatOpen(v => !v)}
                      className="text-xs"
                    >
                      {chatOpen ? "Hide" : "Open"}
                    </Button>
                  </div>

                  {chatOpen && (
                    <div className="flex flex-col h-[320px]">
                      {/* Messages */}
                      <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
                        {chatMessages.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No messages yet. Say hi.</p>
                        ) : (
                          chatMessages
                            .slice()
                            .reverse()
                            .map((m, idx) => {
                              const isMine = user?.name && m.senderName === user.name;
                              return (
                                <div key={`${m.timestamp}-${idx}`} className={`flex gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
                                  {!isMine && (
                                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold shrink-0">
                                      {(m.senderName || "?").charAt(0)}
                                    </div>
                                  )}
                                  <div className={`max-w-[80%] ${isMine ? "text-right" : "text-left"}`}>
                                    {!isMine && (
                                      <div className="text-[11px] text-muted-foreground">
                                        <span className="font-semibold text-foreground/80">{m.senderName}</span>
                                        <span> · {new Date(m.timestamp).toLocaleTimeString()}</span>
                                      </div>
                                    )}
                                    <div className={`mt-1 inline-block rounded-2xl px-3 py-2 text-xs leading-relaxed break-words ${
                                      isMine
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-background/70 border border-border"
                                    }`}>
                                      {m.messageText}
                                    </div>
                                    {isMine && (
                                      <div className="text-[11px] text-muted-foreground mt-1">
                                        {new Date(m.timestamp).toLocaleTimeString()}
                                      </div>
                                    )}
                                  </div>
                                  {isMine && (
                                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-bold shrink-0">
                                      {(user?.name || "Y").charAt(0)}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                        )}
                      </div>

                      {/* Composer */}
                      <div className="p-3 border-t border-border bg-secondary/30">
                        <div className="flex gap-2">
                          <Input
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Chat..."
                            disabled={!isConnected || !isLiveAuction}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") sendChat();
                            }}
                            className="bg-background"
                          />
                          <Button onClick={sendChat} disabled={!chatInput.trim() || !isConnected || !isLiveAuction}>
                            Send
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground">Current Bid</p>
                <p className="text-4xl font-bold gradient-gold-text font-mono">
                  {currentDisplayBid} CR
                </p>
                {(auction.currentBidderName || auction.current_bidder_name) && (
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3" /> {auction.currentBidderName || auction.current_bidder_name}
                    </p>
                    {currentBidProxy?.isProxy && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Auto-Bid
                      </span>
                    )}
                  </div>
                )}
              </div>

              {auction.status === "active" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Time Remaining</p>
                  <CountdownTimer endTime={new Date(auction.endTime || auction.end_time || auction.auction_end_time || "")} />
                </div>
              )}

              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground mb-2">Min bid: {auction.minimumBid || auction.starting_price || 0} CR · Total bids: {auction.totalBids || auction.total_bids || 0}</p>
              </div>

              {auction.status === "active" && (
                <>
                  {/* IPL Bidding Info - REMOVED */}

                  {/* Manual bid input */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Place Your Bid</p>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder={`Min bid: ${effectiveNextMinBid} CR`}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(sanitizeIntegerInput(e.target.value))}
                        disabled={isBidding}
                        className="font-mono"
                      />
                      <Button
                        onClick={() => {
                          const amount = Number.parseInt(bidAmount || "0", 10);
                          if (amount > 0) {
                            handleBid(amount);
                          }
                        }}
                        disabled={isBidding || !bidAmount}
                        className="gradient-gold-bg text-primary-foreground"
                      >
                        <Gavel className="w-4 h-4 mr-2" />
                        Place Bid
                      </Button>
                    </div>
                  </div>

                  {/* Analyze Auction Button */}
                  {user?.role === "bidder" && (
                    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4 mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-blue-500" />
                          Auction Analysis
                        </h4>
                        <span className="text-xs text-muted-foreground">Get bidding insights</span>
                      </div>
                      <div className="space-y-3">
                        <Button 
                          onClick={handleAnalyzeAuction}
                          disabled={analyzing}
                          className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          {analyzing ? (
                            <>
                              <span className="animate-spin mr-2">⏳</span> Analyzing...
                            </>
                          ) : (
                            <>
                              <BarChart3 className="w-4 h-4 mr-2" /> Analyze Auction
                            </>
                          )}
                        </Button>
                        
                        {auctionAnalysis && (
                          <div className="space-y-4">
                            {/* ML Price Prediction */}
                            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-lg p-4 space-y-4">
                              <h4 className="text-sm font-bold text-foreground">ML Price Prediction</h4>
                              
                              {/* Note about fresh data */}
                              <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2">
                                <p className="text-xs text-muted-foreground">
                                  📊 ML model predicts final price based on current auction dynamics.
                                </p>
                              </div>
                              
                              {/* Predicted Final Price Range */}
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground font-semibold">Based on current bidding activity, this item will likely sell for:</p>
                                <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-lg p-3">
                                  {(() => {
                                    const predictedPrice = auctionAnalysis.mlPredictedPrice;
                                    const lowerBound = Math.max(0.75 * predictedPrice, currentDisplayBid);
                                    const upperBound = 1.25 * predictedPrice;
                                    return (
                                      <>
                                        <p className="text-2xl font-bold text-foreground">
                                          {Math.round(lowerBound)} - {Math.round(upperBound)} CR
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-3">
                                          {predictedPrice > currentDisplayBid 
                                            ? `You need ${Math.ceil(predictedPrice - currentDisplayBid)} CR more to reach the predicted price`
                                            : `Already at/above the predicted price`}
                                        </p>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>

                            {/* LLM Winning Probability Analysis */}
                            {auctionAnalysis.llmWinningProbability && (
                              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 rounded-lg p-4 space-y-4">
                                <h4 className="text-sm font-bold text-foreground">LLM Winning Probability Analysis</h4>
                                
                                <div className="bg-purple-500/10 border border-purple-500/20 rounded p-2">
                                  <p className="text-xs text-muted-foreground">
                                    🤖 Pure LLM analysis using auction theory - no ML model dependency.
                                  </p>
                                </div>
                                
                                {/* Winning Probability */}
                                <div className="space-y-2">
                                  <p className="text-xs text-muted-foreground font-semibold">Your calculated winning probability:</p>
                                  <div className={`rounded-lg p-3 border ${
                                    auctionAnalysis.llmWinningProbability >= 70 
                                      ? 'bg-green-500/10 border-green-500/30' 
                                      : auctionAnalysis.llmWinningProbability >= 40 
                                      ? 'bg-yellow-500/10 border-yellow-500/30' 
                                      : 'bg-red-500/10 border-red-500/30'
                                  }`}>
                                    <div className="flex items-end gap-2">
                                      <p className={`text-3xl font-bold ${
                                        auctionAnalysis.llmWinningProbability >= 70 
                                          ? 'text-green-500' 
                                          : auctionAnalysis.llmWinningProbability >= 40 
                                          ? 'text-yellow-600' 
                                          : 'text-red-500'
                                      }`}>{auctionAnalysis.llmWinningProbability}%</p>
                                      <p className="text-xs text-muted-foreground mb-1">
                                        {auctionAnalysis.llmWinningProbability >= 70 
                                          ? '✓ High chance' 
                                          : auctionAnalysis.llmWinningProbability >= 40 
                                          ? '⚠ Moderate chance' 
                                          : '✗ Low chance'}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* LLM Explanation */}
                                {auctionAnalysis.llmExplanation && (
                                  <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground font-semibold">Analysis:</p>
                                    <div className="bg-background/70 border border-border rounded-lg p-3">
                                      <p className="text-sm text-foreground">{auctionAnalysis.llmExplanation}</p>
                                    </div>
                                  </div>
                                )}

                                {/* LLM Actionable Tip */}
                                {auctionAnalysis.llmActionableTip && (
                                  <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground font-semibold">Recommendation:</p>
                                    <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-3">
                                      <p className="text-sm text-green-600 font-medium">{auctionAnalysis.llmActionableTip}</p>
                                    </div>
                                  </div>
                                )}

                                {/* LLM Analysis Details */}
                                {auctionAnalysis.llmAnalysis && (
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="bg-background/50 border border-border rounded p-2">
                                      <p className="text-muted-foreground">Bid Strength</p>
                                      <p className="font-semibold">{auctionAnalysis.llmAnalysis.bidStrength}</p>
                                    </div>
                                    <div className="bg-background/50 border border-border rounded p-2">
                                      <p className="text-muted-foreground">Competition</p>
                                      <p className="font-semibold">{auctionAnalysis.llmAnalysis.competitionLevel}</p>
                                    </div>
                                    <div className="bg-background/50 border border-border rounded p-2">
                                      <p className="text-muted-foreground">Time Factor</p>
                                      <p className="font-semibold">{auctionAnalysis.llmAnalysis.timeFactor}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Combined Analysis Summary */}
                            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-lg p-3">
                              <p className="text-xs text-muted-foreground">
                                📈 Source: {auctionAnalysis.source || "Combined ML + LLM Analysis"}
                              </p>
                            </div>

                            {/* Action Button */}
                            <Button
                              onClick={() => handleBid(auctionAnalysis.suggestedBid)}
                              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-semibold"
                            >
                              Place Bid: {auctionAnalysis.suggestedBid} CR
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Auto-increment / Proxy Bidding — only if > 10 min left */}
                  <div className="space-y-3 pt-2">
                    {proxyAllowed ? (
                      <Button 
                        variant="outline" 
                        className="w-full flex justify-between items-center" 
                        onClick={() => setShowProxyInput(!showProxyInput)}
                      >
                        <span className="flex items-center"><Zap className="w-4 h-4 mr-2 text-primary" /> Setup Proxy Bidding</span>
                        <span className="text-xs text-muted-foreground">{showProxyInput ? "Cancel" : "Enable"}</span>
                      </Button>
                    ) : (
                      <div className="w-full text-center py-3 px-4 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-xs text-destructive font-medium flex items-center justify-center gap-2">
                          <Zap className="w-3 h-3" /> Proxy bidding is disabled in the last 10 minutes
                        </p>
                      </div>
                    )}
                    
                    {showProxyInput && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-secondary/50 rounded-lg p-4 space-y-3 border border-border">
                        <p className="text-xs text-muted-foreground">
                          Set your maximum bid. We'll automatically bid for you up to this limit. Your bid must be a whole number.
                        </p>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Enter your max bid (integer)"
                            value={maxProxy}
                            step={1}
                            inputMode="numeric"
                            onChange={(e) => setMaxProxy(sanitizeIntegerInput(e.target.value))}
                            disabled={isBidding}
                            className="bg-background border-border font-mono"
                          />
                          <Button
                            onClick={() => {
                              const maxAmount = Number.parseInt(maxProxy || "0", 10);
                              if (isNaN(maxAmount) || maxAmount <= 0) {
                                toast({ title: "Invalid Amount", description: "Your maximum bid must be a positive number.", variant: "destructive" });
                                return;
                              }
                              if (maxAmount <= currentDisplayBid) {
                                toast({ title: "Invalid Limit", description: `Proxy limit must be higher than the current bid (${currentDisplayBid} CR).`, variant: "destructive" });
                                return;
                              }
                              
                              // Calculate the next valid bid amount
                              // If there's a current bid, we need to bid at least 1 more than current
                              // If no current bid, start from minimum bid
                              const nextBidAmount = currentDisplayBid > 0 ? currentDisplayBid + 1 : (auction.minimumBid || auction.starting_price || 0);
                              
                              // Ensure the next bid amount is at least the minimum required
                              const finalBidAmount = Math.max(nextBidAmount, auction.minimumBid || auction.starting_price || 0);
                              
                              // Directly handle the proxy bid placement
                              handleBid(finalBidAmount, true, maxAmount);
                              setShowProxyInput(false);
                            }}
                            disabled={!maxProxy || isBidding}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                          >
                            Set Auto-Bid
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </>
              )}

              {auction.status === "ended" && (
                <div className={`border rounded-xl p-6 text-center shadow-lg ${
                  user?.name === (auction.currentBidderName || auction.current_bidder_name) 
                  ? "bg-success/10 border-success/30" 
                  : "bg-primary/5 border-primary/20"
                }`}>
                  {user?.name === (auction.currentBidderName || auction.current_bidder_name) ? (
                    <div className="space-y-2">
                       <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }} 
                        animate={{ scale: 1, opacity: 1 }}
                        className="mx-auto bg-success/20 w-12 h-12 rounded-full flex items-center justify-center mb-2"
                      >
                        <Trophy className="w-6 h-6 text-success" />
                      </motion.div>
                      <h3 className="text-xl font-bold text-success">Congratulations!</h3>
                      <p className="text-sm text-muted-foreground">You won this auction</p>
                      <p className="font-mono text-xl font-bold mt-2">{auction.currentBid || auction.current_bid_price} CR</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Auction Winner</p>
                      <p className="text-xl font-bold">{(auction.currentBidderName || auction.current_bidder_name) || "No Bids"}</p>
                      <p className="font-mono text-muted-foreground">{auction.currentBid || auction.current_bid_price} CR</p>
                    </div>
                  )}
                </div>
              )}

              {auction.status === "upcoming" && (
                <div className="bg-info/10 border border-info/20 rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground">Starts soon</p>
                  {auction.endTime || auction.end_time || auction.auction_end_time ? (
                    <CountdownTimer endTime={new Date(auction.endTime || auction.end_time || auction.auction_end_time || "")} />
                  ) : (
                    <p className="text-muted-foreground">Time TBA</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}