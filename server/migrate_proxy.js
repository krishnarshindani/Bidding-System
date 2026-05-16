import * as dotenv from 'dotenv';
dotenv.config();
import { pool } from './services/queries.js';

async function createProxyBidsTable() {
  try {
    await pool.query(`
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
      );
    `);
    console.log("proxy_bids table created successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error creating proxy_bids table:", error);
    process.exit(1);
  }
}

createProxyBidsTable();
