"use client";

import React, { useEffect, useState, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit3,
  Trash2,
  Search,
  Package,
  DollarSign,
  CheckCircle,
  XCircle,
  Brain,
  FileText,
  Download,
  Video,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const ACCESS_FEATURES_OPTIONS = [
  { key: "tests", label: "Tests", icon: CheckCircle, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { key: "ai_explanation", label: "AI Explanation", icon: Brain, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { key: "notes", label: "Notes", icon: FileText, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { key: "videos", label: "Videos", icon: Video, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { key: "download_allowed", label: "Download", icon: Download, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
];

export default function AddonsManagementPage() {
  const [addons, setAddons] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters and search
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState(null);

  // Form state - ONLY fields from database schema
  const [form, setForm] = useState({
    plan_id: "",
    name: "",
    price: 0,
    access_features: {},
    is_active: true,
  });

  // Load data
  const loadPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/plans/get?limit=100&is_active=true");
      const json = await res.json();
      if (json.success) setPlans(json.plans || []);
    } catch (err) {
      console.error("Error loading plans:", err);
      toast.error("Failed to load plans");
    }
  }, []);

  const loadAddons = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
        ...(planFilter && { plan_id: planFilter }),
      });

      const res = await fetch(`/api/admin/addons/get?${params}`);
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Failed to load addons");
        setAddons([]);
        setTotal(0);
      } else {
        setAddons(json.addons || []);
        const totalItems = json.pagination?.total || json.addons?.length || 0;
        setTotal(totalItems);
        setTotalPages(Math.max(1, Math.ceil(totalItems / limit)));
      }
    } catch (err) {
      console.error("Error loading addons:", err);
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, planFilter]);

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    loadAddons();
  }, [loadAddons]);

  // Open create modal
  const openCreate = () => {
    setForm({
      plan_id: plans[0]?.id || "",
      name: "",
      price: 0,
      access_features: {},
      is_active: true,
    });
    setShowCreate(true);
  };

  // Open edit modal
  const openEdit = (addon) => {
    setEditing(addon);
    setForm({
      plan_id: addon.plan_id,
      name: addon.name,
      price: addon.price,
      access_features: addon.access_features || {},
      is_active: addon.is_active ?? true,
    });
    setShowEdit(true);
  };

  // Handle create
  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!form.plan_id) {
      toast.error("Please select a plan");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Addon name is required");
      return;
    }
    if (Number(form.price) < 0) {
      toast.error("Price cannot be negative");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Creating addon...");

    try {
      const body = {
        ...form,
        price: Number(form.price),
      };

      const res = await fetch("/api/admin/addons/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      
      if (!json.success) {
        toast.error(json.error || "Create failed");
      } else {
        toast.success("Addon created successfully!");
        setShowCreate(false);
        loadAddons();
      }
    } catch (err) {
      console.error("Create error:", err);
      toast.error("Network error");
    } finally {
      setSubmitting(false);
      toast.dismiss(toastId);
    }
  };

  // Handle update
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editing) return;

    setSubmitting(true);
    const toastId = toast.loading("Updating addon...");

    try {
      const body = {
        id: editing.id,
        ...form,
        price: Number(form.price),
      };

      const res = await fetch("/api/admin/addons/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      
      if (!json.success) {
        toast.error(json.error || "Update failed");
      } else {
        toast.success("Addon updated successfully!");
        setShowEdit(false);
        setEditing(null);
        loadAddons();
      }
    } catch (err) {
      console.error("Update error:", err);
      toast.error("Network error");
    } finally {
      setSubmitting(false);
      toast.dismiss(toastId);
    }
  };

  // Handle delete
  const handleDelete = async (addon) => {
    if (!confirm(`Are you sure you want to delete the addon "${addon.name}"?\n\nThis action cannot be undone.`)) return;

    const toastId = toast.loading("Deleting addon...");
    
    try {
      const res = await fetch(`/api/admin/addons/delete?id=${addon.id}`, { 
        method: "DELETE" 
      });
      const json = await res.json();
      
      if (!json.success) {
        toast.error(json.error || "Delete failed");
      } else {
        toast.success("Addon deleted successfully!");
        loadAddons();
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Network error");
    } finally {
      toast.dismiss(toastId);
    }
  };

  // Toggle access feature
  const toggleAccessFeature = (featureKey) => {
    setForm(f => ({
      ...f,
      access_features: {
        ...f.access_features,
        [featureKey]: !f.access_features[featureKey]
      }
    }));
  };

  // Stats calculations
  const activeAddons = addons.filter(a => a.is_active).length;
  const totalAddons = addons.length;
  const averagePrice = addons.length > 0 
    ? addons.reduce((sum, a) => sum + (a.price || 0), 0) / addons.length 
    : 0;

  // Loading skeleton
  const renderSkeleton = () => (
    <div className="space-y-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 animate-pulse">
          <div className="flex justify-between items-center">
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-20" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-20" />
            </div>
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

      <div className="mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Plan Addons
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Create and manage additional packages for subscription plans
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
                  placeholder="Search addons..."
                  className="w-full sm:w-64 pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={planFilter}
                  onChange={(e) => {
                    setPlanFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">All Plans</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={openCreate}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Create Addon</span>
                  <span className="sm:hidden">Create</span>
                </motion.button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Addons</p>
                  <p className="text-2xl font-bold dark:text-white mt-1">{totalAddons}</p>
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
                  <p className="text-2xl font-bold dark:text-white mt-1">{activeAddons}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Avg Price</p>
                  <p className="text-2xl font-bold dark:text-white mt-1">
                    ₹{averagePrice.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          renderSkeleton()
        ) : addons.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-24 h-24 mx-auto mb-6 text-gray-400">
              <Package className="w-full h-full opacity-50" />
            </div>
            <h3 className="text-xl font-semibold dark:text-white mb-2">
              {search || planFilter ? "No matching addons" : "No addons yet"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {search || planFilter 
                ? "Try adjusting your search or filter criteria"
                : "Start by creating your first addon package"
              }
            </p>
            {!search && !planFilter && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={openCreate}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold"
              >
                Create First Addon
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
                      Addon Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Features
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
                  {addons.map((addon) => {
                    const plan = plans.find(p => p.id === addon.plan_id);
                    const activeFeatures = addon.access_features 
                      ? Object.entries(addon.access_features).filter(([_, enabled]) => enabled).length 
                      : 0;

                    return (
                      <tr key={addon.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold dark:text-white">{addon.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            ID: {addon.id.slice(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm dark:text-gray-300">
                            {plan?.name || "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold dark:text-white">₹{addon.price}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {addon.access_features?.tests && (
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded">
                                Tests
                              </span>
                            )}
                            {addon.access_features?.ai_explanation && (
                              <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded">
                                AI
                              </span>
                            )}
                            {addon.access_features?.notes && (
                              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded">
                                Notes
                              </span>
                            )}
                            {addon.access_features?.videos && (
                              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded">
                                Videos
                              </span>
                            )}
                            {addon.access_features?.download_allowed && (
                              <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded">
                                Download
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            addon.is_active
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                          }`}>
                            {addon.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => openEdit(addon)}
                              className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                              title="Edit addon"
                            >
                              <Edit3 className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDelete(addon)}
                              className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                              title="Delete addon"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
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
        {addons.length > 0 && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} addons
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
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
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

      {/* Create Addon Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => !submitting && setShowCreate(false)}
        title="Create New Addon"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-2">
              Plan *
            </label>
            <select
              value={form.plan_id}
              onChange={(e) => setForm(f => ({ ...f, plan_id: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
              disabled={submitting}
            >
              <option value="">Select a plan</option>
              {plans.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-2">
              Addon Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="e.g., Test Series, AI Tutor, Notes Package"
              required
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-2">
              Price (₹) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm(f => ({ ...f, price: Number(e.target.value) }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
              disabled={submitting}
            />
          </div>

          {/* Access Features */}
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-3">
              Access Features
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ACCESS_FEATURES_OPTIONS.map((feature) => {
                const Icon = feature.icon;
                const isActive = form.access_features[feature.key];
                
                return (
                  <button
                    key={feature.key}
                    type="button"
                    onClick={() => toggleAccessFeature(feature.key)}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                      isActive
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                    disabled={submitting}
                  >
                    <div className={`p-2 rounded-lg ${isActive ? feature.color : 'bg-gray-100 dark:bg-gray-700'}`}>
                      <Icon className={`w-4 h-4 ${isActive ? '' : 'text-gray-400 dark:text-gray-500'}`} />
                    </div>
                    <span className={`text-sm font-medium ${isActive ? 'dark:text-white' : 'dark:text-gray-300'}`}>
                      {feature.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${form.is_active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-200 dark:bg-gray-600'}`}>
                {form.is_active ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                )}
              </div>
              <div>
                <p className="font-medium dark:text-white">Active Status</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {form.is_active ? "Available for purchase" : "Hidden"}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))}
                className="sr-only peer"
                disabled={submitting}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setShowCreate(false)}
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
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Addon"
              )}
            </motion.button>
          </div>
        </form>
      </Modal>

      {/* Edit Addon Modal */}
      <Modal
        isOpen={showEdit}
        onClose={() => !submitting && (setShowEdit(false) || setEditing(null))}
        title={`Edit Addon: ${editing?.name || ''}`}
        size="md"
      >
        <form onSubmit={handleUpdate} className="space-y-6">
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-2">
              Addon Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-2">
              Price (₹) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm(f => ({ ...f, price: Number(e.target.value) }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
              disabled={submitting}
            />
          </div>

          {/* Access Features */}
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-3">
              Access Features
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ACCESS_FEATURES_OPTIONS.map((feature) => {
                const Icon = feature.icon;
                const isActive = form.access_features[feature.key];
                
                return (
                  <button
                    key={feature.key}
                    type="button"
                    onClick={() => toggleAccessFeature(feature.key)}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                      isActive
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                    disabled={submitting}
                  >
                    <div className={`p-2 rounded-lg ${isActive ? feature.color : 'bg-gray-100 dark:bg-gray-700'}`}>
                      <Icon className={`w-4 h-4 ${isActive ? '' : 'text-gray-400 dark:text-gray-500'}`} />
                    </div>
                    <span className={`text-sm font-medium ${isActive ? 'dark:text-white' : 'dark:text-gray-300'}`}>
                      {feature.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${form.is_active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-200 dark:bg-gray-600'}`}>
                {form.is_active ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                )}
              </div>
              <div>
                <p className="font-medium dark:text-white">Active Status</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {form.is_active ? "Available for purchase" : "Hidden"}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))}
                className="sr-only peer"
                disabled={submitting}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setShowEdit(false)}
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
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </motion.button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Enhanced Modal Component
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