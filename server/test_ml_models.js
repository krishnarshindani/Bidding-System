import * as mlPredictionService from './services/mlPredictionService.js';
import { logger } from './utils/logger.js';

/**
 * Test ML Models with sample auction data
 */
async function testMLModels() {
  console.log('='.repeat(60));
  console.log('ML MODEL TEST');
  console.log('='.repeat(60));

  // Test 1: Basic auction scenario
  const testData1 = {
    starting_price: 100,
    current_bid: 450,
    bidders: 5,
    total_bids: 15,
    avg_increment: 30,
    bid_velocity: 2.0,
    auction_duration: 120,
    time_remaining: 50,
    bid_history: []
  };

  console.log('\nTest Case 1: Active Auction');
  console.log('Input Features:');
  console.log(JSON.stringify(testData1, null, 2));

  try {
    const result1 = await mlPredictionService.getFullAnalysis(testData1);
    console.log('Output:');
    console.log(JSON.stringify(result1, null, 2));

    if (result1.price_prediction?.predicted_price) {
      const predictedPrice = result1.price_prediction.predicted_price;
      const lowerBound = Math.max(0.75 * predictedPrice, testData1.current_bid);
      const upperBound = 1.25 * predictedPrice;
      console.log(`\nPrice Range: ${Math.round(lowerBound)} - ${Math.round(upperBound)} CR`);
    }

    if (result1.win_probability?.win_probability) {
      const winProb = result1.win_probability.win_probability * 100;
      console.log(`Win Probability: ${winProb.toFixed(2)}%`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }

  // Test 2: Late stage auction
  const testData2 = {
    starting_price: 100,
    current_bid: 600,
    bidders: 8,
    total_bids: 45,
    avg_increment: 15,
    bid_velocity: 5.5,
    auction_duration: 180,
    time_remaining: 3,
    bid_history: []
  };

  console.log('\n' + '='.repeat(60));
  console.log('Test Case 2: Late Stage Auction (High Activity)');
  console.log('Input Features:');
  console.log(JSON.stringify(testData2, null, 2));

  try {
    const result2 = await mlPredictionService.getFullAnalysis(testData2);
    console.log('Output:');
    console.log(JSON.stringify(result2, null, 2));

    if (result2.price_prediction?.predicted_price) {
      const predictedPrice = result2.price_prediction.predicted_price;
      const lowerBound = Math.max(0.75 * predictedPrice, testData2.current_bid);
      const upperBound = 1.25 * predictedPrice;
      console.log(`\nPrice Range: ${Math.round(lowerBound)} - ${Math.round(upperBound)} CR`);
    }

    if (result2.win_probability?.win_probability) {
      const winProb = result2.win_probability.win_probability * 100;
      console.log(`Win Probability: ${winProb.toFixed(2)}%`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test Complete');
  console.log('='.repeat(60));
}

// Run tests
testMLModels().catch(console.error);
