/**
 * Bid Lock Service
 * Prevents race conditions when multiple bids happen simultaneously
 * Uses database row-level locking to ensure atomic bid operations
 */

import * as queries from './queries.js';

// Lock timeout in milliseconds (5 seconds)
const LOCK_TIMEOUT = 5000;

/**
 * Acquire a lock on an auction for bid operations
 * Uses database row-level locking with FOR UPDATE
 */
export const acquireBidLock = async (auctionId, connection) => {
  try {
    // Acquire lock on the auction row
    const [rows] = await connection.query(
      'SELECT id FROM auctions WHERE id = ? FOR UPDATE',
      [auctionId]
    );
    
    if (rows.length === 0) {
      throw new Error('Auction not found');
    }
    
    return true;
  } catch (error) {
    console.error(`[BID LOCK] Failed to acquire lock for auction ${auctionId}:`, error.message);
    throw error;
  }
};

/**
 * Release bid lock (happens automatically when transaction commits/rollbacks)
 */
export const releaseBidLock = async (connection) => {
  // Lock is automatically released when transaction ends
  return true;
};

/**
 * Execute a bid operation with locking
 * Ensures atomicity and prevents race conditions
 */
export const executeBidWithLock = async (auctionId, bidderId, bidAmount, operation) => {
  const connection = await queries.pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Acquire lock on auction
    await acquireBidLock(auctionId, connection);
    
    // Execute the bid operation
    const result = await operation(connection);
    
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    console.error(`[BID LOCK] Bid operation failed for auction ${auctionId}:`, error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Place a bid with locking to prevent race conditions
 */
export const placeBidWithLock = async (auctionId, bidderId, bidAmount, io) => {
  return executeBidWithLock(auctionId, bidderId, bidAmount, async (connection) => {
    // Get current highest bid within the locked transaction
    const [highestBidRows] = await connection.query(
      `SELECT * FROM bids 
       WHERE auction_id = ? AND bid_status = 'active'
       ORDER BY bid_amount DESC
       LIMIT 1`,
      [auctionId]
    );
    
    const highestBid = highestBidRows[0];
    const currentBidAmount = highestBid ? parseFloat(highestBid.bid_amount) : 0;
    
    // Validate bid amount
    if (bidAmount <= currentBidAmount) {
      throw new Error(`Bid amount must be higher than current bid of ${currentBidAmount} CR`);
    }
    
    // Get user credits within the locked transaction
    const [userRows] = await connection.query(
      'SELECT credits FROM users WHERE id = ? FOR UPDATE',
      [bidderId]
    );
    
    if (!userRows[0]) {
      throw new Error('User not found');
    }
    
    const userCredits = userRows[0].credits;
    if (userCredits < bidAmount) {
      throw new Error(`Insufficient credits. Have ${userCredits}, need ${bidAmount}`);
    }
    
    // Deduct credits
    const [updateUserResult] = await connection.query(
      'UPDATE users SET credits = credits - ? WHERE id = ?',
      [bidAmount, bidderId]
    );
    
    // Create bid record
    const [bidResult] = await connection.query(
      `INSERT INTO bids (auction_id, bidder_id, bid_amount, bid_status, credits_deducted)
       VALUES (?, ?, ?, 'active', ?)`,
      [auctionId, bidderId, bidAmount, bidAmount]
    );
    
    // Update auction current bid
    const [updateAuctionResult] = await connection.query(
      `UPDATE auctions 
       SET current_bid_price = ?, current_highest_bidder_id = ?, updated_at = NOW()
       WHERE id = ?`,
      [bidAmount, bidderId, auctionId]
    );
    
    // Handle outbid logic for previous highest bidder
    if (highestBid && highestBid.bidder_id !== bidderId) {
      // Return credits to previous highest bidder
      await connection.query(
        'UPDATE users SET credits = credits + ? WHERE id = ?',
        [highestBid.bid_amount, highestBid.bidder_id]
      );
      
      // Mark previous bid as outbid
      await connection.query(
        'UPDATE bids SET bid_status = ?, credits_returned = TRUE WHERE id = ?',
        ['outbid', highestBid.id]
      );
    }
    
    return {
      bidId: bidResult.insertId,
      bidAmount,
      creditsRemaining: userCredits - bidAmount
    };
  });
};

/**
 * Set proxy bid with locking
 */
export const setProxyBidWithLock = async (auctionId, bidderId, maxBidAmount, io) => {
  return executeBidWithLock(auctionId, bidderId, maxBidAmount, async (connection) => {
    // Check if proxy bid already exists
    const [existingProxyRows] = await connection.query(
      `SELECT * FROM proxy_bids 
       WHERE auction_id = ? AND bidder_id = ? AND is_active = TRUE`,
      [auctionId, bidderId]
    );
    
    if (existingProxyRows[0]) {
      // Update existing proxy bid
      await connection.query(
        'UPDATE proxy_bids SET max_bid_amount = ?, updated_at = NOW() WHERE id = ?',
        [maxBidAmount, existingProxyRows[0].id]
      );
      return { proxyBidId: existingProxyRows[0].id, action: 'updated' };
    } else {
      // Create new proxy bid
      const [proxyResult] = await connection.query(
        `INSERT INTO proxy_bids (auction_id, bidder_id, max_bid_amount, is_active)
         VALUES (?, ?, ?, TRUE)`,
        [auctionId, bidderId, maxBidAmount]
      );
      return { proxyBidId: proxyResult.insertId, action: 'created' };
    }
  });
};

/**
 * Check if auction is locked for bidding operations
 * This is a utility function to check lock status
 */
export const isAuctionLocked = async (auctionId) => {
  try {
    // Try to acquire lock with a short timeout
    const connection = await queries.pool.getConnection();
    await connection.query('SET innodb_lock_wait_timeout = 1');
    
    const [rows] = await connection.query(
      'SELECT id FROM auctions WHERE id = ? FOR UPDATE NOWAIT',
      [auctionId]
    );
    
    connection.release();
    return rows.length === 0;
  } catch (error) {
    // If we can't acquire lock immediately, auction is likely locked
    return true;
  }
};

/**
 * Get bid operation status for monitoring
 */
export const getBidOperationStatus = async (auctionId) => {
  try {
    const [rows] = await queries.pool.query(
      `SELECT 
         a.id,
         a.current_bid_price,
         a.current_highest_bidder_id,
         (SELECT COUNT(*) FROM bids WHERE auction_id = a.id AND bid_status = 'active') as active_bids,
         (SELECT COUNT(*) FROM proxy_bids WHERE auction_id = a.id AND is_active = TRUE) as active_proxies
       FROM auctions a
       WHERE a.id = ?`,
      [auctionId]
    );
    return rows[0];
  } catch (error) {
    console.error('[BID LOCK] Error getting operation status:', error);
    return null;
  }
};