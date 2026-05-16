/**
 * Property-Based Tests for Database Query Functions
 * Feature: auction-completion-winner-management
 * Property 4: Winning Bid Status Update
 * Validates: Requirements 3.2, 9.2
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pool from './database.js';
import {
  markBidAsWon,
  markOtherBidsAsOutbid,
  getAuctionWinnerDetails,
  getUserWonAuctions,
  getUserLostAuctions
} from './queries.js';

describe('Database Query Functions - Property 4: Winning Bid Status Update', () => {
  let testAuctionId;
  let testUserId1;
  let testUserId2;
  let testBidId1;
  let testBidId2;
  let testBidId3;

  beforeAll(async () => {
    // Create test users
    const [user1] = await pool.query(
      'INSERT INTO users (email, username, password_hash, user_type) VALUES (?, ?, ?, ?)',
      ['test1@example.com', 'testuser1', 'hash', 'buyer']
    );
    testUserId1 = user1.insertId;

    const [user2] = await pool.query(
      'INSERT INTO users (email, username, password_hash, user_type) VALUES (?, ?, ?, ?)',
      ['test2@example.com', 'testuser2', 'hash', 'buyer']
    );
    testUserId2 = user2.insertId;

    // Create test category
    const [category] = await pool.query(
      'INSERT INTO categories (name, slug) VALUES (?, ?)',
      ['Test Category', 'test-category']
    );

    // Create test auction
    const [auction] = await pool.query(
      `INSERT INTO auctions (seller_id, category_id, title, description, starting_price, auction_end_time, status)
       VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY), ?)`,
      [testUserId1, category.insertId, 'Test Auction', 'Test Description', 100, 'active']
    );
    testAuctionId = auction.insertId;
  });

  afterAll(async () => {
    // Clean up test data
    if (testAuctionId) {
      await pool.query('DELETE FROM bids WHERE auction_id = ?', [testAuctionId]);
      await pool.query('DELETE FROM auctions WHERE id = ?', [testAuctionId]);
    }
    if (testUserId1) {
      await pool.query('DELETE FROM users WHERE id = ?', [testUserId1]);
    }
    if (testUserId2) {
      await pool.query('DELETE FROM users WHERE id = ?', [testUserId2]);
    }
    await pool.query('DELETE FROM categories WHERE slug = ?', ['test-category']);
  });

  beforeEach(async () => {
    // Clean up bids before each test
    await pool.query('DELETE FROM bids WHERE auction_id = ?', [testAuctionId]);
  });

  describe('markBidAsWon', () => {
    it('should mark a bid as won', async () => {
      // Create a test bid
      const [bid] = await pool.query(
        'INSERT INTO bids (auction_id, bidder_id, bid_amount, bid_status) VALUES (?, ?, ?, ?)',
        [testAuctionId, testUserId1, 150, 'active']
      );
      testBidId1 = bid.insertId;

      // Mark as won
      const result = await markBidAsWon(testBidId1);
      expect(result).toBe(true);

      // Verify status changed
      const [rows] = await pool.query('SELECT bid_status FROM bids WHERE id = ?', [testBidId1]);
      expect(rows[0].bid_status).toBe('won');
    });

    it('should return false for non-existent bid', async () => {
      const result = await markBidAsWon(999999);
      expect(result).toBe(false);
    });
  });

  describe('markOtherBidsAsOutbid', () => {
    it('should mark all other bids as outbid except the winning bid', async () => {
      // Create multiple bids
      const [bid1] = await pool.query(
        'INSERT INTO bids (auction_id, bidder_id, bid_amount, bid_status) VALUES (?, ?, ?, ?)',
        [testAuctionId, testUserId1, 150, 'active']
      );
      testBidId1 = bid1.insertId;

      const [bid2] = await pool.query(
        'INSERT INTO bids (auction_id, bidder_id, bid_amount, bid_status) VALUES (?, ?, ?, ?)',
        [testAuctionId, testUserId2, 140, 'active']
      );
      testBidId2 = bid2.insertId;

      const [bid3] = await pool.query(
        'INSERT INTO bids (auction_id, bidder_id, bid_amount, bid_status) VALUES (?, ?, ?, ?)',
        [testAuctionId, testUserId1, 130, 'active']
      );
      testBidId3 = bid3.insertId;

      // Mark bid1 as winning, others as outbid
      await markBidAsWon(testBidId1);
      const affectedRows = await markOtherBidsAsOutbid(testAuctionId, testBidId1);

      expect(affectedRows).toBe(2); // Should update 2 bids

      // Verify statuses
      const [rows] = await pool.query(
        'SELECT id, bid_status FROM bids WHERE auction_id = ? ORDER BY bid_amount DESC',
        [testAuctionId]
      );

      expect(rows[0].bid_status).toBe('won'); // Highest bid
      expect(rows[1].bid_status).toBe('outbid'); // Second bid
      expect(rows[2].bid_status).toBe('outbid'); // Third bid
    });

    it('should only update active bids', async () => {
      // Create bids with different statuses
      const [bid1] = await pool.query(
        'INSERT INTO bids (auction_id, bidder_id, bid_amount, bid_status) VALUES (?, ?, ?, ?)',
        [testAuctionId, testUserId1, 150, 'active']
      );
      testBidId1 = bid1.insertId;

      const [bid2] = await pool.query(
        'INSERT INTO bids (auction_id, bidder_id, bid_amount, bid_status) VALUES (?, ?, ?, ?)',
        [testAuctionId, testUserId2, 140, 'outbid']
      );
      testBidId2 = bid2.insertId;

      // Mark bid1 as won
      await markBidAsWon(testBidId1);
      const affectedRows = await markOtherBidsAsOutbid(testAuctionId, testBidId1);

      expect(affectedRows).toBe(0); // Should not update already outbid bids
    });
  });

  describe('Property: Exactly one bid marked as won', () => {
    it('should ensure only one bid has won status per auction', async () => {
      // Create multiple bids
      const [bid1] = await pool.query(
        'INSERT INTO bids (auction_id, bidder_id, bid_amount, bid_status) VALUES (?, ?, ?, ?)',
        [testAuctionId, testUserId1, 150, 'active']
      );
      testBidId1 = bid1.insertId;

      const [bid2] = await pool.query(
        'INSERT INTO bids (auction_id, bidder_id, bid_amount, bid_status) VALUES (?, ?, ?, ?)',
        [testAuctionId, testUserId2, 140, 'active']
      );
      testBidId2 = bid2.insertId;

      // Mark highest bid as won and others as outbid
      await markBidAsWon(testBidId1);
      await markOtherBidsAsOutbid(testAuctionId, testBidId1);

      // Count bids with 'won' status
      const [wonCount] = await pool.query(
        'SELECT COUNT(*) as count FROM bids WHERE auction_id = ? AND bid_status = ?',
        [testAuctionId, 'won']
      );

      expect(wonCount[0].count).toBe(1);

      // Count bids with 'outbid' status
      const [outbidCount] = await pool.query(
        'SELECT COUNT(*) as count FROM bids WHERE auction_id = ? AND bid_status = ?',
        [testAuctionId, 'outbid']
      );

      expect(outbidCount[0].count).toBe(1);
    });
  });

  describe('getAuctionWinnerDetails', () => {
    it('should return complete winner information', async () => {
      // Create and mark a winning bid
      const [bid] = await pool.query(
        'INSERT INTO bids (auction_id, bidder_id, bid_amount, bid_status) VALUES (?, ?, ?, ?)',
        [testAuctionId, testUserId1, 150, 'won']
      );

      const winner = await getAuctionWinnerDetails(testAuctionId);

      expect(winner).toBeDefined();
      expect(winner.bidder_id).toBe(testUserId1);
      expect(winner.bid_amount).toBe(150);
      expect(winner.username).toBe('testuser1');
      expect(winner.email).toBe('test1@example.com');
      expect(winner.auction_title).toBe('Test Auction');
    });

    it('should return undefined for auction with no winner', async () => {
      const winner = await getAuctionWinnerDetails(testAuctionId);
      expect(winner).toBeUndefined();
    });
  });

  describe('getUserWonAuctions', () => {
    it('should return auctions won by user', async () => {
      // Mark auction as ended with user1 as winner
      await pool.query(
        'UPDATE auctions SET status = ?, current_highest_bidder_id = ? WHERE id = ?',
        ['ended', testUserId1, testAuctionId]
      );

      // Create winning bid
      await pool.query(
        'INSERT INTO bids (auction_id, bidder_id, bid_amount, bid_status) VALUES (?, ?, ?, ?)',
        [testAuctionId, testUserId1, 150, 'won']
      );

      const wonAuctions = await getUserWonAuctions(testUserId1);

      expect(wonAuctions.length).toBeGreaterThan(0);
      expect(wonAuctions[0].id).toBe(testAuctionId);
      expect(wonAuctions[0].winning_bid_amount).toBe(150);
    });

    it('should return empty array for user with no wins', async () => {
      const wonAuctions = await getUserWonAuctions(testUserId2);
      expect(wonAuctions).toEqual([]);
    });
  });

  describe('getUserLostAuctions', () => {
    it('should return auctions where user bid but lost', async () => {
      // Mark auction as ended with user1 as winner
      await pool.query(
        'UPDATE auctions SET status = ?, current_highest_bidder_id = ? WHERE id = ?',
        ['ended', testUserId1, testAuctionId]
      );

      // Create winning bid for user1
      await pool.query(
        'INSERT INTO bids (auction_id, bidder_id, bid_amount, bid_status) VALUES (?, ?, ?, ?)',
        [testAuctionId, testUserId1, 150, 'won']
      );

      // Create losing bid for user2
      await pool.query(
        'INSERT INTO bids (auction_id, bidder_id, bid_amount, bid_status) VALUES (?, ?, ?, ?)',
        [testAuctionId, testUserId2, 140, 'outbid']
      );

      const lostAuctions = await getUserLostAuctions(testUserId2);

      expect(lostAuctions.length).toBeGreaterThan(0);
      expect(lostAuctions[0].id).toBe(testAuctionId);
      expect(lostAuctions[0].winner_name).toBe('testuser1');
    });

    it('should return empty array for user who never lost', async () => {
      const lostAuctions = await getUserLostAuctions(testUserId1);
      expect(lostAuctions).toEqual([]);
    });
  });
});
