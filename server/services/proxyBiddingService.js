/**
 * Proxy Bidding Service
 * Handles automated bidding on behalf of users up to their maximum price
 * 
 * Proxy Bidding Explanation:
 * - User sets a maximum price they're willing to pay (e.g., 120 CR)
 * - Current bid is lower (e.g., 100 CR)
 * - System automatically bids on their behalf up to 120 CR
 * - Works like a second-price auction system
 * - Only integer bids allowed (no decimals)
 */

import * as queries from './queries.js';
import { checkAndExtendAuctionTime } from './auctionCompletion.js';

/**
 * Calculate the dynamic bid increment based on the current bid amount.
 * This provides a more realistic bidding escalation.
 * @param {number} currentBid - The current highest bid.
 * @returns {number} The increment to be added.
 */
const getDynamicIncrement = (currentBid) => {
  if (currentBid < 100) return 5;
  if (currentBid < 1000) return 25;
  if (currentBid < 5000) return 100;
  return 500;
};

/**
 * Calculate the next bid amount using dynamic increments.
 */
const getNextBidAmount = (currentBid, challengerMaxBid) => {
  const increment = getDynamicIncrement(currentBid);
  const nextBid = currentBid + increment;
  
  // The next bid cannot exceed the challenger's maximum bid.
  if (nextBid > challengerMaxBid) {
    return challengerMaxBid;
  }
  return nextBid;
};

/**
 * Process proxy bidding loops when a bid is placed or changed
 * Ensures proxy bids fight each other and manual bids up to their maximums
 * Uses dynamic increments based on the current bid amount.
 */
export const processProxyBidding = async (auctionId, io) => {
  try {
    let settled = false;
    let loopCount = 0;
    
    const auction = await queries.getAuctionById(auctionId);
    if (!auction) return;
    
    while (!settled && loopCount < 15) {
      loopCount++;
      const proxyBids = await queries.getAuctionProxyBids(auctionId);
      const highestBid = await queries.getHighestBid(auctionId);
      
      const currentHighestAmount = highestBid ? parseInt(highestBid.bid_amount, 10) : 0;
      const currentHighestBidderId = highestBid ? highestBid.bidder_id : null;
      
      console.log(`[PROXY LOOP ${loopCount}] Proxies: ${proxyBids.length}, Current High: ${currentHighestAmount} by user ${currentHighestBidderId}`);
      
      const opposingProxies = proxyBids.filter(p => p.bidder_id !== currentHighestBidderId);
      
      console.log(`[PROXY LOOP ${loopCount}] Opposing proxies: ${opposingProxies.length}`);
      
      if (opposingProxies.length === 0) {
        console.log(`[PROXY LOOP ${loopCount}] No opposing proxies, settling`);
        settled = true;
        break;
      }
      
      const challenger = opposingProxies[0];
      
      // Convert all values to integers for proper comparison
      const challengerMaxBid = Math.floor(parseFloat(challenger.max_bid_amount));
      
      let minimumRequiredBid = currentHighestAmount + 1; // At least 1 more than current
      if (!highestBid) {
        // Start from the auction's defined starting price
        minimumRequiredBid = Math.max(1, Math.floor(parseFloat(auction.starting_price)));
      }
      
      console.log(`[PROXY LOOP ${loopCount}] Challenger user ${challenger.bidder_id} (max: ${challengerMaxBid}), Min required bid: ${minimumRequiredBid}`);
      
      if (challengerMaxBid >= minimumRequiredBid) {
        // Calculate next bid using IPL-style increments
        let nextBidAmount = getNextBidAmount(currentHighestAmount, challengerMaxBid);
        
        // Ensure next bid is at least the minimum required
        if (nextBidAmount < minimumRequiredBid) {
          nextBidAmount = minimumRequiredBid;
        }
        
        // Cap at challenger's maximum
        if (nextBidAmount > challengerMaxBid) {
          nextBidAmount = challengerMaxBid;
        }
        
        // Ensure nextBidAmount is always an integer
        nextBidAmount = Math.floor(nextBidAmount);
        
        console.log(`[PROXY LOOP ${loopCount}] Calculated next bid (IPL-style): ${nextBidAmount} CR`);
        
        const proxyUser = await queries.getUserCredits(challenger.bidder_id);
        const userCredits = proxyUser ? Math.floor(parseFloat(proxyUser.credits)) : 0;
        
        if (!proxyUser || userCredits < nextBidAmount) {
          console.log(`[PROXY LOOP ${loopCount}] Insufficient credits for user ${challenger.bidder_id}: has ${userCredits}, needs ${nextBidAmount}`);
          await queries.deactivateProxyBid(challenger.id);
          if (io) io.to(`user:${challenger.bidder_id}`).emit('notification:new', { type: 'proxy_failed', message: 'Your proxy bid was deactivated due to insufficient credits' });
          continue;
        }
        
        console.log(`[PROXY LOOP ${loopCount}] Checking bid placement: ${nextBidAmount} > ${currentHighestAmount} = ${nextBidAmount > currentHighestAmount}, or !highestBid && ${nextBidAmount} >= ${auction.starting_price}`);
        
        // Fix: Allow proxy bids to be placed when they meet the minimum requirements
        // The key issue was that proxy bids were being rejected when they should be allowed
        if (nextBidAmount >= minimumRequiredBid && nextBidAmount <= challengerMaxBid) {
          // Add a short delay to make the proxy war visually appealing turn-by-turn on the frontend
          console.log(`[PROXY LOOP ${loopCount}] Placing proxy bid: ${nextBidAmount} CR`);
          await new Promise(r => setTimeout(r, 800));
          await placeProxyBid(auctionId, challenger.bidder_id, nextBidAmount, challenger, io);
        } else {
          console.log(`[PROXY LOOP ${loopCount}] NOT placing bid - doesn't meet conditions`);
          await queries.deactivateProxyBid(challenger.id);
          if (io) io.to(`user:${challenger.bidder_id}`).emit('notification:new', { type: 'proxy_exceeded', message: 'Your proxy bid was exceeded' });
        }
      } else {
        console.log(`[PROXY LOOP ${loopCount}] Challenger max bid ${challengerMaxBid} < minimum required ${minimumRequiredBid}, deactivating`);
        await queries.deactivateProxyBid(challenger.id);
        if (io) io.to(`user:${challenger.bidder_id}`).emit('notification:new', { type: 'proxy_exceeded', message: 'Your proxy bid was exceeded' });
      }
    }
  } catch (error) {
    console.error('[PROXY ERROR] Error processing proxy bidding:', error);
  }
};

