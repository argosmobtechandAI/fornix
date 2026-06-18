"use client";

import { useEffect, useState } from "react";
import {
    Users, BookOpen, Activity, Loader2, GraduationCap,
    TrendingUp, ArrowRight, Upload, BarChart3, Shield,
    UserCheck, UserX, CalendarDays, Eye, Clock
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" },
    }),
};

export default function UniversityDashboard() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/university/dashboard-stats");
                const json = await res.json();
                if (json.success) {
                    setStats(json.data);
                }
            } catch (err) {
                console.error("Failed to load dashboard stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    const enrolled = stats?.enrolledStudentsCount || 0;
    const max = stats?.maxStudents || 0;
    const usagePercent = max > 0 ? Math.round((enrolled / max) * 100) : 0;
    const active = stats?.activeStudentsCount || 0;
    const inactive = stats?.inactiveStudentsCount || 0;
    const gender = stats?.genderDistribution || { male: 0, female: 0, other: 0 };
    const recentStudents = stats?.recentStudents || [];

    const statCards = [
        {
            title: "Total Students",
            value: enrolled,
            subtitle: `of ${max} seats used`,
            icon: Users,
            gradient: "from-orange-500 to-amber-500",
            lightBg: "bg-orange-50 dark:bg-orange-900/20",
        },
        {
            title: "Active Students",
            value: active,
            subtitle: `${inactive} inactive`,
            icon: UserCheck,
            gradient: "from-emerald-500 to-teal-500",
            lightBg: "bg-emerald-50 dark:bg-emerald-900/20",
        },
        {
            title: "Active Subscriptions",
            value: stats?.activeSubscriptionsCount || 0,
            subtitle: "currently learning",
            icon: Activity,
            gradient: "from-blue-500 to-indigo-500",
            lightBg: "bg-blue-50 dark:bg-blue-900/20",
        },
        {
            title: "Assigned Plans",
            value: stats?.assignedPlansCount || 0,
            subtitle: "plan licenses",
            icon: BookOpen,
            gradient: "from-purple-500 to-violet-500",
            lightBg: "bg-purple-50 dark:bg-purple-900/20",
        },
        {
            title: "Joined This Month",
            value: stats?.joinedThisMonth || 0,
            subtitle: new Date().toLocaleString("default", { month: "long" }),
            icon: CalendarDays,
            gradient: "from-pink-500 to-rose-500",
            lightBg: "bg-pink-50 dark:bg-pink-900/20",
        },
        {
            title: "Suspended",
            value: inactive,
            subtitle: "accounts paused",
            icon: UserX,
            gradient: "from-red-500 to-orange-500",
            lightBg: "bg-red-50 dark:bg-red-900/20",
        },
    ];

    const genderTotal = gender.male + gender.female + gender.other;

    return (
        <div className="space-y-6 md:space-y-8">

            {/* Welcome Section */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2.5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl shadow-lg">
                            <GraduationCap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                                {stats?.universityName || "University Dashboard"}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                {stats?.country ? `${stats.country} • ` : ""}Institutional analytics and student tracking
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/university/students"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm text-sm"
                    >
                        <Users className="w-4 h-4" />
                        View Roster
                    </Link>
                    <Link
                        href="/university/students"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
                    >
                        <Upload className="w-4 h-4" />
                        Import Students
                    </Link>
                </div>
            </motion.div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                {statCards.map((card, i) => (
                    <motion.div
                        key={card.title}
                        custom={i}
                        initial="hidden"
                        animate="visible"
                        variants={fadeUp}
                        className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 group"
                    >
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
                            <card.icon className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                            {card.value}
                        </h3>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{card.title}</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">{card.subtitle}</p>
                    </motion.div>
                ))}
            </div>

            {/* Usage + Gender Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

                {/* Capacity Bar */}
                <motion.div
                    custom={6}
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    className="lg:col-span-2 bg-white dark:bg-gray-800 p-5 md:p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">Student Capacity</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {enrolled} of {max} seats utilized
                                </p>
                            </div>
                        </div>
                        <span className={`text-sm font-bold px-3 py-1 rounded-full ${usagePercent >= 90
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : usagePercent >= 70
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            }`}>
                            {usagePercent}% used
                        </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(usagePercent, 100)}%` }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                            className={`h-full rounded-full ${usagePercent >= 90
                                ? "bg-gradient-to-r from-red-500 to-red-600"
                                : usagePercent >= 70
                                    ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                                    : "bg-gradient-to-r from-orange-400 to-amber-500"
                                }`}
                        />
                    </div>
                    <div className="flex justify-between mt-3 text-xs text-gray-400">
                        <span>0</span>
                        <span>{Math.round(max / 2)}</span>
                        <span>{max} seats</span>
                    </div>
                </motion.div>

                {/* Gender Distribution */}
                <motion.div
                    custom={7}
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm"
                >
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-500" />
                        Gender Distribution
                    </h3>
                    <div className="space-y-3">
                        {[
                            { label: "Male", count: gender.male, color: "bg-blue-500", lightBg: "bg-blue-50 dark:bg-blue-900/20", textColor: "text-blue-700 dark:text-blue-400" },
                            { label: "Female", count: gender.female, color: "bg-pink-500", lightBg: "bg-pink-50 dark:bg-pink-900/20", textColor: "text-pink-700 dark:text-pink-400" },
                            { label: "Other", count: gender.other, color: "bg-gray-400", lightBg: "bg-gray-50 dark:bg-gray-700", textColor: "text-gray-600 dark:text-gray-400" },
                        ].map(g => (
                            <div key={g.label}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{g.label}</span>
                                    <span className={`text-sm font-bold ${g.textColor}`}>
                                        {g.count} <span className="text-xs font-normal text-gray-400">({genderTotal > 0 ? Math.round((g.count / genderTotal) * 100) : 0}%)</span>
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${genderTotal > 0 ? (g.count / genderTotal) * 100 : 0}%` }}
                                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 }}
                                        className={`h-full rounded-full ${g.color}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Recent Students + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

                {/* Recent Students Table */}
                <motion.div
                    custom={8}
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
                >
                    <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Clock className="w-4 h-4 text-orange-500" />
                            Recently Added Students
                        </h3>
                        <Link
                            href="/university/students"
                            className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 hover:underline"
                        >
                            View All <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                    {recentStudents.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-gray-900/50">
                                    <tr>
                                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {recentStudents.map(s => (
                                        <tr key={s.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                                                        {s.full_name?.charAt(0) || "S"}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white text-sm">{s.full_name}</p>
                                                        <p className="text-[11px] text-gray-500">{s.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {s.active_plan ? (
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{s.active_plan.plan_name}</p>
                                                        <p className="text-[11px] text-gray-400">{s.active_plan.course_name}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">No active plan</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {s.is_active ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-gray-500">
                                                {new Date(s.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-400">
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No students enrolled yet.</p>
                        </div>
                    )}
                </motion.div>

                {/* Quick Actions */}
                <motion.div
                    custom={9}
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    className="bg-white dark:bg-gray-800 rounded-2xl p-5 md:p-6 border border-gray-100 dark:border-gray-700 shadow-sm"
                >
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-orange-500" />
                        Quick Actions
                    </h3>
                    <div className="space-y-3">
                        <Link
                            href="/university/students"
                            className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-orange-50 dark:hover:bg-orange-900/10 border border-gray-100 dark:border-gray-700 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center group-hover:bg-orange-200 dark:group-hover:bg-orange-800/40 transition-colors">
                                    <Users className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Student Roster</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                        </Link>
                        <Link
                            href="/university/students"
                            className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/10 border border-gray-100 dark:border-gray-700 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                                    <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Bulk Upload CSV</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                        </Link>
                        <Link
                            href="/university/exams"
                            className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-purple-50 dark:hover:bg-purple-900/10 border border-gray-100 dark:border-gray-700 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-800/40 transition-colors">
                                    <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Manage Exams</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
                        </Link>
                    </div>

                    {/* Capacity Alert */}
                    {usagePercent >= 80 && (
                        <div className={`mt-5 p-3.5 rounded-xl border ${usagePercent >= 90
                            ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
                            : "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800"
                            }`}>
                            <p className={`text-xs font-medium ${usagePercent >= 90 ? "text-red-700 dark:text-red-400" : "text-yellow-700 dark:text-yellow-400"}`}>
                                ⚠️ {usagePercent >= 90 ? "Almost at capacity!" : "Approaching capacity"} — {max - enrolled} seat{max - enrolled !== 1 ? "s" : ""} remaining.
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
