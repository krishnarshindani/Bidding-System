import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { motion } from "framer-motion";
import { API_SERVICE } from "@/services/api";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function TopAuctionsBar() {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const auctions = await API_SERVICE.analytics.getTopAuctions(8);
        if (Array.isArray(auctions) && auctions.length > 0) {
          // Already ordered by backend; just slice to safety limit
          const sorted = auctions.slice(0, 8);

          const labels = sorted.map((a: any) => {
            const title = a.title || "Untitled";
            return title.length > 15 ? title.substring(0, 15) + "…" : title;
          });
          const prices = sorted.map((a: any) => parseFloat(a.current_bid_price) || 0);
          const bids = sorted.map((a: any) => a.total_bids || 0);

          setChartData({
            labels,
            datasets: [
              {
                label: "Current Price (CR)",
                data: prices,
                backgroundColor: prices.map((_: number, i: number) => {
                  const alpha = 0.3 + (1 - i / prices.length) * 0.7;
                  return `rgba(229, 169, 25, ${alpha})`;
                }),
                borderColor: "#e5a919",
                borderWidth: 1,
                borderRadius: 6,
                barPercentage: 0.7,
              },
              {
                label: "Total Bids",
                data: bids,
                backgroundColor: bids.map((_: number, i: number) => {
                  const alpha = 0.2 + (1 - i / bids.length) * 0.5;
                  return `rgba(59, 130, 246, ${alpha})`;
                }),
                borderColor: "#3b82f6",
                borderWidth: 1,
                borderRadius: 6,
                barPercentage: 0.7,
              },
            ],
          });
        }
      } catch (error) {
        console.warn("Could not fetch auction data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y" as const,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { color: "hsl(220, 12%, 65%)", font: { size: 12 }, usePointStyle: true, pointStyleWidth: 8 },
      },
      tooltip: {
        backgroundColor: "rgba(10, 10, 15, 0.95)",
        titleColor: "#e5a919",
        bodyColor: "hsl(220, 12%, 75%)",
        borderColor: "rgba(229, 169, 25, 0.3)",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
    scales: {
      x: { ticks: { color: "hsl(220, 12%, 45%)", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.04)" } },
      y: { ticks: { color: "hsl(220, 12%, 55%)", font: { size: 11 } }, grid: { display: false } },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 80 }}
      className="glass-card p-6"
    >
      <h3 className="text-lg font-semibold mb-4">🏆 Top Auctions Leaderboard</h3>
      <div className="h-[340px]">
        {chartData ? (
          <Bar data={chartData} options={options} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">Loading chart...</div>
        )}
      </div>
    </motion.div>
  );
}
