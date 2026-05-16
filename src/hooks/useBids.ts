// src/hooks/useBids.ts
import { useState, useCallback } from 'react';
import { useSocket } from '@/contexts/SocketContext';

interface Bid {
  id: number;
  auction_id: number;
  bidder_id: number;
  bid_amount: number;
  bidder_name: string;
  created_at: string;
}

export const useBids = (auctionId: number) => {
  const { on, off, emit } = useSocket();
  const [bids, setBids] = useState<Bid[]>([]);
  const [highestBid, setHighestBid] = useState<Bid | null>(null);

  const placeBid = useCallback((bidderId: number, bidAmount: number) => {
    emit('bid:place', {
      auctionId,
      bidderId,
      bidAmount,
    });
  }, [auctionId, emit]);

  const handleBidPlaced = useCallback((data: any) => {
    if (data.auctionId === auctionId) {
      setHighestBid(data);
    }
  }, [auctionId]);

  const handleBidError = useCallback((error: any) => {
    console.error('Bid error:', error.message);
  }, []);

  const listenToBids = useCallback(() => {
    on('bid:placed', handleBidPlaced);
    on('bid:error', handleBidError);

    return () => {
      off('bid:placed', handleBidPlaced);
      off('bid:error', handleBidError);
    };
  }, [on, off, handleBidPlaced, handleBidError]);

  return { bids, highestBid, placeBid, listenToBids };
};
