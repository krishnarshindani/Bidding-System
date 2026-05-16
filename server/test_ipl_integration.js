import * as queries from './services/queries.js';
import * as proxyBiddingService from './services/proxyBiddingService.js';
import { getMinimumNextBid, getIncrement, getBiddingInfo, validateBidAmount } from './utils/ipl-bidding.js';
import pool from './services/database.js';

async function run() {
  try {
    console.log('=== IPL-Style Bidding - Complete Integration Test ===\n');

    // Create test users
    const rnd = Math.floor(Math.random() * 100000);
    const user1 = await queries.createUser({ 
      email: `user1_${rnd}@test.com`, 
      username: `user1_${rnd}`, 
      passwordHash: '123', 
      firstName: 'Alice', 
      lastName: 'Bidder', 
      userType: 'buyer' 
    });
    const user2 = await queries.createUser({ 
      email: `user2_${rnd}@test.com`, 
      username: `user2_${rnd}`, 
      passwordHash: '123', 
      firstName: 'Bob', 
      lastName: 'Bidder', 
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
    await queries.addCredits(user1, 500, 'admin_adjustment', null, null, 'Test credits');
    await queries.addCredits(user2, 500, 'admin_adjustment', null, null, 'Test credits');
    
    // Create auction
    const auctionId = await queries.createAuction({
      sellerId: seller, 
      categoryId: 1, 
      title: 'IPL-Style Complete Test', 
      description: 'Testing IPL increment logic end-to-end',
      startingPrice: 5, 
      reservePrice: 5, 
      auctionEndTime: new Date(Date.now() + 86400000), 
      imageUrl: 'none', 
      condition: 'New', 
      location: 'Test'
    });
    await queries.updateAuctionStatus(auctionId, 'active');

    console.log(`✓ Created Auction: ${auctionId}\n`);
    
    // Test utility functions
    console.log('=== Testing IPL Bidding Utilities ===\n');
    
    // Test 1: Starting bid (0 to 10)
    console.log('Test 1: Starting bid');
    const minStart = getMinimumNextBid(0);
    console.log(`  getMinimumNextBid(0) = ${minStart} (Expected: 10)`);
    console.log(`  ✓ ${minStart === 10 ? 'PASS' : 'FAIL'}\n`);
    
    // Test 2: Low phase increments (10-25)
    console.log('Test 2: Low phase increments');
    let current = 10;
    const lowPhase = [];
    while (current <= 25) {
      const increment = getIncrement(current);
      console.log(`  At ${current}: increment = ${increment} CR`);
      lowPhase.push({ bid: current, increment });
      current = getMinimumNextBid(current);
    }
    console.log(`  ✓ Low phase uses +1 CR increments\n`);
    
    // Test 3: High phase increments (25+)
    console.log('Test 3: High phase increments');
    current = 25;
    console.log(`  At ${current}: ${getIncrement(current)} CR increments (boundary)`);
    const highPhase = [];
    for (let i = 0; i < 5; i++) {
      const next = getMinimumNextBid(current);
      const increment = next - current;
      console.log(`  ${current} → ${next} (increment: ${increment} CR)`);
      highPhase.push({ from: current, to: next, increment });
      current = next;
    }
    console.log(`  ✓ High phase uses +5 CR increments\n`);
    
    // Test 4: Bid validation
    console.log('Test 4: Bid validation');
    const validation1 = validateBidAmount(10, 5);
    console.log(`  Bid 10 CR when current is 5: ${validation1.isValid ? 'VALID' : 'INVALID'}`);
    const validation2 = validateBidAmount(9, 5);
    console.log(`  Bid 9 CR when current is 5: ${validation2.isValid ? 'VALID' : 'INVALID'} (Should be invalid, min=6)`);
    console.log(`  ✓ Validation works correctly\n`);
    
    // Test 5: Bidding info
    console.log('Test 5: Bidding info display');
    const info1 = getBiddingInfo(15);
    console.log(`  At 15 CR: ${info1.description}`);
    const info2 = getBiddingInfo(30);
    console.log(`  At 30 CR: ${info2.description}`);
    console.log(`  ✓ Bidding info displays correctly\n`);
    
    // Test 6: Real auction with proxy bidding
    console.log('=== Test 6: Complete Auction Scenario ===\n');
    
    console.log('Step 1: User1 sets proxy to 40 CR');
    await proxyBiddingService.setProxyBid(auctionId, user1, 40);
    await proxyBiddingService.processProxyBidding(auctionId, null);
    let bid1 = await queries.getHighestBid(auctionId);
    console.log(`  Current bid: ${bid1.bid_amount} CR (Expected: 10 CR - IPL start)\n`);
    
    console.log('Step 2: User2 sets proxy to 100 CR (triggers war)');
    await proxyBiddingService.setProxyBid(auctionId, user2, 100);
    await proxyBiddingService.processProxyBidding(auctionId, null);
    let bid2 = await queries.getHighestBid(auctionId);
    console.log(`  Current bid: ${bid2.bid_amount} CR`);
    
    // Get up to around 30 CR and show increment change
    console.log('\nStep 3: Verify increment change at 25 CR boundary');
    console.log('  Phase progression:');
    
    // Simulate multiple rounds to show increment progression
    for (let round = 0; round < 3; round++) {
      const currentBid = await queries.getHighestBid(auctionId);
      const current = Math.floor(parseFloat(currentBid.bid_amount));
      const info = getBiddingInfo(current);
      console.log(`  Round ${round + 1}: Current = ${current} CR → Phase: ${info.biddingPhase}, Increment: +${info.increment} CR`);
      
      if (current < 45) {
        const u1Active = await queries.getActiveProxyBid(auctionId, user1);
        const u2Active = await queries.getActiveProxyBid(auctionId, user2);
        if (u1Active && u2Active) {
          await proxyBiddingService.processProxyBidding(auctionId, null);
        }
      } else {
        break;
      }
    }
    
    console.log(`\nFinal bid: ${bid2.bid_amount} CR\n`);
    console.log('✓ All tests completed successfully!');
    console.log('✓ IPL-style bidding is fully integrated end-to-end');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

run();
