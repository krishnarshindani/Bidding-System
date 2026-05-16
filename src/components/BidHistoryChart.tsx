import React, { useEffect, useRef, useState } from 'react';
import 'chartjs-adapter-date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions,
  ChartData,
  ChartDataset
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Clock, 
  RefreshCw,
  BarChart3,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSocket } from '@/contexts/SocketContext';
import { API_SERVICE } from '@/services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface BidHistoryChartProps {
  auctionId?: number | string;
  className?: string;
  height?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface BidData {
  id: number;
  auctionId: number;
  bidderId: number;
  bidAmount: number;
  bidderName: string;
  timestamp: string;
}

interface ChartDataPoint {
  x: Date;
  y: number;
  bidderName: string;
  bidId: number;
}

export const BidHistoryChart: React.FC<BidHistoryChartProps> = ({
  auctionId,
  className = '',
  height = 400,
  autoRefresh = true,
  refreshInterval = 5000
}) => {
  const [bidData, setBidData] = useState<BidData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'all' | 'last_hour' | 'last_30min' | 'last_10min'>('all');
  const chartRef = useRef<any>(null);
  const { toast } = useToast();
  const { socket, isConnected } = useSocket();

  // Fetch bid history data
  const fetchBidHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authentication required');
      }

      let data;
      if (auctionId) {
        data = await API_SERVICE.bids.getByAuction(auctionId);
      } else {
        data = await API_SERVICE.bids.getAll(token);
      }
      
      setBidData(data || []);
    } catch (err) {
      console.error('Error fetching bid history:', err);
      setError('Failed to load bid history');
      toast({
        title: "Error",
        description: "Could not load bid history data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on time range
  const filterDataByTimeRange = (data: BidData[], range: string): BidData[] => {
    if (range === 'all') return data;
    
    const now = new Date();
    let cutoffTime: Date;
    
    switch (range) {
      case 'last_10min':
        cutoffTime = new Date(now.getTime() - 10 * 60 * 1000);
        break;
      case 'last_30min':
        cutoffTime = new Date(now.getTime() - 30 * 60 * 1000);
        break;
      case 'last_hour':
        cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      default:
        return data;
    }
    
    return data.filter(bid => new Date(bid.timestamp) >= cutoffTime);
  };

  // Prepare chart data
  const prepareChartData = (data: BidData[]): ChartData<'line', ChartDataPoint[], string> => {
    if (!data.length) {
      return {
        datasets: []
      };
    }

    // Sort bids by timestamp
    const sortedData = [...data].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Create cumulative bid history (price over time)
    const cumulativeData: ChartDataPoint[] = [];
    let runningTotal = 0;

    sortedData.forEach(bid => {
      runningTotal = Math.max(runningTotal, bid.bidAmount);
      cumulativeData.push({
        x: new Date(bid.timestamp),
        y: runningTotal,
        bidderName: bid.bidderName,
        bidId: bid.id
      });
    });

    // Group by bidder for individual lines
    const bidders = [...new Set(data.map(bid => bid.bidderName))];
    const datasets: ChartDataset<'line', ChartDataPoint[]>[] = [];

    // Main cumulative line (highest bid over time)
    datasets.push({
      label: 'Highest Bid',
      data: cumulativeData,
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6
    });

    // Individual bidder lines
    bidders.forEach((bidder, index) => {
      const bidderData = sortedData
        .filter(bid => bid.bidderName === bidder)
        .map(bid => ({
          x: new Date(bid.timestamp),
          y: bid.bidAmount,
          bidderName: bid.bidderName,
          bidId: bid.id
        }));

      const colors = [
        'rgb(16, 185, 129)',
        'rgb(245, 158, 11)',
        'rgb(239, 68, 68)',
        'rgb(147, 51, 234)',
        'rgb(2, 132, 199)'
      ];

      datasets.push({
        label: `Bid by ${bidder}`,
        data: bidderData,
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length].replace('rgb', 'rgba').replace(')', ', 0.1)'),
        borderWidth: 2,
        tension: 0.1,
        pointRadius: 3,
        pointHoverRadius: 5,
        hidden: true // Hide individual bidder lines by default
      });
    });

    return {
      datasets
    };
  };

  // Chart options
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          title: (context) => {
            const dataPoint = context[0].raw as ChartDataPoint;
            return new Date(dataPoint.x).toLocaleString();
          },
          label: (context) => {
            const dataPoint = context.raw as ChartDataPoint;
            if (context.dataset.label === 'Highest Bid') {
              return `Highest Bid: ${dataPoint.y} CR`;
            }
            return `${context.dataset.label}: ${dataPoint.y} CR`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'minute',
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          callback: function(value) {
            return value + ' CR';
          }
        }
      }
    },
    animation: {
      duration: 750,
      easing: 'easeInOutQuart'
    }
  };

  // Socket.IO real-time bid updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for new bids on this auction
    const handleNewBid = (data: any) => {
      console.log('Real-time bid received:', data);
      if (!auctionId || data.auctionId === auctionId) {
        // Add new bid to the chart data
        const newBid: BidData = {
          id: data.id || Math.random(),
          auctionId: data.auctionId,
          bidderId: data.bidderId,
          bidAmount: data.amount,
          bidderName: data.bidderName || 'Unknown',
          timestamp: data.timestamp || new Date().toISOString()
        };
        
        setBidData(prev => {
          // Check if bid already exists to avoid duplicates
          const exists = prev.some(bid => bid.id === newBid.id);
          if (exists) return prev;
          return [...prev, newBid];
        });
      }
    };

    // Listen for bid events from the server
    const handleBidPlaced = (data: any) => {
      console.log('Bid placed event received:', data);
      if (!auctionId || data.auctionId === auctionId) {
        const newBid: BidData = {
          id: data.bidId || Math.random(),
          auctionId: data.auctionId,
          bidderId: data.bidderId,
          bidAmount: data.bidAmount,
          bidderName: 'Unknown',
          timestamp: data.timestamp || new Date().toISOString()
        };
        
        setBidData(prev => {
          const exists = prev.some(bid => bid.id === newBid.id);
          if (exists) return prev;
          return [...prev, newBid];
        });
      }
    };

    socket.on('new-bid', handleNewBid);
    socket.on('bid:placed', handleBidPlaced);

    return () => {
      socket.off('new-bid', handleNewBid);
      socket.off('bid:placed', handleBidPlaced);
    };
  }, [socket, auctionId, isConnected]);

  // Auto-refresh effect with Socket.IO fallback
  useEffect(() => {
    fetchBidHistory();
    
    if (autoRefresh && !isConnected) {
      // Only use interval refresh if Socket.IO is not connected
      const interval = setInterval(fetchBidHistory, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [auctionId, autoRefresh, refreshInterval, isConnected]);

  // Filter data based on time range
  const filteredData = filterDataByTimeRange(bidData, timeRange);
  const chartData = prepareChartData(filteredData);

  // Calculate statistics
  const stats = {
    totalBids: bidData.length,
    uniqueBidders: new Set(bidData.map(b => b.bidderName)).size,
    highestBid: bidData.length > 0 ? Math.max(...bidData.map(b => b.bidAmount)) : 0,
    avgBidAmount: bidData.length > 0 ? bidData.reduce((sum, b) => sum + b.bidAmount, 0) / bidData.length : 0
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Bid History Analytics
              </CardTitle>
              <p className="text-xs text-muted-foreground">Real-time bidding activity visualization</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBidHistory}
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
        {/* Statistics Row */}
        <div className="grid grid-cols-4 gap-4 p-4 border-b bg-muted/50">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-blue-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">Total Bids</span>
            </div>
            <div className="text-lg font-bold">{stats.totalBids}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium">Unique Bidders</span>
            </div>
            <div className="text-lg font-bold">{stats.uniqueBidders}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-orange-600 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">Highest Bid</span>
            </div>
            <div className="text-lg font-bold">{stats.highestBid} CR</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-purple-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">Avg Bid</span>
            </div>
            <div className="text-lg font-bold">{Math.round(stats.avgBidAmount)} CR</div>
          </div>
        </div>

        {/* Time Range Controls */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex gap-2">
            {(['all', 'last_hour', 'last_30min', 'last_10min'] as const).map(range => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="text-xs"
              >
                {range.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {filteredData.length} bids shown
            </Badge>
            {autoRefresh && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Auto-refresh
              </Badge>
            )}
          </div>
        </div>

        {/* Chart Area */}
        <div className="p-4">
          {loading ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="h-[400px] flex items-center justify-center text-red-500">
              {error}
            </div>
          ) : bidData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              {auctionId ? "No bid history available for this auction" : "Select an auction to view bid history"}
            </div>
          ) : (
            <div style={{ height: `${height}px` }}>
              <Line
                ref={chartRef}
                data={chartData}
                options={chartOptions}
              />
            </div>
          )}
        </div>

        {/* Legend and Controls */}
        {bidData.length > 0 && (
          <div className="p-4 border-t bg-muted/30">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Chart shows bid progression over time</span>
              <div className="flex gap-4">
                <span>• Highest bid line shows auction price progression</span>
                <span>• Individual lines show each bidder's activity</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};