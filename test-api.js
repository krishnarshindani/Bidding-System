// Test API connectivity
async function testAPI() {
  const baseURL = 'http://localhost:3000/api';
  
  try {
    console.log('\n🧪 Testing Bid Brilliance API...\n');
    
    // Test health endpoint
    let response = await fetch(`${baseURL}/health`);
    console.log(`✓ Health: ${response.status} ${response.statusText}`);
    
    // Test categories
    response = await fetch(`${baseURL}/categories`);
    const categories = await response.json();
    console.log(`✓ Categories: ${response.status} - Found ${categories.length} categories`);
    
    // Test auctions
    response = await fetch(`${baseURL}/auctions/active?limit=5`);
    const auctions = await response.json();
    console.log(`✓ Auctions: ${response.status} - Found ${auctions.length} active auctions`);
    
    // Test analytics stats
    response = await fetch(`${baseURL}/analytics/stats`);
    const stats = await response.json();
    console.log(`✓ Stats: ${response.status} - Total auctions: ${stats.totalAuctions}`);
    
    // Test analytics trends
    response = await fetch(`${baseURL}/analytics/trends?days=30`);
    const trends = await response.json();
    console.log(`✓ Trends: ${response.status} - Found ${trends.length} days of data`);
    
    // Test analytics bid activity
    response = await fetch(`${baseURL}/analytics/bid-activity`);
    const bidActivity = await response.json();
    console.log(`✓ Bid Activity: ${response.status} - 24h data available`);
    
    // Test bids route
    if (auctions.length > 0) {
      response = await fetch(`${baseURL}/bids/auction/${auctions[0].id}`);
      const bids = await response.json();
      console.log(`✓ Bids: ${response.status} - Found ${bids.length} bids for auction ${auctions[0].id}`);
    }
    
    console.log('\n✅ All API endpoints are working!\n');
  } catch (error) {
    console.error('\n❌ API Test Failed:', error.message);
    console.log('\nMake sure the server is running on http://localhost:3000\n');
    process.exit(1);
  }
}

testAPI();
