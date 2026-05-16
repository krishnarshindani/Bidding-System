import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../hooks/use-toast';

interface AuctionWinnerDisplayProps {
  auctionId: number;
}

export default function AuctionWinnerDisplay({ auctionId }: AuctionWinnerDisplayProps) {
  const [winner, setWinner] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchWinner();
  }, [auctionId]);

  const fetchWinner = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/auctions/${auctionId}/winner`);
      setWinner(response.data.winner);
    } catch (error) {
      console.error('Error fetching winner:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center text-gray-400">Loading...</div>;
  }

  if (!winner) {
    return (
      <div className="bg-slate-700 border border-slate-600 rounded-lg p-6 text-center">
        <p className="text-gray-400">No winner yet - auction still active</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-green-900 to-slate-800 border border-green-600 rounded-lg p-6">
      <div className="text-center">
        <p className="text-4xl mb-4">🏆</p>
        <h3 className="text-xl font-bold text-white mb-4">Auction Winner</h3>

        <div className="bg-slate-800 rounded-lg p-4 space-y-3 text-left">
          <div>
            <p className="text-gray-400 text-sm">Winner Name</p>
            <p className="text-white font-bold">{winner.name}</p>
          </div>

          <div>
            <p className="text-gray-400 text-sm">Email</p>
            <p className="text-blue-400 text-sm">{winner.email}</p>
          </div>

          <div>
            <p className="text-gray-400 text-sm">Winning Bid</p>
            <p className="text-green-400 text-2xl font-bold">{winner.bidAmount} CR</p>
          </div>
        </div>
      </div>
    </div>
  );
}
