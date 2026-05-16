import * as queries from './services/queries.js';
import * as proxyBiddingService from './services/proxyBiddingService.js';
import pool from './services/database.js';

async function run() {
  try {
    console.log('--- IPL-Style Proxy Bidding Test ---\n');

    // Create test users
    const rnd = Math.floor(Math.random() * 100000);
    const user1 = await queries.createUser({ 
      email: `user1_${rnd}@test.com`, 
      username: `user1_${rnd}`, 
      passwordHash: '123', 
      firstName: 'User', 
      lastName: 'One', 
      userType: 'buyer' 
    });
    const user2 = await queries.createUser({ 
      email: `user2_${rnd}@test.com`, 
      username: `user2_${rnd}`, 
      passwordHash: '123', 
      firstName: 'User', 
      lastName: 'Two', 
      userType: 'buyer' 
    });
    const seller = await queries.createUser({ 
      email: `seller_${rnd}@test.com`, 
      username: `seller_${rnd}`, 
      passwordHash: '123', 
      firstName: 'Seller', 
      lastName: 'Test', 
      userType: 'seller' 
    });

    // Give credits
    await queries.addCredits(user1, 200, 'admin_adjustment', null, null, 'Initial credits');
    await queries.addCredits(user2, 200, 'admin_adjustment', null, null, 'Initial credits');
    
    // Create auction
    const auctionId = await queries.createAuction({
      sellerId: seller, 
      categoryId: 1, 
      title: 'IPL-Style Bidding Test', 
      description: 'Testing IPL-style proxy bidding with incremental jumps',
      startingPrice: 5, 
      reservePrice: 5, 
      auctionEndTime: new Date(Date.now() + 86400000), 
      imageUrl: 'none', 
      condition: 'New', 
      location: 'Test'
    });
    await queries.updateAuctionStatus(auctionId, 'active');

    console.log(`Created Auction: ${auctionId}\n`);
    
    // Test Case 1: User1 sets proxy to 42 CR
    console.log('=== Test Case 1: User1 sets proxy max to 42 CR ===');
    await proxyBiddingService.setProxyBid(auctionId, user1, 42);
    console.log('✓ User1 proxy set to 42 CR\n');
    
    await proxyBiddingService.processProxyBidding(auctionId, null);
    
    let bid1 = await queries.getHighestBid(auctionId);
    console.log(`Current bid: ${bid1.bid_amount} CR (Expected: 10 CR - IPL start)`);
    console.log(`Expected progression: 10 → 11 → 12 ... until 25 → then 30 → 35 → 40 → 42\n`);
    
    // Test Case 2: User2 sets proxy to 50 CR (higher than User1)
    console.log('=== Test Case 2: User2 sets proxy max to 50 CR ===');
    await proxyBiddingService.setProxyBid(auctionId, user2, 50);
    console.log('✓ User2 proxy set to 50 CR');
    console.log('→ This triggers proxy war between User1 (max 42) and User2 (max 50)\n');
    
    await proxyBiddingService.processProxyBidding(auctionId, null);
    
    let bid2 = await queries.getHighestBid(auctionId);
    console.log(`Final bid: ${bid2.bid_amount} CR`);
    console.log(`Winner: User${bid2.bidder_id === user1 ? '1 (cannot afford more)' : '2 (higher max bid)'}`);
    console.log(`Expected: User1 bids up to 42 CR (their max), User2 bids 43 (next increment is +5 for >25)\n`);
    
    // Test Case 3: User1 increases proxy to 60 CR
    console.log('=== Test Case 3: User1 updates proxy to 60 CR ===');
    await proxyBiddingService.setProxyBid(auctionId, user1, 60);
    console.log('✓ User1 proxy updated to 60 CR');
    console.log('→ User1 should now outbid User2\n');
    
    await proxyBiddingService.processProxyBidding(auctionId, null);
    
    let bid3 = await queries.getHighestBid(auctionId);
    console.log(`Final bid: ${bid3.bid_amount} CR`);
    console.log(`Winner: User${bid3.bidder_id === user1 ? '1 (higher max)' : '2'}`);
    console.log(`Expected: User1 bids up to 55 CR (next increment for 50+ is +5), User2 cannot match\n`);
    
    console.log('--- Test Complete ---');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

run();
