import express from 'express';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import * as fraudDetectionService from '../services/fraudDetectionService.js';
import * as mlPredictionService from '../services/mlPredictionService.js';
import { logger } from '../utils/logger.js';

dotenv.config();

const router = express.Router();

// Middleware to verify JWT token and attach userId
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_here');
    req.userId = decoded.userId;
    // Assuming the user object might also attach userType, but for safety 
    // we should ideally fetch the user or trust the token if it had roles.
    // For now we just attach the decoded info.
    req.user = decoded; 
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

let groq = null;
try {
  if (process.env.GROQ_API_KEY) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  } else {
    console.warn("GROQ_API_KEY is not set. AI features will not work.");
  }
} catch (error) {
  console.error("Failed to initialize Groq client:", error);
}

/**
 * Helper: Format ML predictions into consistent response structure
 */
function formatMLPredictions(mlAnalysis, currentPrice, currentBid) {
  if (!mlAnalysis || mlAnalysis.error) {
    return {
      pricePredict: currentPrice * 1.3,
      winProbability: 50,
      topFeatures: [],
      hasError: true
    };
  }

  // Extract price prediction
  const pricePredict = mlAnalysis.price_prediction?.predicted_price || currentPrice * 1.3;
  
  // Extract win probability and convert to percentage (0-100)
  let winProb = (mlAnalysis.win_probability?.win_probability || 0.5);
  // If it's already a 0-100 scale, use as is; if 0-1 scale, multiply by 100
  if (winProb <= 1) {
    winProb = winProb * 100;
  }
  // Clamp to reasonable range
  winProb = Math.min(99, Math.max(5, Math.floor(winProb)));
  
  // Extract top features
  const topFeatures = mlAnalysis.win_probability?.top_features || [];

  return {
    pricePredict: Math.floor(pricePredict),
    winProbability: winProb,
    topFeatures: topFeatures.map(f => ({
      feature: f.feature.replace(/_/g, ' '),
      importance: (parseFloat(f.importance) * 100).toFixed(1)
    })),
    hasError: false
  };
}

// Route to generate auction description
router.post('/generate-description', verifyToken, async (req, res) => {
  try {
    // Only admins should generate descriptions
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    const { title, category } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!groq) {
      // Fallback description when AI is unavailable
      const fallback = `Discover this exceptional ${category || 'item'}: "${title}". A premium offering that combines quality and value, perfect for discerning collectors and enthusiasts. Don't miss your chance to own this remarkable piece — place your bid today!`;
      return res.json({ description: fallback });
    }

    const prompt = `Write a short, compelling, and professional auction description for an item with the title: "${title}" in the category: "${category || 'General'}". The description should be 3-4 sentences long, highlighting its value and encouraging bids. Do not include any made-up specifications or fake history. Just make it sound exciting and premium.`;

    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert auction house appraiser and copywriter. You write concise, high-end descriptions that drive bidding."
          },
          {
            role: "user",
            content: prompt,
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 200,
      });

      const description = chatCompletion.choices[0]?.message?.content || "";
      res.json({ description: description.trim() });
    } catch (groqError) {
      console.error('Groq API error:', groqError.message || groqError);
      // Fallback description
      const fallback = `Discover this exceptional ${category || 'item'}: "${title}". A premium offering that combines quality and value, perfect for discerning collectors and enthusiasts. Don't miss your chance to own this remarkable piece — place your bid today!`;
      res.json({ description: fallback });
    }
  } catch (error) {
    console.error('Error generating description:', error);
    res.status(500).json({ error: 'Failed to generate description' });
  }
});

