"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  Search,
  RefreshCw,
  Copy,
  BookOpen,
  Trash2,
  Pencil,
  Upload,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  User,
  Tag,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// Action config — icon + color + label
const ACTION_CONFIG = {
  course_cloned:  { icon: Copy,     color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",  label: "Course Cloned" },
  course_created: { icon: BookOpen, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",    label: "Course Created" },
  course_updated: { icon: Pencil,   color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300", label: "Course Updated" },
  course_deleted: { icon: Trash2,   color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",        label: "Course Deleted" },
  bulk_upload:    { icon: Upload,   color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", label: "Bulk Upload" },
};

function getActionConfig(action) {
  return ACTION_CONFIG[action] || {
    icon: Activity,
    color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    label: action?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "Action",
  };
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterType, setFilterType] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [expandedLog, setExpandedLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page, limit: 30 });
      if (search) params.set("search", search);
      if (filterAction) params.set("action", filterAction);
      if (filterType) params.set("target_type", filterType);

      const res = await fetch(`/api/admin/activity-logs?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setLogs(json.data || []);
      setPagination(json.pagination);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterAction, filterType]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterAction, filterType]);

  return (
    <div className="min-h-screen">
      <Toaster position="top-right" />
      <div className="mx-auto">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-600 dark:bg-orange-500 rounded-xl shadow-lg">
              <Activity className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Activity Logs
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Track all admin actions — course cloning, creation, deletion &amp; more
              </p>
            </div>
          </div>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm font-medium"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Search */}
          <div className="relative sm:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by description, name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm text-sm"
            />
          </div>

          {/* Filter by Action */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm text-sm appearance-none"
            >
              <option value="">All Actions</option>
              <option value="course_cloned">Course Cloned</option>
              <option value="course_created">Course Created</option>
              <option value="course_updated">Course Updated</option>
              <option value="course_deleted">Course Deleted</option>
              <option value="bulk_upload">Bulk Upload</option>
            </select>
          </div>

          {/* Filter by Type */}
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm text-sm appearance-none"
            >
              <option value="">All Types</option>
              <option value="course">Course</option>
              <option value="subject">Subject</option>
              <option value="question">Question</option>
            </select>
          </div>
        </div>

        {/* Stats strip */}
        {pagination && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing <strong>{logs.length}</strong> of <strong>{pagination.total}</strong> logs
            </span>
          </div>
        )}

        {/* Logs list */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <RefreshCw className="animate-spin text-orange-500 mx-auto mb-4" size={40} />
              <p className="text-gray-500 dark:text-gray-400">Loading activity logs...</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <Activity className="mx-auto text-gray-300 mb-4" size={56} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No activity logs found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {search || filterAction || filterType
                ? "Try adjusting your filters."
                : "Activity will appear here when admin actions are performed."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const cfg = getActionConfig(log.action);
              const IconComp = cfg.icon;
              const isExpanded = expandedLog === log.id;

              return (
                <div
                  key={log.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 hover:shadow-md"
                >
                  <button
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    className="w-full text-left p-5 flex items-start gap-4"
                  >
                    {/* Icon */}
                    <div className={`p-2.5 rounded-xl shrink-0 ${cfg.color}`}>
                      <IconComp size={20} />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {log.target_type && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full capitalize">
                            {log.target_type}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200 font-medium leading-snug">
                        {log.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {log.admin_email && (
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            {log.admin_email}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          <span title={formatDate(log.created_at)}>{timeAgo(log.created_at)}</span>
                          <span className="text-gray-400">· {formatDate(log.created_at)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Chevron */}
                    <ChevronRight
                      size={16}
                      className={`text-gray-400 mt-1 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                    />
                  </button>

                  {/* Expanded metadata */}
                  {isExpanded && log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="px-5 pb-5">
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                          Metadata
                        </p>

                        {/* If this is a clone action, show summary nicely */}
                        {log.action === "course_cloned" && log.metadata.summary ? (
                          <div>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                              {[
                                { label: "Subjects",  value: log.metadata.summary.subjects },
                                { label: "Chapters",  value: log.metadata.summary.chapters },
                                { label: "Topics",    value: log.metadata.summary.topics },
                                { label: "Questions", value: log.metadata.summary.questions },
                                { label: "Options",   value: log.metadata.summary.options },
                                { label: "Answers",   value: log.metadata.summary.correct_answers },
                              ].map(({ label, value }) => (
                                <div key={label} className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center border border-gray-200 dark:border-gray-700">
                                  <p className="text-base font-bold text-gray-900 dark:text-white">{(value || 0).toLocaleString()}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                                </div>
                              ))}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                              <p><span className="font-medium">Source:</span> {log.metadata.source_course_name} <span className="text-gray-400">({log.metadata.source_course_id})</span></p>
                              <p><span className="font-medium">New Course:</span> {log.metadata.new_course_name} <span className="text-gray-400">({log.metadata.new_course_id})</span></p>
                            </div>
                          </div>
                        ) : (
                          <pre className="text-xs text-gray-600 dark:text-gray-300 overflow-auto whitespace-pre-wrap">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrev}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium text-sm"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.hasNext}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium text-sm"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
