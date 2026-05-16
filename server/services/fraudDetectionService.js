/**
 * AI Fraud Detection Service
 * Detects suspicious bidding behavior using pattern analysis
 */

import * as queries from './queries.js';

// Fraud detection thresholds and patterns
const FRAUD_THRESHOLDS = {
  RAPID_BIDS_COUNT: 4,        // Number of bids in rapid succession
  RAPID_BIDS_TIMEFRAME: 60000, // Time window in milliseconds (1 minute)
  SAME_IP_THRESHOLD: 2,        // Multiple accounts from same IP
  LAST_SECOND_BIDS_COUNT: 3,   // Rapid bids in last 10 seconds
  LAST_SECOND_TIMEFRAME: 10000 // Last 10 seconds
};

/**
 * Analyze bidding patterns for fraud detection
 */
export const analyzeBiddingPatterns = async (auctionId, io = null) => {
  try {
    // Get recent bids for this auction
    const bids = await queries.getAuctionBids(auctionId);
    const now = new Date();
    
    // Analyze different fraud patterns
    const fraudReports = [];
    
    // 1. Rapid bidding detection
    const rapidBidsReport = await detectRapidBidding(bids, auctionId);
    if (rapidBidsReport) fraudReports.push(rapidBidsReport);
    
    // 2. Multiple accounts from same IP detection (REMOVED as ip_address field was removed from database)
    // const ipFraudReport = await detectIPFraud(bids, auctionId);
    // if (ipFraudReport) fraudReports.push(ipFraudReport);
    
    // 3. Last-second bid spamming detection
    const lastSecondReport = await detectLastSecondSpamming(bids, auctionId);
    if (lastSecondReport) fraudReports.push(lastSecondReport);
    
    // 4. Bid sniping detection (last moment bids)
    const snipingReport = await detectBidSniping(bids, auctionId);
    if (snipingReport) fraudReports.push(snipingReport);
    
    // 5. Unusual bid amount patterns
    const amountPatternReport = await detectUnusualBidPatterns(bids, auctionId);
    if (amountPatternReport) fraudReports.push(amountPatternReport);
    
    // Emit real-time fraud alerts if io is provided
    if (io && fraudReports.length > 0) {
      // Emit general fraud detection event
      io.emit('fraud:detected', {
        auctionId,
        timestamp: now.toISOString(),
        riskLevel: calculateRiskLevel(fraudReports),
        totalReports: fraudReports.length,
        reports: fraudReports.slice(0, 3) // Send top 3 reports
      });

      // Emit fraud analysis update
      io.emit('fraud:analysis_update', {
        auctionId,
        analysis: {
          auctionId,
          timestamp: now.toISOString(),
          totalFraudReports: fraudReports.length,
          fraudReports,
          riskLevel: calculateRiskLevel(fraudReports)
        }
      });

      // Emit individual fraud alerts for high/critical severity
      fraudReports.forEach(report => {
        if (report.severity === 'high' || report.severity === 'critical') {
          io.emit('fraud:alert', {
            auctionId,
            type: report.type,
            severity: report.severity,
            description: report.description,
            details: report.details.slice(0, 2)
          });
        }
      });

      // Emit general fraud update
      io.emit('fraud:update', {
        auctionId,
        riskLevel: calculateRiskLevel(fraudReports),
        totalReports: fraudReports.length,
        timestamp: now.toISOString()
      });
    }

    return {
      auctionId,
      timestamp: now,
      totalFraudReports: fraudReports.length,
      fraudReports,
      riskLevel: calculateRiskLevel(fraudReports)
    };
  } catch (error) {
    console.error('[FRAUD DETECTION] Error analyzing patterns:', error);
    return null;
  }
};

/**
 * Detect rapid bidding (too many bids in short time)
 */
const detectRapidBidding = async (bids, auctionId) => {
  const now = new Date();
  const timeWindow = now.getTime() - FRAUD_THRESHOLDS.RAPID_BIDS_TIMEFRAME;
  
  // Group bids by user within time window
  const userBids = {};
  bids.forEach(bid => {
    const bidTime = new Date(bid.created_at).getTime();
    if (bidTime >= timeWindow) {
      if (!userBids[bid.bidder_id]) {
        userBids[bid.bidder_id] = [];
      }
      userBids[bid.bidder_id].push(bid);
    }
  });
  
  // Check for users with excessive bids
  const suspiciousUsers = Object.entries(userBids).filter(([userId, userBidList]) => 
    userBidList.length >= FRAUD_THRESHOLDS.RAPID_BIDS_COUNT
  );
  
  if (suspiciousUsers.length > 0) {
    const details = await Promise.all(
      suspiciousUsers.map(async ([userId, userBidList]) => {
        const user = await queries.getUserById(userId);
        return {
          userId,
          username: user ? user.username : 'Unknown',
          bidCount: userBidList.length,
          timeWindow: FRAUD_THRESHOLDS.RAPID_BIDS_TIMEFRAME / 1000 + ' seconds',
          averageTimeBetweenBids: calculateAverageTimeBetweenBids(userBidList)
        };
      })
    );
    
    return {
      type: 'rapid_bidding',
      severity: 'high',
      description: 'Multiple rapid bids detected from same user',
      details,
      recommendation: 'Review user activity and consider bid validation'
    };
  }
  
  return null;
};

