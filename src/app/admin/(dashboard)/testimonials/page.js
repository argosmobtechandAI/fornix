"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import {
  Plus,
  Edit3,
  Trash2,
  Image as ImageIcon,
  Star,
  Search,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Grid,
  List,
  Users,
  MessageSquare,
  ThumbsUp,
  Upload,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

export default function ManageTestimonials() {
  // Data state
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  const [courses, setCourses] = useState([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(9);
  const [total, setTotal] = useState(0);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("");

  // UI states
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState("grid");

  // Form state
  const emptyForm = {
    profile_image: null,
    preview: null,
    name: "",
    rating: 5,
    message: "",
    status: true,
    course_id: "",
  };
  const [form, setForm] = useState(emptyForm);

  // Responsive view mode
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 900) setViewMode("table");
      else setViewMode("grid");
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load testimonials
  const loadTestimonials = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(courseFilter && { course_id: courseFilter }),
      });

      const res = await fetch(`/api/admin/testimonials/list?${params}`);
      const json = await res.json();

      if (json.success) {
        setTestimonials(json.testimonials || []);
        setTotal(json.total || 0);
      } else {
        toast.error(json.error || "Failed to load testimonials");
      }
    } catch (err) {
      console.error("Error loading testimonials:", err);
      toast.error("Error fetching testimonials");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, courseFilter]);

  const loadCourses = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/courses");
      const json = await res.json();
      if (json.success) {
        setCourses(json.data || []);
      }
    } catch (err) {
      console.error("Error loading courses for testimonials:", err);
    }
  }, []);

  useEffect(() => {
    loadTestimonials();
  }, [loadTestimonials]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Open form for create/edit
  const openForm = (testimonial = null) => {
    if (testimonial) {
      setEditing(testimonial);
      setForm({
        profile_image: null,
        preview: testimonial.profile_image || null,
        name: testimonial.name || "",
        rating: testimonial.rating || 5,
        message: testimonial.message || "",
        status: testimonial.status ?? true,
        course_id: testimonial.course_id || "",
      });
    } else {
      setEditing(null);
      setForm(emptyForm);
    }
    setShowForm(true);
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }
    
    const url = URL.createObjectURL(file);
    setForm((f) => ({ ...f, profile_image: file, preview: url }));
  };

  // Submit form
  const submitForm = async () => {
    // Validation
    if (!form.name?.trim()) {
      toast.error("Please enter a name");
      return;
    }
    if (!form.message?.trim()) {
      toast.error("Please enter a testimonial message");
      return;
    }
    if (form.message.trim().length < 10) {
      toast.error("Message should be at least 10 characters");
      return;
    }
    if (!editing && !form.profile_image) {
      toast.error("Please upload a profile image");
      return;
    }

    setSubmitting(true);
    const loadingId = toast.loading(editing ? "Updating testimonial..." : "Creating testimonial...");

    try {
      const formData = new FormData();
      if (form.profile_image) formData.append("profile_image", form.profile_image);
      formData.append("name", form.name.trim());
      formData.append("rating", String(form.rating));
      formData.append("message", form.message.trim());
      formData.append("status", String(form.status));
      if (form.course_id) formData.append("course_id", form.course_id);

      const endpoint = editing ? "/api/admin/testimonials/update" : "/api/admin/testimonials/create";
      const method = editing ? "PUT" : "POST";

      if (editing) {
        formData.append("id", editing.id);
      }

      const res = await fetch(endpoint, { method, body: formData });
      const json = await res.json();

      if (json.success) {
        toast.success(editing ? "Testimonial updated successfully!" : "Testimonial created successfully!");
        setShowForm(false);
        setEditing(null);
        setForm(emptyForm);
        loadTestimonials();
      } else {
        toast.error(json.error || "Operation failed");
      }
    } catch (err) {
      console.error("Form submission error:", err);
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
      toast.dismiss(loadingId);
    }
  };

  // Delete testimonial
  const confirmDelete = (item) => {
    setToDelete(item);
    setShowDeleteConfirm(true);
  };

  const deleteTestimonial = async () => {
    if (!toDelete) return;
    
    const loadingId = toast.loading("Deleting testimonial...");
    try {
      const res = await fetch("/api/admin/testimonials/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: toDelete.id }),
      });
      const json = await res.json();
      
      if (json.success) {
        toast.success("Testimonial deleted successfully");
        setShowDeleteConfirm(false);
        setToDelete(null);
        loadTestimonials();
      } else {
        toast.error(json.error || "Delete failed");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Network error");
    } finally {
      toast.dismiss(loadingId);
    }
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const goToPage = (pageNum) => {
    if (pageNum < 1 || pageNum > totalPages) return;
    setPage(pageNum);
  };

  // Calculate average rating
  const averageRating = testimonials.length > 0
    ? (testimonials.reduce((sum, t) => sum + (t.rating || 0), 0) / testimonials.length).toFixed(1)
    : "0.0";

  // Loading skeleton
  const renderSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border dark:border-gray-700 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              <div className="flex gap-2">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-20" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-20" />
              </div>
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
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent">
                Testimonial Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Showcase customer feedback and build trust
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
                  placeholder="Search testimonials..."
                  className="w-full sm:w-64 pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Course Filter */}
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

              {/* View Toggle */}
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>

                <button
                  onClick={() => setViewMode(v => v === "grid" ? "table" : "grid")}
                  className="p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  title={`Switch to ${viewMode === "grid" ? "list" : "grid"} view`}
                >
                  {viewMode === "grid" ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
                </button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => openForm()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Add Testimonial</span>
                  <span className="sm:hidden">Add</span>
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
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Testimonials</p>
                  <p className="text-2xl font-bold dark:text-white mt-1">{total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Eye className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                  <p className="text-2xl font-bold dark:text-white mt-1">
                    {testimonials.filter(t => t.status).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Avg Rating</p>
                  <p className="text-2xl font-bold dark:text-white mt-1">{averageRating}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">This Page</p>
                  <p className="text-2xl font-bold dark:text-white mt-1">
                    {testimonials.length} of {total}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          renderSkeleton()
        ) : testimonials.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-24 h-24 mx-auto mb-6 text-gray-400">
              <MessageSquare className="w-full h-full opacity-50" />
            </div>
            <h3 className="text-xl font-semibold dark:text-white mb-2">
              {search || statusFilter !== "all" ? "No matching testimonials" : "No testimonials yet"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {search || statusFilter !== "all" 
                ? "Try adjusting your search or filter criteria"
                : "Start building trust by adding your first customer testimonial"
              }
            </p>
            {!search && statusFilter === "all" && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => openForm()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold"
              >
                Add First Testimonial
              </motion.button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -5 }}
                className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-blue-100 to-blue-100 dark:from-gray-700 dark:to-gray-800">
                        {testimonial.profile_image ? (
                          <img 
                            src={testimonial.profile_image} 
                            alt={testimonial.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Users className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      {!testimonial.status && (
                        <div className="absolute inset-0 bg-gray-900/50 rounded-xl flex items-center justify-center">
                          <EyeOff className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h3 className="font-bold text-lg dark:text-white truncate">
                            {testimonial.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < (testimonial.rating || 0)
                                    ? "text-yellow-500 fill-yellow-500"
                                    : "text-gray-300 dark:text-gray-600"
                                }`}
                              />
                            ))}
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              ({testimonial.rating || 0}.0)
                            </span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          testimonial.status
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        }`}>
                          {testimonial.status ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <p className="text-gray-600 dark:text-gray-300 mt-3 line-clamp-3 text-sm">
                        "{testimonial.message}"
                      </p>

                      {testimonial.course_id && (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Course: {courses.find((c) => c.id === testimonial.course_id)?.name || "Unknown"}
                        </p>
                      )}

                      <div className="flex gap-2 mt-4">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => openForm(testimonial)}
                          className="flex-1 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2 font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => confirmDelete(testimonial)}
                          className="flex-1 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center gap-2 font-medium hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Testimonial
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Rating
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
                  {testimonials.map((testimonial) => (
                    <tr key={testimonial.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-blue-100 to-blue-100 dark:from-gray-700 dark:to-gray-800">
                            {testimonial.profile_image ? (
                              <img 
                                src={testimonial.profile_image} 
                                alt={testimonial.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Users className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium dark:text-white">{testimonial.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(testimonial.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                            "{testimonial.message}"
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < (testimonial.rating || 0)
                                  ? "text-yellow-500 fill-yellow-500"
                                  : "text-gray-300 dark:text-gray-600"
                              }`}
                            />
                          ))}
                          <span className="ml-2 text-sm font-medium dark:text-white">
                            {testimonial.rating || 0}.0
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          testimonial.status
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        }`}>
                          {testimonial.status ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => openForm(testimonial)}
                            className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => confirmDelete(testimonial)}
                            className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {testimonials.length > 0 && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} testimonials
            </div>
            
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => goToPage(page - 1)}
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
                      onClick={() => goToPage(pageNum)}
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
                onClick={() => goToPage(page + 1)}
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

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showForm && (
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
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold dark:text-white">
                    {editing ? "Edit Testimonial" : "Add New Testimonial"}
                  </h2>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditing(null);
                      setForm(emptyForm);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                    disabled={submitting}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Image Upload Section */}
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium dark:text-gray-300 mb-3">
                      Profile Image
                    </label>
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-6 text-center hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="profileImage"
                        disabled={submitting}
                      />
                      <label
                        htmlFor="profileImage"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        {form.preview ? (
                          <div className="relative w-full max-w-xs mx-auto">
                            <img
                              src={form.preview}
                              alt="Preview"
                              className="rounded-xl w-full h-48 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                              <Upload className="w-8 h-8 text-white" />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-blue-100 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                              <Users className="w-12 h-12 text-gray-400" />
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 mb-2">
                              Click to upload image
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-500">
                              PNG, JPG up to 5MB
                            </p>
                          </>
                        )}
                      </label>
                    </div>
                    {editing && !form.profile_image && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                        Leave empty to keep current image
                      </p>
                    )}
                  </div>

                  {/* Form Fields */}
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                        Customer Name *
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="Enter customer name"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                        Course (optional)
                      </label>
                      <select
                        value={form.course_id}
                        onChange={(e) => setForm(f => ({ ...f, course_id: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        disabled={submitting}
                      >
                        <option value="">All Courses / Not specific</option>
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                        Testimonial Message *
                      </label>
                      <textarea
                        value={form.message}
                        onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                        placeholder="Share what the customer said about your service..."
                        disabled={submitting}
                      />
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {form.message.length} characters (minimum 10)
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                          Rating
                        </label>
                        <select
                          value={form.rating}
                          onChange={(e) => setForm(f => ({ ...f, rating: Number(e.target.value) }))}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          disabled={submitting}
                        >
                          {[5, 4, 3, 2, 1].map(r => (
                            <option key={r} value={r}>
                              {r} Star{r !== 1 ? 's' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${form.status ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-200 dark:bg-gray-600'}`}>
                            {form.status ? (
                              <Eye className="w-5 h-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <EyeOff className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium dark:text-white">Status</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {form.status ? "Visible" : "Hidden"}
                            </p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.status}
                            onChange={(e) => setForm(f => ({ ...f, status: e.target.checked }))}
                            className="sr-only peer"
                            disabled={submitting}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                    setForm(emptyForm);
                  }}
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={submitForm}
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-600 text-white font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {editing ? "Updating..." : "Creating..."}
                    </>
                  ) : editing ? (
                    <>
                      <Check className="w-4 h-4" />
                      Update Testimonial
                    </>
                  ) : (
                    "Create Testimonial"
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && toDelete && (
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
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                  <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold dark:text-white mb-2">
                  Delete Testimonial
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to delete the testimonial from{" "}
                  <strong className="text-gray-900 dark:text-white">{toDelete.name}</strong>?
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex justify-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex-1"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={deleteTestimonial}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-medium flex-1"
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}