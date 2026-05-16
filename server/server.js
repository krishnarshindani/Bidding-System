import express from 'express';
import http from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import * as queries from './services/queries.js';
import { socketAuthMiddleware } from './middleware/auth.js';
import { completeAuction, shouldCompleteAuction } from './services/auctionCompletion.js';
import * as proxyBiddingService from './services/proxyBiddingService.js';
import * as fraudDetectionService from './services/fraudDetectionService.js';
import authRoutes from './routes/auth.js';
import auctionRoutes from './routes/auctions.js';
import analyticsRoutes from './routes/analytics.js';
import bidsRoutes from './routes/bids.js';
import usersRoutes from './routes/users.js';
import aiRoutes from './routes/ai.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:8080',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8080',
      ];
      const isNgrok = origin && /ngrok-free\.app$/.test(origin);
      if (!origin || allowedOrigins.includes(origin) || isNgrok) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Create uploads directory if it doesn't exist
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer config for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false // Allow loading images from other origins
}));
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:8080',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080',
    ];
    const isNgrok = origin && /ngrok-free\.app$/.test(origin);
    if (!origin || allowedOrigins.includes(origin) || isNgrok) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Serve static uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Store active connections
const activeConnections = new Map();

// Per-auction mutex to prevent race conditions on concurrent bids
const auctionLocks = new Map();

async function withAuctionLock(auctionId, fn) {
  const key = String(auctionId);
  const prev = auctionLocks.get(key) || Promise.resolve();
  let resolve;
  const current = new Promise((r) => { resolve = r; });
  auctionLocks.set(key, current);
  try {
    await prev; // wait for previous operation on this auction
    return await fn();
  } finally {
    resolve();
    if (auctionLocks.get(key) === current) {
      auctionLocks.delete(key);
    }
  }
}

// Socket.IO Middleware for authentication (optional during dev, required for bids)
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const userId = socket.handshake.auth.userId;
  
  console.log(`[SOCKET AUTH] New connection attempt - userId: ${userId}, hasToken: ${!!token}`);
  
  if (token) {
    // Verify JWT token if provided
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_here');
      socket.userId = decoded.userId;
      socket.email = decoded.email;
      console.log(`[SOCKET AUTH] ✓ JWT verified for user ${socket.userId}`);
      next();
    } catch (error) {
      console.warn('[SOCKET AUTH] ✗ Invalid token:', error.message);
      // For now, allow connection but mark as unauthenticated
      socket.userId = null;
      next();
    }
  } else if (userId) {
    // Accept user ID from socket auth (for demo purposes)
    socket.userId = userId;
    console.log(`[SOCKET AUTH] ✓ Direct userId accepted: ${userId}`);
    next();
  } else {
    // Allow unauthenticated connections for browsing, but require auth for bids
    socket.userId = null;
    console.log(`[SOCKET AUTH] Unauthenticated connection allowed`);
    next();
  }
});

