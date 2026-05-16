import pool from './database.js';

// User queries
export const getUserById = async (userId) => {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE id = ?',
    [userId]
  );
  return rows[0];
};

export const getUserByEmail = async (email) => {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );
  return rows[0];
};

export const createUser = async (userData) => {
  const { email, username, passwordHash, firstName, lastName, userType = 'buyer' } = userData;
  const [result] = await pool.query(
    'INSERT INTO users (email, username, password_hash, first_name, last_name, user_type) VALUES (?, ?, ?, ?, ?, ?)',
    [email, username, passwordHash, firstName, lastName, userType]
  );
  return result.insertId;
};

export const updateUser = async (userId, updates) => {
  const allowedFields = ['first_name', 'last_name', 'bio', 'phone', 'address', 'profile_image_url'];
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (allowedFields.includes(snakeKey)) {
      fields.push(`${snakeKey} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return false;

  values.push(userId);
  const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
  const [result] = await pool.query(query, values);
  return result.affectedRows > 0;
};

// Auction queries
export const getAuctionById = async (auctionId) => {
  const [rows] = await pool.query(
    `SELECT a.*, 
            u.username as seller_name, 
            c.name as category_name,
            COALESCE(hbu.first_name, hbu.username) as current_bidder_name
     FROM auctions a
     LEFT JOIN users u ON a.seller_id = u.id
     LEFT JOIN categories c ON a.category_id = c.id
     LEFT JOIN users hbu ON a.current_highest_bidder_id = hbu.id
     WHERE a.id = ?`,
    [auctionId]
  );
  return rows[0];
};

export const getActiveAuctions = async (limit = 20, offset = 0) => {
  const [rows] = await pool.query(
    `SELECT a.*, u.username as seller_name, c.name as category_name,
            (SELECT COUNT(*) FROM bids WHERE auction_id = a.id) as total_bids
     FROM auctions a
     LEFT JOIN users u ON a.seller_id = u.id
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE a.status = 'active' AND a.auction_end_time > NOW()
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows;
};

// Get active auctions whose end time has passed (for the sweeper to auto-close)
export const getExpiredActiveAuctions = async (limit = 100) => {
  const [rows] = await pool.query(
    `SELECT a.*, u.username as seller_name, c.name as category_name,
            (SELECT COUNT(*) FROM bids WHERE auction_id = a.id) as total_bids
     FROM auctions a
     LEFT JOIN users u ON a.seller_id = u.id
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE a.status = 'active' AND a.auction_end_time <= NOW()
     ORDER BY a.auction_end_time ASC
     LIMIT ?`,
    [limit]
  );
  return rows;
};

export const getAuctionsByCategory = async (categoryId, limit = 20, offset = 0) => {
  const [rows] = await pool.query(
    `SELECT a.*, u.username as seller_name, c.name as category_name
     FROM auctions a
     LEFT JOIN users u ON a.seller_id = u.id
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE a.category_id = ? AND a.status = 'active'
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
    [categoryId, limit, offset]
  );
  return rows;
};

export const createAuction = async (auctionData) => {
  const {
    sellerId, categoryId, title, description, startingPrice,
    reservePrice, auctionEndTime, imageUrl, condition, location
  } = auctionData;

  const [result] = await pool.query(
    `INSERT INTO auctions 
     (seller_id, category_id, title, description, starting_price, reserve_price, 
      auction_end_time, image_url, \`condition\`, location, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
    [sellerId, categoryId, title, description, startingPrice, reservePrice,
      auctionEndTime, imageUrl, condition, location]
  );
  return result.insertId;
};

export const updateAuctionStatus = async (auctionId, status) => {
  const [result] = await pool.query(
    'UPDATE auctions SET status = ? WHERE id = ?',
    [status, auctionId]
  );
  return result.affectedRows > 0;
};

export const updateAuctionEndTime = async (auctionId, newEndTime) => {
  const [result] = await pool.query(
    'UPDATE auctions SET auction_end_time = ? WHERE id = ?',
    [newEndTime, auctionId]
  );
  return result.affectedRows > 0;
};

// Check if auction is in last N seconds
export const isAuctionInLastSeconds = async (auctionId, seconds) => {
  const [rows] = await pool.query(
    `SELECT auction_end_time FROM auctions WHERE id = ?`,
    [auctionId]
  );
  
  if (rows.length === 0) {
    return false;
  }
  
  const endTime = new Date(rows[0].auction_end_time);
  const now = new Date();
  const timeDiff = endTime.getTime() - now.getTime();
  
  return timeDiff <= (seconds * 1000) && timeDiff > 0;
};

// Get auction time remaining in milliseconds
export const getAuctionTimeRemaining = async (auctionId) => {
  const [rows] = await pool.query(
    `SELECT auction_end_time FROM auctions WHERE id = ?`,
    [auctionId]
  );
  
  if (rows.length === 0) {
    return 0;
  }
  
  const endTime = new Date(rows[0].auction_end_time);
  const now = new Date();
  const timeDiff = endTime.getTime() - now.getTime();
  
  return Math.max(0, timeDiff);
};

// Bid queries
export const createBid = async (bidData) => {
  const { auctionId, bidderId, bidAmount } = bidData;
  const [result] = await pool.query(
    `INSERT INTO bids (auction_id, bidder_id, bid_amount, bid_status)
     VALUES (?, ?, ?, 'active')`,
    [auctionId, bidderId, bidAmount]
  );
  return result.insertId;
};

export const getAuctionBids = async (auctionId) => {
  const [rows] = await pool.query(
    `SELECT b.*, u.username as bidder_name
     FROM bids b
     LEFT JOIN users u ON b.bidder_id = u.id
     WHERE b.auction_id = ?
     ORDER BY b.bid_amount DESC`,
    [auctionId]
  );
  return rows;
};

export const getHighestBid = async (auctionId) => {
  const [rows] = await pool.query(
    `SELECT * FROM bids
     WHERE auction_id = ? AND bid_status = 'active'
     ORDER BY bid_amount DESC
     LIMIT 1`,
    [auctionId]
  );
  return rows[0];
};

export const updateAuctionCurrentBid = async (auctionId, amount, bidderId) => {
  const [result] = await pool.query(
    `UPDATE auctions
     SET current_bid_price = ?, current_highest_bidder_id = ?, updated_at = NOW()
     WHERE id = ?`,
    [amount, bidderId, auctionId]
  );
  return result.affectedRows > 0;
};

export const updateBidCreditsDeducted = async (bidId, creditsDeducted) => {
  const [result] = await pool.query(
    'UPDATE bids SET credits_deducted = ? WHERE id = ?',
    [creditsDeducted, bidId]
  );
  return result.affectedRows > 0;
};

export const markBidAsOutbid = async (bidId) => {
  const [result] = await pool.query(
    'UPDATE bids SET bid_status = ?, credits_returned = TRUE WHERE id = ?',
    ['outbid', bidId]
  );
  return result.affectedRows > 0;
};

// Mark bid as won (for auction completion)
export const markBidAsWon = async (bidId) => {
  const [result] = await pool.query(
    'UPDATE bids SET bid_status = ? WHERE id = ?',
    ['won', bidId]
  );
  return result.affectedRows > 0;
};

export const getAllBids = async (limit = 100) => {
  const [rows] = await pool.query(
    `SELECT b.*, u.username as bidder_name, a.title as auction_title
     FROM bids b
     LEFT JOIN users u ON b.bidder_id = u.id
     LEFT JOIN auctions a ON b.auction_id = a.id
     ORDER BY b.created_at DESC
     LIMIT ?`,
    [limit]
  );
  return rows;
};

// Mark all other bids as outbid (for auction completion)
export const markOtherBidsAsOutbid = async (auctionId, winningBidId) => {
  const [result] = await pool.query(
    'UPDATE bids SET bid_status = ? WHERE auction_id = ? AND id != ? AND bid_status = ?',
    ['outbid', auctionId, winningBidId, 'active']
  );
  return result.affectedRows;
};

// Watchlist queries
export const addToWatchlist = async (userId, auctionId) => {
  try {
    const [result] = await pool.query(
      'INSERT INTO watchlist (user_id, auction_id) VALUES (?, ?)',
      [userId, auctionId]
    );
    return result.insertId;
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return null; // Already in watchlist
    }
    throw error;
  }
};

export const removeFromWatchlist = async (userId, auctionId) => {
  const [result] = await pool.query(
    'DELETE FROM watchlist WHERE user_id = ? AND auction_id = ?',
    [userId, auctionId]
  );
  return result.affectedRows > 0;
};

export const getUserWatchlist = async (userId) => {
  const [rows] = await pool.query(
    `SELECT a.*, u.username as seller_name, c.name as category_name
     FROM watchlist w
     JOIN auctions a ON w.auction_id = a.id
     LEFT JOIN users u ON a.seller_id = u.id
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE w.user_id = ? AND a.status = 'active'
     ORDER BY w.created_at DESC`,
    [userId]
  );
  return rows;
};

// Message queries
export const createMessage = async (messageData) => {
  const { senderId, receiverId, auctionId, messageText } = messageData;
  const [result] = await pool.query(
    `INSERT INTO messages (sender_id, receiver_id, auction_id, message_text)
     VALUES (?, ?, ?, ?)`,
    [senderId, receiverId, auctionId, messageText]
  );
  return result.insertId;
};

export const getConversation = async (userId, otherId, limit = 50) => {
  const [rows] = await pool.query(
    `SELECT * FROM messages
     WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, otherId, otherId, userId, limit]
  );
  return rows.reverse();
};

// Notification queries
export const createNotification = async (notificationData) => {
  const { userId, type, title, message, relatedAuctionId, relatedUserId } = notificationData;
  const [result] = await pool.query(
    `INSERT INTO notifications (user_id, type, title, message, related_auction_id, related_user_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, type, title, message, relatedAuctionId, relatedUserId]
  );
  return result.insertId;
};

export const getUserNotifications = async (userId, unreadOnly = false) => {
  let query = 'SELECT * FROM notifications WHERE user_id = ?';
  const params = [userId];

  if (unreadOnly) {
    query += ' AND is_read = FALSE';
  }

  query += ' ORDER BY created_at DESC LIMIT 50';
  const [rows] = await pool.query(query, params);
  return rows;
};

export const markNotificationAsRead = async (notificationId) => {
  const [result] = await pool.query(
    'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ?',
    [notificationId]
  );
  return result.affectedRows > 0;
};

// Category queries
export const getAllCategories = async () => {
  const [rows] = await pool.query(
    'SELECT * FROM categories WHERE is_active = TRUE ORDER BY name'
  );
  return rows;
};

export const getCategoryById = async (categoryId) => {
  const [rows] = await pool.query(
    'SELECT * FROM categories WHERE id = ? AND is_active = TRUE',
    [categoryId]
  );
  return rows[0];
};

// Credit management queries
export const getUserCredits = async (userId) => {
  const [rows] = await pool.query(
    'SELECT id, email, username, user_type, credits FROM users WHERE id = ?',
    [userId]
  );
  return rows[0];
};

// Get user's available credits (total credits minus credits tied up in active bids)
export const getUserAvailableCredits = async (userId) => {
  const [rows] = await pool.query(
    `SELECT u.id, u.credits as total_credits,
            COALESCE(SUM(CASE WHEN b.bid_status = 'active' THEN b.bid_amount ELSE 0 END), 0) as credits_tied_up,
            (u.credits - COALESCE(SUM(CASE WHEN b.bid_status = 'active' THEN b.bid_amount ELSE 0 END), 0)) as available_credits
     FROM users u
     LEFT JOIN bids b ON u.id = b.bidder_id AND b.bid_status = 'active'
     WHERE u.id = ?
     GROUP BY u.id, u.credits`,
    [userId]
  );
  return rows[0];
};

// Get user's credit summary with detailed breakdown
export const getUserCreditSummaryDetailed = async (userId) => {
  const [rows] = await pool.query(
    `SELECT 
       u.id,
       u.username,
       u.credits as total_credits,
       COALESCE(SUM(CASE WHEN b.bid_status = 'active' THEN b.bid_amount ELSE 0 END), 0) as credits_tied_up,
       COALESCE(SUM(CASE WHEN b.bid_status = 'won' THEN b.bid_amount ELSE 0 END), 0) as credits_won,
       (u.credits - COALESCE(SUM(CASE WHEN b.bid_status = 'active' THEN b.bid_amount ELSE 0 END), 0)) as available_credits,
       COUNT(DISTINCT CASE WHEN b.bid_status = 'active' THEN b.id END) as active_bids,
       COUNT(DISTINCT CASE WHEN b.bid_status = 'won' THEN b.id END) as winning_bids
     FROM users u
     LEFT JOIN bids b ON u.id = b.bidder_id
     WHERE u.id = ?
     GROUP BY u.id, u.username, u.credits`,
    [userId]
  );
  return rows[0];
};

export const deductCredits = async (userId, amount, transactionType, relatedAuctionId = null, relatedBidId = null, description = '') => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get current credits
    const [user] = await connection.query(
      'SELECT credits FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );

    if (!user[0]) {
      throw new Error('User not found');
    }

    const currentCredits = user[0].credits;

    // Check if user has sufficient credits
    if (currentCredits < amount) {
      throw new Error(`Insufficient credits. Have ${currentCredits}, need ${amount}`);
    }

    // Deduct credits
    const [updateResult] = await connection.query(
      'UPDATE users SET credits = credits - ? WHERE id = ?',
      [amount, userId]
    );

    // Log transaction
    const [logResult] = await connection.query(
      `INSERT INTO user_credits_history 
       (user_id, transaction_type, amount, balance_before, balance_after, related_auction_id, related_bid_id, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, transactionType, amount, currentCredits, currentCredits - amount, relatedAuctionId, relatedBidId, description]
    );

    await connection.commit();

    return {
      success: true,
      balanceBefore: currentCredits,
      balanceAfter: currentCredits - amount,
      historyId: logResult.insertId
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const addCredits = async (userId, amount, transactionType, relatedAuctionId = null, relatedBidId = null, description = '') => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Get current credits
    const [user] = await connection.query(
      'SELECT credits FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );

    if (!user[0]) {
      throw new Error('User not found');
    }

    const currentCredits = user[0].credits;

    // Add credits
    const [updateResult] = await connection.query(
      'UPDATE users SET credits = credits + ? WHERE id = ?',
      [amount, userId]
    );

    // Log transaction
    const [logResult] = await connection.query(
      `INSERT INTO user_credits_history 
       (user_id, transaction_type, amount, balance_before, balance_after, related_auction_id, related_bid_id, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, transactionType, amount, currentCredits, currentCredits + amount, relatedAuctionId, relatedBidId, description]
    );

    await connection.commit();

    return {
      success: true,
      balanceBefore: currentCredits,
      balanceAfter: currentCredits + amount,
      historyId: logResult.insertId
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const assignCreditsToUser = async (userId, amount, adminId, reason = '') => {
  return addCredits(userId, amount, 'admin_adjustment', null, null, `Admin assigned: ${reason}`);
};

// Get all users (for admin panel)
export const getAllUsers = async () => {
  const [rows] = await pool.query(
    `SELECT id, email, username, user_type, credits, first_name, last_name, created_at 
     FROM users 
     ORDER BY created_at DESC`
  );
  return rows;
};

// Update last login timestamp
export const updateLastLogin = async (userId) => {
  const [result] = await pool.query(
    'UPDATE users SET last_login = NOW() WHERE id = ?',
    [userId]
  );
  return result.affectedRows > 0;
};

// Get auctions by seller
export const getSellerAuctions = async (sellerId, limit = 50, offset = 0) => {
  const [rows] = await pool.query(
    `SELECT a.*, c.name as category_name,
            (SELECT COUNT(*) FROM bids WHERE auction_id = a.id) as total_bids,
            (SELECT u.username FROM users u WHERE u.id = a.current_highest_bidder_id) as current_bidder_name
     FROM auctions a
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE a.seller_id = ?
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
    [sellerId, limit, offset]
  );
  return rows;
};

// Get ALL auctions for admin (including ended)
export const getAllAuctionsAdmin = async (limit = 100, offset = 0) => {
  const [rows] = await pool.query(
    `SELECT a.*, u.username as seller_name, c.name as category_name,
            (SELECT COUNT(*) FROM bids WHERE auction_id = a.id) as total_bids,
            COALESCE(hbu.first_name, hbu.username) as current_bidder_name
     FROM auctions a
     LEFT JOIN users u ON a.seller_id = u.id
     LEFT JOIN categories c ON a.category_id = c.id
     LEFT JOIN users hbu ON a.current_highest_bidder_id = hbu.id
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows;
};

// Get user's bid history
export const getUserBidHistory = async (userId, limit = 50) => {
  const [rows] = await pool.query(
    `SELECT b.*, a.title as auction_title, a.image_url as auction_image, 
            a.status as auction_status, a.auction_end_time,
            c.name as category_name
     FROM bids b
     LEFT JOIN auctions a ON b.auction_id = a.id
     LEFT JOIN categories c ON a.category_id = c.id
     WHERE b.bidder_id = ?
     ORDER BY b.created_at DESC
     LIMIT ?`,
    [userId, limit]
  );
  return rows;
};

// Proxy Bid queries
export const createProxyBid = async (auctionId, bidderId, maxBidAmount) => {
  const [result] = await pool.query(
    `INSERT INTO proxy_bids (auction_id, bidder_id, max_bid_amount, is_active)
     VALUES (?, ?, ?, TRUE)`,
    [auctionId, bidderId, maxBidAmount]
  );
  return result.insertId;
};

export const getActiveProxyBid = async (auctionId, bidderId) => {
  const [rows] = await pool.query(
    `SELECT * FROM proxy_bids
     WHERE auction_id = ? AND bidder_id = ? AND is_active = TRUE`,
    [auctionId, bidderId]
  );
  return rows[0];
};

export const getProxyBidById = async (proxyBidId) => {
  const [rows] = await pool.query(
    `SELECT * FROM proxy_bids WHERE id = ?`,
    [proxyBidId]
  );
  return rows[0];
};

export const getAuctionProxyBids = async (auctionId) => {
  const [rows] = await pool.query(
    `SELECT pb.*, u.username as bidder_name, u.first_name
     FROM proxy_bids pb
     LEFT JOIN users u ON pb.bidder_id = u.id
     WHERE pb.auction_id = ? AND pb.is_active = TRUE
     ORDER BY pb.max_bid_amount DESC`,
    [auctionId]
  );
  return rows;
};

export const updateProxyBid = async (proxyBidId, maxBidAmount) => {
  const [result] = await pool.query(
    `UPDATE proxy_bids
     SET max_bid_amount = ?, updated_at = NOW()
     WHERE id = ?`,
    [maxBidAmount, proxyBidId]
  );
  return result.affectedRows > 0;
};

export const deactivateProxyBid = async (proxyBidId) => {
  const [result] = await pool.query(
    `UPDATE proxy_bids
     SET is_active = FALSE, updated_at = NOW()
     WHERE id = ?`,
    [proxyBidId]
  );
  return result.affectedRows > 0;
};

export const getUserProxyBids = async (userId) => {
  const [rows] = await pool.query(
    `SELECT pb.*, a.title as auction_title, a.current_bid_price
     FROM proxy_bids pb
     LEFT JOIN auctions a ON pb.auction_id = a.id
     WHERE pb.bidder_id = ? AND pb.is_active = TRUE
     ORDER BY pb.created_at DESC`,
    [userId]
  );
  return rows;
};

// User Auction History & Reporting Queries

// Get auctions won by user
export const getUserWonAuctions = async (userId) => {
  const [rows] = await pool.query(
    `SELECT a.*, u.username as seller_name, c.name as category_name,
            b.bid_amount as winning_bid_amount, b.created_at as bid_time
     FROM auctions a
     LEFT JOIN users u ON a.seller_id = u.id
     LEFT JOIN categories c ON a.category_id = c.id
     LEFT JOIN bids b ON a.id = b.auction_id AND b.bidder_id = ? AND b.bid_status = 'won'
     WHERE a.current_highest_bidder_id = ? AND a.status = 'ended'
     ORDER BY a.updated_at DESC`,
    [userId, userId]
  );
  return rows;
};

// Get auctions user participated in (bid but didn't win)
export const getUserLostAuctions = async (userId) => {
  const [rows] = await pool.query(
    `SELECT DISTINCT a.*, u.username as seller_name, c.name as category_name,
            hb.bid_amount as highest_bid, hb.bidder_id as winner_id, wu.username as winner_name,
            MAX(ub.bid_amount) as my_highest_bid
     FROM auctions a
     LEFT JOIN users u ON a.seller_id = u.id
     LEFT JOIN categories c ON a.category_id = c.id
     LEFT JOIN bids hb ON a.id = hb.auction_id AND hb.bid_status = 'won'
     LEFT JOIN users wu ON hb.bidder_id = wu.id
     INNER JOIN bids ub ON a.id = ub.auction_id AND ub.bidder_id = ?
     WHERE a.status = 'ended' AND (a.current_highest_bidder_id != ? OR a.current_highest_bidder_id IS NULL)
     GROUP BY a.id, u.username, c.name, hb.bid_amount, hb.bidder_id, wu.username
     ORDER BY a.updated_at DESC`,
    [userId, userId]
  );
  return rows;
};

// Get user's bid history for an auction
export const getUserAuctionBidHistory = async (userId, auctionId) => {
  const [rows] = await pool.query(
    `SELECT b.*, u.username as bidder_name
     FROM bids b
     LEFT JOIN users u ON b.bidder_id = u.id
     WHERE b.bidder_id = ? AND b.auction_id = ?
     ORDER BY b.created_at DESC`,
    [userId, auctionId]
  );
  return rows;
};

// Get all bids for a user across all auctions
export const getUserBiddingHistory = async (userId, limit = 50, offset = 0) => {
  const [rows] = await pool.query(
    `SELECT b.*, a.title as auction_title, u.username as auction_seller,
            CASE 
              WHEN b.bid_status IN ('won', 'winning') THEN 'Won'
              WHEN b.bid_status = 'outbid' THEN 'Outbid'
              ELSE 'Active'
            END as status_display
     FROM bids b
     LEFT JOIN auctions a ON b.auction_id = a.id
     LEFT JOIN users u ON a.seller_id = u.id
     WHERE b.bidder_id = ?
     ORDER BY b.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );
  return rows;
};

// Get user's credit transactions/history
export const getUserCreditHistory = async (userId, limit = 50, offset = 0) => {
  const [rows] = await pool.query(
    `SELECT uch.*, a.title as auction_title
     FROM user_credits_history uch
     LEFT JOIN auctions a ON uch.related_auction_id = a.id
     WHERE uch.user_id = ?
     ORDER BY uch.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );
  return rows;
};

// Get credit summary for user
export const getUserCreditSummary = async (userId) => {
  const [rows] = await pool.query(
    `SELECT 
       u.id,
       u.username,
       u.credits as current_balance,
       COUNT(DISTINCT CASE WHEN uch.transaction_type = 'bid_placement' THEN uch.related_auction_id END) as total_bids_placed,
       COUNT(DISTINCT CASE WHEN b.bid_status = 'winning' THEN b.auction_id END) as auctions_won,
       SUM(CASE WHEN uch.transaction_type = 'bid_placement' THEN uch.amount ELSE 0 END) as total_spent,
       SUM(CASE WHEN uch.transaction_type = 'bid_return' THEN uch.amount ELSE 0 END) as total_returned
     FROM users u
     LEFT JOIN user_credits_history uch ON u.id = uch.user_id
     LEFT JOIN bids b ON u.id = b.bidder_id
     WHERE u.id = ?
     GROUP BY u.id, u.username, u.credits`,
    [userId]
  );
  return rows[0];
};

// Get all auction winners (for admin)
export const getAllAuctionWinners = async (limit = 50, offset = 0) => {
  const [rows] = await pool.query(
    `SELECT a.*, u.username as seller_name, c.name as category_name,
            b.id as winning_bid_id, b.bidder_id as winner_id,
            COALESCE(wu.first_name, wu.username, hbu.first_name, hbu.username) as winner_name,
            COALESCE(b.bid_amount, a.current_bid_price) as bid_amount,
            COALESCE(b.created_at, a.updated_at) as bid_time
     FROM auctions a
     LEFT JOIN users u ON a.seller_id = u.id
     LEFT JOIN categories c ON a.category_id = c.id
     LEFT JOIN bids b ON a.id = b.auction_id AND b.bid_status = 'won'
     LEFT JOIN users wu ON b.bidder_id = wu.id
     LEFT JOIN users hbu ON a.current_highest_bidder_id = hbu.id
     WHERE a.status = 'ended'
     ORDER BY a.updated_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows;
};

// Get auction winner details
export const getAuctionWinner = async (auctionId) => {
  const [rows] = await pool.query(
    `SELECT b.*, u.username as winner_name, u.email as winner_email
     FROM bids b
     LEFT JOIN users u ON b.bidder_id = u.id
     WHERE b.auction_id = ? AND b.bid_status = 'won'
     LIMIT 1`,
    [auctionId]
  );
  return rows[0];
};

// Get complete auction winner details (enhanced)
export const getAuctionWinnerDetails = async (auctionId) => {
  const [rows] = await pool.query(
    `SELECT b.*, 
            u.username, u.email, u.phone, u.first_name, u.last_name,
            a.title as auction_title, a.description as auction_description,
            a.starting_price, a.current_bid_price, a.auction_end_time
     FROM bids b
     JOIN users u ON b.bidder_id = u.id
     JOIN auctions a ON b.auction_id = a.id
     WHERE b.auction_id = ? AND b.bid_status = 'won'
     LIMIT 1`,
    [auctionId]
  );
  return rows[0];
};

// Close an auction and mark winner
export const closeAuctionAndDeclareWinner = async (auctionId) => {
  // Get highest bid
  const [bids] = await pool.query(
    `SELECT * FROM bids WHERE auction_id = ? AND bid_status = 'active' ORDER BY bid_amount DESC LIMIT 1`,
    [auctionId]
  );

  if (bids.length > 0) {
    const highestBid = bids[0];
    
    // Mark this bid as winning
    await pool.query(
      'UPDATE bids SET bid_status = ? WHERE id = ?',
      ['winning', highestBid.id]
    );

    // Update auction status to ended
    await pool.query(
      'UPDATE auctions SET status = ?, updated_at = NOW() WHERE id = ?',
      ['ended', auctionId]
    );

    return highestBid;
  } else {
    // No bids - auction ended with no winner
    await pool.query(
      'UPDATE auctions SET status = ?, updated_at = NOW() WHERE id = ?',
      ['ended', auctionId]
    );
    return null;
  }
};

// Auction Images queries
export const addAuctionImage = async (auctionId, imageUrl, imageOrder = 1) => {
  const [result] = await pool.query(
    `INSERT INTO auction_images (auction_id, image_url, display_order)
     VALUES (?, ?, ?)`,
    [auctionId, imageUrl, imageOrder]
  );
  return result.insertId;
};

export const getAuctionImages = async (auctionId) => {
  const [rows] = await pool.query(
    `SELECT * FROM auction_images
     WHERE auction_id = ?
     ORDER BY display_order ASC`,
    [auctionId]
  );
  return rows;
};

export const deleteAuctionImage = async (imageId) => {
  const [result] = await pool.query(
    `DELETE FROM auction_images WHERE id = ?`,
    [imageId]
  );
  return result.affectedRows > 0;
};

export const updateAuctionImageOrder = async (imageId, newOrder) => {
  const [result] = await pool.query(
    `UPDATE auction_images SET display_order = ? WHERE id = ?`,
    [newOrder, imageId]
  );
  return result.affectedRows > 0;
};