/**
 * Detect last-second bid spamming
 */
const detectLastSecondSpamming = async (bids, auctionId) => {
  const auction = await queries.getAuctionById(auctionId);
  if (!auction) return null;
  
  const auctionEndTime = new Date(auction.auction_end_time);
  const timeWindowStart = new Date(auctionEndTime.getTime() - FRAUD_THRESHOLDS.LAST_SECOND_TIMEFRAME);
  
  // Get bids in the last 10 seconds
  const lastSecondBids = bids.filter(bid => {
    const bidTime = new Date(bid.created_at);
    return bidTime >= timeWindowStart && bidTime <= auctionEndTime;
  });
  
  if (lastSecondBids.length >= FRAUD_THRESHOLDS.LAST_SECOND_BIDS_COUNT) {
    const userBids = {};
    lastSecondBids.forEach(bid => {
      if (!userBids[bid.bidder_id]) {
        userBids[bid.bidder_id] = [];
      }
      userBids[bid.bidder_id].push(bid);
    });
    
    const details = await Promise.all(
      Object.entries(userBids).map(async ([userId, userBidList]) => {
        const user = await queries.getUserById(userId);
        return {
          userId,
          username: user ? user.username : 'Unknown',
          bidCount: userBidList.length,
          timeWindow: 'Last 10 seconds before auction end'
        };
      })
    );
    
    return {
      type: 'last_second_spamming',
      severity: 'medium',
      description: 'Excessive bidding activity in final seconds',
      details,
      recommendation: 'Monitor for bid sniping and consider extending auction time'
    };
  }
  
  return null;
};

/**
 * Detect bid sniping (last moment winning bids)
 */
const detectBidSniping = async (bids, auctionId) => {
  const auction = await queries.getAuctionById(auctionId);
  if (!auction) return null;
  
  const auctionEndTime = new Date(auction.auction_end_time);
  const snipeWindow = 30000; // 30 seconds before end
  const timeWindowStart = new Date(auctionEndTime.getTime() - snipeWindow);
  
  // Get bids in the last 30 seconds
  const snipeBids = bids.filter(bid => {
    const bidTime = new Date(bid.created_at);
    return bidTime >= timeWindowStart && bidTime <= auctionEndTime;
  });
  
  if (snipeBids.length > 0) {
    // Check if the winning bid was placed in the last 30 seconds
    const highestBid = snipeBids.reduce((prev, current) => 
      prev.bid_amount > current.bid_amount ? prev : current
    );
    
    if (highestBid) {
      const bidTime = new Date(highestBid.created_at);
      const timeUntilEnd = auctionEndTime.getTime() - bidTime.getTime();
      
      if (timeUntilEnd <= snipeWindow) {
        const user = await queries.getUserById(highestBid.bidder_id);
        return {
          type: 'bid_sniping',
          severity: 'low',
          description: 'Winning bid placed in final moments',
          details: {
            userId: highestBid.bidder_id,
            username: user ? user.username : 'Unknown',
            bidAmount: highestBid.bid_amount,
            timeUntilEnd: Math.round(timeUntilEnd / 1000) + ' seconds',
            bidTime: bidTime.toISOString()
          },
          recommendation: 'Consider implementing anti-sniping measures'
        };
      }
    }
  }
  
  return null;
};

/**
 * Detect unusual bid amount patterns
 */
