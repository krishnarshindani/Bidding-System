// src/hooks/useAuctions.ts
import { useState, useEffect } from 'react';
import { useSocket } from '@/contexts/SocketContext';

interface Auction {
  id: number;
  title: string;
  description: string;
  starting_price: number;
  current_bid_price: number | null;
  image_url: string;
  seller_name: string;
  category_name: string;
  total_bids: number;
  auction_end_time: string;
}

export const useAuctions = () => {
  const { on, off, emit } = useSocket();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch active auctions
    emit('auctions:getActive', { limit: 20, offset: 0 });

    // Listen for auction data
    const handleAuctionsData = (data: Auction[]) => {
      setAuctions(data);
      setLoading(false);
    };

    const handleError = (errorData: any) => {
      setError(errorData.message || 'Failed to fetch auctions');
      setLoading(false);
    };

    on('auctions:active', handleAuctionsData);
    on('error', handleError);

    return () => {
      off('auctions:active', handleAuctionsData);
      off('error', handleError);
    };
  }, [emit, on, off]);

  return { auctions, loading, error };
};
