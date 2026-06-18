"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Stethoscope,
  Calendar,
  Clock,
  Users,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  ArrowUpRight,
  Eye,
  Download,
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
} from "recharts";
import { jwtDecode } from "jwt-decode";

// Custom Stat Card Component for Doctor
const DoctorStatCard = ({
  title,
  value,
  icon: Icon,
  change,
  color,
  delay = 0,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ y: -2 }}
    className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 relative group"
  >
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
          {title}
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </p>
      </div>
      <div
        className={`p-2 rounded-lg bg-${color}-50 dark:bg-${color}-900/20 group-hover:scale-110 transition-transform duration-200`}
      >
        <Icon className={`w-5 h-5 text-${color}-700 dark:text-${color}-400`} />
      </div>
    </div>
    {change && (
      <div
        className={`flex items-center gap-1 text-xs ${
          change.startsWith("+") ? "text-green-600" : "text-red-600"
        }`}
      >
        <TrendingUp className="w-3 h-3" />
        <span>{change} from last week</span>
      </div>
    )}
  </motion.div>
);

// Graph Card Component
const GraphCard = ({ title, children, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}
  >
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>
      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
        <ArrowUpRight className="w-4 h-4" />
      </button>
    </div>
    {children}
  </motion.div>
);

// Patient Activity Item
const PatientActivityItem = ({ name, time, status, condition, avatar }) => (
  <div className="flex items-center gap-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
      {avatar}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {name}
        </p>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            status === "Completed"
              ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
              : status === "In Progress"
              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
          }`}
        >
          {status}
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{condition}</p>
    </div>
    <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
      {time}
    </div>
  </div>
);

export default function DoctorDashboard() {
  const [subjects, setSubjects] = useState([]);
  const [stats, setStats] = useState({
    appointments: 0,
    patients: 0,
    hours: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState({ name: "", email: "" });
  useEffect(() => {
    const tokenCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="));

    if (tokenCookie) {
      const token = tokenCookie.split("=")[1];
      try {
        const decoded = jwtDecode(token);
        setUserInfo({
          name: decoded.name || "User",
          email: decoded.email || "no-email@fornix.com",
        });
      } catch (error) {
        console.error("Failed to decode JWT:", error);
      }
    }
  }, []);
  // Sample data for doctor-specific charts
  const appointmentData = [
    { day: "Mon", scheduled: 8, completed: 6 },
    { day: "Tue", scheduled: 12, completed: 10 },
    { day: "Wed", scheduled: 10, completed: 8 },
    { day: "Thu", scheduled: 14, completed: 12 },
    { day: "Fri", scheduled: 9, completed: 7 },
    { day: "Sat", scheduled: 4, completed: 3 },
    { day: "Sun", scheduled: 2, completed: 1 },
  ];

  const patientAgeData = [
    { range: "0-18", count: 15 },
    { range: "19-35", count: 45 },
    { range: "36-50", count: 32 },
    { range: "51-65", count: 28 },
    { range: "65+", count: 20 },
  ];

  const conditionDistribution = [
    { name: "Routine Check", value: 35 },
    { name: "Follow-up", value: 25 },
    { name: "Emergency", value: 15 },
    { name: "Consultation", value: 20 },
    { name: "Other", value: 5 },
  ];

  const recentPatients = [
    {
      name: "Sarah Johnson",
      time: "10:30 AM",
      status: "Completed",
      condition: "Routine Check-up",
      avatar: "SJ",
    },
    {
      name: "Mike Chen",
      time: "11:15 AM",
      status: "In Progress",
      condition: "Follow-up Consultation",
      avatar: "MC",
    },
    {
      name: "Emma Davis",
      time: "2:00 PM",
      status: "Scheduled",
      condition: "Initial Consultation",
      avatar: "ED",
    },
    {
      name: "Robert Wilson",
      time: "3:30 PM",
      status: "Scheduled",
      condition: "Emergency Visit",
      avatar: "RW",
    },
  ];

  const COLORS = ["#f77f00", "#ffb347", "#d36800", "#ff9100", "#ffc56d"];

  useEffect(() => {
    async function loadDoctorData() {
      try {
        // Simulate API calls
        await new Promise((resolve) => setTimeout(resolve, 1200));

        // Mock data - replace with actual API calls
        const mockSubjects = [
          { id: 1, name: "Cardiology" },
          { id: 2, name: "Pediatrics" },
          { id: 3, name: "Internal Medicine" },
          { id: 4, name: "Neurology" },
        ];

        const mockStats = {
          appointments: 24,
          patients: 156,
          hours: 38,
          pending: 8,
        };

        setSubjects(mockSubjects);
        setStats(mockStats);
      } catch (error) {
        console.error("Error loading doctor data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDoctorData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="w-12 h-12 border-3 border-amber-200 border-t-orange-600 rounded-full animate-spin mx-auto"></div>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 text-gray-600 dark:text-gray-400 font-medium text-sm"
          >
            Loading Doctor Dashboard...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            Doctor Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Welcome back, {userInfo.name || "Loading..."}! Here's your medical practice overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Calendar className="w-4 h-4 inline mr-2" />
            Today
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DoctorStatCard
          title="Today's Appointments"
          value={stats.appointments}
          icon={Calendar}
          change="+3"
          color="orange"
          delay={0.1}
        />
        <DoctorStatCard
          title="Total Patients"
          value={stats.patients}
          icon={Users}
          change="+12"
          color="green"
          delay={0.2}
        />
        <DoctorStatCard
          title="Weekly Hours"
          value={`${stats.hours}h`}
          icon={Clock}
          change="+2h"
          color="purple"
          delay={0.3}
        />
        <DoctorStatCard
          title="Pending Reviews"
          value={stats.pending}
          icon={AlertCircle}
          change="-2"
          color="orange"
          delay={0.4}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointment Analytics */}
        <GraphCard title="Appointment Analytics">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={appointmentData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="scheduled"
                  fill="#f77f00"
                  radius={[2, 2, 0, 0]}
                  name="Scheduled"
                />
                <Bar
                  dataKey="completed"
                  fill="#00C49F"
                  radius={[2, 2, 0, 0]}
                  name="Completed"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GraphCard>

        {/* Patient Age Distribution */}
        <GraphCard title="Patient Age Distribution">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={patientAgeData}>
                <defs>
                    <linearGradient
                      id="colorPatients"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                    <stop offset="5%" stopColor="#fbbf77" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f77f00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#f77f00"
                  fillOpacity={1}
                  fill="url(#colorPatients)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GraphCard>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Condition Distribution */}
        <GraphCard title="Condition Distribution" className="lg:col-span-1">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={conditionDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {conditionDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GraphCard>

        {/* Recent Patients */}
        <GraphCard title="Today's Appointments" className="lg:col-span-2">
          <div className="space-y-1">
            {recentPatients.map((patient, index) => (
              <PatientActivityItem
                key={index}
                name={patient.name}
                time={patient.time}
                status={patient.status}
                condition={patient.condition}
                avatar={patient.avatar}
              />
            ))}
          </div>
          <button className="w-full mt-4 py-2 text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors">
            View All Appointments
          </button>
        </GraphCard>
      </div>

      {/* Quick Actions & Subjects */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Assigned Subjects */}
        <GraphCard title="My Specializations">
          <div className="space-y-3">
            {subjects.map((subject, index) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {subject.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    12 patients
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
              </motion.div>
            ))}
          </div>
        </GraphCard>

        {/* Quick Metrics */}
        <GraphCard title="Practice Metrics">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-orange-600 to-amber-700 rounded-xl text-white">
              <Eye className="w-6 h-6 mx-auto mb-2 text-amber-200" />
              <p className="text-lg font-bold">156</p>
              <p className="text-amber-100 text-xs">Patient Views</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white">
              <Download className="w-6 h-6 mx-auto mb-2 text-green-200" />
              <p className="text-lg font-bold">89</p>
              <p className="text-green-100 text-xs">Reports Generated</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white">
              <BarChart3 className="w-6 h-6 mx-auto mb-2 text-purple-200" />
              <p className="text-lg font-bold">94%</p>
              <p className="text-purple-100 text-xs">Satisfaction Rate</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl text-white">
              <Clock className="w-6 h-6 mx-auto mb-2 text-orange-200" />
              <p className="text-lg font-bold">18m</p>
              <p className="text-orange-100 text-xs">Avg. Session</p>
            </div>
          </div>
        </GraphCard>
      </div>
    </div>
  );
}
