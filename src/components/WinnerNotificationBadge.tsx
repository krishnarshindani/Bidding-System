import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../hooks/use-toast';

export default function WinnerNotificationBadge() {
  const [wonCount, setWonCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    checkWonAuctions();
    // Poll every minute for new wins
    const interval = setInterval(checkWonAuctions, 60000);
    return () => clearInterval(interval);
  }, []);

  const checkWonAuctions = async () => {
    try {
      const response = await api.get('/auctions/user/won');
      const newCount = response.data.count || 0;

      if (newCount > wonCount) {
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);
      }

      setWonCount(newCount);
    } catch (error) {
      console.error('Error checking won auctions:', error);
    }
  };

  if (wonCount === 0) return null;

  return (
    <>
      {/* Notification Badge - floating in top right */}
      <div className={`fixed top-4 right-4 bg-green-600 border border-green-500 rounded-lg px-4 py-3 flex items-center gap-3 z-40 transition-opacity ${showNotification ? 'opacity-100' : 'opacity-50'}`}>
        <span className="text-2xl">🎉</span>
        <div className="text-white">
          <p className="font-bold">Auction Won!</p>
          <p className="text-sm text-green-100">You won {wonCount} auction{wonCount !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Counter Badge - can be used in navbar */}
      <a href="/won-auctions" className="relative inline-block">
        <div className="text-white">Won Auctions</div>
        {wonCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">
            {wonCount}
          </span>
        )}
      </a>
    </>
  );
}