// Route to generate smart bid suggestion
router.post('/bid-suggestion', verifyToken, async (req, res) => {
  try {
    if (!groq) {
      return res.status(503).json({ error: 'AI service unavailable' });
    }

    const { auctionTitle, currentBid, startingPrice, totalBids, userCredits, reservePrice } = req.body;
    
    // Create a data context for the AI
    const currentPrice = currentBid || startingPrice || 0;
    const isHighDemand = totalBids > 10;
    
    const prompt = `I am a bidder in an auction for "${auctionTitle}". 
The current price is ${currentPrice} credits.
There have been ${totalBids} bids so far.
I have a total balance of ${userCredits} credits.

Based on basic auction theory and game theory, suggest a specific bid amount for me to place next, and provide a 1-sentence strategic reasoning.
Keep your response extremely concise. Format as JSON: {"suggestedBid": number, "reasoning": "string"}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert AI bidding strategist. You output ONLY valid JSON matching the requested format."
        },
        {
          role: "user",
          content: prompt,
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const content = chatCompletion.choices[0]?.message?.content || "{}";
    const suggestion = JSON.parse(content);
    
    // Safety check: don't suggest more than user has or less than current
    let finalSuggested = suggestion.suggestedBid;
    if (finalSuggested < currentPrice + 1) {
      finalSuggested = currentPrice + Math.max(1, Math.floor(currentPrice * 0.05));
    }
    if (finalSuggested > userCredits) {
      finalSuggested = userCredits;
    }

    res.json({
      suggestedBid: Math.floor(finalSuggested),
      reasoning: suggestion.reasoning || "A solid incremental bid to take the lead."
    });
  } catch (error) {
    console.error('Error generating bid suggestion:', error);
    // Fallback if AI fails
    const currentPrice = req.body.currentBid || req.body.startingPrice || 0;
    res.json({
      suggestedBid: Math.floor(currentPrice * 1.1),
      reasoning: "System fallback suggestion."
    });
  }
});

// Route to get comprehensive AI bidding analysis (now with ML models + Groq explanations)
router.post('/bidding-analysis', verifyToken, async (req, res) => {
  try {
    const {
      auctionId,
      auctionTitle,
      currentBid,
      startingPrice,
      minimumBid,
      totalBids,
      activeBidders,
      remainingTime,
      userCredits,
      userCurrentBid,
      recentBids,
      // ML features (optional - will compute if not provided)
      bidders,
      bid_velocity,
      auction_duration,
      time_remaining,
      avg_increment
    } = req.body;

    const currentPrice = currentBid || startingPrice || 0;
    const timeLeftMinutes = Math.max(0, remainingTime / 60000);

    let mlAnalysis = null;
    let mlError = null;

    // Try to get ML predictions using the new helper function
    try {
      const auctionFeatures = mlPredictionService.prepareAuctionFeaturesFromRequest({
        startingPrice,
        currentBid: currentPrice,
        activeBidders,
        totalBids,
        avg_increment,
        bid_velocity,
        auction_duration,
        time_remaining,
        remainingTime,
        bidHistory: recentBids || []
      });

      logger.info('Sending to ML model:', JSON.stringify(auctionFeatures));
      mlAnalysis = await mlPredictionService.getFullAnalysis(auctionFeatures);
      logger.info('ML Analysis Response:', JSON.stringify(mlAnalysis));
    } catch (mlErr) {
      logger.warn('ML prediction failed, will use Groq fallback:', mlErr.message);
      mlError = mlErr.message;
    }

    // Format ML predictions into consistent structure
    const mlPreds = formatMLPredictions(mlAnalysis, currentPrice, userCurrentBid);
    const mlPricePredict = mlPreds.pricePredict;
    const mlHighPriceProb = mlPreds.winProbability;
    const mlTopFeatures = mlPreds.topFeatures;

    // Use Groq to generate human-readable explanations
    if (!groq) {
      // Fallback without Groq (use ML predictions only)
      return res.json({
        suggestedBid: Math.floor(mlPricePredict * 1.05),
        winningProbability: Math.floor(mlHighPriceProb),
        strategy: `Based on the ML prediction of ${Math.floor(mlPricePredict)} CR, ${userCurrentBid >= mlPricePredict ? 'maintain your strong position' : 'consider bidding more to increase your chances'}.`,
        winningProbabilityReason: `Based on auction dynamics, your winning probability is approximately ${Math.floor(mlHighPriceProb)}%.`,
        explanation: `Based on auction dynamics, your winning probability is approximately ${Math.floor(mlHighPriceProb)}%.`,
        mlPredictedPrice: Math.floor(mlPricePredict),
        mlWinProbability: Math.floor(mlHighPriceProb),
        mlTopFeatures: mlTopFeatures,
        mlSource: "XGBoost ML Model" + (mlError ? " (with fallback)" : ""),
        auctionIntelligence: {
          auctionMood: totalBids > 20 ? "Hot" : totalBids > 10 ? "Warm" : "Cool",
          bidSpeed: bid_velocity > 5 ? "Fast" : bid_velocity > 2 ? "Moderate" : "Slow",
          predictedFinalRange: `${Math.floor(mlPricePredict * 0.95)} - ${Math.floor(mlPricePredict * 1.15)} credits`,
          bidWarProbability: activeBidders > 3 ? 70 : 30
        }
      });
    }

    // Generate Groq explanation based on ML predictions
    const prompt = `Based on these ML model predictions and auction data, provide strategic insights. The ML classification model predicts a ${Math.floor(mlHighPriceProb)}% chance of this auction reaching a high price.

ML Model Predictions:
- Predicted Final Price: ${Math.floor(mlPricePredict)} credits
- High Price Probability: ${Math.floor(mlHighPriceProb)}%
- Top Influencing Features: ${mlTopFeatures.map(f => `${f.feature} (${f.importance}%)`).join(', ')}

Auction Data:
- Auction: "${auctionTitle}"
- Current Price: ${currentPrice} credits
- User's Intended Bid: ${userCurrentBid} credits
- Total Bids: ${totalBids}
- Active Bidders: ${activeBidders}
- Time Remaining: ${timeLeftMinutes.toFixed(1)} minutes

Provide a comprehensive JSON response with:
1. Suggested next bid (considering ML prediction + current data)
2. Strategy explanation
3. 1-2 sentence explanation of the predicted outcome
4. Auction intelligence insights

Format as JSON: {
  "suggestedBid": number,
  "strategy": "string",
  "winningProbabilityReason": "string",
  "auctionIntelligence": {
    "auctionMood": "string",
    "bidSpeed": "string",
    "predictedFinalRange": "string",
    "bidWarProbability": number
  }
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert AI auction analyst. Combine ML model insights with real-time auction dynamics to provide strategic recommendations. Output ONLY valid JSON."
        },
        {
          role: "user",
          content: prompt,
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      response_format: { type: "json_object" },
    });

    const content = chatCompletion.choices[0]?.message?.content || "{}";
    const analysis = JSON.parse(content);

    const result = {
      suggestedBid: Math.floor(Math.max(analysis.suggestedBid || mlPricePredict * 1.05, currentPrice + 1)),
      winningProbability: Math.floor(mlHighPriceProb),
      strategy: analysis.strategy || "Place a competitive bid to maintain your position.",
      winningProbabilityReason: analysis.winningProbabilityReason || `Based on auction dynamics, your winning probability is approximately ${Math.floor(mlHighPriceProb)}%.`,
      explanation: analysis.winningProbabilityReason || `Based on auction dynamics, your winning probability is approximately ${Math.floor(mlHighPriceProb)}%.`,
      // Include ML prediction details for frontend
      mlPredictedPrice: Math.floor(mlPricePredict),
      mlWinProbability: Math.floor(mlHighPriceProb),
      mlTopFeatures: mlTopFeatures,
      mlSource: "XGBoost ML Model" + (mlError ? " (partial)" : ""),
      auctionIntelligence: {
        auctionMood: analysis.auctionIntelligence?.auctionMood || (totalBids > 20 ? "Hot" : "Neutral"),
        bidSpeed: analysis.auctionIntelligence?.bidSpeed || "Moderate",
        predictedFinalRange: analysis.auctionIntelligence?.predictedFinalRange || `${Math.floor(mlPricePredict * 0.95)} - ${Math.floor(mlPricePredict * 1.15)} credits`,
        bidWarProbability: Math.min(100, Math.max(0, analysis.auctionIntelligence?.bidWarProbability || 30))
      }
    };

    res.json(result);
  } catch (error) {
    logger.error('Error generating bidding analysis:', error);
    const fallbackPrice = (req.body.currentBid || req.body.startingPrice || 0) * 1.1;
    // Use 50 as default probability when ML fails
    const fallbackWinProb = 50;
    res.status(500).json({
      suggestedBid: Math.floor(fallbackPrice),
      winningProbability: fallbackWinProb,
      strategy: "System fallback analysis.",
      winningProbabilityReason: "Analysis temporarily unavailable.",
      explanation: "Analysis temporarily unavailable.",
      mlPredictedPrice: Math.floor(fallbackPrice),
      mlWinProbability: fallbackWinProb,
      mlTopFeatures: [],
      mlSource: "Fallback",
      auctionIntelligence: {
        auctionMood: "Neutral",
        bidSpeed: "Moderate",
        predictedFinalRange: "Data unavailable",
        bidWarProbability: 30
      }
    });
  }
});

