import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface CountdownTimerProps {
  endTime: Date;
  compact?: boolean;
}

export default function CountdownTimer({ endTime, compact = false }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, expired: false });
  const [prevSeconds, setPrevSeconds] = useState(0);

  useEffect(() => {
    const update = () => {
      const parsedDate = new Date(endTime).getTime();
      
      // Handle invalid or missing dates
      if (isNaN(parsedDate)) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }

      const diff = parsedDate - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      
      const newSeconds = Math.floor((diff % 60000) / 1000);
      if (newSeconds !== prevSeconds) {
        setPrevSeconds(newSeconds);
      }
      
      setTimeLeft({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: newSeconds,
        expired: false,
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTime, prevSeconds]);

  if (timeLeft.expired) {
    return (
      <motion.span 
        className="text-destructive font-mono font-semibold"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 0.5 }}
      >
        Ended
      </motion.span>
    );
  }

  if (compact) {
    return (
      <motion.span 
        className="font-mono text-primary font-semibold bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20"
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
      </motion.span>
    );
  }

  const TimeUnit = ({ val, label }: { val: number; label: string }) => (
    <motion.div 
      className="flex flex-col items-center"
      initial={{ scale: 1 }}
      animate={{ scale: 1 }}
    >
      <motion.span 
        className="bg-gradient-to-br from-primary/20 to-primary/10 backdrop-blur-md rounded-lg px-3 py-2 font-mono text-lg font-bold text-primary tabular-nums border border-primary/20"
        key={val}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 0.3 }}
      >
        {String(val).padStart(2, "0")}
      </motion.span>
      <motion.span 
        className="text-[10px] text-muted-foreground mt-1.5 font-semibold uppercase tracking-wider"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {label}
      </motion.span>
    </motion.div>
  );

  return (
    <div className="flex gap-3">
      {[
        { val: timeLeft.hours, label: "HRS" },
        { val: timeLeft.minutes, label: "MIN" },
        { val: timeLeft.seconds, label: "SEC" },
      ].map((unit) => (
        <TimeUnit key={unit.label} val={unit.val} label={unit.label} />
      ))}
    </div>
  );
}
