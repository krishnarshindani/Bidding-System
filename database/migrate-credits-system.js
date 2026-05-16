// Database Migration Script - Add Credits System
// Run with: node database/migrate-credits-system.js

import pool from '../server/services/database.js';

async function runMigration() {
  try {
    console.log('🔄 Starting migration: Add Credits System...\n');

    // 1. Add credits column to users table
    console.log('1️⃣  Adding credits column to users table...');
    try {
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS credits DECIMAL(10, 2) DEFAULT 0.00');
      console.log('   ✓ Credits column added\n');
    } catch (e) {
      console.log(`   ℹ️  Column likely exists: ${e.message}\n`);
    }

    // 2. Add credit tracking columns to bids table
    console.log('2️⃣  Adding credit tracking columns to bids table...');
    try {
      await pool.query('ALTER TABLE bids ADD COLUMN IF NOT EXISTS credits_deducted DECIMAL(10, 2) DEFAULT 0.00');
      console.log('   ✓ credits_deducted column added');
    } catch (e) {
      console.log(`   ℹ️  Column likely exists: ${e.message}`);
    }

    try {
      await pool.query('ALTER TABLE bids ADD COLUMN IF NOT EXISTS credits_returned BOOLEAN DEFAULT FALSE');
      console.log('   ✓ credits_returned column added\n');
    } catch (e) {
      console.log(`   ℹ️  Column likely exists: ${e.message}\n`);
    }

    // 3. Create user_credits_history table
    console.log('3️⃣  Creating user_credits_history table...');
    try {
      await pool.query(`
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('   ✓ user_credits_history table created\n');
    } catch (e) {
      console.log(`   ℹ️  Table likely exists: ${e.message}\n`);
    }

    // 4. Add indexes for performance
    console.log('4️⃣  Adding performance indexes...');
    try {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_user_credits ON users(id, credits)');
      console.log('   ✓ Index idx_user_credits created');
    } catch (e) {
      console.log(`   ℹ️  Index likely exists: ${e.message}`);
    }

    try {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_auction_winner ON auctions(id, current_highest_bidder_id)');
      console.log('   ✓ Index idx_auction_winner created');
    } catch (e) {
      console.log(`   ℹ️  Index likely exists: ${e.message}`);
    }

    try {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_bid_status_auction ON bids(auction_id, bid_status)');
      console.log('   ✓ Index idx_bid_status_auction created\n');
    } catch (e) {
      console.log(`   ℹ️  Index likely exists: ${e.message}\n`);
    }

    // 5. Add check constraint for positive credits
    console.log('5️⃣  Adding credit constraints...');
    try {
      await pool.query('ALTER TABLE users ADD CONSTRAINT check_positive_credits CHECK (credits >= 0)');
      console.log('   ✓ Check constraint added\n');
    } catch (e) {
      if (e.code === 'ER_DUP_CONSTRAINT_NAME') {
        console.log(`   ℹ️  Constraint already exists\n`);
      } else {
        console.log(`   ℹ️  ${e.message}\n`);
      }
    }

    // 6. Initialize credits for existing users (500 credits each)
    console.log('6️⃣  Initializing credits for existing users (500 CR each)...');
    const [result] = await pool.query('UPDATE users SET credits = 500 WHERE credits = 0');
    console.log(`   ✓ Updated ${result.affectedRows} users with initial credits\n`);

    // 7. Create view for user credit summary
    console.log('7️⃣  Creating user_credit_summary view...');
    try {
      await pool.query(`
        CREATE OR REPLACE VIEW user_credit_summary AS
        SELECT 
          u.id,
          u.username,
          u.credits as current_credits,
          COALESCE(SUM(CASE WHEN uch.transaction_type IN ('bid_placement', 'auction_win') THEN -uch.amount ELSE uch.amount END), 0) as total_transactions,
          COUNT(DISTINCT CASE WHEN uch.transaction_type IN ('bid_placement', 'auction_win') THEN uch.related_auction_id END) as total_bids_placed,
          COUNT(DISTINCT CASE WHEN uch.transaction_type = 'auction_win' THEN uch.related_auction_id END) as auctions_won
        FROM users u
        LEFT JOIN user_credits_history uch ON u.id = uch.user_id
        GROUP BY u.id, u.username, u.credits
      `);
      console.log('   ✓ View user_credit_summary created\n');
    } catch (e) {
      console.log(`   ℹ️  View may exist: ${e.message}\n`);
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Credits System Features:');
    console.log('   • Credits stored in users.credits column');
    console.log('   • Every auction bid automatically deducts credits');
    console.log('   • Outbid users receive credits back');
    console.log('   • All transactions logged in user_credits_history');
    console.log('   • Admin can assign/deduct credits via API');
    console.log('');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigration();
