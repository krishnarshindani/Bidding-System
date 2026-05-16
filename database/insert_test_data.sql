-- Test Data Insert Queries for Bid Brilliance

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

USE bid_brilliance;

-- ========== USERS ==========
-- Insert admin user (skip if exists)
INSERT IGNORE INTO users (id, email, username, password_hash, first_name, last_name, user_type, email_verified, account_status, kyc_status, credits)
VALUES (1, 'admin@bidbrilliance.com', 'admin', '$2a$10$fVftV3/jyH/ClU1qkR/Rs.UdbAqIyb.QqWHi.V7gEQP20FmuHfD86', 'Admin', 'User', 'admin', TRUE, 'active', 'verified', 0.00);

-- Insert seller users (skip if exists)
INSERT IGNORE INTO users (id, email, username, password_hash, first_name, last_name, user_type, email_verified, account_status, kyc_status, rating, credits)
VALUES 
(2, 'seller1@bidbrilliance.com', 'seller1', '$2a$10$fVftV3/jyH/ClU1qkR/Rs.UdbAqIyb.QqWHi.V7gEQP20FmuHfD86', 'John', 'Smith', 'seller', TRUE, 'active', 'verified', 4.8, 0.00),
(3, 'seller2@bidbrilliance.com', 'seller2', '$2a$10$fVftV3/jyH/ClU1qkR/Rs.UdbAqIyb.QqWHi.V7gEQP20FmuHfD86', 'Sarah', 'Johnson', 'seller', TRUE, 'active', 'verified', 4.5, 0.00),
(4, 'seller3@bidbrilliance.com', 'seller3', '$2a$10$fVftV3/jyH/ClU1qkR/Rs.UdbAqIyb.QqWHi.V7gEQP20FmuHfD86', 'Mike', 'Davis', 'seller', TRUE, 'active', 'verified', 4.9, 0.00);

-- Insert buyer/bidder users (skip if exists)
INSERT IGNORE INTO users (id, email, username, password_hash, first_name, last_name, user_type, email_verified, account_status, kyc_status, credits)
VALUES 
(5, 'bidder1@bidbrilliance.com', 'bidder1', '$2a$10$fVftV3/jyH/ClU1qkR/Rs.UdbAqIyb.QqWHi.V7gEQP20FmuHfD86', 'Alice', 'Wilson', 'buyer', TRUE, 'active', 'verified', 500.00),
(6, 'bidder2@bidbrilliance.com', 'bidder2', '$2a$10$fVftV3/jyH/ClU1qkR/Rs.UdbAqIyb.QqWHi.V7gEQP20FmuHfD86', 'Bob', 'Brown', 'buyer', TRUE, 'active', 'verified', 500.00),
(7, 'bidder3@bidbrilliance.com', 'bidder3', '$2a$10$fVftV3/jyH/ClU1qkR/Rs.UdbAqIyb.QqWHi.V7gEQP20FmuHfD86', 'Charlie', 'Taylor', 'buyer', TRUE, 'active', 'verified', 500.00);

-- ========== CATEGORIES ==========
INSERT IGNORE INTO categories (id, name, slug, description, is_active)
VALUES
(1, 'Electronics', 'electronics', 'Electronics, gadgets, and computer equipment', TRUE),
(2, 'Art', 'art', 'Artwork, paintings, and digital art', TRUE),
(3, 'Collectibles', 'collectibles', 'Collectible items and memorabilia', TRUE),
(4, 'Antiques', 'antiques', 'Vintage and antique items', TRUE),
(5, 'Books', 'books', 'Books, rare editions, and literature', TRUE);

-- ========== AUCTIONS ==========
-- Active Auctions (will end in the future)
INSERT IGNORE INTO auctions (id, seller_id, category_id, title, description, starting_price, current_bid_price, reserve_price, status, auction_start_time, auction_end_time, current_highest_bidder_id, total_bids, image_url, `condition`, location, featured)
VALUES
-- Electronics
(1, 2, 1, 'Vintage Nintendo Switch Console', 'Original Nintendo Switch with dock and controllers. Like new condition.', 150.00, 275.00, 200.00, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 2 DAY), 6, 8, 'https://images.unsplash.com/photo-1612198188060-c7044a937e1f?w=400', 'excellent', 'New York, NY', TRUE),
(2, 3, 1, 'Apple MacBook Pro 13" M1', 'MacBook Pro 13-inch with M1 chip. Minimal usage. Includes original box.', 800.00, 950.00, 700.00, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 3 DAY), 5, 12, 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400', 'like_new', 'San Francisco, CA', TRUE),
(3, 2, 1, 'Sony A7 IV Mirrorless Camera', 'Professional mirrorless camera with 2 lenses. Great for photographers.', 2000.00, 2350.00, 1800.00, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 5 DAY), 7, 5, 'https://images.unsplash.com/photo-1606986628025-35d57e735ae0?w=400', 'excellent', 'Los Angeles, CA', FALSE),