// Socket.IO Event Handlers
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // User authentication and join
  socket.on('user:join', (userId) => {
    try {
      // Ensure socket.userId is set (in case auth didn't work)
      if (!socket.userId) {
        socket.userId = userId;
      }
      
      // Remove any old socket connection for this user
      const oldSocketId = activeConnections.get(userId);
      if (oldSocketId && oldSocketId !== socket.id) {
        console.log(`Disconnecting previous socket ${oldSocketId} for user ${userId}`);
        io.to(oldSocketId).emit('session:replaced', { message: 'You have logged in from another device' });
        // Note: We don't forcefully disconnect the old socket as it will disconnect naturally
      }
      
      activeConnections.set(userId, socket.id);
      socket.join(`user:${userId}`);
      
      socket.emit('user:joined', { userId, socketId: socket.id });
      console.log(`✓ User ${userId} joined with socket ${socket.id}`);
    } catch (error) {
      console.error(`Error in user:join:`, error.message);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Auction events
  socket.on('auction:create', async (data) => {
    try {
      const auctionId = await queries.createAuction(data);
      io.emit('auction:created', { id: auctionId, ...data });
      console.log(`Auction created: ${auctionId}`);
    } catch (error) {
      socket.emit('error', { message: 'Failed to create auction', error: error.message });
    }
  });

  socket.on('auction:get', async (auctionId) => {
    try {
      const auction = await queries.getAuctionById(auctionId);
      const bids = await queries.getAuctionBids(auctionId);
      socket.emit('auction:data', { auction, bids });
    } catch (error) {
      socket.emit('error', { message: 'Failed to fetch auction', error: error.message });
    }
  });

  socket.on('auctions:getActive', async (data) => {
    try {
      const { limit = 20, offset = 0 } = data;
      const auctions = await queries.getActiveAuctions(limit, offset);
      socket.emit('auctions:active', auctions);
    } catch (error) {
      socket.emit('error', { message: 'Failed to fetch auctions', error: error.message });
    }
  });

  socket.on('auctions:getByCategory', async (data) => {
    try {
      const { categoryId, limit = 20, offset = 0 } = data;
      const auctions = await queries.getAuctionsByCategory(categoryId, limit, offset);
      socket.emit('auctions:byCategory', auctions);
    } catch (error) {
      socket.emit('error', { message: 'Failed to fetch auctions', error: error.message });
    }
  });

  // Auction room management
  socket.on('join-auction', (auctionId) => {
    socket.join(`auction:${auctionId}`);
    console.log(`Client ${socket.id} joined auction ${auctionId}`);
  });

  socket.on('leave-auction', (auctionId) => {
    socket.leave(`auction:${auctionId}`);
    console.log(`Client ${socket.id} left auction ${auctionId}`);
  });

  // Live chat inside an auction room (active auctions only)
  socket.on('chat:send', async (data) => {
    try {
      const { auctionId, messageText, senderId, senderName } = data || {};
      if (!auctionId) return;

      const auction = await queries.getAuctionById(auctionId);
      if (!auction || auction.status !== 'active') {
        socket.emit('chat:error', { message: 'Chat is only available during live (active) auctions.' });
        return;
      }

      const text = typeof messageText === 'string' ? messageText.trim() : '';
      if (!text) return;
      if (text.length > 500) {
        socket.emit('chat:error', { message: 'Message too long (max 500 characters)' });
        return;
      }

      const effectiveSenderId = senderId || socket.userId;
      const payload = {
        auctionId,
        messageText: text,
        senderId: effectiveSenderId ? String(effectiveSenderId) : null,
        senderName: senderName || 'Bidder',
        timestamp: new Date().toISOString(),
      };

      io.to(`auction:${auctionId}`).emit('chat:new', payload);
    } catch (error) {
      socket.emit('chat:error', { message: 'Failed to send chat message' });
    }
  });

  // Bid events
  socket.on('bid:place', async (data) => {
    try {
      const auctionId = data.auctionId;
      const bidderId = data.bidderId;
      const bidderName = data.bidderName;
      const isProxy = data.isProxy;
      const bidAmount = Math.floor(Number(data.bidAmount));
      const maxProxyAmount = data.maxProxyAmount !== undefined ? Math.floor(Number(data.maxProxyAmount)) : undefined;

      if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
        socket.emit('bid:error', { message: 'Bid amount must be a positive integer' });
        return;
      }

      if (maxProxyAmount !== undefined && (!Number.isFinite(maxProxyAmount) || maxProxyAmount <= 0)) {
        socket.emit('bid:error', { message: 'Proxy max must be a positive integer' });
        return;
      }

      console.log(`[BID PLACE EVENT] Socket: ${socket.id}, Auth User: ${socket.userId}, Bidder ID: ${bidderId}, Amount: ${bidAmount}, Proxy: ${isProxy}, Max: ${maxProxyAmount}`);

      // Verify bidder ID matches authenticated user (prevent bid spoofing)
      const socketUserId = String(socket.userId);
      const incomingBidderId = String(bidderId);
      
      if (!socket.userId) {
        socket.emit('bid:error', { message: 'Authentication error: You must be logged in to place a bid' });
        console.warn(`[AUTH FAILED] Unauthenticated bid attempt from socket ${socket.id}`);
        return;
      }

      if (socketUserId !== incomingBidderId) {
        socket.emit('bid:error', { message: 'Authentication error: Bid ID mismatch. You cannot bid on behalf of another user.' });
        console.warn(`[AUTH FAILED] Socket user ${socketUserId} attempted to bid as ${incomingBidderId} on socket ${socket.id}`);
        return;
      }

      // ===== RACE CONDITION PROTECTION =====
      // Use per-auction mutex to serialize concurrent bids on the same auction
      await withAuctionLock(auctionId, async () => {
        // Get auction details
        const auction = await queries.getAuctionById(auctionId);
        if (!auction) {
          socket.emit('bid:error', { message: 'Auction not found' });
          console.warn(`[BID FAILED] Auction ${auctionId} not found`);
          return;
        }

        // Check auction status
        if (auction.status !== 'active') {
          socket.emit('bid:error', { message: `Cannot bid on ${auction.status} auction` });
          console.warn(`[BID FAILED] Auction ${auctionId} is ${auction.status}, not active`);
          return;
        }

        // Check if auction time has expired
        const now = new Date();
        const endTime = new Date(auction.auction_end_time);
        if (endTime.getTime() <= now.getTime()) {
          socket.emit('bid:error', { message: 'This auction has ended. No more bids can be placed.' });
          console.warn(`[BID FAILED] Auction ${auctionId} has expired`);
          return;
        }

        // Get current highest bid
        const highestBid = await queries.getHighestBid(auctionId);

        // ===== PREVENT SAME-USER CONSECUTIVE BIDS =====
        if (highestBid && String(highestBid.bidder_id) === incomingBidderId) {
          socket.emit('bid:error', {
            message: 'You are already the highest bidder. Wait for someone else to bid first.',
            isCurrentLeader: true,
            currentBid: highestBid.bid_amount
          });
          console.warn(`[BID BLOCKED] User ${bidderId} is already the highest bidder on auction ${auctionId}`);
          return;
        }

        // Validate bid amount against current bid
        if (highestBid && bidAmount < highestBid.bid_amount) {
          socket.emit('bid:error', { message: `Bid amount must be higher than current bid (${highestBid.bid_amount} CR)` });
          console.warn(`[BID FAILED] Bid amount ${bidAmount} not greater than current highest ${highestBid.bid_amount}`);
          return;
        }

        // Validate bid amount against starting price
        if (bidAmount < auction.starting_price) {
          socket.emit('bid:error', { message: `Bid amount must be at least ${auction.starting_price} CR` });
          console.warn(`[BID FAILED] Bid amount ${bidAmount} less than starting price ${auction.starting_price}`);
          return;
        }

        // Get user credits
        const user = await queries.getUserCredits(bidderId);
        if (!user) {
          socket.emit('bid:error', { message: 'User not found' });
          console.warn(`[BID FAILED] User ${bidderId} not found in database`);
          return;
        }

        console.log(`[USER LOOKUP] User ${bidderId}: type='${user.user_type}', credits=${user.credits}, username='${user.username}'`);

        // Verify user is a buyer/bidder (not a seller or admin)
        if (user.user_type !== 'buyer') {
          socket.emit('bid:error', { 
            message: `Only bidders can place bids. Your account type is '${user.user_type}' which does not allow bidding.`,
            userType: user.user_type
          });
          console.warn(`[AUTH FAILED] User ${bidderId} with type '${user.user_type}' attempted to place bid`);
          return;
        }

        // Check if user has sufficient credits
        if (user.credits < bidAmount) {
          socket.emit('bid:error', { 
            message: `Insufficient credits. You have ${user.credits} CR but need ${bidAmount} CR`,
            currentCredits: user.credits,
            requiredCredits: bidAmount
          });
          console.warn(`[BID FAILED] User ${bidderId} has insufficient credits: ${user.credits} < ${bidAmount}`);
          return;
        }

        // CREDIT DEDUCTION: Deduct credits for placing bid
        const creditResult = await queries.deductCredits(
          bidderId,
          bidAmount,
          'bid_placement',
          auctionId,
          null,
          `Bid placed on auction ${auctionId}`
        );

        // Create bid record
        const bidId = await queries.createBid({ 
          auctionId, 
          bidderId, 
          bidAmount
        });
        await queries.updateAuctionCurrentBid(auctionId, bidAmount, bidderId);

        // Update bid with credits deducted
        await queries.updateBidCreditsDeducted(bidId, bidAmount);

        // Notify all auction room subscribers with real-time update
        io.to(`auction:${auctionId}`).emit('new-bid', {
          id: bidId,
          auctionId,
          bidderId,
          amount: bidAmount,
          bidderName: user.username || 'Anonymous',
          timestamp: new Date(),
          isProxy,
          maxProxyAmount
        });

        // Emit to bidder with updated credit balance
        io.to(`user:${bidderId}`).emit('credits:updated', {
          currentCredits: creditResult.balanceAfter,
          bidAmount,
          auctionId,
          message: `Bid placed! Credits deducted: ${bidAmount} CR`
        });

        // Also emit to all for analytics
        io.emit('bid:placed', {
          bidId,
          auctionId,
          bidderId,
          bidAmount,
          timestamp: new Date(),
        });

        // ===== ANTI-SNIPING LOGIC (after successful bid) =====
        const remainingTime = endTime.getTime() - Date.now();
        const tenSeconds = 10 * 1000;
        let newEndTime = null;

        if (remainingTime > 0 && remainingTime <= tenSeconds) {
          // Extend the auction by 30 seconds from now
          newEndTime = new Date(Date.now() + 30 * 1000);
          await queries.updateAuctionEndTime(auctionId, newEndTime);
          console.log(`[ANTI-SNIPE] Auction ${auctionId} extended to ${newEndTime.toISOString()}`);
        }

        // Notify clients if auction was extended
        if (newEndTime) {
          io.to(`auction:${auctionId}`).emit('auction:extended', {
            auctionId,
            newEndTime: newEndTime.toISOString(),
            timeAdded: 30,
            message: 'Auction extended by 30 seconds due to last-second bid!'
          });
        }

        // RETURN CREDITS: If there was a previous highest bid, return credits to that user
        if (highestBid && highestBid.bidder_id !== bidderId) {
          // Return the outbid user's credits
          const outbidResult = await queries.addCredits(
            highestBid.bidder_id,
            highestBid.bid_amount,
            'bid_return',
            auctionId,
            highestBid.id,
            `Outbid by ${user.username}, credits returned`
          );

          // Mark previous bid as outbid
          await queries.markBidAsOutbid(highestBid.id);

          // Notify outbid user
          await queries.createNotification({
            userId: highestBid.bidder_id,
            type: 'bid_outbid',
            title: 'Outbid!',
            message: `You have been outbid on "${auction.title}" by ${user.username} with ${bidAmount} CR. Your ${highestBid.bid_amount} CR has been returned.`,
            relatedAuctionId: auctionId,
            relatedUserId: bidderId,
          });

          // Notify outbid user in real-time
          io.to(`user:${highestBid.bidder_id}`).emit('notification:new', {
            type: 'bid_outbid',
            auctionId,
            creditsReturned: highestBid.bid_amount,
            newBalance: outbidResult.balanceAfter
          });

          console.log(`[OUTBID] User ${highestBid.bidder_id} outbid by ${bidderId}. Returned ${highestBid.bid_amount} CR.`);
        }

        console.log(`✓ [BID SUCCESS] Bid ${bidId} placed on auction ${auctionId} by user ${bidderId} (${user.username}) for ${bidAmount} CR. Remaining: ${creditResult.balanceAfter}`);

        // If this was a proxy bid setup, save it to the database
        if (isProxy && maxProxyAmount) {
           // ===== PROXY BID LAST-10-MIN RESTRICTION =====
           const proxyCheckNow = Date.now();
           const proxyEndTime = new Date(auction.auction_end_time).getTime();
           const timeUntilEnd = proxyEndTime - proxyCheckNow;
           const tenMinutesMs = 10 * 60 * 1000;

           if (timeUntilEnd <= tenMinutesMs) {
             console.warn(`[PROXY BLOCKED] User ${bidderId} tried to set proxy bid on auction ${auctionId} with only ${Math.round(timeUntilEnd / 1000)}s remaining (< 10 min)`);
             // The manual bid already went through, but we don't save the proxy
             socket.emit('bid:error', {
               message: 'Proxy bidding is not allowed in the last 10 minutes of an auction. Your manual bid was placed, but auto-bidding was not activated.',
               proxyBlocked: true
             });
           } else {
             // Check if proxy bid already exists
             const existingProxy = await queries.getActiveProxyBid(auctionId, bidderId);
             if (existingProxy) {
               console.log(`[PROXY UPDATE] Updating existing proxy bid ${existingProxy.id} from ${existingProxy.max_bid_amount} to ${maxProxyAmount}`);
               await queries.updateProxyBid(existingProxy.id, maxProxyAmount);
             } else {
               console.log(`[PROXY CREATE] Creating new proxy bid with max ${maxProxyAmount}`);
               await queries.createProxyBid(auctionId, bidderId, maxProxyAmount);
             }
             console.log(`[PROXY SET] User ${bidderId} set proxy max ${maxProxyAmount} for auction ${auctionId}`);
           }
        }

        // --- AUTO-EVALUATE PROXY BIDS NATIVELY ---
        // Hand over to the centralized proxy bidding service to do the looping
        // This will trigger proxy wars and place additional bids if needed
        await proxyBiddingService.processProxyBidding(auctionId, io);
      }); // end withAuctionLock

    } catch (error) {
      console.error('Error placing bid:', error.message);
      socket.emit('bid:error', { message: error.message || 'Failed to place bid' });
    }
  });

  // Watchlist events
  socket.on('watchlist:add', async (data) => {
    try {
      const { userId, auctionId } = data;
      await queries.addToWatchlist(userId, auctionId);
      socket.emit('watchlist:added', { auctionId });
      console.log(`Auction ${auctionId} added to watchlist for user ${userId}`);
    } catch (error) {
      socket.emit('error', { message: 'Failed to add to watchlist', error: error.message });
    }
  });

  socket.on('watchlist:remove', async (data) => {
    try {
      const { userId, auctionId } = data;
      await queries.removeFromWatchlist(userId, auctionId);
      socket.emit('watchlist:removed', { auctionId });
    } catch (error) {
      socket.emit('error', { message: 'Failed to remove from watchlist', error: error.message });
    }
  });

  socket.on('watchlist:get', async (data) => {
    try {
      const { userId } = data;
      const watchlist = await queries.getUserWatchlist(userId);
      socket.emit('watchlist:data', watchlist);
    } catch (error) {
      socket.emit('error', { message: 'Failed to fetch watchlist', error: error.message });
    }
  });

  // Message events
  socket.on('message:send', async (data) => {
    try {
      const { senderId, receiverId, auctionId, messageText } = data;
      const messageId = await queries.createMessage({
        senderId,
        receiverId,
        auctionId,
        messageText,
      });

      // Send to receiver
      io.to(`user:${receiverId}`).emit('message:receive', {
        messageId,
        senderId,
        receiverId,
        auctionId,
        messageText,
        timestamp: new Date(),
      });

      socket.emit('message:sent', { messageId });
      console.log(`Message sent from ${senderId} to ${receiverId}`);
    } catch (error) {
      socket.emit('error', { message: 'Failed to send message', error: error.message });
    }
  });

  socket.on('conversation:get', async (data) => {
    try {
      const { userId, otherId } = data;
      const messages = await queries.getConversation(userId, otherId);
      socket.emit('conversation:data', messages);
    } catch (error) {
      socket.emit('error', { message: 'Failed to fetch messages', error: error.message });
    }
  });

  // Notification events
  socket.on('notifications:get', async (data) => {
    try {
      const { userId, unreadOnly = false } = data;
      const notifications = await queries.getUserNotifications(userId, unreadOnly);
      socket.emit('notifications:data', notifications);
    } catch (error) {
      socket.emit('error', { message: 'Failed to fetch notifications', error: error.message });
    }
  });

  socket.on('notification:read', async (data) => {
    try {
      const { notificationId } = data;
      await queries.markNotificationAsRead(notificationId);
      socket.emit('notification:marked', { notificationId });
    } catch (error) {
      socket.emit('error', { message: 'Failed to mark notification', error: error.message });
    }
  });

  // Auction end event - Finalize auction and process winner
  socket.on('auction:end', async (data) => {
    try {
      const { auctionId } = data;

      console.log(`[SOCKET] Manual auction end requested for auction ${auctionId} by socket ${socket.id}`);

      // Use the centralized auction completion service
      const result = await completeAuction(auctionId, 'manual', io);

      if (result.success) {
        socket.emit('auction:end:success', {
          auctionId,
          winner: result.winner,
          finalPrice: result.finalPrice,
          message: result.message
        });
        console.log(`[SOCKET] ✓ Auction ${auctionId} ended successfully via manual trigger`);
      } else {
        socket.emit('auction:error', {
          message: result.error || 'Failed to end auction'
        });
        console.error(`[SOCKET] ✗ Failed to end auction ${auctionId}:`, result.error);
      }
    } catch (error) {
      console.error(`[SOCKET] ✗ Error ending auction:`, error);
      socket.emit('auction:error', {
        message: error.message || 'Failed to end auction'
      });
    }
  });

  // Disconnect
  socket.on('disconnect', (reason) => {
    console.log(`✗ Client disconnecting: ${socket.id}, reason: ${reason}`);
    
    // Remove user from active connections
    let disconnectedUserId = null;
    for (const [userId, socketId] of activeConnections.entries()) {
      if (socketId === socket.id) {
        activeConnections.delete(userId);
        disconnectedUserId = userId;
        console.log(`✗ User ${userId} disconnected (socket: ${socket.id}) - reason: ${reason}`);
        break;
      }
    }
    
    if (!disconnectedUserId) {
      console.log(`✗ Unknown user disconnected (socket: ${socket.id}) - reason: ${reason}`);
    }
    
    console.log(`✗ Client disconnected: ${socket.id} - ${reason}`);
  });

  // Error handling
  socket.on('error', (error) => {
    console.error(`Socket error from ${socket.id}:`, error);
  });
});

