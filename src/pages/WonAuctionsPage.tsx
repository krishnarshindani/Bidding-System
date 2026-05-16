import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_SERVICE } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Trophy, ArrowLeft } from 'lucide-react';

export default function WonAuctionsPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [wonAuctions, setWonAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchWonAuctions();
  }, []);

  const fetchWonAuctions = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await API_SERVICE.users.getWonAuctions(token);
      setWonAuctions(data?.auctions || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch won auctions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen pt-20 flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4">
        <motion.button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          whileHover={{ x: -5 }}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </motion.button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold">🎉 <span className="gradient-gold-text">Won Auctions</span></h1>
          <p className="text-muted-foreground">You have won {wonAuctions.length} auction{wonAuctions.length !== 1 ? 's' : ''}</p>
        </motion.div>

        {wonAuctions.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>You haven't won any auctions yet. Keep bidding!</p>
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-success/30 bg-success/10 p-5 mb-6"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                    className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center"
                  >
                    <Trophy className="w-6 h-6 text-success" />
                  </motion.div>
                  <div>
                    <p className="font-semibold">Winner’s circle unlocked</p>
                    <p className="text-xs text-muted-foreground">These are the auctions you won — enjoy the victory.</p>
                  </div>
                </div>
                <Badge className="bg-success/20 text-success border-success/30">
                  {wonAuctions.length} WON
                </Badge>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wonAuctions.map((auction: any, i: number) => (
              <motion.div
                key={auction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                onClick={() => navigate(`/auction/${auction.id}`)}
                className="glass-card overflow-hidden cursor-pointer hover:border-success/30 transition-all"
              >
                {auction.image_url && (
                  <img src={auction.image_url} alt={auction.title} className="w-full h-40 object-cover" />
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold flex-1">{auction.title}</h3>
                    <Badge className="bg-success/20 text-success border-success/30">WON</Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">{auction.category_name}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Winning Bid:</span>
                      <span className="text-success font-semibold font-mono">{auction.winning_bid_amount || auction.current_bid_price || 0} CR</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Seller:</span>
                      <span>{auction.seller_name}</span>
                    </div>
                    {auction.bid_time && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Won on:</span>
                        <span>{new Date(auction.bid_time).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
