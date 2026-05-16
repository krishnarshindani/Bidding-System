import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Clock, 
  RefreshCw,
  Eye,
  EyeOff,
  Search,
  FileText,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSocket } from '@/contexts/SocketContext';
import { API_SERVICE } from '@/services/api';
import { motion } from 'framer-motion';

interface FraudReport {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: any[];
  recommendation: string;
  timestamp: string;
}

interface FraudSummary {
  auctionId: number | string;
  auctionTitle: string;
  riskLevel: string;
  totalReports: number;
  lastUpdated: string;
}

interface FraudAnalysis {
  auctionId: number | string;
  timestamp: string;
  totalFraudReports: number;
  fraudReports: FraudReport[];
  riskLevel: string;
}

export const FraudDetectionPage: React.FC = () => {
  const [fraudSummary, setFraudSummary] = useState<FraudSummary[]>([]);
  const [selectedAuction, setSelectedAuction] = useState<FraudSummary | null>(null);
  const [fraudAnalysis, setFraudAnalysis] = useState<FraudAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();
  const { socket, isConnected } = useSocket();

  const token = localStorage.getItem('auth_token');

  // Fetch fraud detection summary
  const fetchFraudSummary = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await API_SERVICE.fraud.getFraudSummary(token);
      if (data && Array.isArray(data)) {
        setFraudSummary(data);
        // Auto-select the highest risk auction if none selected
        if (!selectedAuction && data.length > 0) {
          const highestRisk = data.reduce((prev, current) => {
            const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return riskOrder[prev.riskLevel] > riskOrder[current.riskLevel] ? prev : current;
          });
          setSelectedAuction(highestRisk);
        }
      } else {
        setFraudSummary([]);
      }
    } catch (error) {
      console.error('Error fetching fraud summary:', error);
      toast({
        title: "Error",
        description: "Failed to load fraud detection summary.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch detailed fraud analysis for selected auction
  const fetchFraudAnalysis = async (auctionId: number | string) => {
    if (!token) return;
    try {
      setAnalysisLoading(true);
      const data = await API_SERVICE.fraud.getFraudAnalysis(auctionId, token);
      if (data) {
        setFraudAnalysis(data);
      } else {
        setFraudAnalysis(null);
      }
    } catch (error) {
      console.error('Error fetching fraud analysis:', error);
      toast({
        title: "Error",
        description: "Failed to load fraud analysis for this auction.",
        variant: "destructive"
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  // Socket.IO real-time fraud detection updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for fraud detection alerts
    const handleFraudAlert = (data: any) => {
      console.log('Fraud alert received:', data);
      // Refresh the fraud summary when new fraud is detected
      fetchFraudSummary();
      
      // If the alert is for the currently selected auction, refresh its analysis
      if (selectedAuction && selectedAuction.auctionId === data.auctionId) {
        fetchFraudAnalysis(data.auctionId);
      }
    };

    // Listen for fraud analysis updates
    const handleFraudAnalysisUpdate = (data: any) => {
      console.log('Fraud analysis update received:', data);
      if (selectedAuction && selectedAuction.auctionId === data.auctionId) {
        setFraudAnalysis(data.analysis || data);
      }
    };

    // Listen for general fraud events
    const handleFraudEvent = (data: any) => {
      console.log('General fraud event:', data);
      fetchFraudSummary();
      if (selectedAuction && selectedAuction.auctionId === data.auctionId) {
        fetchFraudAnalysis(data.auctionId);
      }
    };

    socket.on('fraud:detected', handleFraudAlert);
    socket.on('fraud:analysis_update', handleFraudAnalysisUpdate);
    socket.on('fraud:alert', handleFraudEvent);
    socket.on('fraud:update', handleFraudEvent);

    return () => {
      socket.off('fraud:detected', handleFraudAlert);
      socket.off('fraud:analysis_update', handleFraudAnalysisUpdate);
      socket.off('fraud:alert', handleFraudEvent);
      socket.off('fraud:update', handleFraudEvent);
    };
  }, [socket, selectedAuction, isConnected]);

  // Auto-refresh effect with Socket.IO fallback
  useEffect(() => {
    fetchFraudSummary();
    if (selectedAuction) {
      fetchFraudAnalysis(selectedAuction.auctionId);
    }
    
    if (autoRefresh && !isConnected) {
      // Only use interval refresh if Socket.IO is not connected
      const interval = setInterval(fetchFraudSummary, 10000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, selectedAuction, isConnected]);

  // Filter summary based on search and risk level
  const filteredSummary = fraudSummary.filter(item => {
    const matchesSearch = item.auctionTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = filterRisk === 'all' || item.riskLevel === filterRisk;
    return matchesSearch && matchesRisk;
  });

  // Get risk level color and icon
  const getRiskLevelConfig = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return { color: 'bg-red-500', icon: AlertTriangle, text: 'Critical' };
      case 'high':
        return { color: 'bg-orange-500', icon: AlertTriangle, text: 'High' };
      case 'medium':
        return { color: 'bg-yellow-500', icon: TrendingUp, text: 'Medium' };
      case 'low':
        return { color: 'bg-green-500', icon: Users, text: 'Low' };
      default:
        return { color: 'bg-gray-500', icon: Shield, text: 'Unknown' };
    }
  };

  // Get fraud type icon and color
  const getFraudTypeConfig = (type: string) => {
    switch (type) {
      case 'rapid_bidding':
        return { icon: Clock, color: 'text-red-600', bg: 'bg-red-500/10' };
      case 'multiple_accounts_same_ip':
        return { icon: Users, color: 'text-orange-600', bg: 'bg-orange-500/10' };
      case 'last_second_spamming':
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-500/10' };
      case 'bid_sniping':
        return { icon: Eye, color: 'text-blue-600', bg: 'bg-blue-500/10' };
      case 'unusual_bid_amounts':
        return { icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-500/10' };
      default:
        return { icon: Shield, color: 'text-gray-600', bg: 'bg-gray-500/10' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Fraud Detection & Security</h1>
            <p className="text-sm text-muted-foreground">Monitor and analyze suspicious bidding activity</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFraudSummary}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="text-xs"
          >
            {autoRefresh ? "Auto Refresh On" : "Auto Refresh Off"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Summary Panel */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-b">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Risk Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Filters */}
              <div className="p-4 border-b space-y-3">
                <div className="flex gap-2">
                  {(['all', 'critical', 'high', 'medium', 'low'] as const).map(risk => (
                    <Button
                      key={risk}
                      variant={filterRisk === risk ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterRisk(risk)}
                      className="text-xs"
                    >
                      {risk.charAt(0).toUpperCase() + risk.slice(1)}
                    </Button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search auctions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 text-sm"
                  />
                </div>
              </div>

              {/* Summary List */}
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-muted-foreground">Loading...</div>
                ) : filteredSummary.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No suspicious activity detected
                  </div>
                ) : (
                  filteredSummary.map((item) => {
                    const config = getRiskLevelConfig(item.riskLevel);
                    const Icon = config.icon;
                    return (
                      <motion.div
                        key={item.auctionId}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 cursor-pointer hover:bg-secondary/30 transition-colors ${
                          selectedAuction?.auctionId === item.auctionId ? 'bg-secondary/50' : ''
                        }`}
                        onClick={() => setSelectedAuction(item)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-sm">{item.auctionTitle}</h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {item.totalReports} reports
                            </Badge>
                            <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{config.text} Risk</span>
                          <span>{new Date(item.lastUpdated).toLocaleString()}</span>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analysis Panel */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Detailed Analysis
                </CardTitle>
                {selectedAuction && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Auction: {selectedAuction.auctionTitle}
                    </Badge>
                    <Badge 
                      variant="default" 
                      className={`text-xs ${
                        selectedAuction.riskLevel === 'critical' ? 'bg-red-500' :
                        selectedAuction.riskLevel === 'high' ? 'bg-orange-500' :
                        selectedAuction.riskLevel === 'medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                    >
                      {selectedAuction.riskLevel.toUpperCase()} RISK
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {selectedAuction ? (
                analysisLoading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    Analyzing auction data...
                  </div>
                ) : fraudAnalysis ? (
                  <div className="divide-y divide-border">
                    {/* Analysis Header */}
                    <div className="p-4 border-b">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-primary">{fraudAnalysis.totalFraudReports}</div>
                          <div className="text-xs text-muted-foreground">Total Reports</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-orange-600">{fraudAnalysis.fraudReports.filter(r => r.severity === 'high' || r.severity === 'critical').length}</div>
                          <div className="text-xs text-muted-foreground">High Risk</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-yellow-600">{fraudAnalysis.fraudReports.filter(r => r.severity === 'medium').length}</div>
                          <div className="text-xs text-muted-foreground">Medium Risk</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">{fraudAnalysis.fraudReports.filter(r => r.severity === 'low').length}</div>
                          <div className="text-xs text-muted-foreground">Low Risk</div>
                        </div>
                      </div>
                    </div>

                    {/* Fraud Reports */}
                    <div className="p-4">
                      <h3 className="font-semibold mb-4">Fraud Detection Reports</h3>
                      <div className="space-y-4">
                        {fraudAnalysis.fraudReports.map((report, index) => {
                          const typeConfig = getFraudTypeConfig(report.type);
                          const Icon = typeConfig.icon;
                          return (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`p-4 border border-border rounded-lg ${typeConfig.bg}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 bg-white rounded-lg flex items-center justify-center ${typeConfig.color}`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium capitalize">{report.type.replace('_', ' ')}</h4>
                                    <p className="text-xs text-muted-foreground">{report.description}</p>
                                  </div>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    report.severity === 'critical' ? 'border-red-500 text-red-600' :
                                    report.severity === 'high' ? 'border-orange-500 text-orange-600' :
                                    report.severity === 'medium' ? 'border-yellow-500 text-yellow-600' :
                                    'border-green-500 text-green-600'
                                  }`}
                                >
                                  {report.severity.toUpperCase()}
                                </Badge>
                              </div>
                              
                              {/* Details */}
                              {report.details && report.details.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground">Details:</p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {report.details.slice(0, 3).map((detail, detailIndex) => (
                                      <div key={detailIndex} className="bg-white/50 p-2 rounded text-xs">
                                        {typeof detail === 'object' ? (
                                          Object.entries(detail).map(([key, value]) => (
                                            <div key={key} className="flex justify-between">
                                              <span className="text-muted-foreground">{key}:</span>
                                              <span className="font-medium">{String(value)}</span>
                                            </div>
                                          ))
                                        ) : (
                                          <div>{String(detail)}</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Recommendation */}
                              <div className="mt-3 p-2 bg-white/50 rounded">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Recommendation:</p>
                                <p className="text-xs">{report.recommendation}</p>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 border-t bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Last updated: {new Date(fraudAnalysis.timestamp).toLocaleString()}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="text-xs">
                            Export Report
                          </Button>
                          <Button variant="destructive" size="sm" className="text-xs">
                            Flag for Review
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    No fraud analysis available for this auction
                  </div>
                )
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select an auction from the summary panel to view detailed fraud analysis</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};