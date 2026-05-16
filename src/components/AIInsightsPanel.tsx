import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  TrendingUp, 
  Target, 
  BarChart3, 
  Brain, 
  AlertTriangle, 
  Clock, 
  Users, 
  DollarSign,
  RefreshCw,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSocket } from '@/contexts/SocketContext';
import { API_SERVICE } from '@/services/api';

interface AIInsightsPanelProps {
  auctionId: number | string;
  currentBid: number;
  startingPrice: number;
  totalBids: number;
  activeBidders: number;
  remainingTime: number;
  userCredits: number;
  userCurrentBid?: number;
  recentBids?: any[];
  onBidAmount?: (amount: number) => void;
  className?: string;
}

interface AIAnalysis {
  suggestedBid: number;
  winningProbability: number;
  strategy: string;
  winningProbabilityReason?: string;
  explanation?: string;
  // ML model fields
  mlPredictedPrice?: number;
  mlWinProbability?: number;
  mlSource?: string;
  mlTopFeatures?: Array<{ feature: string; importance: string }>;
  auctionIntelligence: {
    auctionMood: string;
    bidSpeed: string;
    predictedFinalRange: string;
    bidWarProbability: number;
  };
}

interface WinningProbability {
  winningProbability: number;
  explanation: string;
  // ML model fields
  mlWinProbability?: number;
  mlTopFeatures?: Array<{ feature: string; importance: string }>;
  mlSource?: string;
  actionableTip?: string;
  mlPredictedPrice?: number;
}

