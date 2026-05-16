-- Migration: Fix proxy_bids table structure
-- This migration updates the proxy_bids table to use correct column names

-- Drop the old table if it exists with wrong structure
DROP TABLE IF EXISTS proxy_bids;

-- Create the proxy_bids table with correct structure
CREATE TABLE IF NOT EXISTS proxy_bids (
  id INT PRIMARY KEY AUTO_INCREMENT,
  auction_id INT NOT NULL,
  bidder_id INT NOT NULL,
  max_bid_amount DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_auction_id (auction_id),
  INDEX idx_bidder_id (bidder_id),
  INDEX idx_is_active (is_active),
  UNIQUE KEY unique_active_proxy (auction_id, bidder_id, is_active),
  FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
  FOREIGN KEY (bidder_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add triggers for automatic bidding logic (optional)
-- This can be extended with stored procedures if needed
