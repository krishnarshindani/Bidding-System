import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../hooks/use-toast';

export default function BiddingHistoryPage() {
  const [bidHistory, setBidHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 20;
  const { toast } = useToast();

  useEffect(() => {
    fetchBiddingHistory();
  }, [page]);

  const fetchBiddingHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/auctions/user/bidding-history?limit=${limit}&offset=${page * limit}`);
      setBidHistory(response.data.bidHistory || []);
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

  const getStatusBadge = (status) => {
    const styles = {
      'Won': 'bg-green-500/20 text-green-400',
      'Outbid': 'bg-red-500/20 text-red-400',
      'Active': 'bg-blue-500/20 text-blue-400'
    };
    return styles[status] || 'bg-gray-500/20 text-gray-400';
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Bidding History</h1>
          <p className="text-gray-400">All your bids across auctions</p>
        </div>

        {bidHistory.length === 0 ? (
          <div className="bg-slate-700 border border-slate-600 rounded-lg p-8 text-center">
            <p className="text-gray-300">No bidding history yet</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="bg-slate-700 border border-slate-600 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-800 border-b border-slate-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Auction</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Bid Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {bidHistory.map((bid, idx) => (
                    <tr key={idx} className="border-b border-slate-600 hover:bg-slate-600/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white font-medium">{bid.auction_title}</p>
                          <p className="text-gray-400 text-sm">by {bid.auction_seller}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-blue-400 font-semibold">{bid.bid_amount} CR</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(bid.status_display)}`}>
                          {bid.status_display}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {new Date(bid.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-4 mt-8">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-white">Page {page + 1}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={bidHistory.length < limit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
