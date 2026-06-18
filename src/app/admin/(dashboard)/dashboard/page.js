"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  UserCheck,
  BookOpen,
  Activity,
  TrendingUp,
  Eye,
  Download,
  Calendar,
  ArrowUpRight,
  FileText,
  BarChart3,
  Clock,
  DollarSign,
  Target,
  Smartphone,
  Zap,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  TrendingDown,
  Server,
  Cpu,
  Database,
  Shield,
  Globe,
  Sparkles,
  Layers,
  Award,
  Target as TargetIcon,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  BarChart as BarChartIcon,
} from "lucide-react";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  ComposedChart,
} from "recharts";

// ------------------------------
// Small Components
// ------------------------------
const StatCard = ({ title, value, icon: Icon, change, color, isLoading, description, trendDirection = "up" }) => {
  const colorClasses = {
    blue: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800",
    blue: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800",
    green: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 border-green-200 dark:border-green-800",
    orange: "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10 border-orange-200 dark:border-orange-800",
    indigo: "bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-900/10 border-indigo-200 dark:border-indigo-800",
    pink: "bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-900/10 border-pink-200 dark:border-pink-800",
  };

  const iconColors = {
    blue: "text-blue-600 dark:text-blue-400",
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    orange: "text-orange-600 dark:text-orange-400",
    indigo: "text-indigo-600 dark:text-indigo-400",
    pink: "text-pink-600 dark:text-pink-400",
  };

  const gradientColors = {
    blue: "from-blue-500 to-blue-600",
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    orange: "from-orange-500 to-orange-600",
    indigo: "from-indigo-500 to-indigo-600",
    pink: "from-pink-500 to-pink-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ 
        y: -8,
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      className="relative group"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/50 to-transparent dark:from-gray-900/50 rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
      
      <div className={`relative rounded-2xl p-6 shadow-lg border ${colorClasses[color]} overflow-hidden`}>
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
          <div className={`absolute inset-0 bg-gradient-to-br ${gradientColors[color]} rounded-full`} />
        </div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-2 tracking-wide">
                {title}
              </p>
              {isLoading ? (
                <div className="h-10 w-32 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg animate-pulse" />
              ) : (
                <p className="text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300">
                  {typeof value === 'number' ? value.toLocaleString() : value ?? 0}
                </p>
              )}
            </div>

            <div className={`p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border ${iconColors[color]} shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>

          {description && (
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              {description}
            </p>
          )}

          {change && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                trendDirection === "up" 
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" 
                  : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
              }`}>
                {trendDirection === "up" ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="text-sm font-semibold">{change}</span>
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-xs">
                from last month
              </span>
            </div>
          )}
        </div>

        {/* Animated border effect */}
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${gradientColors[color]} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      </div>
    </motion.div>
  );
};

