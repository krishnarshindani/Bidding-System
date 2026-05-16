import React, { useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../hooks/use-toast';

interface CloseAuctionModalProps {
  auctionId: number;
  auctionTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CloseAuctionModal({
  auctionId,
  auctionTitle,
  onClose,
  onSuccess
}: CloseAuctionModalProps) {
  const [loading, setLoading] = useState(false);
  const [winner, setWinner] = useState(null);
  const { toast } = useToast();

  const handleCloseAuction = async () => {
    try {
      setLoading(true);
      const response = await api.post(`/auctions/${auctionId}/close`);

      setWinner(response.data.winner);

      toast({
        title: 'Success',
        description: response.data.message,
        variant: 'default'
      });

      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-700 border border-slate-600 rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800 border-b border-slate-600 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Close Auction</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {winner ? (
            // Winner Display
            <div className="space-y-4">
              <div className="text-center py-6">
                <p className="text-4xl mb-2">🎉</p>
                <p className="text-gray-400 mb-4">Auction Closed Successfully</p>
              </div>

              <div className="bg-slate-800 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-gray-400 text-sm">Auction</p>
                  <p className="text-white font-medium">{auctionTitle}</p>
                </div>

                <div>
                  <p className="text-gray-400 text-sm">Winner</p>
                  <p className="text-white font-medium">{winner.username}</p>
                </div>

                <div>
                  <p className="text-gray-400 text-sm">Winning Bid</p>
                  <p className="text-green-400 font-bold text-lg">{winner.winningBid} CR</p>
                </div>

                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white text-sm">{winner.email}</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            // Confirmation
            <>
              <p className="text-gray-300 mb-6">
                Are you sure you want to close this auction? This action cannot be undone.
              </p>

              <div className="bg-slate-800 rounded-lg p-4 mb-6">
                <p className="text-gray-400 text-sm mb-1">Auction</p>
                <p className="text-white font-medium">{auctionTitle}</p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 bg-slate-600 hover:bg-slate-500 disabled:bg-gray-600 text-white py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCloseAuction}
                  disabled={loading}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  {loading ? 'Closing...' : 'Close Auction'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
