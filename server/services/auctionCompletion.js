/**
 * Auction Completion Service
 * Handles auction completion logic for both automatic (sweeper) and manual (admin) closure
 * Ensures proper winner assignment, notifications, and real-time updates
 */

import pool from './database.js';
import * as queries from './queries.js';

// Add the missing function that was removed
export async function checkAndExtendAuctionTime(auctionId, io = null) {
  try {
    const auction = await queries.getAuctionById(auctionId);
    if (!auction || auction.status !== 'active') {
      return false;
    }

    const endTime = new Date(auction.auction_end_time).getTime();
    const now = Date.now();
    const timeRemaining = endTime - now;

    // Check if bid was placed in last 10 seconds
    if (timeRemaining > 0 && timeRemaining <= 10000) { // 10 seconds
      const newEndTime = new Date(endTime + 30000); // Add 30 seconds
      
      await queries.updateAuctionEndTime(auctionId, newEndTime);
      
      console.log(`[ANTI-SNIPING] Auction ${auctionId} extended by 30 seconds. New end time: ${newEndTime}`);
      
      // Emit Socket.IO event if available
      if (io) {
        try {
          io.to(`auction:${auctionId}`).emit('auction:extended', {
            auctionId,
            newEndTime: newEndTime.toISOString(),
            timeAdded: 30,
            message: 'Auction extended by 30 seconds due to last-second bid!'
          });
        } catch (socketError) {
          console.warn(`[ANTI-SNIPING] Socket.IO emission failed for auction ${auctionId}:`, socketError.message);
        }
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`[ANTI-SNIPING] Error checking auction extension for ${auctionId}:`, error);
    return false;
  }
}

/**
 * Complete an auction and assign winner
 * @param {number} auctionId - The auction to complete
 * @param {string} source - 'sweeper' or 'admin' (for logging)
 * @param {object} io - Socket.IO instance for real-time updates
 * @returns {Promise<object>} Winner details or null if no bids
 */
export async function completeAuction(auctionId, source = 'system', io = null) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    console.log(`[AUCTION_COMPLETION] Starting completion for auction ${auctionId} (source: ${source})`);
    
    // 1. Get auction details
    const auction = await queries.getAuctionById(auctionId);
    
    if (!auction) {
      console.warn(`[AUCTION_COMPLETION] Auction ${auctionId} not found`);
      await connection.rollback();
      return { success: false, error: 'Auction not found' };
    }
    
    // 2. Check if already ended (idempotency)
    if (auction.status === 'ended') {
      console.log(`[AUCTION_COMPLETION] Auction ${auctionId} already ended - skipping`);
      await connection.rollback();
      return { success: true, alreadyEnded: true, message: 'Auction already ended' };
    }
    
    // 3. Get highest bid
    const highestBid = await queries.getHighestBid(auctionId);
    
    if (!highestBid) {
      // No bids - auction ended with no winner
      console.log(`[AUCTION_COMPLETION] Auction ${auctionId} has no bids`);
      
      // Update auction status to ended
      await connection.query(
        'UPDATE auctions SET status = ?, updated_at = NOW() WHERE id = ?',
        ['ended', auctionId]
      );
      
      // Create notification for seller
      await connection.query(
        `INSERT INTO notifications (user_id, type, title, message, related_auction_id)
         VALUES (?, ?, ?, ?, ?)`,
        [
          auction.seller_id,
          'auction_ended',
          'Auction Ended',
          `Your auction "${auction.title}" ended with no bids.`,
          auctionId
        ]
      );
      
      await connection.commit();
      
      // Emit Socket.IO event if available
      if (io) {
        io.to(`auction:${auctionId}`).emit('auction:ended', {
          auctionId,
          status: 'ended',
          winner: null,
          finalPrice: 0,
          message: 'Auction ended with no bids'
        });

        // Also broadcast globally so admin dashboard picks it up
        io.emit('auction:ended', {
          auctionId,
          status: 'ended',
          winner: null,
          finalPrice: 0,
          message: 'Auction ended with no bids'
        });
        
        io.to(`user:${auction.seller_id}`).emit('notification:new', {
          type: 'auction_ended',
          auctionId,
          message: 'Your auction ended with no bids'
        });
      }
      
      console.log(`[AUCTION_COMPLETION] ✓ Auction ${auctionId} completed with no bids`);
      
      return {
        success: true,
        auctionId,
        winner: null,
        finalPrice: 0,
        message: 'Auction ended with no bids'
      };
    }
    
    // Auction has bids - proceed with winner assignment
    const winnerId = highestBid.bidder_id;
    const winningAmount = highestBid.bid_amount;
    
    console.log(`[AUCTION_COMPLETION] Auction ${auctionId} winner: User ${winnerId} with ${winningAmount} CR`);
    
    // 4. Update auction status to ended
    await connection.query(
      'UPDATE auctions SET status = ?, current_highest_bidder_id = ?, updated_at = NOW() WHERE id = ?',
      ['ended', winnerId, auctionId]
    );
    
    // 5. Mark winning bid as 'won'
    await connection.query(
      'UPDATE bids SET bid_status = ? WHERE id = ?',
      ['won', highestBid.id]
    );
    
    // 6. Mark all other bids as 'outbid'
    await connection.query(
      'UPDATE bids SET bid_status = ? WHERE auction_id = ? AND id != ? AND bid_status = ?',
      ['outbid', auctionId, highestBid.id, 'active']
    );
    
    // 7. Get winner details
    const winner = await queries.getUserById(winnerId);
    
    if (!winner) {
      console.warn(`[AUCTION_COMPLETION] Winner user ${winnerId} not found`);
      // Continue anyway - auction is still ended
    }
    
    // 8. Create notifications
    // Winner notification
    if (winner) {
      await connection.query(
        `INSERT INTO notifications (user_id, type, title, message, related_auction_id)
         VALUES (?, ?, ?, ?, ?)`,
        [
          winnerId,
          'auction_won',
          '🎉 You Won!',
          `Congratulations! You won the auction "${auction.title}" with a bid of ${winningAmount} CR.`,
          auctionId
        ]
      );
    }
    
    // Seller notification
    await connection.query(
      `INSERT INTO notifications (user_id, type, title, message, related_auction_id, related_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        auction.seller_id,
        'auction_ended',
        '✅ Auction Ended',
        `Your auction "${auction.title}" has ended. Winner: ${winner ? winner.username : 'Unknown'} with bid ${winningAmount} CR`,
        auctionId,
        winnerId
      ]
    );
    
    // 9. Commit transaction
    await connection.commit();
    
    console.log(`[AUCTION_COMPLETION] ✓ Auction ${auctionId} completed successfully`);
    
    // 10. Emit Socket.IO events (after commit, so failures don't affect DB)
    if (io && winner) {
      try {
        // Emit to auction room
        io.to(`auction:${auctionId}`).emit('auction:ended', {
          auctionId,
          status: 'ended',
          winner: {
            id: winnerId,
            username: winner.username,
            email: winner.email
          },
          finalPrice: winningAmount,
          message: `Auction ended. Winner: ${winner.username}`
        });

        // Also broadcast globally so admin dashboard can pick it up
        io.emit('auction:ended', {
          auctionId,
          status: 'ended',
          winner: {
            id: winnerId,
            username: winner.username,
            email: winner.email
          },
          finalPrice: winningAmount,
          message: `Auction ended. Winner: ${winner.username}`
        });
        
        // Emit to winner
        io.to(`user:${winnerId}`).emit('notification:new', {
          type: 'auction_won',
          auctionId,
          finalPrice: winningAmount,
          auctionTitle: auction.title
        });
        
        // Emit to seller
        io.to(`user:${auction.seller_id}`).emit('notification:new', {
          type: 'auction_ended',
          auctionId,
          winnerName: winner.username,
          finalPrice: winningAmount
        });
        
        console.log(`[AUCTION_COMPLETION] ✓ Socket.IO events emitted for auction ${auctionId}`);
      } catch (socketError) {
        console.warn(`[AUCTION_COMPLETION] Socket.IO emission failed for auction ${auctionId}:`, socketError.message);
        // Don't throw - auction completion succeeded even if notifications failed
      }
    }
    
    return {
      success: true,
      auctionId,
      winner: winner ? {
        id: winnerId,
        username: winner.username,
        email: winner.email
      } : null,
      finalPrice: winningAmount,
      message: `Auction completed. Winner: ${winner ? winner.username : 'Unknown'}`
    };
    
  } catch (error) {
    await connection.rollback();
    console.error(`[AUCTION_COMPLETION] ✗ Error completing auction ${auctionId}:`, {
      timestamp: new Date().toISOString(),
      auctionId,
      source,
      error: error.message,
      stack: error.stack
    });
    
    return {
      success: false,
      auctionId,
      error: error.message
    };
  } finally {
    connection.release();
  }
}

/**
 * Check if an auction should be completed (time expired)
 * @param {object} auction - Auction object with auction_end_time
 * @returns {boolean} True if auction should be completed
 */
export function shouldCompleteAuction(auction) {
  if (!auction || auction.status !== 'active') {
    return false;
  }
  
  const endTimeString = auction.auction_end_time || auction.end_time || auction.endTime;
  if (!endTimeString) {
    return false;
  }
  
  const endTime = new Date(endTimeString).getTime();
  const now = Date.now();
  
  return endTime <= now;
}

