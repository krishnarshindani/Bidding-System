// src/utils/auctionHelpers.ts

export const formatAuctionPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
};

export const formatTimeRemaining = (endTime: string): string => {
  const now = new Date();
  const end = new Date(endTime);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return 'Ended';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const calculateAuctionStatus = (
  endTime: string,
  status: string
): 'active' | 'ending_soon' | 'ended' => {
  if (status === 'ended' || status === 'cancelled') return 'ended';

  const now = new Date();
  const end = new Date(endTime);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return 'ended';
  if (diff <= 1000 * 60 * 60) return 'ending_soon'; // Less than 1 hour
  return 'active';
};

export const getBidIncrement = (currentBid: number): number => {
  if (currentBid < 1) return 0.25;
  if (currentBid < 5) return 0.5;
  if (currentBid < 25) return 1;
  if (currentBid < 100) return 5;
  if (currentBid < 250) return 10;
  if (currentBid < 500) return 25;
  if (currentBid < 1000) return 50;
  if (currentBid < 2500) return 100;
  if (currentBid < 5000) return 250;
  return 500;
};

export const getSuggestedBidAmount = (currentBid: number): number => {
  return currentBid + getBidIncrement(currentBid);
};
