import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { motion } from "framer-motion";
import { API_SERVICE } from "@/services/api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function RevenueLineChart() {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await API_SERVICE.analytics.getTrends(30);
        if (Array.isArray(result) && result.length > 0) {
          const labels = result.map((d: any) =>
            typeof d.date === "string" ? d.date : new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          );
          const revenueData = result.map((d: any) => d.revenue || 0);
          const bidsData = result.map((d: any) => d.bids || 0);

          setChartData({
            labels,
            datasets: [
              {
                label: "Revenue (CR)",
                data: revenueData,
                borderColor: "#e5a919",
                backgroundColor: "rgba(229, 169, 25, 0.1)",
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: "#e5a919",
                pointBorderColor: "#0a0a0f",
                pointBorderWidth: 2,
              },
              {
                label: "Bids",
                data: bidsData,
                borderColor: "#22c55e",
                backgroundColor: "rgba(34, 197, 94, 0.05)",
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: "#22c55e",
                pointBorderColor: "#0a0a0f",
                pointBorderWidth: 2,
              },
            ],
          });
        }
      } catch (error) {
        console.warn("Could not fetch revenue data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: {
        display: true,
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
      y: { ticks: { color: "hsl(220, 12%, 45%)", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.04)" } },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-card p-6"
    >
      <h3 className="text-lg font-semibold mb-4">📈 Revenue & Bid Activity</h3>
      <div className="h-[300px]">
        {chartData ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">Loading chart...</div>
        )}
      </div>
    </motion.div>
  );
}
