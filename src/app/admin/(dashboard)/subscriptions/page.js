"use client";

import React, { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Plus,
  RefreshCw,
  UserCheck,
  Package,
  BookOpen,
} from "lucide-react";

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState([]);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  // assign modal
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ 
    user_id: "", 
    plan_id: "", 
    start_date: "", 
    custom_end_date: "", 
    auto_renew: false 
  });

  useEffect(() => {
    loadAll();
  }, [page, search]);

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([loadSubscriptions(), loadUsers(), loadPlans(), loadCourses()]);
    } finally {
      setLoading(false);
    }
  }

  async function loadSubscriptions() {
    try {
      const res = await fetch(`/api/admin/subscriptions/get?page=${page}&limit=${limit}&search=${search}`);
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Failed to load subscriptions");
        setSubs([]);
        setTotal(0);
      } else {
        setSubs(json.subscriptions || []);
        setTotal(json.pagination?.total || json.subscriptions?.length || 0);
        setTotalPages(Math.max(1, Math.ceil((json.pagination?.total || json.subscriptions?.length || 0) / limit)));
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error");
    }
  }

  async function loadUsers() {
    try {
      const res = await fetch("/api/admin/users/get?page=1&limit=200");
      const json = await res.json();
      if (json.success) setUsers(json.users || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadPlans() {
    try {
      const res = await fetch("/api/admin/plans/get?limit=200");
      const json = await res.json();
      if (json.success) setPlans(json.plans || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadCourses() {
    try {
      const res = await fetch("/api/admin/courses");
      const json = await res.json();
      if (json.success) setCourses(json.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  function openAssign() {
    setAssignForm({ 
      user_id: users[0]?.id || "", 
      plan_id: plans[0]?.id || "", 
      start_date: new Date().toISOString().split('T')[0], 
      custom_end_date: "", 
      auto_renew: false 
    });
    setShowAssign(true);
  }

  async function handleAssign(e) {
    e.preventDefault();
    if (!assignForm.user_id || !assignForm.plan_id) {
      toast.error("User and Plan are required");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Assigning subscription...");

    try {
      const res = await fetch("/api/admin/subscriptions/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignForm),
      });
      const json = await res.json();
      
      if (!json.success) {
        toast.error(json.error || "Assign failed");
      } else {
        toast.success("Subscription assigned successfully!");
        setShowAssign(false);
        loadSubscriptions();
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
      toast.dismiss(toastId);
    }
  }

  async function handleCancel(sub) {
    if (!confirm(`Cancel subscription for user?\n\nThis action cannot be undone.`)) return;
    
    const toastId = toast.loading("Cancelling subscription...");
    
    try {
      const res = await fetch("/api/admin/subscriptions/cancel", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sub.id }),
      });
      const json = await res.json();
      
      if (!json.success) {
        toast.error(json.error || "Cancel failed");
      } else {
        toast.success("Subscription cancelled!");
        loadSubscriptions();
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      toast.dismiss(toastId);
    }
  }

  // Calculate stats
  const activeSubs = subs.filter(s => s.status === 'active').length;
  const cancelledSubs = subs.filter(s => s.status === 'cancelled').length;
  const autoRenewSubs = subs.filter(s => s.auto_renew).length;

  // Loading skeleton
  const renderSkeleton = () => (
    <div className="space-y-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 animate-pulse">
          <div className="flex justify-between items-center">
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32" />
            </div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-20" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1f2937',
            color: '#fff',
            borderRadius: '0.75rem',
            border: '1px solid #374151',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <div className=" mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent">
                Subscriptions
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                View, assign, and manage user subscriptions
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by user or plan..."
                  className="w-full sm:w-64 pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={openAssign}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Assign Subscription</span>
                <span className="sm:hidden">Assign</span>
              </motion.button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                  <p className="text-2xl font-bold dark:text-white mt-1">{total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                  <p className="text-2xl font-bold dark:text-white mt-1">{activeSubs}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Cancelled</p>
                  <p className="text-2xl font-bold dark:text-white mt-1">{cancelledSubs}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Auto Renew</p>
                  <p className="text-2xl font-bold dark:text-white mt-1">{autoRenewSubs}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          renderSkeleton()
        ) : subs.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-24 h-24 mx-auto mb-6 text-gray-400">
              <Users className="w-full h-full opacity-50" />
            </div>
            <h3 className="text-xl font-semibold dark:text-white mb-2">
              {search ? "No matching subscriptions" : "No subscriptions yet"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {search 
                ? "Try adjusting your search criteria"
                : "Start by assigning your first subscription"
              }
            </p>
            {!search && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={openAssign}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold"
              >
                Assign First Subscription
              </motion.button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Plan & Course
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {subs.map(sub => {
                    const user = users.find(u => u.id === sub.user_id);
                    const plan = plans.find(p => p.id === sub.plan_id);
                    const course = courses.find(c => c.id === sub.course_id);
                    const isActive = sub.is_active === true;

                    return (
                      <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-semibold dark:text-white">
                              {user?.full_name || sub.user_id?.slice(0, 8) + '...'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {user?.email || 'No email'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="text-sm dark:text-gray-300">
                              {plan?.name || 'No plan'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {course?.name || 'No course'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="text-sm dark:text-gray-300 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(sub.start_date).toLocaleDateString()}
                            </div>
                            <div className="text-sm dark:text-gray-300 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(sub.end_date).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              isActive
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                            }`}>
                              {isActive ? "Active" : "Cancelled"}
                            </span>
                            {sub.auto_renew && (
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
                                Auto Renew
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isActive && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleCancel(sub)}
                              className="px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                            >
                              Cancel
                            </motion.button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {subs.length > 0 && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} subscriptions
            </div>
            
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </motion.button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-xl font-medium transition-colors ${
                        page === pageNum
                          ? "bg-gradient-to-r from-blue-600 to-blue-600 text-white"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      <Modal
        isOpen={showAssign}
        onClose={() => !submitting && setShowAssign(false)}
        title="Assign New Subscription"
        size="md"
      >
        <form onSubmit={handleAssign} className="space-y-6">
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-2">
              User *
            </label>
            <select 
              value={assignForm.user_id} 
              onChange={(e) => setAssignForm((f) => ({ ...f, user_id: e.target.value }))} 
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
              disabled={submitting}
            >
              <option value="">Select user</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-2">
              Plan *
            </label>
            <select 
              value={assignForm.plan_id} 
              onChange={(e) => setAssignForm((f) => ({ ...f, plan_id: e.target.value }))} 
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
              disabled={submitting}
            >
              <option value="">Select plan</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} - ₹{p.price}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input 
                type="date" 
                value={assignForm.start_date} 
                onChange={(e) => setAssignForm((f) => ({ ...f, start_date: e.target.value }))} 
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Custom End Date (optional)
              </label>
              <input 
                type="date" 
                value={assignForm.custom_end_date} 
                onChange={(e) => setAssignForm((f) => ({ ...f, custom_end_date: e.target.value }))} 
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${assignForm.auto_renew ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-200 dark:bg-gray-600'}`}>
                <RefreshCw className={`w-5 h-5 ${assignForm.auto_renew ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
              </div>
              <div>
                <p className="font-medium dark:text-white">Auto Renew</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {assignForm.auto_renew ? "Automatically renews" : "Manual renewal required"}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={assignForm.auto_renew} 
                onChange={(e) => setAssignForm((f) => ({ ...f, auto_renew: e.target.checked }))} 
                className="sr-only peer"
                disabled={submitting}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button" 
              onClick={() => setShowAssign(false)}
              disabled={submitting}
              className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit" 
              disabled={submitting}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-600 text-white font-medium disabled:opacity-50"
            >
              {submitting ? "Assigning..." : "Assign Subscription"}
            </motion.button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* Enhanced Modal Component */
function Modal({ isOpen, onClose, title, children, size = "md" }) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`relative bg-white dark:bg-gray-800 w-full ${sizeClasses[size]} rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto`}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold dark:text-white">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}