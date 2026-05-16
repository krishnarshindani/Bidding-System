import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { motion } from "framer-motion";
import { API_SERVICE } from "@/services/api";

interface TrendData {
  date: string;
  bids: number;
  revenue: number;
  auctions: number;
}

export default function AuctionTrends() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<TrendData[]>([]);
  const [activeMetric, setActiveMetric] = useState<"bids" | "revenue">("bids");
  const [loading, setLoading] = useState(true);

  // Fetch trend data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await API_SERVICE.analytics.getTrends(30);
        if (Array.isArray(result) && result.length > 0) {
          setData(result.map((d: any) => ({
            date: typeof d.date === 'string' ? d.date : new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            bids: d.bids || 0,
            revenue: d.revenue || 0,
            auctions: d.auctions || 0,
          })));
        }
      } catch (error) {
        console.warn("Could not fetch trend data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const width = (svgRef.current?.parentElement?.clientWidth || 600) - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([0, data.length - 1])
      .range([0, width]);

    const dataKey = activeMetric === "bids" ? "bids" : "revenue";
    const values = data.map((d) => d[dataKey]);
    const yScale = d3
      .scaleLinear()
      .domain([0, Math.max(...values)])
      .range([height, 0]);

    // Line generator
    const line = d3
      .line<(typeof data)[0]>()
      .x((_, i) => xScale(i))
      .y((d) => yScale(d[dataKey]));

    // Area generator
    const area = d3
      .area<(typeof data)[0]>()
      .x((_, i) => xScale(i))
      .y0(height)
      .y1((d) => yScale(d[dataKey]));

    // Add gradient
    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "trend-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#e5a919").attr("stop-opacity", 0.3);
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#e5a919").attr("stop-opacity", 0);

    // Area path
    g.append("path")
      .datum(data)
      .attr("fill", "url(#trend-gradient)")
      .attr("d", area);

    // Line path
    g.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#e5a919")
      .attr("stroke-width", 2.5)
      .attr("d", line);

    // Dots on line
    g.selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (_, i) => xScale(i))
      .attr("cy", (d) => yScale(d[dataKey]))
      .attr("r", 3)
      .attr("fill", "#e5a919")
      .attr("opacity", 0.6)
      .on("mouseover", function () {
        d3.select(this).transition().attr("r", 5).attr("opacity", 1);
      })
      .on("mouseout", function () {
        d3.select(this).transition().attr("r", 3).attr("opacity", 0.6);
      });

    // X Axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickValues(d3.range(0, data.length, 5)).tickFormat((i) => data[i as number].date))
      .attr("color", "hsl(220, 12%, 55%)");

    // Y Axis
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5))
      .attr("color", "hsl(220, 12%, 55%)");
  }, [data, activeMetric]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="glass-card p-6 h-96 flex items-center justify-center"
      >
        <div className="text-muted-foreground">Loading trends...</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Auction Trends (30 Days)</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveMetric("bids")}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
              activeMetric === "bids"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            Bids
          </button>
          <button
            onClick={() => setActiveMetric("revenue")}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
              activeMetric === "revenue"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            Revenue
          </button>
        </div>
      </div>
      <svg ref={svgRef} width="100%" height={300} />
    </motion.div>
  );
}
