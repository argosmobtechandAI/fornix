"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
    Users,
    Search,
    Download,
    Loader2,
    BarChart3,
    Eye,
    TrendingUp,
    CheckCircle,
    Target,
    XCircle,
    ClipboardList,
    BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";

function Modal({ isOpen, onClose, children, title, size = "md" }) {
    if (!isOpen) return null;
    const sizeClasses = {
        sm: "max-w-md",
        md: "max-w-xl",
        lg: "max-w-3xl",
        xl: "max-w-5xl",
        "2xl": "max-w-7xl",
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={`relative w-full ${sizeClasses[size]} bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden`}
            >
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <XCircle className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-black/20">
                    {children}
                </div>
            </motion.div>
        </div>
    );
}

export default function UniversityAnalyticsPage() {
    const [analyticsData, setAnalyticsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal state
    const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
    const [inspectedStudentId, setInspectedStudentId] = useState(null);
    const [inspectLoading, setInspectLoading] = useState(false);
    const [inspectData, setInspectData] = useState(null);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/university/analytics");
            const json = await res.json();
            if (json.success) {
                setAnalyticsData(json.data || []);
            } else {
                toast.error("Failed to load analytics");
            }
        } catch (err) {
            toast.error("Error loading analytics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const openInspectModal = async (studentId, studentName) => {
        setInspectedStudentId(studentId);
        setInspectData(null);
        setIsInspectModalOpen(true);
        setInspectLoading(true);

        try {
            const res = await fetch(`/api/university/analytics/${studentId}`);
            const json = await res.json();
            if (json.success) {
                setInspectData(json);
            } else {
                toast.error(json.error || "Failed to load student details");
            }
        } catch (err) {
            toast.error("Error loading student details");
        } finally {
            setInspectLoading(false);
        }
    };

    const handleExportCsv = () => {
        if (analyticsData.length === 0) return;

        const headers = ["Rank", "Name", "Email", "Phone", "Status", "Joined", "Total Attempts", "Avg Score", "Accuracy %"];
        const rows = analyticsData.map(s => [
            s.university_rank,
            `"${s.full_name}"`,
            `"${s.email}"`,
            `"${s.phone || ''}"`,
            s.is_active ? "Active" : "Inactive",
            new Date(s.created_at).toLocaleDateString(),
            s.total_attempts,
            s.average_score,
            s.accuracy
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `university_analytics_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filtered = analyticsData.filter(s =>
        s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="w-8 h-8 text-orange-500" /> Analytics & Rankings
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        View competitive rankings, performance metrics, and history for your students.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportCsv}
                        disabled={analyticsData.length === 0}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                    <button
                        onClick={fetchAnalytics}
                        className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl shadow-sm transition-all"
                    >
                        Refresh Data
                    </button>
                </div>
            </div>

            {/* Roster Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search students by name or email..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Rank</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student Profile</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Tests Taken</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Avg Score</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Accuracy</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-gray-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-orange-500" />
                                        Computing analytics & rankings...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-gray-500">
                                        No student data found or no matching students.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((s, idx) => {
                                    const rankColor = idx === 0 ? "text-amber-500 bg-amber-50 border-amber-200" :
                                        idx === 1 ? "text-slate-500 bg-slate-50 border-slate-200" :
                                            idx === 2 ? "text-orange-700 bg-orange-50 border-orange-200" :
                                                "text-gray-600 bg-gray-50 border-gray-200";
                                    return (
                                        <tr key={s.id} className="hover:bg-orange-50/30 dark:hover:bg-gray-800/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border ${rankColor} shadow-sm`}>
                                                        {s.university_rank}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                            {s.full_name}
                                                            {!s.is_active && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 uppercase">Suspended</span>}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{s.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-semibold text-gray-700 dark:text-gray-300">{s.total_attempts}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-semibold text-orange-600 dark:text-orange-400">{s.average_score}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {s.total_attempts > 0 ? (
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div className="h-full bg-emerald-500" style={{ width: `${s.accuracy}%` }} />
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-8 text-left">{s.accuracy}%</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-400">N/A</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => openInspectModal(s.id, s.full_name)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" /> Inspect
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Inspect Modal */}
            <AnimatePresence>
                <Modal
                    isOpen={isInspectModalOpen}
                    onClose={() => setIsInspectModalOpen(false)}
                    title={inspectData ? `Student Profile: ${inspectData.student?.full_name}` : "Inspecting Student..."}
                    size="xl"
                >
                    {inspectLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-gray-500">
                            <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
                            <p>Loading historical performance data...</p>
                        </div>
                    ) : inspectData && inspectData.success ? (
                        <div className="space-y-6">

                            {/* Summary Stat Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-3 text-emerald-600 mb-2">
                                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
                                            <ClipboardList className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-semibold">Attempts</h4>
                                    </div>
                                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{inspectData.summary.total_attempts}</p>
                                    <p className="text-xs text-gray-500 mt-1">{inspectData.summary.quiz_attempts} Quizzes, {inspectData.summary.test_attempts} Tests</p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-3 text-orange-600 mb-2">
                                        <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                                            <TrendingUp className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-semibold">Avg Score</h4>
                                    </div>
                                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{inspectData.summary.average_score}</p>
                                    <p className="text-xs text-gray-500 mt-1">Across all examinations</p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-3 text-blue-600 mb-2">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                            <Target className="w-5 h-5" />
                                        </div>
                                        <h4 className="font-semibold">Accuracy</h4>
                                    </div>
                                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{inspectData.summary.accuracy}%</p>
                                    <p className="text-xs text-gray-500 mt-1">{inspectData.summary.total_correct} / {inspectData.summary.total_questions} correct</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Timeline Chart */}
                                {inspectData.timeline && inspectData.timeline.length > 0 && (
                                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Performance Timeline</h4>
                                        <div className="h-64 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={inspectData.timeline}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                                    <XAxis
                                                        dataKey="date"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 12, fill: '#6B7280' }}
                                                        dy={10}
                                                    />
                                                    <YAxis
                                                        yAxisId="left"
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 12, fill: '#6B7280' }}
                                                        dx={-10}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    />
                                                    <Line
                                                        yAxisId="left"
                                                        type="monotone"
                                                        dataKey="avg_score"
                                                        name="Avg Score"
                                                        stroke="#f97316"
                                                        strokeWidth={3}
                                                        dot={{ r: 4, strokeWidth: 2 }}
                                                        activeDot={{ r: 6 }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                )}

                                {/* Recent Tests */}
                                <div className={`${inspectData.timeline && inspectData.timeline.length > 0 ? 'lg:col-span-1' : 'col-span-1 lg:col-span-3'} bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col`}>
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Tests</h4>

                                    <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2 max-h-[300px]">
                                        {inspectData.tests && inspectData.tests.length > 0 ? (
                                            inspectData.tests.map(t => (
                                                <div key={t.id} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{t.title}</p>
                                                    <div className="flex items-center justify-between mt-2">
                                                        <span className="text-xs font-medium text-orange-600 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded">
                                                            Score: {t.score}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500">
                                                            {new Date(t.date).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-gray-500 mt-10">
                                                <BookOpen className="w-8 h-8 mb-2 opacity-50" />
                                                <p className="text-sm">No tests taken yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-10 text-center text-red-500">
                            Failed to load profile. Please try again.
                        </div>
                    )}
                </Modal>
            </AnimatePresence>
        </div>
    );
}
