-- Migration: Add Credits System
-- Date: March 10, 2026
-- Purpose: Add credits management for bidding system

USE bid_brilliance;

-- Step 1: Add credits column to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits DECIMAL(10, 2) DEFAULT 0.00;

-- Step 2: Create credits audit/history table
CREATE TABLE IF NOT EXISTS user_credits_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  transaction_type ENUM('initial_assignment', 'bid_placement', 'bid_return', 'auction_win', 'admin_adjustment', 'refund') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  balance_before DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  related_auction_id INT,
  related_bid_id INT,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT,
  INDEX idx_user_id (user_id),
  INDEX idx_auction_id (related_auction_id),
  INDEX idx_transaction_type (transaction_type),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (related_auction_id) REFERENCES auctions(id) ON DELETE SET NULL,
  FOREIGN KEY (related_bid_id) REFERENCES bids(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 3: Add columns to bids table to track credit state
ALTER TABLE bids ADD COLUMN IF NOT EXISTS credits_deducted DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS credits_returned BOOLEAN DEFAULT FALSE;

-- Step 4: Add proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_credits ON users(id, credits);
CREATE INDEX IF NOT EXISTS idx_auction_winner ON auctions(id, current_highest_bidder_id);
CREATE INDEX IF NOT EXISTS idx_bid_status_auction ON bids(auction_id, bid_status);

-- Step 5: Initialize credits for existing users (optional - set to 500 by default)
-- UPDATE users SET credits = 500 WHERE credits = 0;

-- Note: The check constraint for positive credits is already defined in the main schema

-- Create view for user credit summary
CREATE OR REPLACE VIEW user_credit_summary AS
SELECT 
  u.id,
  u.username,
  u.credits as current_credits,
  COALESCE(SUM(CASE WHEN uch.transaction_type = 'bid_placement' THEN -uch.amount ELSE uch.amount END), 0) as total_transactions,
  COUNT(DISTINCT CASE WHEN uch.transaction_type IN ('bid_placement', 'auction_win') THEN uch.related_auction_id END) as total_bids_placed,
  COUNT(DISTINCT CASE WHEN uch.transaction_type = 'auction_win' THEN uch.related_auction_id END) as auctions_won
FROM users u
LEFT JOIN user_credits_history uch ON u.id = uch.user_id
GROUP BY u.id, u.username, u.credits;

-- This script is idempotent and can be run multiple times safely
