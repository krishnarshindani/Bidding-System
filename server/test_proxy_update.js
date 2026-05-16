import * as queries from './services/queries.js';
import * as proxyBiddingService from './services/proxyBiddingService.js';
import pool from './services/database.js';

async function run() {
  try {
    console.log('--- Starting Proxy Bid UPDATE Test ---\n');

    // Create test users
    const rnd = Math.floor(Math.random() * 100000);
    const kishan = await queries.createUser({ 
      email: `kishan${rnd}@test.com`, 
      username: `kishan${rnd}`, 
      passwordHash: '123', 
      firstName: 'Kishan', 
      lastName: 'Test', 
      userType: 'buyer' 
    });
    const rudra = await queries.createUser({ 
      email: `rudra${rnd}@test.com`, 
      username: `rudra${rnd}`, 
      passwordHash: '123', 
      firstName: 'Rudra', 
      lastName: 'Test', 
      userType: 'buyer' 
    });
    const seller = await queries.createUser({ 
      email: `seller${rnd}@test.com`, 
      username: `seller${rnd}`, 
      passwordHash: '123', 
      firstName: 'Seller', 
      lastName: 'Test', 
      userType: 'seller' 
    });

    // Give credits
    await queries.addCredits(kishan, 100, 'admin_adjustment', null, null, 'Initial credits');
    await queries.addCredits(rudra, 100, 'admin_adjustment', null, null, 'Initial credits');
    
    // Create auction
    const auctionId = await queries.createAuction({
      sellerId: seller, 
      categoryId: 1, 
      title: 'Proxy Update Test Auction', 
      description: 'Testing proxy bid updates',
      startingPrice: 5, 
      reservePrice: 5, 
      auctionEndTime: new Date(Date.now() + 86400000), 
      imageUrl: 'none', 
      condition: 'New', 
      location: 'Test'
    });
    await queries.updateAuctionStatus(auctionId, 'active');

    console.log(`Created Auction: ${auctionId}\n`);
    
    // Step 1: Kishan sets proxy to 15 CR
    console.log('--- STEP 1: Kishan sets proxy to 15 CR ---');
    const proxyId1 = await proxyBiddingService.setProxyBid(auctionId, kishan, 15);
    console.log(`✓ Created proxy bid ${proxyId1} with max 15 CR`);
    
    await proxyBiddingService.processProxyBidding(auctionId, null);
    
    let kishEntry1 = await queries.getActiveProxyBid(auctionId, kishan);
    console.log(`✓ Verified proxy bid exists: max_bid_amount = ${kishEntry1.max_bid_amount}`);
    console.log(`  Expected: 15, Actual: ${kishEntry1.max_bid_amount}\n`);
    
    // Step 2: Kishan updates proxy to 17 CR
    console.log('--- STEP 2: Kishan UPDATES proxy to 17 CR ---');
    const proxyId2 = await proxyBiddingService.setProxyBid(auctionId, kishan, 17);
    console.log(`✓ Updated proxy bid ${proxyId2} with max 17 CR`);
    
    await proxyBiddingService.processProxyBidding(auctionId, null);
    
    let kishEntry2 = await queries.getActiveProxyBid(auctionId, kishan);
    console.log(`✓ Verified proxy bid update: max_bid_amount = ${kishEntry2.max_bid_amount}`);
    console.log(`  Expected: 17, Actual: ${kishEntry2.max_bid_amount}`);
    
    if (kishEntry2.max_bid_amount !== 17) {
      console.log(`  ❌ ERROR: Proxy bid NOT updated correctly! Expected 17 but got ${kishEntry2.max_bid_amount}`);
    } else {
      console.log(`  ✓ SUCCESS: Proxy bid updated correctly!\n`);
    }
    
    // Step 3: Rudra sets proxy and watch it compete
    console.log('--- STEP 3: Rudra sets proxy to 20 CR (triggers proxy war) ---');
    const proxyId3 = await proxyBiddingService.setProxyBid(auctionId, rudra, 20);
    console.log(`✓ Created proxy bid ${proxyId3} with max 20 CR for Rudra`);
    
    await proxyBiddingService.processProxyBidding(auctionId, null);
    
    const highestBid = await queries.getHighestBid(auctionId);
    console.log(`✓ Highest bid: ${highestBid.bid_amount} CR by user ${highestBid.bidder_id === rudra ? 'Rudra' : 'Kishan'}`);
    console.log(`  Expected: Rudra with 18 CR (Kishan's max 17 + 1)\n`);
    
    // Step 4: Final verification - Kishan updates to 21 CR (should take lead)
    console.log('--- STEP 4: Kishan UPDATES proxy to 21 CR (takes lead) ---');
    const proxyId4 = await proxyBiddingService.setProxyBid(auctionId, kishan, 21);
    console.log(`✓ Updated proxy bid to 21 CR`);
    
    await proxyBiddingService.processProxyBidding(auctionId, null);
    
    let kishEntry3 = await queries.getActiveProxyBid(auctionId, kishan);
    console.log(`✓ Verified proxy bid update: max_bid_amount = ${kishEntry3.max_bid_amount}`);
    console.log(`  Expected: 21, Actual: ${kishEntry3.max_bid_amount}`);
    
    const finalBid = await queries.getHighestBid(auctionId);
    console.log(`✓ Final highest bid: ${finalBid.bid_amount} CR by user ${finalBid.bidder_id === kishan ? 'Kishan' : 'Rudra'}`);
    console.log(`  Expected: Kishan with 21 CR\n`);
    
    console.log('--- Test Complete ---');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

run();
