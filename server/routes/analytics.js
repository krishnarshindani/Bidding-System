import express from 'express';
import pool from '../services/database.js';

const router = express.Router();

// Get auction statistics
router.get('/stats', async (req, res) => {
  try {
    const [[totalStats]] = await pool.query(`
      SELECT 
        COUNT(*) as totalAuctions,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeAuctions,
        (SELECT COUNT(*) FROM bids) as totalBids,
        COALESCE(SUM(current_bid_price), 0) as totalRevenue
      FROM auctions
    `);

    const [[categoryStats]] = await pool.query(`
      SELECT COUNT(DISTINCT category_id) as uniqueCategories
      FROM auctions
    `);

    res.json({
      totalAuctions: totalStats.totalAuctions,
      activeAuctions: totalStats.activeAuctions,
      totalBids: totalStats.totalBids || 0,
      totalRevenue: parseFloat(totalStats.totalRevenue) || 0,
      uniqueCategories: categoryStats.uniqueCategories,
      avgBidsPerAuction: totalStats.totalAuctions > 0 ? (totalStats.totalBids / totalStats.totalAuctions).toFixed(2) : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get bid trends (past 30 days)
router.get('/trends', async (req, res) => {
  try {
    const days = req.query.days || 30;
    
    const [trends] = await pool.query(`
      SELECT 
        DATE(b.created_at) as date,
        COUNT(*) as bids,
        SUM(b.bid_amount) as revenue,
        COUNT(DISTINCT a.id) as auctions
      FROM bids b
      LEFT JOIN auctions a ON b.auction_id = a.id
      WHERE b.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(b.created_at)
      ORDER BY date ASC
    `, [days]);

    res.json(trends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get bid activity by hour (24-hour view)
router.get('/bid-activity', async (req, res) => {
  try {
    const [activity] = await pool.query(`
      SELECT 
        HOUR(CONVERT_TZ(b.created_at, '+00:00', @@session.time_zone)) as hour,
        COUNT(*) as bids
      FROM bids b
      WHERE b.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
      GROUP BY HOUR(CONVERT_TZ(b.created_at, '+00:00', @@session.time_zone))
      ORDER BY hour ASC
    `);

    // Format for display
    const data = Array.from({ length: 24 }, (_, i) => {
      const record = activity.find(a => a.hour === i);
      return {
        hour: `${String(i).padStart(2, '0')}:00`,
        bids: record ? record.bids : 0
      };
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get category distribution
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await pool.query(`
      SELECT 
        c.id,
        c.name,
        COUNT(a.id) as auctionCount,
        COUNT(DISTINCT b.id) as bidCount,
        COALESCE(SUM(b.bid_amount), 0) as totalBidValue
      FROM categories c
      LEFT JOIN auctions a ON c.id = a.category_id
      LEFT JOIN bids b ON a.id = b.auction_id
      GROUP BY c.id, c.name
      HAVING auctionCount > 0
      ORDER BY auctionCount DESC
    `);

    // Calculate percentages
    const total = categories.reduce((sum, cat) => sum + cat.auctionCount, 0);
    const formatted = categories.map(cat => ({
      name: cat.name,
      value: total > 0 ? Math.round((cat.auctionCount / total) * 100) : 0,
      count: cat.auctionCount,
      bids: cat.bidCount,
      revenue: parseFloat(cat.totalBidValue)
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get live bid notifications (recent bidding activity)
router.get('/live-bids', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || 10, 10);
    
    const [bids] = await pool.query(`
      SELECT 
        b.id,
        b.bid_amount as amount,
        b.bidder_id,
        u.username as bidderName,
        a.id as auctionId,
        a.title,
        b.created_at as timestamp
      FROM bids b
      LEFT JOIN users u ON b.bidder_id = u.id
      LEFT JOIN auctions a ON b.auction_id = a.id
      ORDER BY b.created_at DESC
      LIMIT ?
    `, [limit]);

    res.json(bids);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Top auctions by current price / bids (for leaderboard)
router.get('/top-auctions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || 8, 10);

    const [rows] = await pool.query(`
      SELECT 
        a.id,
        a.title,
        a.status,
        COALESCE(a.current_bid_price, a.starting_price, 0) AS current_bid_price,
        COUNT(b.id) AS total_bids
      FROM auctions a
      LEFT JOIN bids b ON b.auction_id = a.id
      GROUP BY a.id, a.title, a.status, a.current_bid_price, a.starting_price
      ORDER BY COALESCE(a.current_bid_price, a.starting_price, 0) DESC
      LIMIT ?
    `, [limit]);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


export default router;