// Route to get winning probability explanation (now with ML models)
router.post('/winning-probability', verifyToken, async (req, res) => {
  try {
    const {
      auctionTitle,
      currentBid,
      userBid,
      startingPrice,
      totalBids,
      activeBidders,
      remainingTime,
      userCredits,
      // ML features
      bidders,
      bid_velocity,
      auction_duration,
      time_remaining,
      avg_increment
    } = req.body;

    const currentPrice = currentBid || startingPrice || 0;
    const timeLeftMinutes = Math.max(0, remainingTime / 60000);
    const userIntendedBid = userBid || currentPrice;

    let mlHighPriceProb = 0.5;
    let mlPricePredict = currentPrice * 1.3;
    let mlTopFeatures = [];
    let mlError = null;

    // Try to get ML win probability using the new helper function
    try {
      const auctionFeatures = mlPredictionService.prepareAuctionFeaturesFromRequest({
        startingPrice,
        currentBid: currentPrice,
        activeBidders,
        totalBids,
        avg_increment,
        bid_velocity,
        auction_duration,
        time_remaining,
        remainingTime,
        bidHistory: req.body.bidHistory || []
      });

      logger.info('Sending to ML model (winning-probability):', JSON.stringify(auctionFeatures));
      const mlResult = await mlPredictionService.getFullAnalysis(auctionFeatures);
      logger.info('ML Result (winning-probability):', JSON.stringify(mlResult));
      mlHighPriceProb = mlResult?.win_probability?.win_probability || 0.5;
      mlPricePredict = mlResult?.price_prediction?.predicted_price || currentPrice * 1.3;
      mlTopFeatures = mlResult?.win_probability?.top_features || [];
    } catch (mlErr) {
      logger.warn('ML win probability prediction failed:', mlErr.message);
      mlError = mlErr.message;
    }

    // Calculate user's actual win probability based on their intended bid vs predicted price
    let userWinProb;
    if (userIntendedBid >= mlPricePredict) {
      userWinProb = Math.min(99, Math.max(70, mlHighPriceProb * 100));
    } else {
      const priceGap = mlPricePredict - userIntendedBid;
      const priceRatio = userIntendedBid / mlPricePredict;
      userWinProb = Math.min(60, Math.max(5, (mlHighPriceProb * priceRatio * 100)));
    }

    if (!groq) {
      return res.json({
        winningProbability: Math.floor(userWinProb),
        explanation: `Based on ML prediction of ${Math.floor(mlPricePredict)} CR final price, your bid of ${Math.floor(userIntendedBid)} CR gives you approximately ${Math.floor(userWinProb)}% chance to win.`,
        mlWinProbability: Math.floor(userWinProb),
        mlTopFeatures: mlTopFeatures.map(f => ({
          feature: f.feature.replace(/_/g, ' '),
          importance: (f.importance * 100).toFixed(1)
        })),
        mlSource: "XGBoost ML Model" + (mlError ? " (with fallback)" : ""),
        mlPredictedPrice: Math.floor(mlPricePredict)
      });
    }

    const prompt = `Based on ML model prediction and real-time auction data, explain the winning probability.
Note: The ML "High Price Probability" just means the likelihood of the auction closing at a high price overall, NOT the user's chance of winning. You must calculate the user's EXACT winning probability by comparing their intended bid against the ML Predicted Final Price. 
    If the user's intended bid >= Predicted Final Price, their winning probability should be very high (80-99%). 
    If it is far below, it should be very low (1-20%).

ML Prediction:
- Predicted Final Price: ${Math.floor(mlPricePredict)} credits
- Auction High Price Probability: ${Math.floor(mlHighPriceProb * 100)}%
- Top Factors: ${mlTopFeatures.map(f => `${f.feature} (${(f.importance*100).toFixed(1)}%)`).join(', ')}

User Context:
- Current Price: ${currentPrice} credits
- User's Intended Bid: ${userIntendedBid} credits
- Calculated Win Probability: ${Math.floor(userWinProb)}%

Provide a clear 1-3 sentence explanation of why the user has this calculated win probability, referencing the ML predicted final price. Include an actionable tip.

Format as JSON: {
  "calculatedWinProb": number,
  "explanation": "string",
  "actionableTip": "string"
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert AI probability analyst. Explain ML model predictions in simple, actionable terms. Output ONLY valid JSON."
        },
        {
          role: "user",
          content: prompt,
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const content = chatCompletion.choices[0]?.message?.content || "{}";
    const analysis = JSON.parse(content);

    res.json({
      winningProbability: Math.floor(userWinProb),
      explanation: `Based on ML prediction of ${Math.floor(mlPricePredict)} CR final price, your bid of ${Math.floor(userIntendedBid)} CR gives you approximately ${Math.floor(userWinProb)}% chance to win.`,
      actionableTip: analysis.actionableTip || "Consider increasing your bid closer to the predicted final price to improve your chances.",
      mlWinProbability: Math.floor(userWinProb),
      mlTopFeatures: mlTopFeatures.map(f => ({
        feature: f.feature.replace(/_/g, ' '),
        importance: (f.importance * 100).toFixed(1)
      })),
      mlSource: "XGBoost ML Model",
      mlPredictedPrice: Math.floor(mlPricePredict)
    });
  } catch (error) {
    logger.error('Error calculating winning probability:', error);
    res.status(500).json({
      winningProbability: 50,
      explanation: "Unable to calculate probability at this time.",
      mlWinProbability: 50,
      mlSource: "Fallback"
    });
  }
});

// NEW: Pure LLM-based winning probability analysis (no ML dependency)
router.post('/winning-probability-llm', verifyToken, async (req, res) => {
  try {
    if (!groq) {
      return res.status(503).json({ error: 'AI service unavailable' });
    }

    const {
      auctionTitle,
      currentBid,
      userBid,
      startingPrice,
      totalBids,
      activeBidders,
      remainingTime,
      userCredits,
      recentBids
    } = req.body;

    const currentPrice = currentBid || startingPrice || 0;
    const timeLeftMinutes = Math.max(0, remainingTime / 60000);
    const userIntendedBid = userBid || currentPrice;

    // Prepare bid history for analysis
    const bidHistory = recentBids || [];
    const bidHistoryText = bidHistory.length > 0 
      ? bidHistory.slice(-5).map(bid => 
          `Bid: ${bid.amount} CR by ${bid.bidderName || 'Unknown'} at ${new Date(bid.timestamp).toLocaleTimeString()}`
        ).join('\n')
      : 'No recent bids';

    const prompt = `Analyze this auction and calculate the user's winning probability based on real-time data and auction theory. DO NOT use ML model predictions - analyze the data directly.

Auction Data:
- Auction: "${auctionTitle}"
- Current Price: ${currentPrice} credits
- Starting Price: ${startingPrice} credits
- User's Intended Bid: ${userIntendedBid} credits
- Total Bids: ${totalBids}
- Active Bidders: ${activeBidders}
- Time Remaining: ${timeLeftMinutes.toFixed(1)} minutes
- User Credits: ${userCredits} credits

Recent Bid History:
${bidHistoryText}

Auction Theory Analysis:
1. If user's bid >= current price + reasonable increment, probability increases
2. More active bidders = lower probability for any single bidder
3. Less time remaining = higher probability (less chance for others to outbid)
4. Higher total bids = more competitive = lower probability
5. User's bid relative to starting price matters

Calculate a winning probability (0-100%) and provide:
1. The calculated probability
2. A 2-3 sentence explanation of WHY this probability
3. An actionable tip for the user

Format as JSON: {
  "winningProbability": number,
  "explanation": "string",
  "actionableTip": "string",
  "analysis": {
    "bidStrength": "string",
    "competitionLevel": "string",
    "timeFactor": "string"
  }
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert AI auction strategist. Analyze real-time auction data using auction theory to calculate winning probabilities. Output ONLY valid JSON."
        },
        {
          role: "user",
          content: prompt,
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      response_format: { type: "json_object" },
    });

    const content = chatCompletion.choices[0]?.message?.content || "{}";
    const analysis = JSON.parse(content);

    // Validate and clamp probability
    let finalProbability = Math.max(5, Math.min(95, analysis.winningProbability || 50));

    res.json({
      winningProbability: Math.floor(finalProbability),
      explanation: analysis.explanation || "Based on current auction dynamics, you have a moderate chance of winning.",
      actionableTip: analysis.actionableTip || "Consider increasing your bid to improve your chances.",
      analysis: {
        bidStrength: analysis.analysis?.bidStrength || "Moderate",
        competitionLevel: analysis.analysis?.competitionLevel || "Moderate",
        timeFactor: analysis.analysis?.timeFactor || "Neutral"
      },
      source: "Pure LLM Analysis (No ML Models)",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in LLM winning probability analysis:', error);
    res.status(500).json({
      winningProbability: 50,
      explanation: "Unable to calculate probability at this time.",
      actionableTip: "Please try again or place your bid manually.",
      source: "Fallback",
      error: error.message
    });
  }
});

// Route to get auction intelligence insights
router.post('/auction-intelligence', verifyToken, async (req, res) => {
  try {
    if (!groq) {
      return res.status(503).json({ error: 'AI service unavailable' });
    }

    const {
      auctionTitle,
      currentBid,
      startingPrice,
      totalBids,
      activeBidders,
      remainingTime,
      bidFrequency,
      averageIncrement
    } = req.body;

    const currentPrice = currentBid || startingPrice || 0;
    const timeLeftMinutes = Math.max(0, remainingTime / 60000);

    const prompt = `Analyze this auction's real-time dynamics and provide strategic insights:

Auction: "${auctionTitle}"
Current Price: ${currentPrice} credits
Starting Price: ${startingPrice} credits
Total Bids: ${totalBids}
Active Bidders: ${activeBidders}
Time Remaining: ${timeLeftMinutes.toFixed(1)} minutes
Bid Frequency: ${bidFrequency || 'Unknown'} bids per minute
Average Increment: ${averageIncrement || 'Unknown'} credits

Analyze the bidding patterns and provide strategic insights about the auction's competitiveness and predicted outcome.

Format as JSON: {
  "auctionMood": "string",
  "bidSpeed": "string",
  "predictedFinalRange": "string",
  "bidWarProbability": number,
  "strategicInsights": "string"
}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert AI auction intelligence analyst. Provide strategic insights based on real-time data. Output ONLY valid JSON."
        },
        {
          role: "user",
          content: prompt,
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = chatCompletion.choices[0]?.message?.content || "{}";
    const insights = JSON.parse(content);

    res.json({
      auctionMood: insights.auctionMood || "Neutral",
      bidSpeed: insights.bidSpeed || "Moderate",
      predictedFinalRange: insights.predictedFinalRange || "Data unavailable",
      bidWarProbability: Math.min(100, Math.max(0, insights.bidWarProbability || 30)),
      strategicInsights: insights.strategicInsights || "Monitor bidding patterns for optimal timing."
    });
  } catch (error) {
    console.error('Error generating auction intelligence:', error);
    res.status(500).json({
      auctionMood: "Neutral",
      bidSpeed: "Moderate",
      predictedFinalRange: "Data unavailable",
      bidWarProbability: 30,
      strategicInsights: "Unable to analyze at this time."
    });
  }
});

// Route to analyze auction for fraud patterns
router.get('/fraud-analysis/:auctionId', verifyToken, async (req, res) => {
  try {
    // Only admins should access fraud analysis
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    const auctionId = req.params.auctionId;
    
    const analysis = await fraudDetectionService.analyzeBiddingPatterns(auctionId);
    
    if (!analysis) {
      return res.status(404).json({ error: 'Auction not found or no bids to analyze' });
    }

    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing fraud patterns:', error);
    res.status(500).json({ error: 'Failed to analyze fraud patterns' });
  }
});

// Route to get fraud detection summary for admin dashboard
router.get('/fraud-summary', verifyToken, async (req, res) => {
  try {
    // Only admins should access fraud summary
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    const limit = parseInt(req.query.limit) || 50;
    const summary = await fraudDetectionService.getFraudDetectionSummary(limit);
    
    res.json(summary);
  } catch (error) {
    console.error('Error getting fraud summary:', error);
    res.status(500).json({ error: 'Failed to get fraud summary' });
  }
});

// Route to validate bid for fraud before processing
router.post('/validate-bid', verifyToken, async (req, res) => {
  try {
    const { auctionId, bidAmount } = req.body;
    const bidderId = req.userId;

    const validation = await fraudDetectionService.validateBidForFraud(auctionId, bidderId, bidAmount);
    
    res.json(validation);
  } catch (error) {
    console.error('Error validating bid:', error);
    res.status(500).json({ error: 'Failed to validate bid' });
  }
});

// Debug endpoint to test ML models directly (Admin only)
router.post('/debug/test-ml', verifyToken, async (req, res) => {
  try {
    // Only admins should access debug endpoints
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    const {
      starting_price = 100,
      current_bid = 450,
      bidders = 5,
      total_bids = 15,
      avg_increment = 30,
      bid_velocity = 2.0,
      auction_duration = 120,
      time_remaining = 50
    } = req.body;

    const testFeatures = {
      starting_price,
      current_bid,
      bidders,
      total_bids,
      avg_increment,
      bid_velocity,
      auction_duration,
      time_remaining,
      bid_history: []
    };

    logger.info('DEBUG: Testing ML models with features:', JSON.stringify(testFeatures));

    const mlResult = await mlPredictionService.getFullAnalysis(testFeatures);

    logger.info('DEBUG: ML Result:', JSON.stringify(mlResult));

    if (mlResult.error) {
      return res.status(500).json({
        status: 'error',
        message: mlResult.error,
        features: testFeatures
      });
    }

    const predictedPrice = mlResult.price_prediction?.predicted_price || 0;
    const winProb = mlResult.win_probability?.win_probability || 0;
    const lowerBound = Math.max(0.75 * predictedPrice, current_bid);
    const upperBound = 1.25 * predictedPrice;

    res.json({
      status: 'success',
      features: testFeatures,
      predictions: {
        predicted_price: predictedPrice,
        predicted_price_range: `${Math.round(lowerBound)} - ${Math.round(upperBound)} CR`,
        win_probability_decimal: winProb,
        win_probability_percent: `${(winProb * 100).toFixed(2)}%`,
        price_top_features: mlResult.price_prediction?.top_features || [],
        win_top_features: mlResult.win_probability?.top_features || []
      },
      validation: {
        price_valid: predictedPrice > 0,
        probability_valid: winProb >= 0 && winProb <= 1,
        features_count: Object.keys(testFeatures).length
      }
    });
  } catch (error) {
    logger.error('Error testing ML models:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;
