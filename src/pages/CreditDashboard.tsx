import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_SERVICE } from '../services/api';
import { useToast } from '../hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { DollarSign, Coins, Lock, History } from 'lucide-react';

export default function CreditDashboard() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [creditSummary, setCreditSummary] = useState(null);
  const [creditHistory, setCreditHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignAmount, setAssignAmount] = useState('');
  const [assignReason, setAssignReason] = useState('');
  const [deductAmount, setDeductAmount] = useState('');
  const [deductReason, setDeductReason] = useState('');

  useEffect(() => {
    if (user && token) {
      fetchCreditData();
    }
  }, [user, token]);

  const fetchCreditData = async () => {
    try {
      setLoading(true);
      const [summaryRes, historyRes] = await Promise.all([
        API_SERVICE.users.getCreditSummary(token),
        API_SERVICE.users.getNotifications(user.id, token)
      ]);

      setCreditSummary(summaryRes);
      setCreditHistory(historyRes || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch credit data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getTransactionColor = (type) => {
    const colors = {
      'bid_placement': 'text-red-400',
      'bid_return': 'text-green-400',
      'auction_win': 'text-yellow-400',
      'admin_adjustment': 'text-blue-400'
    };
    return colors[type] || 'text-gray-400';
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">💳 Credit Dashboard</h1>
          <p className="text-gray-400">Track your credits and bidding expenses</p>
        </div>

        {creditSummary && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-700 border border-slate-600 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-2">Current Balance</p>
                <p className="text-3xl font-bold text-blue-400">{creditSummary.currentBalance} CR</p>
              </div>

              <div className="bg-slate-700 border border-slate-600 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-2">Bids Placed</p>
                <p className="text-3xl font-bold text-purple-400">{creditSummary.totalBidsPlaced}</p>
              </div>

              <div className="bg-slate-700 border border-slate-600 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-2">Auctions Won</p>
                <p className="text-3xl font-bold text-green-400">{creditSummary.auctionsWon}</p>
              </div>

              <div className="bg-slate-700 border border-slate-600 rounded-lg p-6">
                <p className="text-gray-400 text-sm mb-2">Total Spent</p>
                <p className="text-3xl font-bold text-orange-400">{creditSummary.totalSpent || 0} CR</p>
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-slate-700 border border-slate-600 rounded-lg overflow-hidden">
              <div className="px-6 py-4 bg-slate-800 border-b border-slate-600">
                <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
              </div>

              {creditHistory.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  No transactions yet
                </div>
              ) : (
                <div className="divide-y divide-slate-600">
                  {creditHistory.map((transaction, idx) => (
                    <div key={idx} className="px-6 py-4 hover:bg-slate-600/50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-white font-medium">{transaction.description}</p>
                          <p className="text-gray-400 text-sm">{transaction.auction_title}</p>
                          <p className="text-gray-500 text-xs mt-1">
                            {new Date(transaction.created_at).toLocaleString()}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className={`font-semibold ${getTransactionColor(transaction.transaction_type)}`}>
                            {transaction.transaction_type === 'bid_placement' ? '-' : '+'}
                            {transaction.amount} CR
                          </p>
                          <p className="text-gray-400 text-sm">
                            Balance: {transaction.balance_after} CR
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
