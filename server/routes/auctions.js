import express from 'express';
import jwt from 'jsonwebtoken';
import * as queries from '../services/queries.js';
import { completeAuction } from '../services/auctionCompletion.js';

const router = express.Router();

// Middleware to verify JWT token
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

// Get all active auctions
router.get('/active', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const auctions = await queries.getActiveAuctions(parseInt(limit), parseInt(offset));
    res.json(auctions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get auction by ID
router.get('/:id', async (req, res) => {
  try {
    const auction = await queries.getAuctionById(req.params.id);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }
    const bids = await queries.getAuctionBids(req.params.id);
    res.json({ ...auction, bids });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get auctions by category
router.get('/category/:categoryId', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const auctions = await queries.getAuctionsByCategory(
      req.params.categoryId,
      parseInt(limit),
      parseInt(offset)
    );
    res.json(auctions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get auctions by seller
router.get('/seller/:sellerId', verifyToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const auctions = await queries.getSellerAuctions(
      req.params.sellerId,
      parseInt(limit),
      parseInt(offset)
    );
    res.json(auctions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get ALL auctions (admin - includes ended)
router.get('/admin/all', verifyToken, async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const auctions = await queries.getAllAuctionsAdmin(
      parseInt(limit),
      parseInt(offset)
    );
    res.json(auctions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create auction (requires authentication)
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { title, description, categoryId, startingPrice, reservePrice, auctionEndTime, imageUrl, imageUrls, condition, location } = req.body;

    // Validate input
    if (!title || !description || !categoryId || !startingPrice || !auctionEndTime) {
      return res.status(400).json({ error: 'Missing required fields: title, description, categoryId, startingPrice, auctionEndTime' });
    }

    // Create auction in database
    const auctionId = await queries.createAuction({
      sellerId: req.userId,
      categoryId,
      title,
      description,
      startingPrice,
      reservePrice: reservePrice || startingPrice,
      auctionEndTime,
      imageUrl: imageUrl || 'https://via.placeholder.com/600x400',
      condition: condition || 'Used',
      location: location || 'Not specified'
    });

    // Store multiple images if provided
    if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
      for (let i = 0; i < Math.min(imageUrls.length, 3); i++) {
        await queries.addAuctionImage(auctionId, imageUrls[i], i + 1);
      }
      console.log(`✓ Added ${Math.min(imageUrls.length, 3)} images to auction ${auctionId}`);
    }

    // Update status to active
    await queries.updateAuctionStatus(auctionId, 'active');

    // Fetch and return the created auction
    const auction = await queries.getAuctionById(auctionId);

    res.json({
      success: true,
      auctionId,
      message: 'Auction created successfully',
      auction
    });

    console.log(`✓ Auction created: ${auctionId} by user ${req.userId}`);
  } catch (error) {
    console.error('Error creating auction:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update auction status (close, activate, etc.)
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const auctionId = req.params.id;

    if (!status) {
      return res.status(400).json({ error: 'status required' });
    }

    // Verify auction exists
    const auction = await queries.getAuctionById(auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Allow admin or the auction seller to modify status
    const requestingUser = await queries.getUserById(req.userId);
    const isAdmin = requestingUser && requestingUser.user_type === 'admin';
    if (auction.seller_id !== req.userId && !isAdmin) {
      return res.status(403).json({ error: 'Only auction seller or admin can modify auction status' });
    }

    // Update status
    const success = await queries.updateAuctionStatus(auctionId, status);

    if (success) {
      res.json({
        success: true,
        message: `Auction status updated to ${status}`,
        auctionId
      });
      console.log(`✓ Auction ${auctionId} status updated to ${status}`);
    } else {
      res.status(500).json({ error: 'Failed to update auction status' });
    }
  } catch (error) {
    console.error('Error updating auction status:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// AUCTION CLOSING & WINNER DECLARATION
// ========================================

// Close auction and declare winner
router.post('/:auctionId/close', verifyToken, async (req, res) => {
  try {
    const { auctionId } = req.params;
    const userId = req.userId;

    // Get auction
    const auction = await queries.getAuctionById(auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Verify user is admin or the seller
    const user = await queries.getUserById(userId);
    const isAdmin = user && user.user_type === 'admin';
    const isSeller = auction.seller_id === userId;

    if (!isAdmin && !isSeller) {
      return res.status(403).json({ error: 'Only the auction seller or admin can close the auction' });
    }

    // Check if auction is already ended
    if (auction.status === 'ended') {
      return res.status(400).json({ error: 'Auction is already closed' });
    }

    // Use the centralized auction completion service
    // Note: We don't pass io here since this is a REST endpoint
    // Real-time updates will be handled by the sweeper or socket events
    const result = await completeAuction(auctionId, 'admin', null);

    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Failed to close auction' });
    }

    if (result.winner) {
      res.json({
        success: true,
        message: 'Auction closed successfully',
        winner: {
          id: result.winner.id,
          username: result.winner.username,
          email: result.winner.email,
          winningBid: result.finalPrice
        }
      });

      console.log(`✓ Auction ${auctionId} closed by ${isAdmin ? 'admin' : 'seller'} ${userId}. Winner: ${result.winner.username} with ${result.finalPrice} CR`);
    } else {
      res.json({
        success: true,
        message: 'Auction closed with no bids',
        winner: null
      });

      console.log(`✓ Auction ${auctionId} closed by ${isAdmin ? 'admin' : 'seller'} ${userId} with no bids`);
    }
  } catch (error) {
    console.error('Error closing auction:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// USER AUCTION HISTORY & REPORTING
// ========================================

// Get auctions won by user
router.get('/user/won', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const wonAuctions = await queries.getUserWonAuctions(userId);

    res.json({
      success: true,
      count: wonAuctions.length,
      auctions: wonAuctions
    });
  } catch (error) {
    console.error('Error fetching won auctions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get auctions user bid on but lost
router.get('/user/lost', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const lostAuctions = await queries.getUserLostAuctions(userId);

    res.json({
      success: true,
      count: lostAuctions.length,
      auctions: lostAuctions
    });
  } catch (error) {
    console.error('Error fetching lost auctions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's bid history for specific auction
router.get('/:auctionId/user/bid-history', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { auctionId } = req.params;

    const bidHistory = await queries.getUserAuctionBidHistory(userId, auctionId);

    res.json({
      success: true,
      auctionId,
      bidCount: bidHistory.length,
      bids: bidHistory
    });
  } catch (error) {
    console.error('Error fetching bid history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's overall bidding history
router.get('/user/bidding-history', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 50, offset = 0 } = req.query;

    const biddingHistory = await queries.getUserBiddingHistory(
      userId,
      parseInt(limit),
      parseInt(offset)
    );

    res.json({
      success: true,
      count: biddingHistory.length,
      bidHistory: biddingHistory
    });
  } catch (error) {
    console.error('Error fetching bidding history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// CREDIT & FINANCIAL TRACKING
// ========================================

// Get user's credit balance and transaction history
router.get('/user/credits/history', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 50, offset = 0 } = req.query;

    const creditHistory = await queries.getUserCreditHistory(
      userId,
      parseInt(limit),
      parseInt(offset)
    );

    const creditSummary = await queries.getUserCreditSummary(userId);

    res.json({
      success: true,
      summary: creditSummary,
      transactionCount: creditHistory.length,
      transactions: creditHistory
    });
  } catch (error) {
    console.error('Error fetching credit history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user credit summary (balance, stats)
router.get('/user/credits/summary', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const creditSummary = await queries.getUserCreditSummary(userId);

    if (!creditSummary) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      currentBalance: creditSummary.current_balance,
      totalBidsPlaced: creditSummary.total_bids_placed,
      auctionsWon: creditSummary.auctions_won,
      totalSpent: creditSummary.total_spent || 0,
      totalReturned: creditSummary.total_returned || 0
    });
  } catch (error) {
    console.error('Error fetching credit summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// ADMIN REPORTING
// ========================================

// Get all auction winners (admin only)
router.get('/admin/winners', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await queries.getUserById(userId);

    // Check if user is admin
    if (user.user_type !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view all winners' });
    }

    const { limit = 100, offset = 0 } = req.query;
    const winners = await queries.getAllAuctionWinners(parseInt(limit), parseInt(offset));

    res.json({
      success: true,
      count: winners.length,
      winners: winners
    });
  } catch (error) {
    console.error('Error fetching winners:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get auction winner details (enhanced)
router.get('/:auctionId/winner', async (req, res) => {
  try {
    const { auctionId } = req.params;
    const winner = await queries.getAuctionWinnerDetails(auctionId);

    if (!winner) {
      return res.json({
        success: true,
        winner: null,
        message: 'No winner for this auction'
      });
    }

    res.json({
      success: true,
      winner: {
        id: winner.bidder_id,
        name: winner.username,
        email: winner.email,
        phone: winner.phone,
        firstName: winner.first_name,
        lastName: winner.last_name,
        bidAmount: `${winner.bid_amount} CR`,
        auctionTitle: winner.auction_title
      }
    });
  } catch (error) {
    console.error('Error fetching auction winner:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get auction images
router.get('/:auctionId/images', async (req, res) => {
  try {
    const { auctionId } = req.params;
    const images = await queries.getAuctionImages(auctionId);

    res.json({
      success: true,
      images: images.map(img => ({
        id: img.id,
        imageUrl: img.image_url,
        displayOrder: img.display_order,
        uploadedAt: img.uploaded_at
      }))
    });
  } catch (error) {
    console.error('Error fetching auction images:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
