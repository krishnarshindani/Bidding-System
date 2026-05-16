import { useEffect, useState } from "react";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { motion } from "framer-motion";
import { API_SERVICE } from "@/services/api";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function BidActivityRadar() {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const categoryData = await API_SERVICE.analytics.getCategories();
        if (Array.isArray(categoryData) && categoryData.length > 0) {
          const labels = categoryData.map((c: any) => c.name);
          const bids = categoryData.map((c: any) => c.bids || 0);
          const revenue = categoryData.map((c: any) => parseFloat(c.revenue) || 0);

          setChartData({
            labels,
            datasets: [
              {
                label: "Bids",
                data: bids,
                backgroundColor: "rgba(229, 169, 25, 0.2)",
                borderColor: "#e5a919",
                borderWidth: 2,
                pointBackgroundColor: "#e5a919",
                pointBorderColor: "#0a0a0f",
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 7,
              },
              {
                label: "Revenue",
                data: revenue,
                backgroundColor: "rgba(139, 92, 246, 0.15)",
                borderColor: "#8b5cf6",
                borderWidth: 2,
                pointBackgroundColor: "#8b5cf6",
                pointBorderColor: "#0a0a0f",
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 7,
              },
            ],
          });
        }
      } catch (error) {
        console.warn("Could not fetch category data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
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
      r: {
        angleLines: { color: "rgba(255,255,255,0.06)" },
        grid: { color: "rgba(255,255,255,0.06)" },
        pointLabels: { color: "hsl(220, 12%, 65%)", font: { size: 11 } },
        ticks: { display: false },
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 100 }}
      className="glass-card p-6"
    >
      <h3 className="text-lg font-semibold mb-4">🎯 Category Performance Radar</h3>
      <div className="h-[300px]">
        {chartData ? (
          <Radar data={chartData} options={options} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">Loading radar...</div>
        )}
      </div>
    </motion.div>
  );
}
