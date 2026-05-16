import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { API_SERVICE } from "@/services/api";

interface Metric {
  label: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
}

export default function LiveMetrics() {
  const [metrics, setMetrics] = useState<Metric[]>([
    {
      label: "Active Auctions",
      value: "0",
      change: 0,
      icon: <Activity className="w-5 h-5" />,
      color: "text-primary",
    },
    {
      label: "Total Bids",
      value: "0",
      change: 0,
      icon: <TrendingUp className="w-5 h-5" />,
      color: "text-green-500",
    },
    {
      label: "Total Revenue",
      value: "0 CR",
      change: 0,
      icon: <TrendingDown className="w-5 h-5" />,
      color: "text-orange-500",
    },
    {
      label: "Avg Bids Per Auction",
      value: "0",
      change: 0,
      icon: <TrendingUp className="w-5 h-5" />,
      color: "text-emerald-500",
    },
  ]);

  // Fetch real metrics from API
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const stats = await API_SERVICE.analytics.getStats();
        if (stats) {
          setMetrics([
            {
              label: "Active Auctions",
              value: String(stats.activeAuctions || 0),
              change: 0,
              icon: <Activity className="w-5 h-5" />,
              color: "text-primary",
            },
            {
              label: "Total Bids",
              value: String(stats.totalBids || 0),
              change: 0,
              icon: <TrendingUp className="w-5 h-5" />,
              color: "text-green-500",
            },
            {
              label: "Total Revenue",
              value: `${(stats.totalRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} CR`,
              change: 0,
              icon: <TrendingDown className="w-5 h-5" />,
              color: "text-orange-500",
            },
            {
              label: "Avg Bids Per Auction",
              value: String((Number(stats.avgBidsPerAuction) || 0).toFixed(1)),
              change: 0,
              icon: <TrendingUp className="w-5 h-5" />,
              color: "text-emerald-500",
            },
          ]);
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
      }
    };

    fetchMetrics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, idx) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.1 }}
        >
          <Card className="glass-card p-6 hover:border-primary/30 transition-colors group cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className={`${metric.color}`}>{metric.icon}</div>
              <motion.div
                className="text-xs font-semibold flex items-center gap-1"
                animate={{
                  scale: [1, 1.05, 1],
                  color: metric.change > 0 ? "#22c55e" : "#ef4444",
                }}
                transition={{ duration: 1, repeat: Infinity, delay: idx * 0.2 }}
              >
                {metric.change > 0 ? "+" : ""}{metric.change}%
              </motion.div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
              <motion.p
                className="text-2xl font-bold"
                initial={{ scale: 1 }}
                whileInView={{ scale: 1.05 }}
                viewport={{ once: true }}
              >
                {metric.value}
              </motion.p>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
