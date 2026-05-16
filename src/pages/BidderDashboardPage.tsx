import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_SERVICE } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import AuctionWinnerDisplay from '@/components/AuctionWinnerDisplay';
import WinnerNotificationBadge from '@/components/WinnerNotificationBadge';
import { BidHistoryChart } from '@/components/BidHistoryChart';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Gavel, Coins, ArrowRight, Activity } from 'lucide-react';

export default function BidderDashboardPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [creditSummary, setCreditSummary] = useState<any>(null);
  const [recentBids, setRecentBids] = useState<any[]>([]);
  const [wonCount, setWonCount] = useState(0);
  const [lostCount, setLostCount] = useState(0);
  const [userBidHistory, setUserBidHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    if (!token || !user) return;
    try {
      setLoading(true);
      const [summaryData, wonData, lostData, historyData] = await Promise.all([
        API_SERVICE.users.getCreditSummary(token),
        API_SERVICE.users.getWonAuctions(token),
        API_SERVICE.users.getLostAuctions(token),
        API_SERVICE.users.getBidHistory(user.id, token),
      ]);

      if (summaryData) {
        setCreditSummary({
          currentBalance: summaryData.totalCredits || 0,
          availableCredits: summaryData.availableCredits || 0,
          creditsTiedUp: summaryData.creditsTiedUp || 0,
          totalBidsPlaced: summaryData.activeBids || 0,
          totalSpent: 0,
          totalReturned: 0,
        });
      }
      setWonCount(wonData?.count || 0);
      setLostCount(lostData?.count || 0);
      setRecentBids(Array.isArray(historyData) ? historyData.slice(0, 5) : []);
      setUserBidHistory(Array.isArray(historyData) ? historyData : []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen pt-20 flex items-center justify-center"><p className="text-muted-foreground">Loading dashboard...</p></div>;
  }

  return (
    <div className="min-h-screen pt-20 pb-12">
      <WinnerNotificationBadge />

      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold">📊 <span className="gradient-gold-text">Bidder Dashboard</span></h1>
          <p className="text-muted-foreground">Track your auctions, bids, and credits</p>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            whileHover={{ y: -6 }}
            onClick={() => navigate('/won-auctions')}
            className="glass-card p-6 cursor-pointer group hover:border-success/50 transition-all relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-muted-foreground text-sm font-medium">Auctions Won</p>
                <Trophy className="w-4 h-4 text-success opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-4xl font-bold text-success mb-2">{wonCount}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-success transition-colors">
                <ArrowRight className="w-3 h-3" />
                <span>View details</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            whileHover={{ y: -6 }}
            onClick={() => navigate('/lost-auctions')}
            className="glass-card p-6 cursor-pointer group hover:border-destructive/50 transition-all relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-muted-foreground text-sm font-medium">Auctions Lost</p>
                <TrendingUp className="w-4 h-4 text-destructive opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-4xl font-bold text-destructive mb-2">{lostCount}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-destructive transition-colors">
                <ArrowRight className="w-3 h-3" />
                <span>View details</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            whileHover={{ y: -6 }}
            onClick={() => navigate('/bidding-history')}
            className="glass-card p-6 cursor-pointer group hover:border-primary/50 transition-all relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-muted-foreground text-sm font-medium">Total Bids</p>
                <Gavel className="w-4 h-4 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-4xl font-bold text-primary mb-2">{creditSummary?.totalBidsPlaced || 0}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                <ArrowRight className="w-3 h-3" />
                <span>View details</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            whileHover={{ y: -6 }}
            onClick={() => navigate('/credit-dashboard')}
            className="glass-card p-6 cursor-pointer group hover:border-primary/50 transition-all relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <p className="text-muted-foreground text-sm font-medium">Credit Balance</p>
                <Coins className="w-4 h-4 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-3xl font-bold gradient-gold-text mb-2">{creditSummary?.currentBalance || 0} CR</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                <ArrowRight className="w-3 h-3" />
                <span>View details</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bid History Chart */}
          <div className="lg:col-span-2">
            <BidHistoryChart 
              height={350}
              autoRefresh={false}
              className="h-[400px]"
              auctionId={userBidHistory.length > 0 ? userBidHistory[0].auction_id : undefined}
            />
          </div>

          {/* Recent Bids */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h2 className="font-semibold">Recent Bids</h2>
              <button onClick={() => navigate('/bidding-history')} className="text-primary hover:underline text-sm">
                View All →
              </button>
            </div>

            {recentBids.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No bidding history yet. Start bidding on auctions!
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentBids.map((bid, idx) => (
                  <div key={idx} className="p-4 hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => navigate(`/auction/${bid.auction_id}`)}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{bid.auction_title}</p>
                        <p className="text-xs text-muted-foreground">{bid.category_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-primary text-sm">{bid.bid_amount} CR</p>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium mt-1 ${
                          bid.bid_status === 'won' ? 'bg-success/20 text-success' :
                          bid.bid_status === 'outbid' ? 'bg-destructive/20 text-destructive' :
                          'bg-primary/20 text-primary'
                        }`}>
                          {bid.bid_status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Credit Summary */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card p-6 border-primary/20">
              <p className="text-muted-foreground text-sm mb-2">Available Balance</p>
              <p className="text-4xl font-bold gradient-gold-text mb-1">{creditSummary?.currentBalance || 0}</p>
              <p className="text-xs text-muted-foreground">CR (Bidding Credits)</p>
              <button
                onClick={() => navigate('/credit-dashboard')}
                className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-lg transition-colors text-sm"
              >
                View Transactions
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 pt-8 border-t border-border flex gap-4">
          <button
            onClick={() => navigate('/auctions')}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-lg transition-colors font-medium"
          >
            Browse Auctions
          </button>
          <button
            onClick={() => navigate('/credit-dashboard')}
            className="flex-1 bg-secondary hover:bg-secondary/80 py-3 rounded-lg transition-colors font-medium"
          >
            Manage Credits
          </button>
        </div>
      </div>
    </div>
  );
}