// REST API routes (optional for non-socket operations)
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date() });
});

// Auto-Sweep: Periodically check for expired auctions and close them
setInterval(async () => {
  try {
    // Get auctions that are still 'active' but whose end time has passed
    const expiredAuctions = await queries.getExpiredActiveAuctions(100);
    
    if (!expiredAuctions || expiredAuctions.length === 0) {
      return;
    }

    console.log(`[SWEEPER] Found ${expiredAuctions.length} expired auction(s) to auto-close...`);
    
    let processedCount = 0;
    let completedCount = 0;
    let errorCount = 0;

    for (const auction of expiredAuctions) {
      try {
        console.log(`[SWEEPER] Auction ${auction.id} ("${auction.title}") has expired. Closing automatically...`);
        
        // Use the centralized auction completion service
        const result = await completeAuction(auction.id, 'sweeper', io);
        
        if (result.success) {
          completedCount++;
          console.log(`[SWEEPER] ✓ Auction ${auction.id} completed successfully`);
        } else {
          errorCount++;
          console.error(`[SWEEPER] ✗ Failed to complete auction ${auction.id}:`, result.error);
        }
        
        processedCount++;
      } catch (error) {
        errorCount++;
        console.error(`[SWEEPER] ✗ Error processing auction ${auction.id}:`, error.message);
        // Continue processing other auctions even if one fails
      }
    }
    
    if (processedCount > 0) {
      console.log(`[SWEEPER] Summary: Processed ${processedCount} auctions (${completedCount} completed, ${errorCount} errors)`);
    }
  } catch (error) {
    console.error(`[SWEEPER] ✗ Error in sweeper process:`, error.message);
  }
}, 5000); // Check every 5 seconds for more responsive auto-close

// Register route handlers
app.use('/api/auth', authRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/bids', bidsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await queries.getAllCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    // Return relative path to be stored in DB
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/upload-multiple', upload.array('images', 3), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }
    
    if (req.files.length > 3) {
      return res.status(400).json({ error: 'Maximum 3 images allowed' });
    }
    
    // Return array of relative paths
    const imageUrls = req.files.map(file => `/uploads/${file.filename}`);
    res.json({ imageUrls, count: imageUrls.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
  console.log(`🗄️  Database: ${process.env.DB_NAME || 'bid_brilliance'}\n`);
});
