#!/usr/bin/env node

/**
 * Proxy Bidding Database Migration
 * This script fixes the proxy_bids table to use correct column names
 */

import * as dotenv from 'dotenv';
dotenv.config();

import pool from './config/database.js';

async function fixProxyBidsTable() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔄 Starting proxy_bids table migration...\n');

    // Check if proxy_bids table exists
    const [tables] = await connection.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proxy_bids'"
    );

    if (tables.length > 0) {
      console.log('⚠️  Dropping existing proxy_bids table...');
      await connection.query('DROP TABLE IF EXISTS proxy_bids');
      console.log('✅ Old table dropped\n');
    }

    // Create the correct proxy_bids table
    console.log('✨ Creating proxy_bids table with correct schema...');
    await connection.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ proxy_bids table created successfully!\n');
    console.log('📋 Table structure:');
    console.log('  - id (INT PRIMARY KEY AUTO_INCREMENT)');
    console.log('  - auction_id (INT NOT NULL) - References auctions(id)');
    console.log('  - bidder_id (INT NOT NULL) - References users(id)');
    console.log('  - max_bid_amount (DECIMAL(10,2) NOT NULL) - Maximum bid amount in CR');
    console.log('  - is_active (BOOLEAN DEFAULT TRUE) - Active status');
    console.log('  - created_at (TIMESTAMP)');
    console.log('  - updated_at (TIMESTAMP)\n');

    console.log('✨ Migration completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.release();
    }
  }
}

fixProxyBidsTable();
