"use client";

import React, { useEffect, useState, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import {
  Search,
  Users,
  Download,
  Loader2,
  Mail,
  Phone,
  Calendar,
  BookOpen
} from "lucide-react";
import Papa from "papaparse";

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [subscriberFilter, setSubscriberFilter] = useState("all");

  // Options for filters
  const [courses, setCourses] = useState([]);
  const [plans, setPlans] = useState([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const limit = 15;

  // Load filter options (courses and plans)
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [courseRes, planRes] = await Promise.all([
          fetch("/api/admin/courses"),
          fetch("/api/admin/plans/get")
        ]);
        const courseJson = await courseRes.json();
        const planJson = await planRes.json();

        if (courseJson.success) setCourses(courseJson.data || []);
        if (planJson.success) setPlans(planJson.plans || []);
      } catch (err) {
        console.error("Failed to load filters", err);
      }
    };
    fetchOptions();
  }, []);

  // Fetch students function
  const fetchStudents = async (pageNum, isLoadMore = false) => {
    if (!isLoadMore) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(limit),
        ...(search && { search }),
        ...(courseFilter !== "all" && { course_id: courseFilter }),
        ...(planFilter !== "all" && { plan_id: planFilter }),
        ...(subscriberFilter !== "all" && { subscriber_status: subscriberFilter }),
      });

      const res = await fetch(`/api/admin/students?${params}`);
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Failed to load students");
      } else {
        if (isLoadMore) {
          setStudents((prev) => [...prev, ...(json.data || [])]);
        } else {
          setStudents(json.data || []);
        }

        setTotal(json.pagination?.total || 0);
        setHasMore(pageNum < (json.pagination?.totalPages || 1));
      }
    } catch (err) {
      console.error("Error loading students:", err);
      toast.error("Network error while loading students");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Effect to load initial or filtered data
  useEffect(() => {
    setPage(1);
    const timer = setTimeout(() => {
      fetchStudents(1, false);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, courseFilter, planFilter, subscriberFilter]);

  // Handle Load More
  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchStudents(nextPage, true);
  };

  // Handle Export to Excel (CSV)
  const handleExport = async () => {
    setExporting(true);
    const toastId = toast.loading("Preparing export...");
    try {
      const params = new URLSearchParams({
        export: "true",
        ...(search && { search }),
        ...(courseFilter !== "all" && { course_id: courseFilter }),
        ...(planFilter !== "all" && { plan_id: planFilter }),
        ...(subscriberFilter !== "all" && { subscriber_status: subscriberFilter }),
      });

      const res = await fetch(`/api/admin/students?${params}`);
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Export failed");
        return;
      }

      // Format data for CSV
      const exportData = json.data.map((student) => {
        const subs = student.subscriptions || [];
        const courseNames = subs.map(s => s.courses?.name).filter(Boolean).join(", ");
        const planNames = subs.map(s => s.plans?.name).filter(Boolean).join(", ");

        return {
          "Name": student.full_name || "N/A",
          "Email": student.email || "N/A",
          "Phone": student.phone || "N/A",
          "Joined Date": new Date(student.created_at).toLocaleDateString(),
          "Courses": courseNames || "No Course",
          "Plans": planNames || "No Plan"
        };
      });

      if (exportData.length === 0) {
        toast.error("No data to export");
        return;
      }

      // Generate CSV
      const csv = Papa.unparse(exportData);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Students_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Export successful!");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Network error during export");
    } finally {
      setExporting(false);
      toast.dismiss(toastId);
    }
  };

  // Loading skeleton for table
  const renderSkeleton = () => (
    <div className="space-y-4 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 animate-pulse">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-full" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen dark:from-gray-900 dark:to-gray-800 p-3">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1f2937',
            color: '#fff',
            borderRadius: '0.75rem',
            border: '1px solid #374151',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />

      <div className="mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                Students List
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage and track all registered students and their subscriptions
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
              {/* Filters and Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm w-full sm:w-64 shadow-sm"
                  />
                </div>

                <select
                  value={subscriberFilter}
                  onChange={(e) => setSubscriberFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm cursor-pointer shadow-sm"
                >
                  <option value="all">All Students</option>
                  <option value="subscribed">Subscribed Only</option>
                  <option value="unsubscribed">Free Users (Unsubscribed)</option>
                </select>

                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm cursor-pointer shadow-sm"
                >
                  <option value="all">All Courses</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>

                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm cursor-pointer shadow-sm"
                >
                  <option value="all">All Plans</option>
                  {(courseFilter === "all" ? plans : plans.filter(p => String(p.course_id) === String(courseFilter))).map(plan => {
                    const course = courses.find(c => String(c.id) === String(plan.course_id));
                    return (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} {courseFilter === "all" && course ? `(${course.name})` : ""}
                      </option>
                    );
                  })}
                </select>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleExport}
                  disabled={exporting || students.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  <span className="hidden sm:inline">Export CSV</span>
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mb-6 flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Total Students Found: <span className="font-bold text-lg">{total}</span>
          </p>
        </div>

        {/* Table Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
          {loading ? (
            renderSkeleton()
          ) : students.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No students found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student Details</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact Info</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subscriptions</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {students.map((student) => (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {student.full_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {student.full_name || "N/A"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="truncate max-w-[200px]">{student.email || "N/A"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{student.phone || "N/A"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2 max-w-[250px]">
                          {student.subscriptions && student.subscriptions.length > 0 ? (
                            student.subscriptions.map((sub, idx) => (
                              <div key={idx} className="flex flex-col gap-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg text-xs border border-blue-100 dark:border-blue-800">
                                <span className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" />
                                  {sub.courses?.name || "Unknown Course"}
                                </span>
                                <span className="text-gray-600 dark:text-gray-400">
                                  {sub.plans?.name || "Unknown Plan"}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500 italic">No active subscriptions</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(student.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>

              {/* Load More Button Container */}
              {hasMore && (
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-center bg-gray-50 dark:bg-gray-900/30">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="px-8 py-2.5 rounded-xl bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-semibold shadow-sm hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load More Students"
                    )}
                  </motion.button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
