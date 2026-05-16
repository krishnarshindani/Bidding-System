import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { motion } from "framer-motion";
import { API_SERVICE } from "@/services/api";

interface BidData {
  category: string;
  amount: number;
  count?: number;
  bids?: number;
}

export default function BidDistribution() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<BidData[]>([]);

  // Fetch real category data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const categoryData = await API_SERVICE.analytics.getCategories();
        if (Array.isArray(categoryData) && categoryData.length > 0) {
          const formattedData = categoryData.map((cat: any) => ({
            category: cat.name,
            amount: parseFloat(cat.revenue) || 0,
            count: cat.count || 0,
            bids: cat.bids || 0,
          }));
          setData(formattedData);
        }
      } catch (error) {
        console.error("Error fetching category data:", error);
      }
    };

    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 20, bottom: 80, left: 60 };
    const width = (svgRef.current?.parentElement?.clientWidth || 500) - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.category))
      .range([0, width])
      .padding(0.3);

    const yScale = d3
      .scaleLinear()
      .domain([0, Math.max(...data.map((d) => d.amount))])
      .range([height, 0]);

    // Color scale
    const colorScale = d3
      .scaleLinear<string>()
      .domain([0, data.length])
      .range(["#e5a919", "#8b6914"]);

    // Bars
    g.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", (d) => xScale(d.category))
      .attr("y", (d) => yScale(d.amount))
      .attr("width", xScale.bandwidth())
      .attr("height", (d) => height - yScale(d.amount))
      .attr("fill", (_, i) => colorScale(i))
      .attr("rx", 4)
      .on("mouseover", function (_, d) {
        d3.select(this).transition().attr("opacity", 0.8);
      })
      .on("mouseout", function () {
        d3.select(this).transition().attr("opacity", 1);
      });

    // X Axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .attr("text-anchor", "end")
      .attr("fill", "hsl(220, 12%, 55%)")
      .attr("font-size", "12px");

    // Y Axis
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(4))
      .attr("color", "hsl(220, 12%, 55%)");
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-card p-6"
    >
      <h3 className="text-lg font-semibold mb-6">Bid Distribution by Category</h3>
      <svg ref={svgRef} width="100%" height={300} />
    </motion.div>
  );
}
