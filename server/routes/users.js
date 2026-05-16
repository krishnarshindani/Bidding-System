import express from 'express';
import * as queries from '../services/queries.js';
import jwt from 'jsonwebtoken';

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

// Get user profile and credits
router.get('/profile/:userId', async (req, res) => {
  try {
    const user = await queries.getUserCredits(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      credits: user.credits
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user credits (requires auth)
router.get('/credits', verifyToken, async (req, res) => {
  try {
    const user = await queries.getUserCredits(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      credits: user.credits,
      userId: user.id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get credit history (requires auth)
router.get('/credits/history/:userId', verifyToken, async (req, res) => {
  try {
    // Only allow users to see their own history or admin
    if (req.userId !== parseInt(req.params.userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const history = await queries.getCreditHistory(req.params.userId, 100);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all users (requires auth)
router.get('/admin/all', verifyToken, async (req, res) => {
  try {
    // Get all users from database
    const users = await queries.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Assign credits to user
router.post('/admin/assign-credits', verifyToken, async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ error: 'userId and amount required' });
    }

    // TODO: Verify admin role
    const result = await queries.assignCreditsToUser(userId, amount, req.userId, reason);
    
    res.json({
      success: true,
      message: `${amount} credits assigned to user ${userId}`,
      result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Deduct credits (refund or adjustment)
router.post('/admin/deduct-credits', verifyToken, async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ error: 'userId and amount required' });
    }

    // TODO: Verify admin role
    const result = await queries.deductCredits(
      userId,
      amount,
      'admin_adjustment',
      null,
      null,
      reason || 'Admin adjustment'
    );
    
    res.json({
      success: true,
      message: `${amount} credits deducted from user ${userId}`,
      result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user notifications
router.get('/notifications/:userId', verifyToken, async (req, res) => {
  try {
    const notifications = await queries.getUserNotifications(parseInt(req.params.userId), false);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user bid history
router.get('/bid-history/:userId', verifyToken, async (req, res) => {
  try {
    const bids = await queries.getUserBidHistory(parseInt(req.params.userId), 50);
    res.json(bids);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's available credits (total credits minus credits tied up in active bids)
router.get('/available-credits', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const creditSummary = await queries.getUserAvailableCredits(userId);
    if (!creditSummary) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      success: true,
      totalCredits: creditSummary.total_credits,
      creditsTiedUp: creditSummary.credits_tied_up,
      availableCredits: creditSummary.available_credits
    });
  } catch (error) {
    console.error('Error fetching available credits:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's detailed credit summary
router.get('/credit-summary', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const creditSummary = await queries.getUserCreditSummaryDetailed(userId);
    if (!creditSummary) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      success: true,
      totalCredits: creditSummary.total_credits,
      creditsTiedUp: creditSummary.credits_tied_up,
      creditsWon: creditSummary.credits_won,
      availableCredits: creditSummary.available_credits,
      activeBids: creditSummary.active_bids,
      winningBids: creditSummary.winning_bids
    });
  } catch (error) {
    console.error('Error fetching credit summary:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