const GraphCard = ({ title, children, className = "", subtitle, action, icon: Icon }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    whileHover={{ y: -4 }}
    className={`relative rounded-2xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-6 shadow-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl transition-all duration-500 overflow-hidden ${className}`}
  >
    {/* Background glow effect */}
    <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-blue-500/10 rounded-full blur-3xl" />
    
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-500 text-white shadow-lg">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
            {subtitle && (
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {action && (
          <button className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 hover:scale-110 active:scale-95">
            <ArrowUpRight className="w-4 h-4" />
          </button>
        )}
      </div>
      {children}
    </div>
  </motion.div>
);

const ActivityItem = ({ icon: Icon, title, description, time, user, color = "blue", badge }) => {
  const colorClasses = {
    blue: "bg-gradient-to-br from-blue-500 to-blue-600",
    green: "bg-gradient-to-br from-green-500 to-green-600",
    blue: "bg-gradient-to-br from-blue-500 to-blue-600",
    orange: "bg-gradient-to-br from-orange-500 to-orange-600",
    indigo: "bg-gradient-to-br from-indigo-500 to-indigo-600",
    pink: "bg-gradient-to-br from-pink-500 to-pink-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      className="flex items-start gap-4 py-4 px-3 rounded-xl hover:bg-gradient-to-r hover:from-white/50 hover:to-gray-50/50 dark:hover:from-gray-800/50 dark:hover:to-gray-700/50 transition-all duration-300 group"
    >
      <div className="relative">
        <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center text-white shadow-lg`}>
          <Icon className="w-5 h-5" />
        </div>
        {badge && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">!</span>
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300">
              {title}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
              {description}
            </p>
            {user && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                By <span className="font-medium">{user}</span>
              </p>
            )}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            {time}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const MetricCard = ({ title, value, icon: Icon, color, trend, isLoading, description, metric }) => {
  const colorMap = {
    blue: "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700",
    green: "bg-gradient-to-br from-green-500 via-green-600 to-emerald-700",
    blue: "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700",
    orange: "bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700",
    indigo: "bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700",
    pink: "bg-gradient-to-br from-pink-500 via-pink-600 to-pink-700",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className={`${colorMap[color]} rounded-2xl p-6 text-white shadow-2xl relative overflow-hidden group`}
    >
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <p className="text-blue-100/80 text-sm font-medium mb-3 tracking-wide">
              {title}
            </p>
            {isLoading ? (
              <div className="h-9 w-32 bg-white/20 rounded-lg animate-pulse" />
            ) : (
              <p className="text-3xl font-bold drop-shadow-lg">
                {typeof value === 'number' ? value.toLocaleString() : value ?? 0}
                {metric && <span className="text-lg font-normal ml-1">{metric}</span>}
              </p>
            )}
            {description && (
              <p className="text-blue-100/70 text-sm mt-3">
                {description}
              </p>
            )}
          </div>
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm transform group-hover:rotate-12 transition-transform duration-300">
            <Icon className="w-7 h-7" />
          </div>
        </div>
        
        {trend && (
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/20">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full backdrop-blur-sm">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-semibold">{trend}</span>
            </div>
            <span className="text-blue-100/70 text-xs">
              from last month
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ------------------------------
// MAIN PAGE
// ------------------------------
export default function page() {
  const [stats, setStats] = useState(null);
  const [userGrowthData, setUserGrowthData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [platformData, setPlatformData] = useState([]);
  const [courseQuestionCounts, setCourseQuestionCounts] = useState([]);
  const [analytics, setAnalytics] = useState({
    views: 0,
    downloads: 0,
    avg_session: 0,
    completion_rate: 0,
    engagement: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("30d");
  const [lastUpdated, setLastUpdated] = useState(null);

  const COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#EC4899"];
  const RADIAL_COLORS = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981"];

  // ------------------------------
  // FETCH DASHBOARD DATA
  // ------------------------------
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch dashboard data");
      }

      if (data.success) {
        setStats(data.stats);
        setUserGrowthData(data.charts?.user_growth || generateDemoUserGrowth());
        setRevenueData(data.charts?.revenue || generateDemoRevenue());
        setActivityData(data.activity || generateDemoActivity());
        setPerformanceData(data.performance || generateDemoPerformance());
        setPlatformData(data.platform || generatePlatformData());
        setAnalytics(data.analytics || generateDemoAnalytics());
        setCourseQuestionCounts(data.course_question_counts || []);
        setLastUpdated(new Date().toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        }));
      } else {
        throw new Error("Failed to load dashboard data");
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.message);
      setFallbackData();
    } finally {
      setLoading(false);
    }
  };

  // Demo data generators
  const generateDemoUserGrowth = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.slice(0, 6).map((month, i) => ({
      month,
      users: Math.floor(Math.random() * 3000) + 1000,
      newUsers: Math.floor(Math.random() * 500) + 200,
      returning: Math.floor(Math.random() * 1000) + 500,
    }));
  };

  const generateDemoRevenue = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, i) => ({
      month,
      revenue: Math.floor(Math.random() * 15000) + 5000,
      expenses: Math.floor(Math.random() * 5000) + 2000,
      profit: Math.floor(Math.random() * 10000) + 3000,
    }));
  };

  const generateDemoActivity = () => [
    { action: "New premium user registered", entity: "John Doe", created_at: new Date().toISOString(), badge: true },
    { action: "Course completed with distinction", entity: "Advanced React Mastery", created_at: new Date(Date.now() - 3600000).toISOString() },
    { action: "Payment received", entity: "₹12,500", created_at: new Date(Date.now() - 7200000).toISOString() },
    { action: "New course content uploaded", entity: "Video Lecture - AI/ML", created_at: new Date(Date.now() - 10800000).toISOString() },
    { action: "Test submitted with excellent score", entity: "Mathematics Quiz - 98%", created_at: new Date(Date.now() - 14400000).toISOString() },
    { action: "System update completed", entity: "Version 2.5.1 deployed", created_at: new Date(Date.now() - 18000000).toISOString() },
  ];

  const generateDemoPerformance = () => [
    { category: "Server Uptime", value: 99.9, fill: "#10B981" },
    { category: "Response Time", value: 95.5, fill: "#3B82F6" },
    { category: "CPU Usage", value: 72.3, fill: "#8B5CF6" },
    { category: "Memory Usage", value: 68.7, fill: "#F59E0B" },
    { category: "Storage", value: 85.2, fill: "#EC4899" },
  ];

  const generatePlatformData = () => [
    { name: "Web", value: 65, color: "#3B82F6" },
    { name: "Mobile", value: 25, color: "#10B981" },
    { name: "Tablet", value: 8, color: "#8B5CF6" },
    { name: "Desktop", value: 2, color: "#F59E0B" },
  ];

  const generateDemoAnalytics = () => ({
    views: 28415,
    downloads: 8421,
    avg_session: 32,
    completion_rate: 78,
    engagement: 92,
  });

  const setFallbackData = () => {
    setStats({
      total_users: 28415,
      active_users: 12421,
      courses: 156,
      subjects: 42,
      plans: 8,
      subscriptions: 18421,
      devices: 32415,
      total_revenue: 425800,
      active_sessions: 3215,
      conversion_rate: 4.2,
    });
    setUserGrowthData(generateDemoUserGrowth());
    setRevenueData(generateDemoRevenue());
    setActivityData(generateDemoActivity());
    setPerformanceData(generateDemoPerformance());
    setPlatformData(generatePlatformData());
    setAnalytics(generateDemoAnalytics());
    setCourseQuestionCounts([]);
  };

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ------------------------------
  // LOADING UI
  // ------------------------------
  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <div className="relative mx-auto w-32 h-32">
            <div className="absolute inset-0 border-4 border-amber-200 dark:border-amber-800 rounded-full animate-pulse"></div>
            <div className="absolute inset-4 border-4 border-t-orange-600 dark:border-t-amber-400 border-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-8 border-4 border-b-orange-500 dark:border-b-amber-300 border-transparent rounded-full animate-spin animation-delay-200"></div>
          </div>
          <div className="space-y-3">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-2xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-amber-500 bg-clip-text text-transparent"
            >
              Loading Dashboard
            </motion.p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Fetching real-time analytics...
            </p>
            <div className="w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mx-auto">
              <motion.div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-500"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ------------------------------
  // PAGE CONTENT
  // ------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-6">
      <div className="mx-auto space-y-6">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-orange-600 to-amber-600 shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-amber-700 to-orange-600 dark:from-amber-500 dark:via-orange-600 dark:to-orange-500 bg-clip-text text-transparent">
                  Dashboard Overview
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  Welcome back! Real-time analytics at your fingertips
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <Server className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {lastUpdated ? 'Live Data' : 'Offline'}
              </span>
              {lastUpdated && (
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  Updated: {lastUpdated}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative group">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="pl-4 pr-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm appearance-none cursor-pointer hover:border-orange-600 dark:hover:border-amber-500 transition-colors shadow-sm"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="1y">Last year</option>
                </select>
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchDashboardData}
                disabled={loading}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl flex items-center gap-2 text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Refreshing..." : "Refresh"}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* ERROR MESSAGE */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-4 shadow-lg"
          >
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-red-800 dark:text-red-300 font-semibold">API Connection Issue</p>
              <p className="text-red-700 dark:text-red-400 text-sm mt-1">{error}</p>
              <p className="text-red-700 dark:text-red-400 text-sm mt-3">
                Showing demo data. The dashboard will auto-retry in 30 seconds.
              </p>
            </div>
          </motion.div>
        )}

        {/* TOP STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Users"
            value={stats?.total_users}
            icon={Users}
            change="+12.5%"
            color="blue"
            isLoading={loading}
            description="All registered platform users"
            trendDirection="up"
          />
          <StatCard
            title="Active Courses"
            value={stats?.courses}
            icon={BookOpen}
            change="+5.2%"
            color="blue"
            isLoading={loading}
            description="Courses with active enrollment"
            trendDirection="up"
          />
          <StatCard
            title="Active Subscriptions"
            value={stats?.subscriptions}
            icon={UserCheck}
            change="+8.7%"
            color="green"
            isLoading={loading}
            description="Premium subscriptions active"
            trendDirection="up"
          />
          <StatCard
            title="Active Sessions"
            value={stats?.active_sessions || analytics.engagement}
            icon={Activity}
            change="+15.3%"
            color="orange"
            isLoading={loading}
            description="Current active user sessions"
            trendDirection="up"
          />
        </div>

        {/* CHARTS ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* USER GROWTH */}
          <GraphCard 
            title="User Growth Analytics" 
            subtitle={`Last ${timeRange === '30d' ? '6 months' : timeRange}`}
            icon={LineChartIcon}
            action
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={userGrowthData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorNewUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      padding: '12px'
                    }}
                    formatter={(value) => [value.toLocaleString(), 'Users']}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    fill="url(#colorUsers)"
                    name="Total Users"
                  />
                  <Line
                    type="monotone"
                    dataKey="newUsers"
                    stroke="#10B981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    name="New Users"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </GraphCard>

          {/* REVENUE CHART */}
          <GraphCard 
            title="Revenue Analytics" 
            subtitle={`Last ${timeRange === '30d' ? '6 months' : timeRange}`}
            icon={BarChartIcon}
            action
          >
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    tickFormatter={(value) => `₹${value/1000}k`}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      const formatted = `₹${value.toLocaleString()}`;
                      return [formatted, name === 'revenue' ? 'Revenue' : name];
                    }}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      padding: '12px'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="revenue" 
                    fill="#10B981" 
                    radius={[6, 6, 0, 0]}
                    name="Revenue"
                  />
                  <Bar 
                    dataKey="profit" 
                    fill="#8B5CF6" 
                    radius={[6, 6, 0, 0]}
                    name="Net Profit"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GraphCard>
        </div>

        {/* PERFORMANCE & ACTIVITY */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SYSTEM PERFORMANCE */}
          <GraphCard title="System Performance" icon={Cpu}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  innerRadius="20%" 
                  outerRadius="90%" 
                  data={performanceData}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar
                    minAngle={15}
                    label={{ 
                      position: 'insideStart', 
                      fill: '#fff',
                      fontSize: 12,
                      fontWeight: 'bold'
                    }}
                    background
                    clockWise={true}
                    dataKey="value"
                  >
                    {performanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </RadialBar>
                  <Legend 
                    iconSize={10}
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    wrapperStyle={{
                      paddingLeft: '20px'
                    }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Score']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </GraphCard>

          {/* RECENT ACTIVITY */}
          <GraphCard title="Recent Activity" icon={Activity} className="lg:col-span-2">
            <div className="space-y-1 max-h-72 overflow-y-auto pr-2">
              {activityData.length > 0 ? (
                activityData.map((item, index) => (
                  <ActivityItem
                    key={index}
                    icon={FileText}
                    title={item.action}
                    description={item.entity}
                    time={new Date(item.created_at).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                    color={["blue", "green", "blue", "orange", "indigo", "pink"][index % 6]}
                    badge={item.badge}
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600">
                    <Activity className="w-full h-full" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
                </div>
              )}
            </div>
          </GraphCard>
        </div>

        {/* METRICS DASHBOARD */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Revenue"
            value={`₹${(stats?.total_revenue || 0).toLocaleString()}`}
            icon={DollarSign}
            color="green"
            trend="+18.2%"
            isLoading={loading}
            description="Monthly recurring revenue"
          />
          <MetricCard
            title="Active Devices"
            value={stats?.devices}
            icon={Smartphone}
            color="blue"
            trend="+23.5%"
            isLoading={loading}
            description="Connected devices"
          />
          <MetricCard
            title="Avg Session Time"
            value={analytics.avg_session}
            icon={Clock}
            color="blue"
            metric="min"
            trend="+5.1%"
            isLoading={loading}
            description="Average user session duration"
          />
          <MetricCard
            title="Conversion Rate"
            value={stats?.conversion_rate || 4.2}
            icon={Target}
            color="orange"
            metric="%"
            trend="+2.3%"
            isLoading={loading}
            description="Visitor to subscriber rate"
          />
        </div>

        {/* QUESTIONS BY COURSE */}
        <GraphCard title="Questions by Course" icon={Database} subtitle="Total questions across all subjects in each course">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="py-3 pr-4">Course</th>
                  <th className="py-3 pr-4">Subjects</th>
                  <th className="py-3 pr-4">Questions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-gray-500 dark:text-gray-400">
                      Loading…
                    </td>
                  </tr>
                ) : (courseQuestionCounts || []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-gray-500 dark:text-gray-400">
                      No course data.
                    </td>
                  </tr>
                ) : (
                  courseQuestionCounts
                    .slice()
                    .sort((a, b) => (b.questions || 0) - (a.questions || 0))
                    .map((c) => (
                      <tr key={c.course_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">
                          {c.course_name}
                        </td>
                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                          {c.subjects || 0}
                        </td>
                        <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                          {Number(c.questions || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </GraphCard>

        {/* PLATFORM ANALYTICS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GraphCard title="Platform Distribution" icon={Globe}>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={(entry) => `${entry.name}: ${entry.value}%`}
                  >
                    {platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => [`${value}%`, props.payload.name]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      padding: '12px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </GraphCard>

          <GraphCard title="Platform Health" icon={Shield}>
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Server Uptime</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">99.9%</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full" style={{ width: '99.9%' }} />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">API Response Time</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">145ms</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: '95%' }} />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Error Rate</span>
                    <span className="text-lg font-bold text-red-600 dark:text-red-400">0.2%</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full" style={{ width: '0.2%' }} />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl">
                  <Database className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">4.2TB</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Storage Used</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-xl">
                  <Cpu className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">72%</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">CPU Usage</div>
                </div>
              </div>
            </div>
          </GraphCard>
        </div>
      </div>
    </div>
  );
}