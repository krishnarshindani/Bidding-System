import * as queries from './services/queries.js';
import * as proxyBiddingService from './services/proxyBiddingService.js';
import pool from './services/database.js';

async function run() {
  try {
    console.log('--- Starting Proxy Bidding Test ---');

    // Create test users
    const rnd = Math.floor(Math.random() * 100000);
    const u1 = await queries.createUser({ email: `uA${rnd}@a.com`, username: `uA${rnd}`, passwordHash: '123', firstName: 'A', lastName: 'A', userType: 'buyer' });
    const u2 = await queries.createUser({ email: `uB${rnd}@a.com`, username: `uB${rnd}`, passwordHash: '123', firstName: 'B', lastName: 'B', userType: 'buyer' });
    const u3 = await queries.createUser({ email: `uC${rnd}@a.com`, username: `uC${rnd}`, passwordHash: '123', firstName: 'C', lastName: 'C', userType: 'seller' });

    // Give credits
    await queries.addCredits(u1, 1000, 'admin_adjustment', null, null, 'start');
    await queries.addCredits(u2, 1000, 'admin_adjustment', null, null, 'start');
    
    // Create auction
    const auctionId = await queries.createAuction({
      sellerId: u3, categoryId: 1, title: 'Proxy Test Auction', description: 'Test',
      startingPrice: 10, reservePrice: 10, auctionEndTime: new Date(Date.now() + 86400000), 
      imageUrl: 'none', condition: 'New', location: 'Here'
    });
    await queries.updateAuctionStatus(auctionId, 'active');

    console.log(`Created Auction: ${auctionId}`);
    
    // User 1 sets proxy to 100
    console.log('User 1 sets proxy to 100');
    await proxyBiddingService.setProxyBid(auctionId, u1, 100);
    await proxyBiddingService.processProxyBidding(auctionId, null);
    
    let a1 = await queries.getAuctionById(auctionId);
    let hb1 = await queries.getHighestBid(auctionId);
    console.log(`Highest Bid: ${hb1.bid_amount} by User ${hb1.bidder_id === u1 ? '1' : 'other'} (Expected 10 by User 1)`);

    // User 2 sets proxy to 150
    console.log('User 2 sets proxy to 150');
    await proxyBiddingService.setProxyBid(auctionId, u2, 150);
    await proxyBiddingService.processProxyBidding(auctionId, null);
    
    let hb2 = await queries.getHighestBid(auctionId);
    console.log(`Highest Bid: ${hb2.bid_amount} by User ${hb2.bidder_id === u2 ? '2' : 'other'} (Expected 101 by User 2)`);

    // Check credits
    const u1Cred = await queries.getUserCredits(u1);
    const u2Cred = await queries.getUserCredits(u2);
    console.log(`User 1 Credits: ${u1Cred.credits} (Expected: 1000, since they were outbid and refunded)`);
    console.log(`User 2 Credits: ${u2Cred.credits} (Expected: 899, since 101 deducted)`);

    console.log('Test Complete.');
    process.exit(0);
  } catch (error) {
    console.error('Test Failed:', error);
    process.exit(1);
  }
}
run();