/**
 * Place an automatic proxy bid
 */
export const placeProxyBid = async (auctionId, proxyBidderId, bidAmount, proxyBidRecord, io) => {
  try {
    // Verify it's an integer
    if (!Number.isInteger(bidAmount)) {
      console.log('[PROXY] Invalid bid amount - not an integer');
      return;
    }

    // Get current highest bid before placing a new one
    const highestBid = await queries.getHighestBid(auctionId);

    // Deduct credits
    const creditResult = await queries.deductCredits(
      proxyBidderId,
      bidAmount,
      'bid_placement',
      auctionId,
      null,
      `Proxy auto-bid on auction ${auctionId}`
    );

    if (!creditResult) {
      console.log(`[PROXY] Failed to deduct credits for user ${proxyBidderId}`);
      return;
    }

    // Create bid record
    const bidId = await queries.createBid({
      auctionId,
      bidderId: proxyBidderId,
      bidAmount
    });

    // Update auction
    await queries.updateAuctionCurrentBid(auctionId, bidAmount, proxyBidderId);
    await queries.updateBidCreditsDeducted(bidId, bidAmount);

    console.log(`[PROXY SUCCESS] Proxy auto-bid placed: Auction ${auctionId}, User ${proxyBidderId}, Amount ${bidAmount} CR`);

    // Handle outbid logic - return credits to previous highest bidder
    if (highestBid && highestBid.bidder_id !== proxyBidderId) {
      await queries.addCredits(
        highestBid.bidder_id,
        highestBid.bid_amount,
        'bid_return',
        auctionId,
        highestBid.id,
        `Outbid by auto-proxy, credits returned`
      );

      await queries.markBidAsOutbid(highestBid.id);

      const proxyUser = await queries.getUserById(proxyBidderId);
      const auction = await queries.getAuctionById(auctionId);
      
      await queries.createNotification({
        userId: highestBid.bidder_id,
        type: 'bid_outbid',
        title: 'Outbid!',
        message: `You have been outbid on "${auction.title}" by ${proxyUser ? proxyUser.username : 'another user'} with ${bidAmount} CR. Your ${highestBid.bid_amount} CR has been returned.`,
        relatedAuctionId: auctionId,
        relatedUserId: proxyBidderId,
      });

      if (io) {
        io.to(`user:${highestBid.bidder_id}`).emit('notification:new', {
          type: 'bid_outbid',
          message: `You have been outbid on "${auction.title}"`
        });
      }
    }

    // Check for anti-sniping - extend auction if bid placed in last 10 seconds
    let wasExtended = false;
    if (io) {
      wasExtended = await checkAndExtendAuctionTime(auctionId, io);
      if (wasExtended) {
        console.log(`[ANTI-SNIPING] Auction ${auctionId} extended due to last-second proxy bid by user ${proxyBidderId}`);
      }
    }

    // Notify proxy bidder
    if (io) {
      io.to(`user:${proxyBidderId}`).emit('proxy:bid-placed', {
        auctionId,
        bidAmount,
        remainingCredits: creditResult.balanceAfter,
        maxProxyAmount: proxyBidRecord.max_bid_amount,
        ...(wasExtended && { auctionExtended: true, extensionMessage: 'Auction extended by 30 seconds due to last-second bid!' })
      });

      // Broadcast the new proxy bid to all clients viewing this auction immediately
      const proxyUser = await queries.getUserById(proxyBidderId);
      const bidderName = proxyUser ? proxyUser.username : 'Auto-Proxy';
      
      io.to(`auction:${auctionId}`).emit('new-bid', {
        id: bidId,
        auctionId,
        bidderId: proxyBidderId,
        amount: bidAmount,
        bidderName: bidderName,
        timestamp: new Date(),
        isProxyAutoBid: true
      });

      // Also emit to all for analytics
      io.emit('bid:placed', {
        bidId,
        auctionId,
        bidderId: proxyBidderId,
        bidAmount,
        timestamp: new Date(),
      });
    }

    return bidId;
  } catch (error) {
    console.error('[PROXY ERROR] Failed to place proxy bid:', error);
    throw error;
  }
};

