"use client";

import React, { useEffect, useState, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit3,
  Trash2,
  Search,
  Grid,
  List,
  Calendar,
  DollarSign,
  Users,
  Video,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Brain,
  Smartphone,
  Globe,
  Sparkles,
  Loader2,
  TrendingUp,
  Percent,
  Shield,
  Zap,
  Star,
  Tag,
  RefreshCw,
  Gift,
  Settings,
  HelpCircle,
  Wifi,
  Battery,
  Monitor,
  Tablet,
  Headphones,
  Award,
  BookOpen,
} from "lucide-react";

const DEFAULT_FEATURES = {
  videos: true,
  notes: true,
  tests: true,
  ai_explanation: false,
  download_allowed: false,
};

const ACCESS_FEATURE_KEYS = ["videos", "notes", "tests", "ai_explanation", "download_allowed"];

const RELEASE_MODES = [
  { value: "instant", label: "Instant Access", icon: Zap },
  { value: "scheduled", label: "Scheduled", icon: Calendar },
  { value: "drip", label: "Drip Content", icon: TrendingUp },
  { value: "locked", label: "Locked", icon: Shield },
];

const DEVICE_LIMITS = [
  { value: 1, label: "1 Device" },
  { value: 2, label: "2 Devices" },
  { value: 3, label: "3 Devices" },
  { value: 5, label: "5 Devices" },
  { value: 10, label: "10 Devices" },
  { value: -1, label: "Unlimited" },
];

const STREAM_LIMITS = [
  { value: 1, label: "1 Stream" },
  { value: 2, label: "2 Streams" },
  { value: 3, label: "3 Streams" },
  { value: 5, label: "5 Streams" },
];

const TRIAL_OPTIONS = [
  { value: 0, label: "No Trial" },
  { value: 3, label: "3 Days" },
  { value: 7, label: "7 Days" },
  { value: 14, label: "14 Days" },
  { value: 30, label: "30 Days" },
];

