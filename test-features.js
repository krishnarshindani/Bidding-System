#!/usr/bin/env node

/**
 * Test script for the new features implemented in Bid Brilliance
 * Tests: Bid Lock System, AI Fraud Detection, Bid History Graph, and Proxy Bid Restrictions
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const USER_TOKEN = process.env.USER_TOKEN || '';

console.log('🧪 Testing Bid Brilliance New Features\n');

// Test results tracking
const testResults = [];

function logTest(name, success, details = '') {
  const status = success ? '✅' : '❌';
  console.log(`${status} ${name}`);
  if (details) console.log(`   ${details}`);
  testResults.push({ name, success, details });
}

async function testBidLockSystem() {
  try {
    console.log('\n🔒 Testing Bid Lock System...');
    
    // Test lock status endpoint
    const response = await fetch(`${API_BASE}/bids/lock-status/1`);
    const data = await response.json();
    
    logTest('Lock Status Endpoint', response.ok, `Auction 1 lock status: ${data.isLocked}`);
    
    // Test locked bid placement (if we have a valid user token)
    if (USER_TOKEN) {
      const lockBidResponse = await fetch(`${API_BASE}/bids/place-locked`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${USER_TOKEN}`
        },
        body: JSON.stringify({
          auctionId: 1,
          bidAmount: 50
        })
      });
      
      if (lockBidResponse.ok) {
        const result = await lockBidResponse.json();
        logTest('Locked Bid Placement', true, `Bid ID: ${result.bidId}, Amount: ${result.bidAmount} CR`);
      } else {
        const error = await lockBidResponse.json();
        logTest('Locked Bid Placement', false, error.error || 'Bid placement failed');
      }
    } else {
      logTest('Locked Bid Placement', false, 'No user token provided for testing');
    }
  } catch (error) {
    logTest('Bid Lock System', false, error.message);
  }
}

async function testAIFraudDetection() {
  try {
    console.log('\n🤖 Testing AI Fraud Detection...');
    
    // Test fraud analysis endpoint (requires admin token)
    if (ADMIN_TOKEN) {
      const response = await fetch(`${API_BASE}/ai/fraud-analysis/1`, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
      });
      const data = await response.json();
      
      logTest('Fraud Analysis Endpoint', response.ok, 
        response.ok ? `Risk Level: ${data.riskLevel}, Reports: ${data.totalFraudReports}` : 
                     'Admin access required or auction not found');
    } else {
      logTest('Fraud Analysis Endpoint', false, 'Admin token required');
    }
    
    // Test fraud summary endpoint
    if (ADMIN_TOKEN) {
      const summaryResponse = await fetch(`${API_BASE}/ai/fraud-summary`, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
      });
      const summaryData = await summaryResponse.json();
      
      logTest('Fraud Summary Endpoint', summaryResponse.ok,
        summaryResponse.ok ? `Found ${summaryData.summary.length} auctions with fraud reports` :
                             'Admin access required');
    } else {
      logTest('Fraud Summary Endpoint', false, 'Admin token required');
    }
  } catch (error) {
    logTest('AI Fraud Detection', false, error.message);
  }
}

async function testBidHistoryChart() {
  try {
    console.log('\n📊 Testing Bid History Chart...');
    
    // Test bid history endpoint
    const response = await fetch(`${API_BASE}/bids/auction/1`);
    const data = await response.json();
    
    logTest('Bid History Endpoint', response.ok, 
      response.ok ? `Found ${data.length} bids for auction 1` : 'Failed to fetch bid history');
    
    // Test highest bid endpoint
    const highestResponse = await fetch(`${API_BASE}/bids/highest/1`);
    const highestData = await highestResponse.json();
    
    logTest('Highest Bid Endpoint', highestResponse.ok,
      highestResponse.ok ? `Highest bid: ${highestData.bid_amount} CR by user ${highestData.bidder_id}` :
                           'No highest bid found or auction not found');
  } catch (error) {
    logTest('Bid History Chart', false, error.message);
  }
}

async function testProxyBidRestriction() {
  try {
    console.log('\n⏰ Testing Proxy Bid Restriction...');
    
    // Test proxy allowed endpoint
    const response = await fetch(`${API_BASE}/bids/proxy-allowed/1`);
    const data = await response.json();
    
    logTest('Proxy Allowed Endpoint', response.ok,
      response.ok ? `Proxy allowed: ${data.proxyBiddingAllowed}, Time left: ${data.timeUntilEndMinutes} minutes` :
                   'Failed to check proxy status');
    
    // Test proxy bid setting (should fail if in last 10 minutes or succeed otherwise)
    if (USER_TOKEN && data.proxyBiddingAllowed) {
      const proxyResponse = await fetch(`${API_BASE}/bids/proxy/set`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${USER_TOKEN}`
        },
        body: JSON.stringify({
          auctionId: 1,
          maxBidAmount: 100
        })
      });
      
      if (proxyResponse.ok) {
        const result = await proxyResponse.json();
        logTest('Proxy Bid Setting', true, `Proxy bid ID: ${result.proxyBidId}, Max: ${result.maxBidAmount} CR`);
      } else {
        const error = await proxyResponse.json();
        logTest('Proxy Bid Setting', false, error.error || 'Proxy bid failed');
      }
    } else {
      logTest('Proxy Bid Setting', false, 
        !USER_TOKEN ? 'No user token provided' : 
        !data.proxyBiddingAllowed ? 'Proxy bidding not allowed (likely in last 10 minutes)' :
        'Unknown reason');
    }
  } catch (error) {
    logTest('Proxy Bid Restriction', false, error.message);
  }
}

async function testAIInsights() {
  try {
    console.log('\n🧠 Testing AI Insights...');
    
    // Test AI bidding analysis (requires user token)
    if (USER_TOKEN) {
      const response = await fetch(`${API_BASE}/ai/bidding-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${USER_TOKEN}`
        },
        body: JSON.stringify({
          auctionId: 1,
          auctionTitle: "Test Auction",
          currentBid: 50,
          startingPrice: 10,
          minimumBid: 1,
          totalBids: 5,
          activeBidders: 3,
          remainingTime: 300000, // 5 minutes
          userCredits: 1000,
          userCurrentBid: 0,
          recentBids: [
            { amount: 50, timestamp: new Date().toISOString() },
            { amount: 45, timestamp: new Date(Date.now() - 60000).toISOString() }
          ]
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        logTest('AI Bidding Analysis', true, 
          `Suggested bid: ${data.suggestedBid} CR, Win probability: ${data.winningProbability}%`);
      } else {
        const error = await response.json();
        logTest('AI Bidding Analysis', false, error.error || 'AI analysis failed');
      }
    } else {
      logTest('AI Bidding Analysis', false, 'User token required');
    }
  } catch (error) {
    logTest('AI Insights', false, error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive feature tests...\n');
  
  await testBidLockSystem();
  await testAIFraudDetection();
  await testBidHistoryChart();
  await testProxyBidRestriction();
  await testAIInsights();
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('='.repeat(50));
  
  const passed = testResults.filter(r => r.success).length;
  const total = testResults.length;
  const failed = total - passed;
  
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${Math.round((passed/total) * 100)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.filter(r => !r.success).forEach(result => {
      console.log(`   - ${result.name}: ${result.details}`);
    });
  }
  
  console.log('\n💡 Notes:');
  console.log('   - Some tests require valid authentication tokens');
  console.log('   - Tests assume auction ID 1 exists in the database');
  console.log('   - Proxy bid tests depend on auction timing (last 10 minutes rule)');
  console.log('   - Fraud detection tests require admin privileges');
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests as testFeatures };