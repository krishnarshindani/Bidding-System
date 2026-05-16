import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ML_PREDICTOR_PATH = path.join(__dirname, 'mlPredictor.py');

// Feature columns that must match the Python predictor
const FEATURE_COLUMNS = [
  'starting_price',
  'current_bid',
  'bidders',
  'total_bids',
  'avg_increment',
  'bid_velocity',
  'auction_duration',
  'time_remaining'
];

/**
 * Execute ML prediction via Python subprocess
 * @param {string} command - 'price', 'win', or 'analysis'
 * @param {object} features - Feature data for prediction
 * @returns {Promise<object>} Prediction result
 */
function executePrediction(command, features) {
  return new Promise((resolve, reject) => {
    try {
      const python = spawn('python', [ML_PREDICTOR_PATH, command, JSON.stringify(features)]);
      let dataString = '';
      let errorString = '';

      python.stdout.on('data', (data) => {
        dataString += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorString += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          logger.error(`ML Predictor error (code ${code}):`, errorString);
          reject(new Error(`ML Predictor failed with code ${code}: ${errorString}`));
          return;
        }

        try {
          const result = JSON.parse(dataString);
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result);
          }
        } catch (e) {
          logger.error('Failed to parse ML predictor output:', dataString);
          reject(new Error(`Invalid JSON response from ML predictor: ${e.message}`));
        }
      });
    } catch (error) {
      logger.error('Failed to spawn ML predictor process:', error);
      reject(error);
    }
  });
}

/**
 * Predict final auction price
 * @param {object} auctionData - Auction feature data
 * @returns {Promise<object>} Price prediction with confidence
 */
export async function predictPrice(auctionData) {
  try {
    const result = await executePrediction('price', auctionData);
    return result;
  } catch (error) {
    logger.error('Price prediction error:', error);
    throw error;
  }
}

/**
 * Predict win probability (high price category)
 * @param {object} auctionData - Auction feature data
 * @returns {Promise<object>} Win probability and prediction
 */
export async function predictWinProbability(auctionData) {
  try {
    const result = await executePrediction('win', auctionData);
    return result;
  } catch (error) {
    logger.error('Win probability prediction error:', error);
    throw error;
  }
}

/**
 * Get full auction analysis (price + win probability)
 * @param {object} auctionData - Auction feature data
 * @returns {Promise<object>} Complete analysis with both predictions
 */
export async function getFullAnalysis(auctionData) {
  try {
    const result = await executePrediction('analysis', auctionData);
    return result;
  } catch (error) {
    logger.error('Full analysis error:', error);
    throw error;
  }
}

/**
 * Prepare auction data for ML prediction from database auction object
 * Ensures all 8 required features are present and validates them
 * @param {object} auction - Auction object from database
 * @returns {object} Features formatted for ML model
 */
export function prepareAuctionFeatures(auction) {
  // Ensure all required features have default values
  const features = {
    starting_price: auction.starting_price || 0,
    current_bid: auction.current_bid || auction.starting_price || 0,
    bidders: auction.bidders || auction.activeBidders || 0,
    total_bids: auction.total_bids || auction.bidCount || 0,
    avg_increment: auction.avg_increment || 0,
    bid_velocity: auction.bid_velocity || 0,
    auction_duration: auction.auction_duration || 0,
    time_remaining: auction.time_remaining || 0
  };

  // Validate critical features
  if (!features.starting_price && !features.current_bid) {
    throw new Error('Missing both starting_price and current_bid - cannot make predictions');
  }

  // Validate all required features are present
  for (const feature of FEATURE_COLUMNS) {
    if (features[feature] === undefined || features[feature] === null) {
      throw new Error(`Missing required feature: ${feature}`);
    }
  }

  return features;
}

/**
 * Prepare auction features from frontend request data
 * @param {object} requestData - Request data from frontend
 * @returns {object} Features formatted for ML model
 */
export function prepareAuctionFeaturesFromRequest(requestData) {
  // Extract features from request data with fallbacks
  const features = {
    starting_price: requestData.startingPrice || requestData.starting_price || 0,
    current_bid: requestData.currentBid || requestData.current_bid || requestData.startingPrice || 0,
    bidders: requestData.activeBidders || requestData.bidders || requestData.bidHistory?.length || 0,
    total_bids: requestData.totalBids || requestData.total_bids || requestData.bidHistory?.length || 0,
    avg_increment: requestData.avg_increment || requestData.marketContext?.averageBidIncrement || 105,
    bid_velocity: requestData.bid_velocity || 8.0,
    auction_duration: requestData.auction_duration || 164,
    time_remaining: requestData.time_remaining || Math.floor(Math.max(0, requestData.remainingTime / 60000)) || 50
  };

  // Validate critical features
  if (!features.starting_price && !features.current_bid) {
    throw new Error('Missing both starting_price and current_bid - cannot make predictions');
  }

  // Validate all required features are present
  for (const feature of FEATURE_COLUMNS) {
    if (features[feature] === undefined || features[feature] === null) {
      throw new Error(`Missing required feature: ${feature}`);
    }
  }

  return features;
}

/**
 * Validate auction features before prediction
 * @param {object} features - Feature data to validate
 * @returns {boolean} True if valid, throws error if invalid
 */
export function validateAuctionFeatures(features) {
  const requiredFeatures = [
    'starting_price',
    'current_bid',
    'bidders',
    'total_bids',
    'avg_increment',
    'bid_velocity',
    'auction_duration',
    'time_remaining'
  ];

  for (const feature of requiredFeatures) {
    if (features[feature] === undefined || features[feature] === null) {
      throw new Error(`Missing required feature: ${feature}`);
    }
  }

  return true;
}

export default {
  predictPrice,
  predictWinProbability,
  getFullAnalysis,
  prepareAuctionFeatures,
  validateAuctionFeatures
};
