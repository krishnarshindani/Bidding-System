import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_SERVICE } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function LostAuctionsPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [lostAuctions, setLostAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchLostAuctions();
  }, []);

  const fetchLostAuctions = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await API_SERVICE.users.getLostAuctions(token);
      setLostAuctions(data?.auctions || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch lost auctions',
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
          <h1 className="text-3xl font-bold"><span className="gradient-gold-text">Lost Auctions</span></h1>
          <p className="text-muted-foreground">You bid on {lostAuctions.length} auction{lostAuctions.length !== 1 ? 's' : ''} but didn't win</p>
        </motion.div>

        {lostAuctions.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">
            <p>You haven't lost any auctions. Great bidding!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lostAuctions.map((auction: any, i: number) => (
              <motion.div
                key={auction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                onClick={() => navigate(`/auction/${auction.id}`)}
                className="glass-card overflow-hidden cursor-pointer hover:border-destructive/30 transition-all"
              >
                {auction.image_url && (
                  <img src={auction.image_url} alt={auction.title} className="w-full h-40 object-cover" />
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold flex-1">{auction.title}</h3>
                    <Badge variant="destructive" className="bg-destructive/20 text-destructive">LOST</Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">{auction.category_name}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Highest Bid:</span>
                      <span className="text-warning font-semibold font-mono">{auction.highest_bid || 0} CR</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Won by:</span>
                      <span>{auction.winner_name || "Unknown"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Seller:</span>
                      <span>{auction.seller_name}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