-- Art
(4, 4, 2, 'Modern Abstract Painting', 'Contemporary abstract artwork by emerging artist. 24x36 inches. Acrylic on canvas.', 200.00, 450.00, 250.00, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 4 DAY), 4, 6, 'https://images.unsplash.com/photo-1561214115-6d2f1b0609fa?w=400', 'new', 'Chicago, IL', TRUE),
(5, 3, 2, 'Digital Art NFT Certificate', 'Original digital artwork with NFT certificate of authenticity.', 100.00, 325.00, 150.00, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 2 DAY), 6, 4, 'https://images.unsplash.com/photo-1578301978162-7aae4d755744?w=400', 'new', 'Miami, FL', FALSE),

-- Collectibles
(6, 2, 3, 'Signed Baseball - Babe Ruth Replica', 'Replica signed baseball with certificate of authenticity frame.', 80.00, 185.00, 100.00, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 3 DAY), 5, 9, 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=400', 'excellent', 'Boston, MA', FALSE),
(7, 4, 3, 'Vintage Comic Book Collection', 'Lot of 50 vintage comic books from the 1980s-90s. Mixed conditions.', 300.00, 625.00, 350.00, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 6 DAY), 4, 3, 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400', 'fair', 'Seattle, WA', TRUE),

-- Antiques
(8, 3, 4, 'Antique Pocket Watch - 1920s', 'Beautiful pocket watch in working condition. Gold plated with chain.', 150.00, 385.00, 200.00, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 4 DAY), 7, 7, 'https://images.unsplash.com/photo-1524592094714-0f3dada346e7?w=400', 'good', 'Philadelphia, PA', FALSE),
(9, 2, 4, 'Victorian Era Wooden Cabinet', 'Ornate wooden cabinet with original brass handles. Drawers in good condition.', 250.00, 420.00, 300.00, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 5 DAY), 5, 5, 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400', 'good', 'Portland, OR', FALSE),

-- Books
(10, 4, 5, 'First Edition Harry Potter - Philosopher\'s Stone', 'Original 1997 first edition with dust jacket. Excellent condition.', 500.00, 1250.00, 600.00, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 6, 11, 'https://images.unsplash.com/photo-1507842894735-16cebc0a1b8d?w=400', 'excellent', 'Austin, TX', TRUE),
(11, 3, 5, 'Collection of Vintage Science Fiction Books', 'Lot of 25 sci-fi paperbacks from 1960s-70s including Asimov and Clarke.', 120.00, 280.00, 150.00, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 3 DAY), 7, 6, 'https://images.unsplash.com/photo-1470074893352-eb6a0b06aa11?w=400', 'fair', 'Denver, CO', FALSE);

-- ========== BIDS ==========
-- Bids for Electronics Auction 1
INSERT IGNORE INTO bids (id, auction_id, bidder_id, bid_amount, bid_status, created_at)
VALUES
(1, 1, 6, 200.00, 'outbid', DATE_SUB(NOW(), INTERVAL 10 HOUR)),
(2, 1, 5, 220.00, 'outbid', DATE_SUB(NOW(), INTERVAL 9 HOUR)),
(3, 1, 7, 240.00, 'outbid', DATE_SUB(NOW(), INTERVAL 8 HOUR)),
(4, 1, 4, 250.00, 'outbid', DATE_SUB(NOW(), INTERVAL 7 HOUR)),
(5, 1, 6, 260.00, 'outbid', DATE_SUB(NOW(), INTERVAL 6 HOUR)),
(6, 1, 7, 270.00, 'outbid', DATE_SUB(NOW(), INTERVAL 5 HOUR)),
(7, 1, 6, 275.00, 'active', DATE_SUB(NOW(), INTERVAL 2 HOUR));

SET FOREIGN_KEY_CHECKS = 1;