interface AuctionIntelligence {
  auctionMood: string;
  bidSpeed: string;
  predictedFinalRange: string;
  bidWarProbability: number;
  strategicInsights: string;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  auctionId,
  currentBid,
  startingPrice,
  totalBids,
  activeBidders,
  remainingTime,
  userCredits,
  userCurrentBid = 0,
  recentBids = [],
  onBidAmount,
  className = ''
}) => {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [winningProbability, setWinningProbability] = useState<WinningProbability | null>(null);
  const [auctionIntelligence, setAuctionIntelligence] = useState<AuctionIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'probability' | 'intelligence'>('analysis');
  const { toast } = useToast();
  const { socket, isConnected } = useSocket();

  const generateAnalysis = async () => {
    if (!auctionId) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to access AI insights.",
          variant: "destructive"
        });
        return;
      }

      const data = {
        auctionId,
        auctionTitle: `Auction ${auctionId}`,
        currentBid,
        startingPrice,
        minimumBid: 1,
        totalBids,
        activeBidders,
        remainingTime,
        userCredits,
        userCurrentBid,
        recentBids
      };

      const result = await API_SERVICE.ai.getBiddingAnalysis(data, token);
      setAnalysis(result);
      setActiveTab('analysis');

      toast({
        title: "AI Analysis Complete",
        description: "Comprehensive bidding insights generated.",
      });
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not generate AI insights. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getWinningProbability = async () => {
    if (!auctionId) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const data = {
        auctionTitle: `Auction ${auctionId}`,
        currentBid,
        userBid: userCurrentBid,
        startingPrice,
        totalBids,
        activeBidders,
        remainingTime,
        userCredits
      };

      const result = await API_SERVICE.ai.getWinningProbability(data, token);
      setWinningProbability(result);
      setActiveTab('probability');

      toast({
        title: "Probability Calculated",
        description: "Winning probability updated.",
      });
    } catch (error) {
      console.error('Error calculating winning probability:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAuctionIntelligence = async () => {
    if (!auctionId) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const data = {
        auctionTitle: `Auction ${auctionId}`,
        currentBid,
        startingPrice,
        totalBids,
        activeBidders,
        remainingTime,
        bidFrequency: totalBids / Math.max(1, remainingTime / 60000),
        averageIncrement: 1
      };

      const result = await API_SERVICE.ai.getAuctionIntelligence(data, token);
      setAuctionIntelligence(result);
      setActiveTab('intelligence');

      toast({
        title: "Intelligence Updated",
        description: "Auction intelligence insights generated.",
      });
    } catch (error) {
      console.error('Error generating auction intelligence:', error);
    } finally {
      setLoading(false);
    }
  };

  // Socket.IO real-time AI insights updates
  useEffect(() => {
    if (!socket || !auctionId) return;

    // Listen for AI insights updates
    const handleAIInsightsUpdate = (data: any) => {
      if (data.auctionId === auctionId) {
        console.log('AI insights updated:', data);
        // Refresh all AI insights when new data is available
        if (data.type === 'analysis') {
          setAnalysis(data.analysis);
        } else if (data.type === 'probability') {
          setWinningProbability(data.probability);
        } else if (data.type === 'intelligence') {
          setAuctionIntelligence(data.intelligence);
        }
      }
    };

    // Listen for auction state changes that might affect AI analysis
    const handleAuctionStateChange = (data: any) => {
      if (data.auctionId === auctionId && data.type === 'state_change') {
        // Refresh AI analysis when auction state changes significantly
        generateAnalysis();
      }
    };

    socket.on('ai:insights_update', handleAIInsightsUpdate);
    socket.on('auction:state_change', handleAuctionStateChange);

    return () => {
      socket.off('ai:insights_update', handleAIInsightsUpdate);
      socket.off('auction:state_change', handleAuctionStateChange);
    };
  }, [socket, auctionId]);

  // Auto-generate analysis when component mounts or data changes
  useEffect(() => {
    generateAnalysis();
  }, [auctionId, currentBid, totalBids, activeBidders, remainingTime]);

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'bg-green-500';
    if (probability >= 60) return 'bg-blue-500';
    if (probability >= 40) return 'bg-yellow-500';
    if (probability >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getMoodColor = (mood: string) => {
    const moodLower = mood.toLowerCase();
    if (moodLower.includes('aggressive') || moodLower.includes('competitive')) return 'bg-red-500';
    if (moodLower.includes('active') || moodLower.includes('busy')) return 'bg-blue-500';
    if (moodLower.includes('neutral') || moodLower.includes('steady')) return 'bg-gray-500';
    if (moodLower.includes('slow') || moodLower.includes('quiet')) return 'bg-green-500';
    return 'bg-gray-500';
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Insights
              </CardTitle>
              <p className="text-xs text-muted-foreground">Real-time auction intelligence</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generateAnalysis}
              disabled={loading}
              className="text-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Tab Navigation */}
        <div className="flex border-b bg-muted/50">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex-1 flex items-center gap-2 p-3 text-sm font-medium transition-colors ${
              activeTab === 'analysis' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Target className="w-4 h-4" />
            Bid Analysis
          </button>
          <button
            onClick={() => setActiveTab('probability')}
            className={`flex-1 flex items-center gap-2 p-3 text-sm font-medium transition-colors ${
              activeTab === 'probability' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Win Probability
          </button>
          <button
            onClick={() => setActiveTab('intelligence')}
            className={`flex-1 flex items-center gap-2 p-3 text-sm font-medium transition-colors ${
              activeTab === 'intelligence' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Market Intel
          </button>
        </div>

        {/* Analysis Tab */}
        {activeTab === 'analysis' && analysis && (
          <div className="p-4 space-y-4">
            {/* ML Model Badge */}
            {analysis.mlSource && (
              <div className="flex items-center justify-end">
                <Badge variant="outline" className="text-xs bg-purple-500/10 border-purple-500/30 text-purple-600">
                  🤖 {analysis.mlSource}
                </Badge>
              </div>
            )}

            {/* ML Predicted Price Card - Primary Metric */}
            {analysis.mlPredictedPrice && (
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-2 border-purple-500/40 rounded-lg p-4 shadow-lg">
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-bold text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                    ML Predicted Final Price
                  </h4>
                </div>
                {(() => {
                  const predictedPrice = analysis.mlPredictedPrice;
                  const lowerBound = Math.max(0.75 * predictedPrice, 0);
                  const upperBound = 1.25 * predictedPrice;
                  return (
                    <>
                      <div className="text-3xl font-bold text-purple-600 mb-2">
                        {Math.round(lowerBound)} - {Math.round(upperBound)} CR
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        XGBoost regression model prediction based on current auction dynamics
                      </p>
                    </>
                  );
                })()}
                
                {/* Top Influencing Features */}
                {analysis.mlTopFeatures && analysis.mlTopFeatures.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Top Influencing Factors:</p>
                    <div className="grid grid-cols-1 gap-1">
                      {analysis.mlTopFeatures.slice(0, 3).map((feature, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="capitalize font-medium">{feature.feature}</span>
                          <div className="flex-1 mx-2 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-purple-500"
                              style={{ width: `${Math.min(parseFloat(feature.importance), 100)}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground font-semibold">{feature.importance}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ML Win Probability Card - Primary Metric */}
            {analysis.mlWinProbability !== undefined && (
              <div className={`bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-2 rounded-lg p-4 shadow-lg ${
                analysis.mlWinProbability > 60 ? 'border-green-500/40' :
                analysis.mlWinProbability > 30 ? 'border-yellow-500/40' :
                'border-red-500/40'
              }`}>
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-bold text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    ML Winning Probability
                  </h4>
                </div>
                <div className={`text-3xl font-bold mb-2 ${
                  analysis.mlWinProbability > 60 ? 'text-green-600' :
                  analysis.mlWinProbability > 30 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {Math.round(analysis.mlWinProbability)}%
                </div>
                <p className="text-sm text-muted-foreground">
                  {analysis.mlWinProbability > 60 ? '🟢 Strong chance of winning with current bid strategy' :
                   analysis.mlWinProbability > 30 ? '🟡 Moderate competition - strategic bidding needed' :
                   '🔴 Low probability - high competition detected'}
                </p>
              </div>
            )}

            {/* Auction Intelligence Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Auction Mood</span>
                  <Badge className={`${getMoodColor(analysis.auctionIntelligence.auctionMood)} text-white`}>
                    {analysis.auctionIntelligence.auctionMood}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{analysis.auctionIntelligence.bidSpeed}</span>
                </div>
              </div>
              
              <div className="bg-secondary rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Bid War Risk</span>
                  <Badge variant="destructive">
                    {analysis.auctionIntelligence.bidWarProbability}%
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{activeBidders} active bidders</span>
                </div>
              </div>
            </div>

            {/* Predicted Range */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Predicted Final Range</span>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-lg font-bold">{analysis.auctionIntelligence.predictedFinalRange}</p>
            </div>
          </div>
        )}

        {/* Probability Tab */}
        {activeTab === 'probability' && winningProbability && (
          <div className="p-4 space-y-4">
            {/* ML Badge */}
            {winningProbability.mlSource && (
              <div className="flex items-center justify-end">
                <Badge variant="outline" className="text-xs bg-purple-500/10 border-purple-500/30 text-purple-600">
                  🤖 {winningProbability.mlSource}
                </Badge>
              </div>
            )}

            {/* Large Probability Display */}
            <div className={`rounded-lg p-6 text-center shadow-lg border-2 ${
              winningProbability.winningProbability > 60 
                ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/40' :
              winningProbability.winningProbability > 30 
                ? 'bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/40' :
                'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/40'
            }`}>
              <p className="text-sm text-muted-foreground mb-2 font-semibold">Your Win Probability</p>
              <div className={`text-5xl font-black mb-2 ${
                winningProbability.winningProbability > 60 ? 'text-green-600' :
                winningProbability.winningProbability > 30 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {Math.round(winningProbability.winningProbability)}%
              </div>
              <p className="text-sm text-muted-foreground">
                {winningProbability.winningProbability > 60 
                  ? '✅ Strong competitive position - high likelihood of success' :
                 winningProbability.winningProbability > 30 
                  ? '⚠️ Moderate competition - consider strategic bid increase' :
                  '❌ Highly competitive - aggressive bidding required to win'}
              </p>
            </div>

            {/* ML Predicted Price Display */}
            {winningProbability.mlPredictedPrice && (
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-2 border-purple-500/40 rounded-lg p-4 shadow-lg">
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-bold text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                    ML Predicted Final Price
                  </h4>
                </div>
                {(() => {
                  const predictedPrice = winningProbability.mlPredictedPrice;
                  const lowerBound = Math.max(0.75 * predictedPrice, 0);
                  const upperBound = 1.25 * predictedPrice;
                  return (
                    <>
                      <div className="text-3xl font-bold text-purple-600 mb-2">
                        {Math.round(lowerBound)} - {Math.round(upperBound)} CR
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        XGBoost regression model prediction based on current auction dynamics
                      </p>
                    </>
                  );
                })()}
              </div>
            )}

            {/* ML Explanation */}
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-500" />
                ML Model Analysis
              </h4>
              
              {/* Top Winning Factors */}
              {winningProbability.mlTopFeatures && winningProbability.mlTopFeatures.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground">Key Factors Influencing Win Probability:</p>
                  <div className="space-y-2">
                    {winningProbability.mlTopFeatures.slice(0, 3).map((feature, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="capitalize font-medium w-24">{feature.feature}</span>
                        <div className="flex-1 mx-2 h-2.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500"
                            style={{ width: `${Math.min(parseFloat(feature.importance), 100)}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground font-semibold w-12 text-right">{feature.importance}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Explanation */}
            <div className="bg-secondary rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-primary" />
                Why This Probability?
              </h4>
              <p className="text-sm text-muted-foreground">{winningProbability.explanation}</p>
            </div>

            {/* Actionable Tip */}
            {winningProbability.actionableTip && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-sm text-blue-600 font-medium">💡 {winningProbability.actionableTip}</p>
              </div>
            )}

            {/* Current Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">Current Bid</div>
                <div className="text-lg font-bold">{currentBid} CR</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">Your Credits</div>
                <div className="text-lg font-bold">{userCredits} CR</div>
              </div>
            </div>
          </div>
        )}

        {/* Intelligence Tab */}
        {activeTab === 'intelligence' && auctionIntelligence && (
          <div className="p-4 space-y-4">
            {/* Market Overview */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Market Sentiment</span>
                  <Badge className={`${getMoodColor(auctionIntelligence.auctionMood)} text-white`}>
                    {auctionIntelligence.auctionMood}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span>{auctionIntelligence.bidSpeed}</span>
                </div>
              </div>
            </div>

            {/* Predicted Outcome */}
            <div className="bg-secondary rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Predicted Final Range
              </h4>
              <p className="text-lg font-bold text-primary">{auctionIntelligence.predictedFinalRange}</p>
            </div>

            {/* Strategic Insights */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                Strategic Insights
              </h4>
              <p className="text-sm text-muted-foreground">{auctionIntelligence.strategicInsights}</p>
            </div>

            {/* Current Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-xs text-muted-foreground">Total Bids</div>
                <div className="text-lg font-bold">{totalBids}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-xs text-muted-foreground">Time Left</div>
                <div className="text-lg font-bold">{formatTime(remainingTime)}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-xs text-muted-foreground">Avg Increment</div>
                <div className="text-lg font-bold">~1 CR</div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Analyzing auction data...</p>
          </div>
        )}

        {/* Empty State */}
        {!analysis && !winningProbability && !auctionIntelligence && !loading && (
          <div className="p-6 text-center">
            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-sm text-muted-foreground">Click "Refresh" to generate AI insights</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};