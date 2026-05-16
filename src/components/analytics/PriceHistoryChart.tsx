import { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { motion } from "framer-motion";
import { API_SERVICE } from "@/services/api";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PriceHistoryChart() {
  const [chartData, setChartData] = useState<any>(null);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const categoryData = await API_SERVICE.analytics.getCategories();
        if (Array.isArray(categoryData) && categoryData.length > 0) {
          const labels = categoryData.map((c: any) => c.name);
          const revenue = categoryData.map((c: any) => parseFloat(c.revenue) || 0);
          const total = revenue.reduce((a: number, b: number) => a + b, 0);
          setTotalRevenue(total);

          const colors = [
            "rgba(229, 169, 25, 0.9)",
            "rgba(139, 92, 246, 0.9)",
            "rgba(34, 197, 94, 0.9)",
            "rgba(59, 130, 246, 0.9)",
            "rgba(244, 63, 94, 0.9)",
            "rgba(251, 146, 60, 0.9)",
            "rgba(168, 85, 247, 0.9)",
            "rgba(20, 184, 166, 0.9)",
          ];

          setChartData({
            labels,
            datasets: [
              {
                data: revenue,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: "rgba(10, 10, 15, 0.8)",
                borderWidth: 3,
                hoverBorderWidth: 0,
                hoverOffset: 15,
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
    cutout: "65%",
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: "hsl(220, 12%, 65%)",
          font: { size: 11 },
          usePointStyle: true,
          pointStyleWidth: 8,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: "rgba(10, 10, 15, 0.95)",
        titleColor: "#e5a919",
        bodyColor: "hsl(220, 12%, 75%)",
        borderColor: "rgba(229, 169, 25, 0.3)",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          label: (ctx: any) => {
            const val = ctx.raw;
            const pct = totalRevenue > 0 ? ((val / totalRevenue) * 100).toFixed(1) : 0;
            return ` ${ctx.label}: ${val.toLocaleString()} CR (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, rotateY: 15 }}
      whileInView={{ opacity: 1, rotateY: 0 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 80 }}
      className="glass-card p-6"
    >
      <h3 className="text-lg font-semibold mb-4">💰 Revenue Distribution</h3>
      <div className="h-[300px] relative">
        {chartData ? (
          <>
            <Doughnut data={chartData} options={options} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: "40px" }}>
              <div className="text-center">
                <p className="text-2xl font-bold gradient-gold-text">{totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total CR</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">Loading chart...</div>
        )}
      </div>
    </motion.div>
  );
}
