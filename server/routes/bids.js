
import express from 'express';
import jwt from 'jsonwebtoken';
import * as queries from '../services/queries.js';
import * as proxyBiddingService from '../services/proxyBiddingService.js';
import * as bidLockService from '../services/bidLockService.js';
import { checkAndExtendAuctionTime } from '../services/auctionCompletion.js';

const router = express.Router();

// Middleware to verify JWT token and attach userId
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_here');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all bids (for admin)
router.get('/', verifyToken, async (req, res) => {
  try {
    // Optional: Check if user is admin
    // For now, any authenticated user can see this for the chart
    const bids = await queries.getAllBids();
    res.json(bids);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get bid history for an auction
router.get('/auction/:auctionId', async (req, res) => {
  try {
    const bids = await queries.getAuctionBids(req.params.auctionId);
    res.json(bids);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get highest bid for an auction
router.get('/highest/:auctionId', async (req, res) => {
  try {
    const highestBid = await queries.getHighestBid(req.params.auctionId);
    if (!highestBid) {
      return res.status(404).json({ error: 'No bids found' });
    }
    res.json(highestBid);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Place a bid via REST API (requires authentication)
router.post('/place', verifyToken, async (req, res) => {
  try {
    const { auctionId, bidAmount } = req.body;
    const bidderId = req.userId;

    // Validate input
    if (!auctionId || bidAmount === undefined) {
      return res.status(400).json({ error: 'auctionId and bidAmount are required' });
    }

    // Validate that bidAmount is an integer
    if (!Number.isInteger(bidAmount)) {
      return res.status(400).json({ 
        error: 'Bid amount must be an integer (whole number only, no decimals)' 
      });
    }

    if (isNaN(bidAmount) || bidAmount <= 0) {
      return res.status(400).json({ error: 'Bid amount must be a positive integer' });
    }

    // Get user to verify they are a bidder and have credits
    const user = await queries.getUserCredits(bidderId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify user is a buyer/bidder (not a seller or admin)
    if (user.user_type !== 'buyer') {
      return res.status(403).json({ 
        error: 'Only bidders can place bids. Your account type does not allow bidding.',
        userType: user.user_type 
      });
    }

    // Get user's available credits (total credits minus credits tied up in active bids)
    const creditSummary = await queries.getUserCreditSummaryDetailed(bidderId);
    if (!creditSummary) {
      return res.status(404).json({ error: 'User credit information not found' });
    }

    // Get auction details
    const auction = await queries.getAuctionById(auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Check auction status
    if (auction.status !== 'active') {
      return res.status(400).json({ error: `Cannot bid on ${auction.status} auction` });
    }

    // Check if auction has ended
    if (new Date(auction.auction_end_time) < new Date()) {
      return res.status(400).json({ error: 'Auction has ended' });
    }

    // Get current highest bid
    const highestBid = await queries.getHighestBid(auctionId);
    const currentBidAmount = highestBid ? parseFloat(highestBid.bid_amount) : 0;

    // Check if user is already the current highest bidder
    if (highestBid && highestBid.bidder_id === bidderId) {
      return res.status(400).json({ 
        error: `You are already the highest bidder with ${highestBid.bid_amount} CR. You cannot place another bid on this auction.`,
        currentBid: highestBid.bid_amount,
        isCurrentLeader: true
      });
    }

    // Validate bid amount against current bid
    // Note: For proxy bids, we allow matching the current bid and let the proxy system handle outbidding
    if (highestBid && bidAmount < highestBid.bid_amount) {
      return res.status(400).json({ 
        error: `Bid amount must be higher than the current bid of ${highestBid.bid_amount} CR.`,
        currentBid: highestBid.bid_amount 
      });
    }

    // Validate bid amount against starting price
    if (bidAmount < auction.starting_price) {
      return res.status(400).json({ 
        error: `Bid amount must be at least ${auction.starting_price} CR`,
        minimumBid: auction.starting_price 
      });
    }

    // Check if user has sufficient available credits (total credits minus credits tied up in active bids)
    if (creditSummary.available_credits < bidAmount) {
      return res.status(400).json({ 
        error: `Insufficient available credits. You have ${creditSummary.total_credits} CR total, ${creditSummary.credits_tied_up} CR tied up in active bids, and ${creditSummary.available_credits} CR available. You need ${bidAmount} CR.`,
        totalCredits: creditSummary.total_credits,
        creditsTiedUp: creditSummary.credits_tied_up,
        availableCredits: creditSummary.available_credits,
        requiredCredits: bidAmount,
        activeBids: creditSummary.active_bids
      });
    }

    // Deduct credits for placing bid
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

    // Update auction with current bid
    await queries.updateAuctionCurrentBid(auctionId, bidAmount, bidderId);

    // Update bid with credits deducted
    await queries.updateBidCreditsDeducted(bidId, bidAmount);

    // Get the created bid with all details for real-time updates
    const createdBid = await queries.getBidById(bidId);

    // Handle outbid logic - return credits to previous highest bidder
    if (highestBid && highestBid.bidder_id !== bidderId) {
      // Return the outbid user's credits
      await queries.addCredits(
        highestBid.bidder_id,
        highestBid.bid_amount,
        'bid_return',
        auctionId,
        highestBid.id,
        `Outbid by ${user.username}, credits returned`
      );

      // Mark previous bid as outbid
      await queries.markBidAsOutbid(highestBid.id);

      // Create notification for outbid user
      await queries.createNotification({
        userId: highestBid.bidder_id,
        type: 'bid_outbid',
        title: 'Outbid!',
        message: `You have been outbid on "${auction.title}" by ${user.username} with ${bidAmount} CR. Your ${highestBid.bid_amount} CR has been returned.`,
        relatedAuctionId: auctionId,
        relatedUserId: bidderId,
      });

      // Process proxy auto-bidding natively
      const io = req.app.get('io') || global.io;
      await proxyBiddingService.processProxyBidding(auctionId, io);
    }

    // Check for anti-sniping - extend auction if bid placed in last 10 seconds
    const io = req.app.get('io') || global.io;
    const wasExtended = await checkAndExtendAuctionTime(auctionId, io);
    if (wasExtended) {
      console.log(`[ANTI-SNIPING] Auction ${auctionId} extended due to last-second bid by user ${bidderId}`);
    }

    res.json({
      success: true,
      bidId,
      auctionId,
      bidAmount,
      creditsRemaining: creditResult.balanceAfter,
      message: `Bid of ${bidAmount} CR placed successfully!`,
      biddingInfo: getBiddingInfo(bidAmount)
    });

    console.log(`✓ Bid placed via REST API: ${bidId} on auction ${auctionId} by user ${bidderId} for ${bidAmount} CR`);

  } catch (error) {
    console.error('Error placing bid:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set or update proxy bid  
// Explanation of Proxy Bidding:
// - User sets a maximum price they're willing to pay (e.g., 120 CR)
// - System creates a proxy bid and places initial opening bid
// - When another user places a bid, proxy system automatically outbids up to max
// - Only integer bids allowed (no decimals)
router.post('/proxy/set', verifyToken, async (req, res) => {
  try {
    const { auctionId, maxBidAmount } = req.body;
    const bidderId = req.userId;

    // Validate input
    if (!auctionId || maxBidAmount === undefined) {
      return res.status(400).json({ error: 'auctionId and maxBidAmount are required' });
    }

    // Validate that maxBidAmount is an integer
    if (!Number.isInteger(maxBidAmount)) {
      return res.status(400).json({ 
        error: 'Max bid amount must be an integer (whole number only, no decimals)' 
      });
    }

    if (isNaN(maxBidAmount) || maxBidAmount <= 0) {
      return res.status(400).json({ error: 'Max bid amount must be a positive integer' });
    }

    // Get user to verify they are a bidder
    const user = await queries.getUserCredits(bidderId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.user_type !== 'buyer') {
      return res.status(403).json({ 
        error: 'Only bidders can set proxy bids',
        userType: user.user_type 
      });
    }

    // Get auction details
    const auction = await queries.getAuctionById(auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Check auction status
    if (auction.status !== 'active') {
      return res.status(400).json({ error: `Cannot set proxy bid on ${auction.status} auction` });
    }

    // Check if auction has ended
    if (new Date(auction.auction_end_time) < new Date()) {
      return res.status(400).json({ error: 'Auction has ended' });
    }

    // Check if user is already the current highest bidder - prevent proxy bids
    const highestBid = await queries.getHighestBid(auctionId);
    if (highestBid && highestBid.bidder_id === bidderId) {
      return res.status(400).json({ 
        error: `You are already the highest bidder with ${highestBid.bid_amount} CR. You cannot set a proxy bid on this auction.`,
        currentBid: highestBid.bid_amount,
        isCurrentLeader: true
      });
    }

    // Additional check: prevent proxy bids if user is current highest bidder in auction record
    if (auction.current_highest_bidder_id === bidderId) {
      return res.status(400).json({ 
        error: `You are currently the highest bidder. You cannot set a proxy bid on this auction.`,
        currentBid: auction.current_bid || auction.current_bid_price || 0,
        isCurrentLeader: true
      });
    }

    // Validate max bid against starting price
    if (maxBidAmount < auction.starting_price) {
      return res.status(400).json({ 
        error: `Max bid must be at least ${auction.starting_price} CR`,
        minimumBid: auction.starting_price 
      });
    }

    // Check if user has sufficient credits
    if (user.credits < maxBidAmount) {
      return res.status(400).json({ 
        error: `Insufficient credits. You have ${user.credits} CR but need ${maxBidAmount} CR`,
        currentCredits: user.credits,
        requiredCredits: maxBidAmount
      });
    }

    // Set the proxy bid (creates or updates)
    const proxyBidId = await proxyBiddingService.setProxyBid(auctionId, bidderId, maxBidAmount);

    // Start proxy wars or place initial bid
    const io = req.app.get('io') || global.io;
    await proxyBiddingService.processProxyBidding(auctionId, io);

    res.json({
      success: true,
      proxyBidId,
      auctionId,
      maxBidAmount,
      message: `Proxy bid set successfully! System will automatically bid up to ${maxBidAmount} CR on your behalf when someone outbids the current amount.`
    });

    console.log(`✓ Proxy bid set: ID ${proxyBidId} on auction ${auctionId} by user ${bidderId} with max ${maxBidAmount} CR`);

  } catch (error) {
    console.error('Error setting proxy bid:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's proxy bids
router.get('/proxy/user', verifyToken, async (req, res) => {
  try {
    const bidderId = req.userId;
    
    const proxyBids = await queries.getUserProxyBids(bidderId);
    
    res.json({
      success: true,
      proxyBids,
      count: proxyBids.length
    });
  } catch (error) {
    console.error('Error fetching proxy bids:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get proxy bids for an auction
router.get('/proxy/auction/:auctionId', async (req, res) => {
  try {
    const proxyBids = await queries.getAuctionProxyBids(req.params.auctionId);
    
    res.json({
      success: true,
      proxyBids,
      count: proxyBids.length
    });
  } catch (error) {
    console.error('Error fetching auction proxy bids:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel proxy bid
router.post('/proxy/cancel/:proxyBidId', verifyToken, async (req, res) => {
  try {
    const proxyBidId = req.params.proxyBidId;
    const bidderId = req.userId;

    const proxyBid = await queries.getProxyBidById(proxyBidId);
    if (!proxyBid) {
      return res.status(404).json({ error: 'Proxy bid not found' });
    }

    // Verify ownership
    if (proxyBid.bidder_id !== bidderId) {
      return res.status(403).json({ error: 'You can only cancel your own proxy bids' });
    }

    // Deactivate the proxy bid
    await queries.deactivateProxyBid(proxyBidId);

    res.json({
      success: true,
      message: 'Proxy bid cancelled successfully'
    });

    console.log(`✓ Proxy bid cancelled: ${proxyBidId} by user ${bidderId}`);

  } catch (error) {
    console.error('Error cancelling proxy bid:', error);
    res.status(500).json({ error: error.message });
  }
});

// High-frequency bid placement with locking (for race condition prevention)
router.post('/place-locked', verifyToken, async (req, res) => {
  try {
    const { auctionId, bidAmount } = req.body;
    const bidderId = req.userId;

    // Validate input
    if (!auctionId || bidAmount === undefined) {
      return res.status(400).json({ error: 'auctionId and bidAmount are required' });
    }

    // Validate that bidAmount is an integer
    if (!Number.isInteger(bidAmount)) {
      return res.status(400).json({ 
        error: 'Bid amount must be an integer (whole number only, no decimals)' 
      });
    }

    if (isNaN(bidAmount) || bidAmount <= 0) {
      return res.status(400).json({ error: 'Bid amount must be a positive integer' });
    }

    // Get auction details
    const auction = await queries.getAuctionById(auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Check if user is already the current highest bidder
    const highestBid = await queries.getHighestBid(auctionId);
    if (highestBid && highestBid.bidder_id === bidderId) {
      return res.status(400).json({ 
        error: `You are already the highest bidder with ${highestBid.bid_amount} CR. You cannot place another bid on this auction.`,
        currentBid: highestBid.bid_amount,
        isCurrentLeader: true
      });
    }

    // Additional check: prevent same user from placing any bid if they're the current leader
    // This includes both manual and proxy bids
    const currentAuction = await queries.getAuctionById(auctionId);
    if (currentAuction && currentAuction.current_highest_bidder_id === bidderId) {
      return res.status(400).json({ 
        error: `You are currently the highest bidder. You cannot place another bid on this auction.`,
        currentBid: currentAuction.current_bid || currentAuction.current_bid_price || 0,
        isCurrentLeader: true
      });
    }

    // Use bid lock service for atomic operations
    const result = await bidLockService.placeBidWithLock(auctionId, bidderId, bidAmount, req.app.get('io') || global.io);

    // Check for anti-sniping - extend auction if bid placed in last 10 seconds
    const io = req.app.get('io') || global.io;
    const wasExtended = await checkAndExtendAuctionTime(auctionId, io);
    if (wasExtended) {
      console.log(`[ANTI-SNIPING] Auction ${auctionId} extended due to last-second locked bid by user ${bidderId}`);
    }

    res.json({
      success: true,
      bidId: result.bidId,
      auctionId,
      bidAmount,
      creditsRemaining: result.creditsRemaining,
      message: `Locked bid of ${bidAmount} CR placed successfully!`,
      ...(wasExtended && { auctionExtended: true, extensionMessage: 'Auction extended by 30 seconds due to last-second bid!' })
    });

    console.log(`✓ Locked bid placed: ${result.bidId} on auction ${auctionId} by user ${bidderId} for ${bidAmount} CR`);

  } catch (error) {
    console.error('Error placing locked bid:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check if auction is currently locked
router.get('/lock-status/:auctionId', async (req, res) => {
  try {
    const auctionId = req.params.auctionId;
    const isLocked = await bidLockService.isAuctionLocked(auctionId);
    const status = await bidLockService.getBidOperationStatus(auctionId);
    
    res.json({
      auctionId,
      isLocked,
      status
    });
  } catch (error) {
    console.error('Error checking lock status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check if proxy bidding is allowed for an auction (not in last 10 minutes)
router.get('/proxy-allowed/:auctionId', async (req, res) => {
  try {
    const auctionId = req.params.auctionId;
    const isAllowed = await proxyBiddingService.isProxyBiddingAllowed(auctionId);
    
    // Get time remaining for additional context
    const auction = await queries.getAuctionById(auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }
    
    const now = new Date();
    const auctionEndTime = new Date(auction.auction_end_time);
    const timeUntilEnd = auctionEndTime.getTime() - now.getTime();
    const tenMinutesInMs = 10 * 60 * 1000;
    
    res.json({
      auctionId,
      proxyBiddingAllowed: isAllowed,
      timeUntilEndMs: timeUntilEnd,
      timeUntilEndMinutes: Math.max(0, Math.ceil(timeUntilEnd / 60000)),
      isLast10Minutes: timeUntilEnd <= tenMinutesInMs,
      message: isAllowed 
        ? 'Proxy bidding is allowed' 
        : 'Proxy bidding is not allowed in the last 10 minutes. Please place manual bids only.'
    });
  } catch (error) {
    console.error('Error checking proxy bidding allowance:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
