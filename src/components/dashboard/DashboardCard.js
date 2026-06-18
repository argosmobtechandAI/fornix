"use client";
import { motion } from "framer-motion";

export default function DashboardCard({ title, count, icon, description, trend, color = "blue", delay = 0 }) {
  const colorClasses = {
    blue: {
      bg: "bg-gradient-to-br from-amber-50 to-orange-100/50 dark:from-amber-900/20 dark:to-orange-800/10",
      text: "text-amber-800 dark:text-amber-300",
      border: "border-amber-200/50 dark:border-amber-700/30",
      trend: "text-orange-700 dark:text-amber-400",
      glow: "hover:shadow-amber-200/50 dark:hover:shadow-amber-700/20"
    },
    green: {
      bg: "bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10",
      text: "text-green-700 dark:text-green-300",
      border: "border-green-200/50 dark:border-green-700/30",
      trend: "text-green-600 dark:text-green-400",
      glow: "hover:shadow-green-200/50 dark:hover:shadow-green-700/20"
    },
    purple: {
      bg: "bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10",
      text: "text-purple-700 dark:text-purple-300",
      border: "border-purple-200/50 dark:border-purple-700/30",
      trend: "text-purple-600 dark:text-purple-400",
      glow: "hover:shadow-purple-200/50 dark:hover:shadow-purple-700/20"
    },
    orange: {
      bg: "bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10",
      text: "text-orange-700 dark:text-orange-300",
      border: "border-orange-200/50 dark:border-orange-700/30",
      trend: "text-orange-600 dark:text-orange-400",
      glow: "hover:shadow-orange-200/50 dark:hover:shadow-orange-700/20"
    }
  };

  const { bg, text, border, trend: trendColor, glow } = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 100, 
        damping: 15,
        delay: delay 
      }}
      whileHover={{ 
        scale: 1.05, 
        y: -8,
        transition: { type: "spring", stiffness: 300 }
      }}
      whileTap={{ scale: 0.95 }}
      className={`${bg} ${border} border-2 rounded-3xl p-8 shadow-lg hover:shadow-2xl backdrop-blur-sm transition-all duration-500 cursor-pointer transform-gpu ${glow}`}
    >
      {/* Icon with background */}
      <div className="flex items-center justify-between mb-6">
        <motion.div 
          whileHover={{ rotate: 360, scale: 1.1 }}
          transition={{ duration: 0.5 }}
          className="w-14 h-14 bg-white/80 dark:bg-gray-800/80 rounded-2xl flex items-center justify-center shadow-inner border border-white/50 dark:border-gray-700/50"
        >
          <span className="text-2xl">{icon}</span>
        </motion.div>
        
        {trend && (
          <motion.span 
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + 0.3 }}
            className={`${trendColor} text-sm font-bold bg-white/80 dark:bg-gray-800/80 px-3 py-1.5 rounded-full border border-white/50 dark:border-gray-700/50 shadow-sm`}
          >
            {trend}
          </motion.span>
        )}
      </div>
      
      {/* Count with counting animation */}
      <motion.h3 
        className={`text-4xl font-black ${text} mb-3`}
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 200, 
          delay: delay + 0.2 
        }}
      >
        {count.toLocaleString()}
      </motion.h3>
      
      <p className="text-gray-700 dark:text-gray-300 text-lg font-semibold mb-2">
        {title}
      </p>
      
      {description && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.4 }}
          className="text-gray-500 dark:text-gray-500 text-sm font-medium"
        >
          {description}
        </motion.p>
      )}

      {/* Animated progress bar */}
      <motion.div 
        className="w-full bg-white/50 dark:bg-gray-700/50 rounded-full h-2 mt-4 overflow-hidden"
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ delay: delay + 0.5, duration: 1 }}
      >
        <motion.div
          className={`h-full rounded-full ${bg.split(' ')[1]}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min((count / 1000) * 100, 100)}%` }}
          transition={{ delay: delay + 0.7, duration: 1.5, ease: "easeOut" }}
        />
      </motion.div>
    </motion.div>
  );
}