const detectUnusualBidPatterns = async (bids, auctionId) => {
  if (bids.length < 5) return null;
  
  // Calculate bid increments
  const sortedBids = bids.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const increments = [];
  
  for (let i = 1; i < sortedBids.length; i++) {
    const increment = sortedBids[i].bid_amount - sortedBids[i-1].bid_amount;
    increments.push({
      from: sortedBids[i-1].bid_amount,
      to: sortedBids[i].bid_amount,
      increment: increment,
      bidder: sortedBids[i].bidder_id
    });
  }
  
  // Detect suspicious patterns
  const suspiciousIncrements = increments.filter(inc => 
    inc.increment < 1 || inc.increment > 1000 // Unusually small or large increments
  );
  
  if (suspiciousIncrements.length > 0) {
    const details = await Promise.all(
      suspiciousIncrements.map(async (inc) => {
        const user = await queries.getUserById(inc.bidder);
        return {
          userId: inc.bidder,
          username: user ? user.username : 'Unknown',
          fromAmount: inc.from,
          toAmount: inc.to,
          increment: inc.increment,
          isSuspicious: inc.increment < 1 || inc.increment > 1000
        };
      })
    );
    
    return {
      type: 'unusual_bid_amounts',
      severity: 'medium',
      description: 'Suspicious bid amount patterns detected',
      details,
      recommendation: 'Review bid amounts for potential manipulation'
    };
  }
  
  return null;
};

/**
 * Calculate overall risk level based on fraud reports
 */
const calculateRiskLevel = (fraudReports) => {
  if (fraudReports.length === 0) return 'low';
  
  const highSeverityCount = fraudReports.filter(report => report.severity === 'high').length;
  const mediumSeverityCount = fraudReports.filter(report => report.severity === 'medium').length;
  
  if (highSeverityCount >= 2) return 'critical';
  if (highSeverityCount === 1 || mediumSeverityCount >= 3) return 'high';
  if (mediumSeverityCount >= 1) return 'medium';
  
  return 'low';
};

/**
 * Calculate average time between bids for a user
 */
const calculateAverageTimeBetweenBids = (bids) => {
  if (bids.length < 2) return 0;
  
  const sortedBids = bids.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  let totalTime = 0;
  
  for (let i = 1; i < sortedBids.length; i++) {
    const timeDiff = new Date(sortedBids[i].created_at).getTime() - new Date(sortedBids[i-1].created_at).getTime();
    totalTime += timeDiff;
  }
  
  return Math.round(totalTime / (sortedBids.length - 1) / 1000) + ' seconds';
};

/**
 * Get fraud detection summary for admin dashboard
 */
export const getFraudDetectionSummary = async (limit = 50) => {
  try {
    // Get recent auctions to analyze
    const auctions = await queries.getActiveAuctions(limit, 0);
    const summaries = [];
    
    for (const auction of auctions) {
      const analysis = await analyzeBiddingPatterns(auction.id);
      if (analysis && analysis.totalFraudReports > 0) {
        summaries.push({
          auctionId: auction.id,
          auctionTitle: auction.title,
          riskLevel: analysis.riskLevel,
          totalReports: analysis.totalFraudReports,
          lastUpdated: analysis.timestamp
        });
      }
    }
    
    return summaries.sort((a, b) => {
      const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
    });
  } catch (error) {
    console.error('[FRAUD DETECTION] Error getting summary:', error);
    return [];
  }
};

/**
 * Create fraud alert notification
 */
export const createFraudAlert = async (auctionId, fraudReport) => {
  try {
    // Get admin users
    const [admins] = await queries.pool.query(
      'SELECT id FROM users WHERE user_type = "admin"'
    );
    
    for (const admin of admins) {
      await queries.createNotification({
        userId: admin.id,
        type: 'fraud_detected',
        title: 'Suspicious Bidding Activity Detected',
        message: `Auction ${auctionId}: ${fraudReport.description}`,
        relatedAuctionId: auctionId,
        relatedUserId: null,
      });
    }
  } catch (error) {
    console.error('[FRAUD DETECTION] Error creating alert:', error);
  }
};

/**
 * Validate bid for potential fraud before processing
 */
export const validateBidForFraud = async (auctionId, bidderId, bidAmount) => {
  try {
    const bids = await queries.getAuctionBids(auctionId);
    const userRecentBids = bids.filter(bid => bid.bidder_id === bidderId);
    
    // Check for rapid bidding by this user
    const now = new Date();
    const timeWindow = now.getTime() - FRAUD_THRESHOLDS.RAPID_BIDS_TIMEFRAME;
    const recentUserBids = userRecentBids.filter(bid => 
      new Date(bid.created_at).getTime() >= timeWindow
    );
    
    if (recentUserBids.length >= FRAUD_THRESHOLDS.RAPID_BIDS_COUNT) {
      return {
        isValid: false,
        reason: 'Rapid bidding detected - bid validation required',
        riskLevel: 'high'
      };
    }
    
    return { isValid: true, riskLevel: 'low' };
  } catch (error) {
    console.error('[FRAUD DETECTION] Error validating bid:', error);
    return { isValid: false, reason: 'Validation error', riskLevel: 'unknown' };
  }
};