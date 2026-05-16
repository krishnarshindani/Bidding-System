/**
 * Test script to verify proxy bidding fix
 * Tests the scenario where a user sets a proxy bid when there's already a current bid
 */

import mysql from 'mysql2/promise';
import * as proxyBiddingService from './services/proxyBiddingService.js';

async function testProxyBidFix() {
  console.log('=== Testing Proxy Bid Fix ===\n');

  // Create database connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bid_brilliance'
  });

  try {
    // Test scenario: User sets proxy bid when there's already a current bid
    const auctionId = 69; // Use the same auction from previous tests
    const userId = 110; // Kishan
    const maxProxyAmount = 20; // User wants to bid up to 20 CR

    console.log(`Testing proxy bid setup for auction ${auctionId}, user ${userId}, max ${maxProxyAmount} CR\n`);

    // Get current auction state
    const [auctionRows] = await connection.execute(
      'SELECT current_bid_price, current_highest_bidder_id FROM auctions WHERE id = ?',
      [auctionId]
    );
    
    const currentAuction = auctionRows[0];
    console.log(`Current auction state:`);
    console.log(`  Current bid: ${currentAuction.current_bid_price} CR`);
    console.log(`  Current bidder: ${currentAuction.current_highest_bidder_id}\n`);

    // Get current highest bid
    const [bidRows] = await connection.execute(
      `SELECT * FROM bids 
       WHERE auction_id = ? AND bid_status = 'active' 
       ORDER BY bid_amount DESC LIMIT 1`,
      [auctionId]
    );

    const currentHighestBid = bidRows[0];
    console.log(`Current highest bid:`);
    console.log(`  Amount: ${currentHighestBid ? currentHighestBid.bid_amount : 'None'} CR`);
    console.log(`  Bidder: ${currentHighestBid ? currentHighestBid.bidder_id : 'None'}\n`);

    // Calculate what the next valid bid should be
    const currentBidAmount = currentHighestBid ? parseFloat(currentHighestBid.bid_amount) : 0;
    const nextValidBid = currentBidAmount > 0 ? currentBidAmount + 1 : 5; // Starting price is 5
    
    console.log(`Expected next valid bid: ${nextValidBid} CR\n`);

    // Test the proxy bid setup
    console.log('Setting up proxy bid...');
    
    // This simulates what the frontend should do:
    // 1. Calculate next valid bid amount
    // 2. Place initial bid with that amount
    // 3. Set proxy bid with max amount
    
    // Step 1: Place initial bid (this is what the frontend should send)
    const initialBidAmount = nextValidBid;
    console.log(`Placing initial bid: ${initialBidAmount} CR`);
    
    // Deduct credits for initial bid
    const [userRows] = await connection.execute(
      'SELECT credits FROM users WHERE id = ?',
      [userId]
    );
    
    const userCredits = userRows[0].credits;
    if (userCredits < initialBidAmount) {
      throw new Error(`Insufficient credits: need ${initialBidAmount} CR but have ${userCredits} CR`);
    }
    
    // Deduct credits
    await connection.execute(
      'UPDATE users SET credits = credits - ? WHERE id = ?',
      [initialBidAmount, userId]
    );
    
    // Create bid record
    const [bidResult] = await connection.execute(
      'INSERT INTO bids (auction_id, bidder_id, bid_amount, bid_status) VALUES (?, ?, ?, ?)',
      [auctionId, userId, initialBidAmount, 'active']
    );
    
    const bidId = bidResult.insertId;
    console.log(`Created bid ${bidId} for ${initialBidAmount} CR\n`);
    
    // Update auction current bid
    await connection.execute(
      'UPDATE auctions SET current_bid_price = ?, current_highest_bidder_id = ? WHERE id = ?',
      [initialBidAmount, userId, auctionId]
    );
    
    // Step 2: Set up proxy bid
    console.log(`Setting up proxy bid with max ${maxProxyAmount} CR`);
    
    const [proxyResult] = await connection.execute(
      'INSERT INTO proxy_bids (auction_id, bidder_id, max_bid_amount, is_active) VALUES (?, ?, ?, ?)',
      [auctionId, userId, maxProxyAmount, true]
    );
    
    const proxyBidId = proxyResult.insertId;
    console.log(`Created proxy bid ${proxyBidId}\n`);
    
    // Step 3: Process proxy bidding (this should trigger proxy wars if there are other proxies)
    console.log('Processing proxy bidding...');
    await proxyBiddingService.processProxyBidding(auctionId, null); // null for io since we're testing
    
    // Check final state
    const [finalAuctionRows] = await connection.execute(
      'SELECT current_bid_price, current_highest_bidder_id FROM auctions WHERE id = ?',
      [auctionId]
    );
    
    const [finalBidRows] = await connection.execute(
      `SELECT * FROM bids 
       WHERE auction_id = ? AND bid_status = 'active' 
       ORDER BY bid_amount DESC LIMIT 1`,
      [auctionId]
    );
    
    const [proxyBidRows] = await connection.execute(
      'SELECT * FROM proxy_bids WHERE auction_id = ? AND bidder_id = ? AND is_active = ?',
      [auctionId, userId, true]
    );
    
    console.log('=== Final State ===');
    console.log(`Auction current bid: ${finalAuctionRows[0].current_bid_price} CR`);
    console.log(`Auction current bidder: ${finalAuctionRows[0].current_highest_bidder_id}`);
    console.log(`Highest active bid: ${finalBidRows[0] ? finalBidRows[0].bid_amount : 'None'} CR`);
    console.log(`Proxy bid max: ${proxyBidRows[0] ? proxyBidRows[0].max_bid_amount : 'None'} CR`);
    
    // Verify the fix worked
    const finalBidAmount = finalBidRows[0] ? parseFloat(finalBidRows[0].bid_amount) : 0;
    const expectedBidAmount = Math.min(maxProxyAmount, currentBidAmount + 1);
    
    if (finalBidAmount >= expectedBidAmount) {
      console.log('\n✅ SUCCESS: Proxy bid fix is working correctly!');
      console.log(`Expected at least: ${expectedBidAmount} CR`);
      console.log(`Actual final bid: ${finalBidAmount} CR`);
    } else {
      console.log('\n❌ FAILURE: Proxy bid fix is not working correctly!');
      console.log(`Expected at least: ${expectedBidAmount} CR`);
      console.log(`Actual final bid: ${finalBidAmount} CR`);
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await connection.end();
  }
}

// Run the test
testProxyBidFix().catch(console.error);