export default function PlansManagementPage() {
  const [plans, setPlans] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [viewMode, setViewMode] = useState("table");
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    course_id: "",
    name: "",
    description: "",
    duration_in_days: 30,
    price: 0,
    original_price: null,
    discount_price: null,
    offer_active: false,
    access_features: { ...DEFAULT_FEATURES },
    device_limit: 1,
    max_streams: 1,
    ai_access: false,
    trial_days: 0,
    auto_renew: false,
    supports_addons: false,
    release_mode: "instant",
    download_allowed: false,
    is_active: true,
    popular: false,
    features_list: [],
    priority_order: 0,
    // New fields from original
    supports_addons: false,
    release_mode: "instant",
    download_allowed: false,
    // Additional features
    support_included: false,
    certificate_included: false,
    community_access: false,
    mentorship: false,
    project_review: false,
  });

  const [featureInput, setFeatureInput] = useState("");

  // Load courses and plans
  const loadCourses = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/courses");
      const json = await res.json();
      if (json.success) setCourses(json.data || []);
    } catch (err) {
      console.error("Error loading courses:", err);
      toast.error("Failed to load courses");
    }
  }, []);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(courseFilter && { course_id: courseFilter }),
        ...(search && { search }),
      });

      const res = await fetch(`/api/admin/plans/get?${params}`);
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Failed to load plans");
        setPlans([]);
        setTotal(0);
      } else {
        setPlans(json.plans || []);
        const totalItems = json.pagination?.total || json.plans?.length || 0;
        setTotal(totalItems);
        setTotalPages(Math.max(1, Math.ceil(totalItems / limit)));
      }
    } catch (err) {
      console.error("Error loading plans:", err);
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [page, limit, courseFilter, search]);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // Open create modal
  const openCreate = () => {
    setForm({
      course_id: courses[0]?.id || "",
      name: "",
      description: "",
      duration_in_days: 30,
      price: 0,
      original_price: null,
      discount_price: null,
      offer_active: false,
      access_features: { ...DEFAULT_FEATURES },
      device_limit: 1,
      max_streams: 1,
      ai_access: false,
      trial_days: 0,
      auto_renew: false,
      supports_addons: false,
      release_mode: "instant",
      download_allowed: false,
      is_active: true,
      popular: false,
      features_list: [],
      priority_order: 0,
      support_included: false,
      certificate_included: false,
      community_access: false,
      mentorship: false,
      project_review: false,
    });
    setShowCreate(true);
  };

  // Open edit modal
  const openEdit = (plan) => {
    setEditing(plan);
    setForm({
      course_id: plan.course_id,
      name: plan.name,
      description: plan.description || "",
      duration_in_days: plan.duration_in_days,
      price: plan.price,
      original_price: plan.original_price,
      discount_price: plan.discount_price,
      offer_active: plan.offer_active || false,
      access_features: plan.access_features || { ...DEFAULT_FEATURES },
      device_limit: plan.device_limit || 1,
      max_streams: plan.max_streams || 1,
      ai_access: plan.ai_access || false,
      trial_days: plan.trial_days || 0,
      auto_renew: plan.auto_renew || false,
      supports_addons: plan.supports_addons || false,
      release_mode: plan.release_mode || "instant",
      download_allowed: plan.download_allowed || false,
      is_active: plan.is_active ?? true,
      popular: plan.popular || false,
      features_list: plan.features_list || [],
      priority_order: plan.priority_order || 0,
      support_included: plan.support_included || false,
      certificate_included: plan.certificate_included || false,
      community_access: plan.community_access || false,
      mentorship: plan.mentorship || false,
      project_review: plan.project_review || false,
    });
    setShowEdit(true);
  };

  // Handle create
  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!form.course_id) {
      toast.error("Please select a course");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Plan name is required");
      return;
    }
    if (!Number.isInteger(Number(form.duration_in_days)) || Number(form.duration_in_days) < 1) {
      toast.error("Duration must be a positive integer");
      return;
    }
    if (Number(form.price) < 0) {
      toast.error("Price cannot be negative");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Creating plan...");

    try {
      // Sanitize access_features to only allowed boolean keys
      const cleanAccessFeatures = {};
      ACCESS_FEATURE_KEYS.forEach((key) => {
        cleanAccessFeatures[key] = !!(form.access_features && form.access_features[key]);
      });

      const { access_features: _af, ...restForm } = form;

      const body = {
        ...restForm,
        access_features: cleanAccessFeatures,
        price: Number(form.price),
        duration_in_days: Number(form.duration_in_days),
        original_price: form.original_price ? Number(form.original_price) : null,
        discount_price: form.discount_price ? Number(form.discount_price) : null,
        device_limit: Number(form.device_limit),
        max_streams: Number(form.max_streams),
        trial_days: Number(form.trial_days),
        priority_order: Number(form.priority_order),
      };

      const res = await fetch("/api/admin/plans/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      
      if (!json.success) {
        toast.error(json.error || "Create failed");
      } else {
        toast.success("Plan created successfully!");
        setShowCreate(false);
        loadPlans();
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
    const toastId = toast.loading("Updating plan...");

    try {
      // Sanitize access_features to only allowed boolean keys
      const cleanAccessFeatures = {};
      ACCESS_FEATURE_KEYS.forEach((key) => {
        cleanAccessFeatures[key] = !!(form.access_features && form.access_features[key]);
      });

      const { access_features: _af, ...restForm } = form;

      const body = {
        id: editing.id,
        ...restForm,
        access_features: cleanAccessFeatures,
        price: Number(form.price),
        duration_in_days: Number(form.duration_in_days),
        original_price: form.original_price ? Number(form.original_price) : null,
        discount_price: form.discount_price ? Number(form.discount_price) : null,
        device_limit: Number(form.device_limit),
        max_streams: Number(form.max_streams),
        trial_days: Number(form.trial_days),
        priority_order: Number(form.priority_order),
      };

      const res = await fetch("/api/admin/plans/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      
      if (!json.success) {
        toast.error(json.error || "Update failed");
      } else {
        toast.success("Plan updated successfully!");
        setShowEdit(false);
        setEditing(null);
        loadPlans();
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
  const handleDelete = async (plan) => {
    if (!confirm(`Are you sure you want to delete the plan "${plan.name}"?\n\nNote: This action cannot be undone and may affect active subscriptions.`)) return;

    const toastId = toast.loading("Deleting plan...");
    
    try {
      const res = await fetch(`/api/admin/plans/delete?id=${plan.id}`, { 
        method: "DELETE" 
      });
      const json = await res.json();
      
      if (!json.success) {
        toast.error(json.error || "Delete failed");
      } else {
        toast.success("Plan deleted successfully");
        loadPlans();
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Network error");
    } finally {
      toast.dismiss(toastId);
    }
  };

  // Handle feature addition
  const addFeature = () => {
    if (featureInput.trim() && !form.features_list.includes(featureInput.trim())) {
      setForm(f => ({
        ...f,
        features_list: [...f.features_list, featureInput.trim()]
      }));
      setFeatureInput("");
    }
  };

  const removeFeature = (index) => {
    setForm(f => ({
      ...f,
      features_list: f.features_list.filter((_, i) => i !== index)
    }));
  };

  // Calculate discount percentage
  const calculateDiscount = () => {
    if (form.original_price && form.price && form.original_price > form.price) {
      return Math.round(((form.original_price - form.price) / form.original_price) * 100);
    }
    return 0;
  };

  // Stats calculations
  const activePlans = plans.filter(p => p.is_active).length;
  const popularPlans = plans.filter(p => p.popular).length;
  const averagePrice = plans.length > 0 
    ? plans.reduce((sum, p) => sum + (p.price || 0), 0) / plans.length 
    : 0;
  const trialPlans = plans.filter(p => p.trial_days > 0).length;

  // Loading skeleton
  const renderSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 animate-pulse">
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
            </div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="flex gap-2">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-20" />
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Feature icon mapping - Expanded
  const featureIcons = {
    videos: Video,
    notes: FileText,
    tests: CheckCircle,
    ai_explanation: Brain,
    download_allowed: Download,
    ai_access: Brain,
    device_limit: Monitor,
    max_streams: Wifi,
    trial_days: Gift,
    auto_renew: RefreshCw,
    supports_addons: Settings,
    release_mode: Calendar,
    support_included: HelpCircle,
    certificate_included: Award,
    community_access: Users,
    mentorship: BookOpen,
    project_review: CheckCircle,
  };

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
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent">
                Subscription Plans
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Create and manage subscription plans for your courses
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
                  placeholder="Search plans..."
                  className="w-full sm:w-64 pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={courseFilter}
                  onChange={(e) => {
                    setCourseFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">All Courses</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setViewMode(v => v === "table" ? "card" : "table")}
                  className="p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  title={`Switch to ${viewMode === "table" ? "card" : "table"} view`}
                >
                  {viewMode === "table" ? <Grid className="w-5 h-5" /> : <List className="w-5 h-5" />}
                </button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={openCreate}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Create Plan</span>
                  <span className="sm:hidden">Create</span>
                </motion.button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Plans</p>
                  <p className="text-2xl font-bold dark:text-white mt-1">{total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                  <p className="text-2xl font-bold dark:text-white mt-1">{activePlans}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Popular</p>
                  <p className="text-2xl font-bold dark:text-white mt-1">{popularPlans}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Gift className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">With Trial</p>
                  <p className="text-2xl font-bold dark:text-white mt-1">{trialPlans}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          renderSkeleton()
        ) : plans.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-24 h-24 mx-auto mb-6 text-gray-400">
              <Users className="w-full h-full opacity-50" />
            </div>
            <h3 className="text-xl font-semibold dark:text-white mb-2">
              {search || courseFilter ? "No matching plans" : "No plans yet"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {search || courseFilter 
                ? "Try adjusting your search or filter criteria"
                : "Start by creating your first subscription plan"
              }
            </p>
            {!search && !courseFilter && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={openCreate}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold"
              >
                Create First Plan
              </motion.button>
            )}
          </div>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const course = courses.find(c => c.id === plan.course_id);
              const discountPercent = plan.original_price && plan.price && plan.original_price > plan.price
                ? Math.round(((plan.original_price - plan.price) / plan.original_price) * 100)
                : 0;

              const months = plan.duration_in_days / 30;
              const isWholeMonths = Number.isInteger(months);
              const durationLabel = isWholeMonths
                ? `${months === 1 ? "1 Month" : `${months} Months`}`
                : `${plan.duration_in_days} days`;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -6 }}
                  className={`relative bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800 rounded-3xl overflow-hidden border ${
                    plan.popular 
                      ? 'border-amber-400 dark:border-amber-500 shadow-xl shadow-amber-100 dark:shadow-amber-900/30 scale-[1.02]'
                      : 'border-gray-200 dark:border-gray-700 shadow-lg'
                  } transition-all duration-300 group`}
                >
                  {/* Popular / Best value badge */}
                  {plan.popular && (
                    <div className="absolute inset-x-0 top-0 z-10 flex justify-center mt-3">
                      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-semibold shadow-md">
                        <Star className="w-3 h-3" />
                        Best Value
                      </div>
                    </div>
                  )}

                  {/* Limited offer strip */}
                  {plan.offer_active && plan.discount_price && (
                    <div className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/90 text-white text-[10px] font-semibold backdrop-blur">
                      <Tag className="w-3 h-3" />
                      Limited Offer
                    </div>
                  )}

                  <div className="p-5 pt-8 flex flex-col h-full">
                    {/* Header */}
                    <div className="mb-4">
                      <p className="text-[11px] font-semibold tracking-wide uppercase text-blue-600 dark:text-blue-300">
                        {course?.name || "Unassigned Course"}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <h3 className="font-bold text-xl dark:text-white">{plan.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-[11px] font-medium ${
                          plan.is_active
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        }`}>
                          {plan.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {durationLabel} access
                        {plan.trial_days > 0 && ` • ${plan.trial_days} days trial`}
                      </p>
                    </div>

                    {/* Price Display */}
                    <div className="mb-5">
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">₹</span>
                            <span className="text-3xl font-extrabold tracking-tight dark:text-white">
                              {plan.discount_price && plan.offer_active ? plan.discount_price : plan.price}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            One-time payment for {durationLabel.toLowerCase()}
                          </p>
                        </div>

                        {plan.original_price && plan.original_price > plan.price && (
                          <div className="text-right">
                            <p className="text-xs line-through text-gray-400 dark:text-gray-500">
                              ₹{plan.original_price}
                            </p>
                            <p className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[11px] font-semibold">
                              {discountPercent}% OFF
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Plan Features */}
                    <div className="mb-5 space-y-3 flex-1">
                      {/* Core Access Chips */}
                      <div className="flex flex-wrap gap-2">
                        {plan.access_features?.videos && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[11px] rounded-full inline-flex items-center gap-1">
                            <Video className="w-3 h-3" /> Videos
                          </span>
                        )}
                        {plan.access_features?.notes && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[11px] rounded-full inline-flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Notes
                          </span>
                        )}
                        {plan.access_features?.tests && (
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[11px] rounded-full inline-flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Tests
                          </span>
                        )}
                        {plan.ai_access && (
                          <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 text-[11px] rounded-full inline-flex items-center gap-1">
                            <Brain className="w-3 h-3" /> AI
                          </span>
                        )}
                        {plan.download_allowed && (
                          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-[11px] rounded-full inline-flex items-center gap-1">
                            <Download className="w-3 h-3" /> Download
                          </span>
                        )}
                      </div>

                      {/* Custom feature bullets */}
                      {plan.features_list?.slice(0, 4).map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          <span className="dark:text-gray-300 text-gray-700">{feature}</span>
                        </div>
                      ))}

                      {!plan.features_list?.length && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          Use the features list in the form to highlight what makes this plan special.
                        </p>
                      )}
                    </div>

                    {/* Device and Stream Limits */}
                    <div className="mb-5 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 border-t border-dashed border-gray-200 dark:border-gray-700 pt-3">
                      <div className="flex items-center gap-1">
                        <Monitor className="w-3 h-3" />
                        <span>{plan.device_limit === -1 ? "Unlimited" : `${plan.device_limit}`} device{plan.device_limit !== 1 && 's'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Wifi className="w-3 h-3" />
                        <span>{plan.max_streams} stream{plan.max_streams !== 1 && 's'}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => openEdit(plan)}
                        className="flex-1 px-3 py-2 rounded-xl bg-blue-600 text-white flex items-center justify-center gap-2 text-sm font-semibold shadow-sm hover:bg-blue-700 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit Plan
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(plan)}
                        className="flex-1 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center gap-2 text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Plan Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Course & Duration
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Pricing
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
                  {plans.map((plan) => {
                    const course = courses.find(c => c.id === plan.course_id);
                    const activeFeatures = plan.access_features 
                      ? Object.entries(plan.access_features).filter(([_, enabled]) => enabled).length 
                      : 0;

                    return (
                      <tr key={plan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-semibold dark:text-white">{plan.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Priority: {plan.priority_order || 0}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="text-sm dark:text-gray-300">
                              {course?.name || "—"}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {plan.duration_in_days} days
                              {plan.trial_days > 0 && ` • ${plan.trial_days}d trial`}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-baseline gap-1">
                              <span className="font-semibold dark:text-white">
                                ₹{plan.discount_price && plan.offer_active ? plan.discount_price : plan.price}
                              </span>
                              {plan.original_price && plan.original_price > plan.price && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 line-through">
                                  ₹{plan.original_price}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {plan.auto_renew ? "Auto-renew" : "One-time"}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="text-sm dark:text-gray-300">
                              {activeFeatures} core features
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {plan.device_limit === -1 ? "Unlimited" : plan.device_limit} device{plan.device_limit !== 1 && 's'} • {plan.max_streams} stream{plan.max_streams !== 1 && 's'}
                            </div>
                            {plan.supports_addons && (
                              <div className="text-xs text-blue-600 dark:text-blue-400">
                                Add-ons available
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              plan.is_active
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                            }`}>
                              {plan.is_active ? "Active" : "Inactive"}
                            </span>
                            {plan.popular && (
                              <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium rounded">
                                Popular
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => openEdit(plan)}
                              className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                              title="Edit plan"
                            >
                              <Edit3 className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDelete(plan)}
                              className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                              title="Delete plan"
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
        {plans.length > 0 && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} plans
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

      {/* Create Plan Modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => !submitting && setShowCreate(false)}
        title="Create New Subscription Plan"
        size="xl"
      >
        <form onSubmit={handleCreate} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Course *
              </label>
              <select
                value={form.course_id}
                onChange={(e) => setForm(f => ({ ...f, course_id: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
                disabled={submitting}
              >
                <option value="">Select a course</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Plan Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="e.g., Basic, Premium, Annual"
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Brief description of the plan"
              disabled={submitting}
            />
          </div>

          {/* Duration & Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Duration (days) *
              </label>
              <input
                type="number"
                min="1"
                value={form.duration_in_days}
                onChange={(e) => setForm(f => ({ ...f, duration_in_days: Number(e.target.value) }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Selling Price (₹) *
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

            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Original Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.original_price || ""}
                onChange={(e) => setForm(f => ({ ...f, original_price: e.target.value ? Number(e.target.value) : null }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="For showing discount"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Priority Order
              </label>
              <input
                type="number"
                value={form.priority_order}
                onChange={(e) => setForm(f => ({ ...f, priority_order: Number(e.target.value) }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Display order"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Offer Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Discount Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.discount_price || ""}
                onChange={(e) => setForm(f => ({ ...f, discount_price: e.target.value ? Number(e.target.value) : null }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Special offer price"
                disabled={submitting}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${form.offer_active ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-200 dark:bg-gray-600'}`}>
                  <Tag className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-medium dark:text-white">Special Offer Active</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {form.offer_active ? "Discount price is active" : "No special offer"}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.offer_active}
                  onChange={(e) => setForm(f => ({ ...f, offer_active: e.target.checked }))}
                  className="sr-only peer"
                  disabled={submitting}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Trial Period
              </label>
              <select
                value={form.trial_days}
                onChange={(e) => setForm(f => ({ ...f, trial_days: Number(e.target.value) }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={submitting}
              >
                {TRIAL_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Access & Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Core Access Features */}
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-3">
                Core Access Features
              </label>
              <div className="space-y-3">
                {Object.entries(DEFAULT_FEATURES).map(([feature, defaultValue]) => {
                  const Icon = featureIcons[feature] || CheckCircle;
                  return (
                    <label
                      key={feature}
                      className="flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-blue-500" />
                        <div>
                          <span className="font-medium dark:text-white capitalize">
                            {feature.replace('_', ' ')}
                          </span>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {feature === 'videos' ? 'Access to course videos' :
                             feature === 'notes' ? 'Downloadable notes' :
                             feature === 'tests' ? 'Practice tests & quizzes' :
                             feature === 'ai_explanation' ? 'AI-powered explanations' :
                             feature === 'download_allowed' ? 'Download content for offline' :
                             'AI assistance features'}
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!form.access_features[feature]}
                        onChange={(e) => setForm(f => ({
                          ...f,
                          access_features: { ...f.access_features, [feature]: e.target.checked }
                        }))}
                        className="rounded"
                        disabled={submitting}
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Additional Features */}
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-3">
                Additional Features
              </label>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-blue-500" />
                    <div>
                      <span className="font-medium dark:text-white">Supports Add-ons</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Users can purchase additional add-ons
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.supports_addons}
                    onChange={(e) => setForm(f => ({ ...f, supports_addons: e.target.checked }))}
                    className="rounded"
                    disabled={submitting}
                  />
                </label>

                <label className="flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-purple-500" />
                    <div>
                      <span className="font-medium dark:text-white">Support Included</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Priority customer support access
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.support_included}
                    onChange={(e) => setForm(f => ({ ...f, support_included: e.target.checked }))}
                    className="rounded"
                    disabled={submitting}
                  />
                </label>

                <label className="flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-yellow-500" />
                    <div>
                      <span className="font-medium dark:text-white">Certificate Included</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Completion certificate included
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.certificate_included}
                    onChange={(e) => setForm(f => ({ ...f, certificate_included: e.target.checked }))}
                    className="rounded"
                    disabled={submitting}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Device & Stream Limits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Device Limit
              </label>
              <select
                value={form.device_limit}
                onChange={(e) => setForm(f => ({ ...f, device_limit: Number(e.target.value) }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={submitting}
              >
                {DEVICE_LIMITS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Max Simultaneous Streams
              </label>
              <select
                value={form.max_streams}
                onChange={(e) => setForm(f => ({ ...f, max_streams: Number(e.target.value) }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={submitting}
              >
                {STREAM_LIMITS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Release Mode */}
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-2">
              Content Release Mode
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {RELEASE_MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <label
                    key={mode.value}
                    className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                      form.release_mode === mode.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="release_mode"
                      value={mode.value}
                      checked={form.release_mode === mode.value}
                      onChange={(e) => setForm(f => ({ ...f, release_mode: e.target.value }))}
                      className="hidden"
                      disabled={submitting}
                    />
                    <Icon className={`w-5 h-5 ${
                      form.release_mode === mode.value 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-400 dark:text-gray-500'
                    }`} />
                    <div>
                      <div className="font-medium dark:text-white">{mode.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {mode.value === 'instant' ? 'All content available immediately' :
                         mode.value === 'scheduled' ? 'Content released on schedule' :
                         mode.value === 'drip' ? 'Content released gradually' :
                         'Content locked until certain conditions'}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Additional Custom Features */}
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-2">
              Custom Features List
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault() || addFeature())}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Add a custom feature (e.g., 24/7 Support, Community Access)"
                disabled={submitting}
              />
              <button
                type="button"
                onClick={addFeature}
                disabled={!featureInput.trim() || submitting}
                className="px-4 py-3 rounded-xl bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.features_list.map((feature, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm"
                >
                  {feature}
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    disabled={submitting}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Plan Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${form.is_active ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-200 dark:bg-gray-600'}`}>
                  {form.is_active ? (
                    <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium dark:text-white">Plan Status</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {form.is_active ? "Available for purchase" : "Hidden from users"}
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${form.auto_renew ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-200 dark:bg-gray-600'}`}>
                  <RefreshCw className={`w-5 h-5 ${form.auto_renew ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                </div>
                <div>
                  <p className="font-medium dark:text-white">Auto Renew</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {form.auto_renew ? "Automatically renews" : "Manual renewal required"}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.auto_renew}
                  onChange={(e) => setForm(f => ({ ...f, auto_renew: e.target.checked }))}
                  className="sr-only peer"
                  disabled={submitting}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${form.popular ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-gray-200 dark:bg-gray-600'}`}>
                  <Star className={`w-5 h-5 ${form.popular ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'}`} />
                </div>
                <div>
                  <p className="font-medium dark:text-white">Popular Plan</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {form.popular ? "Highlight as popular choice" : "Regular plan"}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.popular}
                  onChange={(e) => setForm(f => ({ ...f, popular: e.target.checked }))}
                  className="sr-only peer"
                  disabled={submitting}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 dark:peer-focus:ring-yellow-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-yellow-500"></div>
              </label>
            </div>
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
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-600 text-white font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Plan"
              )}
            </motion.button>
          </div>
        </form>
      </Modal>

      {/* Edit Plan Modal */}
      <Modal
        isOpen={showEdit}
        onClose={() => !submitting && (setShowEdit(false) || setEditing(null))}
        title={`Edit Plan: ${editing?.name || ''}`}
        size="xl"
      >
        <form onSubmit={handleUpdate} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Course *
              </label>
              <select
                value={form.course_id}
                onChange={(e) => setForm(f => ({ ...f, course_id: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
                disabled={submitting}
              >
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Plan Name *
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
          </div>

          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              disabled={submitting}
            />
          </div>

          {/* Duration & Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Duration (days) *
              </label>
              <input
                type="number"
                min="1"
                value={form.duration_in_days}
                onChange={(e) => setForm(f => ({ ...f, duration_in_days: Number(e.target.value) }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Selling Price (₹) *
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

            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Original Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.original_price || ""}
                onChange={(e) => setForm(f => ({ ...f, original_price: e.target.value ? Number(e.target.value) : null }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Priority Order
              </label>
              <input
                type="number"
                value={form.priority_order}
                onChange={(e) => setForm(f => ({ ...f, priority_order: Number(e.target.value) }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Offer Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Discount Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.discount_price || ""}
                onChange={(e) => setForm(f => ({ ...f, discount_price: e.target.value ? Number(e.target.value) : null }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={submitting}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${form.offer_active ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-200 dark:bg-gray-600'}`}>
                  <Tag className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-medium dark:text-white">Special Offer Active</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {form.offer_active ? "Discount price is active" : "No special offer"}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.offer_active}
                  onChange={(e) => setForm(f => ({ ...f, offer_active: e.target.checked }))}
                  className="sr-only peer"
                  disabled={submitting}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Trial Period
              </label>
              <select
                value={form.trial_days}
                onChange={(e) => setForm(f => ({ ...f, trial_days: Number(e.target.value) }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={submitting}
              >
                {TRIAL_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Access & Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Core Access Features */}
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-3">
                Core Access Features
              </label>
              <div className="space-y-3">
                {Object.entries(DEFAULT_FEATURES).map(([feature, defaultValue]) => {
                  const Icon = featureIcons[feature] || CheckCircle;
                  return (
                    <label
                      key={feature}
                      className="flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-blue-500" />
                        <div>
                          <span className="font-medium dark:text-white capitalize">
                            {feature.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!form.access_features[feature]}
                        onChange={(e) => setForm(f => ({
                          ...f,
                          access_features: { ...f.access_features, [feature]: e.target.checked }
                        }))}
                        className="rounded"
                        disabled={submitting}
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Additional Features */}
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-3">
                Additional Features
              </label>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-blue-500" />
                    <div>
                      <span className="font-medium dark:text-white">Supports Add-ons</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Users can purchase additional add-ons
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.supports_addons}
                    onChange={(e) => setForm(f => ({ ...f, supports_addons: e.target.checked }))}
                    className="rounded"
                    disabled={submitting}
                  />
                </label>

                <label className="flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-purple-500" />
                    <div>
                      <span className="font-medium dark:text-white">Support Included</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Priority customer support access
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.support_included}
                    onChange={(e) => setForm(f => ({ ...f, support_included: e.target.checked }))}
                    className="rounded"
                    disabled={submitting}
                  />
                </label>

                <label className="flex items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-yellow-500" />
                    <div>
                      <span className="font-medium dark:text-white">Certificate Included</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Completion certificate included
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.certificate_included}
                    onChange={(e) => setForm(f => ({ ...f, certificate_included: e.target.checked }))}
                    className="rounded"
                    disabled={submitting}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Device & Stream Limits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Device Limit
              </label>
              <select
                value={form.device_limit}
                onChange={(e) => setForm(f => ({ ...f, device_limit: Number(e.target.value) }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={submitting}
              >
                {DEVICE_LIMITS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Max Simultaneous Streams
              </label>
              <select
                value={form.max_streams}
                onChange={(e) => setForm(f => ({ ...f, max_streams: Number(e.target.value) }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={submitting}
              >
                {STREAM_LIMITS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Release Mode */}
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-2">
              Content Release Mode
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {RELEASE_MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <label
                    key={mode.value}
                    className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                      form.release_mode === mode.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="release_mode"
                      value={mode.value}
                      checked={form.release_mode === mode.value}
                      onChange={(e) => setForm(f => ({ ...f, release_mode: e.target.value }))}
                      className="hidden"
                      disabled={submitting}
                    />
                    <Icon className={`w-5 h-5 ${
                      form.release_mode === mode.value 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-400 dark:text-gray-500'
                    }`} />
                    <div>
                      <div className="font-medium dark:text-white">{mode.label}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Additional Custom Features */}
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-2">
              Custom Features List
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault() || addFeature())}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Add a custom feature"
                disabled={submitting}
              />
              <button
                type="button"
                onClick={addFeature}
                disabled={!featureInput.trim() || submitting}
                className="px-4 py-3 rounded-xl bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.features_list.map((feature, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm"
                >
                  {feature}
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    disabled={submitting}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Plan Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${form.is_active ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-200 dark:bg-gray-600'}`}>
                  {form.is_active ? (
                    <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium dark:text-white">Plan Status</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {form.is_active ? "Available for purchase" : "Hidden from users"}
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${form.auto_renew ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-200 dark:bg-gray-600'}`}>
                  <RefreshCw className={`w-5 h-5 ${form.auto_renew ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                </div>
                <div>
                  <p className="font-medium dark:text-white">Auto Renew</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {form.auto_renew ? "Automatically renews" : "Manual renewal required"}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.auto_renew}
                  onChange={(e) => setForm(f => ({ ...f, auto_renew: e.target.checked }))}
                  className="sr-only peer"
                  disabled={submitting}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${form.popular ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-gray-200 dark:bg-gray-600'}`}>
                  <Star className={`w-5 h-5 ${form.popular ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'}`} />
                </div>
                <div>
                  <p className="font-medium dark:text-white">Popular Plan</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {form.popular ? "Highlight as popular choice" : "Regular plan"}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.popular}
                  onChange={(e) => setForm(f => ({ ...f, popular: e.target.checked }))}
                  className="sr-only peer"
                  disabled={submitting}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 dark:peer-focus:ring-yellow-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-yellow-500"></div>
              </label>
            </div>
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
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-600 text-white font-medium flex items-center gap-2 disabled:opacity-50"
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
    xl: "max-w-5xl",
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