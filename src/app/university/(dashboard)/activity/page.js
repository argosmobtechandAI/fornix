"use client";
import { useState, useEffect } from "react";
import { Clock, Activity, Loader2, User, FileText, CheckCircle, Database } from "lucide-react";
import toast from "react-hot-toast";

export default function EnhancedActivityLogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        try {
            const res = await fetch("/api/university/activity");
            const json = await res.json();
            if (json.success) {
                setLogs(json.data || []);
            } else {
                toast.error("Failed to load activity logs");
            }
        } catch (err) {
            toast.error("Network error loading logs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const getActionDetails = (action) => {
        if (action.includes("student_deleted") || action.includes("students_bulk_deleted")) {
            return { color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20", icon: User };
        }
        if (action.includes("student_suspended") || action.includes("students_bulk_suspended")) {
            return { color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20", icon: User };
        }
        if (action.includes("student_activated") || action.includes("students_bulk_activated")) {
            return { color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20", icon: User };
        }
        if (action.includes("bulk_imported")) {
            return { color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20", icon: Database };
        }
        if (action.includes("exam")) {
            return { color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-900/20", icon: FileText };
        }
        return { color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20", icon: Activity };
    };

    return (
        <div className="max-w-full mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Clock className="w-6 h-6 text-orange-500" /> Activity Logs
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Recent activities and actions performed in your university portal.
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                        <Loader2 className="w-8 h-8 animate-spin mb-3 text-orange-500" />
                        <p>Loading your activity log...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center p-12 text-gray-500">
                        <Activity className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                        <p>No activity logs found yet. Start managing your students and exams!</p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Vertical Timeline Line */}
                        <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700 md:left-24"></div>

                        <div className="space-y-6">
                            {logs.map((log, index) => {
                                const details = getActionDetails(log.action);
                                const Icon = details.icon;
                                const dateObj = new Date(log.created_at);

                                return (
                                    <div key={log.id} className="relative flex items-start gap-4 md:gap-6 group">

                                        {/* Timestamp (Hidden on small, left on medium+) */}
                                        <div className="hidden md:block w-16 pt-1">
                                            <p className="text-[11px] font-medium text-gray-500 text-right">
                                                {dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                            </p>
                                            <p className="text-[10px] text-gray-400 text-right">
                                                {dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                            </p>
                                        </div>

                                        {/* Timeline Dot & Icon */}
                                        <div className={`relative z-10 w-12 h-12 rounded-full ${details.bg} ${details.color} flex items-center justify-center flex-shrink-0 ring-4 ring-white dark:ring-gray-800 shadow-sm transition-transform group-hover:scale-110`}>
                                            <Icon className="w-5 h-5" />
                                        </div>

                                        {/* Content Card */}
                                        <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700 transition-colors group-hover:border-gray-200 dark:group-hover:border-gray-600">
                                            <div className="flex sm:items-start justify-between flex-col sm:flex-row gap-2 mb-1">
                                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                                                    {log.action.replace(/_/g, " ")}
                                                </h3>
                                                {/* Mobile Timestamp */}
                                                <div className="md:hidden text-xs text-gray-400">
                                                    {dateObj.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                                                </div>
                                            </div>

                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                {log.description}
                                            </p>

                                            {/* Optional Metadata Chip */}
                                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {Object.entries(log.metadata).map(([key, value]) => (
                                                        <span key={key} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] uppercase font-medium bg-white dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700 shadow-xs">
                                                            <span className="text-gray-400">{key}:</span> {value}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
