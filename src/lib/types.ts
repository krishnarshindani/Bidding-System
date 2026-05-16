export type UserRole = "admin" | "bidder";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  credits: number;
  avatar?: string;
  createdAt: Date;
}

export interface Auction {
  id: string;
  title: string;
  description: string;
  image: string;
  startTime: Date;
  endTime: Date;
  minimumBid: number;
  currentBid: number;
  currentBidderId?: string;
  currentBidderName?: string;
  status: "upcoming" | "active" | "ended";
  winnerId?: string;
  winnerName?: string;
  category: string;
  totalBids: number;
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  timestamp: Date;
  isWinning: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: "outbid" | "winning" | "auction_start" | "auction_end" | "credit_assigned";
  message: string;
  read: boolean;
  timestamp: Date;
  auctionId?: string;
}

export interface AuctionStats {
  totalAuctions: number;
  activeAuctions: number;
  totalBids: number;
  totalCreditsDistributed: number;
  totalRevenue: number;
  avgBidsPerAuction: number;
}
