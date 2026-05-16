-- Bid Brilliance Database Schema
-- Created: March 10, 2026

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Create database
CREATE DATABASE IF NOT EXISTS bid_brilliance;
USE bid_brilliance;

-- ---------------------------------------------------------
-- Users table
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  profile_image_url VARCHAR(255),
  bio TEXT,
  phone VARCHAR(20),
  address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  country VARCHAR(100),
  account_status ENUM('active', 'suspended', 'inactive') DEFAULT 'active',
  user_type ENUM('buyer', 'seller', 'admin') DEFAULT 'buyer',
  credits DECIMAL(10, 2) DEFAULT 0.00,
  email_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP NULL,
  kyc_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  rating DECIMAL(3, 2) DEFAULT 0.00,
  total_auctions INT DEFAULT 0,
  total_bids INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_user_type (user_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- Categories table
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  image_url VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- Auctions table
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS auctions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  seller_id INT NOT NULL,
  category_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  starting_price DECIMAL(10, 2) NOT NULL,
  current_bid_price DECIMAL(10, 2) DEFAULT NULL,
  reserve_price DECIMAL(10, 2),
  status ENUM('draft', 'scheduled', 'active', 'ended', 'cancelled') DEFAULT 'active',
  auction_start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  auction_end_time TIMESTAMP NOT NULL,
  current_highest_bidder_id INT,
  total_bids INT DEFAULT 0,
  image_url VARCHAR(255),
  `condition` ENUM('new', 'like_new', 'excellent', 'good', 'fair', 'poor') DEFAULT 'good',
  location VARCHAR(255),
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_seller_id (seller_id),
  INDEX idx_category_id (category_id),
  INDEX idx_status (status),
  INDEX idx_auction_end_time (auction_end_time),
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (current_highest_bidder_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- Bids table
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS bids (
  id INT PRIMARY KEY AUTO_INCREMENT,
  auction_id INT NOT NULL,
  bidder_id INT NOT NULL,
  bid_amount DECIMAL(10, 2) NOT NULL,
  bid_status ENUM('active', 'outbid', 'won', 'cancelled') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_auction_id (auction_id),
  INDEX idx_bidder_id (bidder_id),
  FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
  FOREIGN KEY (bidder_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- Notifications table
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type ENUM('bid_outbid', 'auction_ended', 'auction_won', 'payment_received', 'system') DEFAULT 'system',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_auction_id INT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (related_auction_id) REFERENCES auctions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- User Credits History table
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_credits_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  transaction_type ENUM('initial_assignment', 'bid_placement', 'bid_return', 'auction_win', 'admin_adjustment') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  balance_before DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  related_auction_id INT,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (related_auction_id) REFERENCES auctions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- Proxy Bids table
-- ---------------------------------------------------------
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

SET FOREIGN_KEY_CHECKS = 1;
