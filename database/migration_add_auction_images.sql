-- Migration: Add Auction Images Table
-- Purpose: Store multiple images (up to 3) for each auction item

-- Create auction_images table
CREATE TABLE IF NOT EXISTS auction_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  auction_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  image_order INT DEFAULT 1,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_auction_id (auction_id),
  FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add primary_image_url column to auctions table if it doesn't exist
-- This will store the primary/featured image URL for quick access
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS primary_image_url VARCHAR(500);

-- Migrate existing image_url to primary_image_url for backward compatibility
UPDATE auctions SET primary_image_url = image_url WHERE primary_image_url IS NULL AND image_url IS NOT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_auction_images_order ON auction_images(auction_id, image_order);