/**
 * Check if proxy bidding is allowed for an auction (not in last 10 minutes)
 */
export const isProxyBiddingAllowed = async (auctionId) => {
  try {
    const auction = await queries.getAuctionById(auctionId);
    if (!auction) {
      throw new Error('Auction not found');
    }

    const now = new Date();
    const auctionEndTime = new Date(auction.auction_end_time);
    const timeUntilEnd = auctionEndTime.getTime() - now.getTime();
    const tenMinutesInMs = 10 * 60 * 1000; // 10 minutes

    return timeUntilEnd > tenMinutesInMs;
  } catch (error) {
    console.error('[PROXY ERROR] Failed to check proxy bidding allowance:', error);
    return false;
  }
};

/**
 * Set or update a proxy bid for an auction
 */
export const setProxyBid = async (auctionId, bidderId, maxBidAmount) => {
  try {
    // Verify maxBidAmount is an integer
    if (!Number.isInteger(maxBidAmount) || maxBidAmount <= 0) {
      throw new Error('Max bid amount must be a positive integer');
    }

    // Check if proxy bidding is allowed (not in last 10 minutes)
    const isAllowed = await isProxyBiddingAllowed(auctionId);
    if (!isAllowed) {
      throw new Error('Proxy bidding is not allowed in the last 10 minutes of an auction. Please place manual bids only.');
    }

    // Check if proxy bid already exists
    const existingProxy = await queries.getActiveProxyBid(auctionId, bidderId);
    
    if (existingProxy) {
      // Update existing proxy bid
      await queries.updateProxyBid(existingProxy.id, maxBidAmount);
      return existingProxy.id;
    } else {
      // Create new proxy bid
      const proxyBidId = await queries.createProxyBid(auctionId, bidderId, maxBidAmount);
      return proxyBidId;
    }
  } catch (error) {
    console.error('[PROXY ERROR] Failed to set proxy bid:', error);
    throw error;
  }
};

/**
 * Handle initial proxy bid placement when setting up proxy bidding
 */
export const handleProxyBidInitiation = async (auctionId, bidderId, maxBidAmount, io) => {
  try {
    const auction = await queries.getAuctionById(auctionId);
    if (!auction) {
      throw new Error('Auction not found');
    }

    const user = await queries.getUserCredits(bidderId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get current highest bid
    const highestBid = await queries.getHighestBid(auctionId);

    // Determine opening bid amount (IPL-style: start from 10 CR or starting price)
    let openingBidAmount;
    
    if (highestBid) {
      // If there's already a bid, calculate the next bid amount dynamically.
      openingBidAmount = getNextBidAmount(
        Math.floor(parseFloat(highestBid.bid_amount)),
        Math.floor(parseFloat(maxBidAmount))
      );
    } else {
      // No bid yet, start from the auction's starting price.
      const startPrice = Math.floor(parseFloat(auction.starting_price));
      openingBidAmount = Math.max(1, startPrice);
    }

    // Verify it's an integer
    openingBidAmount = Math.floor(openingBidAmount);

    // Check if user has sufficient credits
    if (user.credits < openingBidAmount) {
      throw new Error(`Insufficient credits. You have ${user.credits} CR but need ${openingBidAmount} CR`);
    }

    // Place the opening bid
    const creditResult = await queries.deductCredits(
      bidderId,
      openingBidAmount,
      'bid_placement',
      auctionId,
      null,
      `Opening proxy bid on auction ${auctionId}`
    );

    const bidId = await queries.createBid({
      auctionId,
      bidderId,
      bidAmount: openingBidAmount
    });

    await queries.updateAuctionCurrentBid(auctionId, openingBidAmount, bidderId);
    await queries.updateBidCreditsDeducted(bidId, openingBidAmount);

    console.log(`[PROXY INIT] Opening proxy bid placed: Auction ${auctionId}, User ${bidderId}, Amount ${openingBidAmount} CR, Max ${maxBidAmount} CR`);

    // Notify user
    if (io) {
      io.to(`user:${bidderId}`).emit('proxy:initialized', {
        auctionId,
        openingBidAmount,
        maxBidAmount,
        remainingCredits: creditResult.balanceAfter
      });
    }

    return { bidId, bidAmount: openingBidAmount };
  } catch (error) {
    console.error('[PROXY ERROR] Failed to initialize proxy bid:', error);
    throw error;
  }
};
