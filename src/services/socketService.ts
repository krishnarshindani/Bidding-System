// src/services/socketService.ts
// Central service for all Socket.IO operations
import { useSocket } from '../contexts/SocketContext';

export interface AuctionData {
  sellerId: number;
  categoryId: number;
  title: string;
  description: string;
  startingPrice: number;
  reservePrice?: number;
  auctionEndTime: Date;
  imageUrl?: string;
  condition?: string;
  location?: string;
}

export interface BidData {
  auctionId: number;
  bidderId: number;
  bidAmount: number;
}

export interface MessageData {
  senderId: number;
  receiverId: number;
  auctionId?: number;
  messageText: string;
}

export const socketService = {
  // Auction operations
  createAuction: (data: AuctionData) => {
    const { emit } = useSocket();
    emit('auction:create', data);
  },

  getAuction: (auctionId: number) => {
    const { emit } = useSocket();
    emit('auction:get', auctionId);
  },

  getActiveAuctions: (limit = 20, offset = 0) => {
    const { emit } = useSocket();
    emit('auctions:getActive', { limit, offset });
  },

  getAuctionsByCategory: (categoryId: number, limit = 20, offset = 0) => {
    const { emit } = useSocket();
    emit('auctions:getByCategory', { categoryId, limit, offset });
  },

  // Bid operations
  placeBid: (data: BidData) => {
    const { emit } = useSocket();
    emit('bid:place', data);
  },

  // Watchlist operations
  addToWatchlist: (userId: number, auctionId: number) => {
    const { emit } = useSocket();
    emit('watchlist:add', { userId, auctionId });
  },

  removeFromWatchlist: (userId: number, auctionId: number) => {
    const { emit } = useSocket();
    emit('watchlist:remove', { userId, auctionId });
  },

  getWatchlist: (userId: number) => {
    const { emit } = useSocket();
    emit('watchlist:get', { userId });
  },

  // Message operations
  sendMessage: (data: MessageData) => {
    const { emit } = useSocket();
    emit('message:send', data);
  },

  getConversation: (userId: number, otherId: number) => {
    const { emit } = useSocket();
    emit('conversation:get', { userId, otherId });
  },

  // Notification operations
  getNotifications: (userId: number, unreadOnly = false) => {
    const { emit } = useSocket();
    emit('notifications:get', { userId, unreadOnly });
  },

  markNotificationAsRead: (notificationId: number) => {
    const { emit } = useSocket();
    emit('notification:read', { notificationId });
  },

  // Category operations
  getCategories: () => {
    const { emit } = useSocket();
    emit('categories:get');
  },

  // Listen to events
  onAuctionCreated: (callback: (data: any) => void) => {
    const { on } = useSocket();
    on('auction:created', callback);
  },

  onBidPlaced: (callback: (data: any) => void) => {
    const { on } = useSocket();
    on('bid:placed', callback);
  },

  onMessageReceived: (callback: (data: any) => void) => {
    const { on } = useSocket();
    on('message:receive', callback);
  },

  onNotificationReceived: (callback: (data: any) => void) => {
    const { on } = useSocket();
    on('notification:new', callback);
  },

  onError: (callback: (data: any) => void) => {
    const { on } = useSocket();
    on('error', callback);
  },
};
