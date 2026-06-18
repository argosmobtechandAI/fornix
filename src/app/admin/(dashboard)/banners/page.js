"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit3,
  Trash2,
  Image as ImageIcon,
  Link as LinkIcon,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Upload,
  Loader2,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function BannersManager() {
  const [banners, setBanners] = useState([]);
  const [courses, setCourses] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);

  const [form, setForm] = useState({
    image: null,
    url: "",
    status: true,
    course_id: "",
  });

  const [previewImage, setPreviewImage] = useState(null);

  const [courseFilter, setCourseFilter] = useState("");

  const loadCourses = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/courses");
      const json = await res.json();
      if (json.success) {
        setCourses(json.data || []);
      }
    } catch (err) {
      console.error("Error loading courses for banners:", err);
    }
  }, []);

  // Fetch banners with pagination
  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    loadBanners();
  }, [pagination.currentPage, courseFilter]);

  // Load banners API
  const loadBanners = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.currentPage),
        limit: "9",
        ...(courseFilter && { course_id: courseFilter }),
      });

      const response = await fetch(
        `/api/admin/banners/list?${params.toString()}`
      );
      const data = await response.json();
      
      if (data.success) {
        setBanners(data.banners);
        setPagination({
          currentPage: data.currentPage || 1,
          totalPages: Math.ceil(data.total / 9),
          totalItems: data.total,
        });
      } else {
        toast.error(data.error || "Failed to load banners");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Open form for create/edit
  const openForm = (banner = null) => {
    if (banner) {
      setEditingBanner(banner);
      setForm({
        image: null,
        url: banner.url,
        status: banner.status,
        course_id: banner.course_id || "",
      });
      setPreviewImage(banner.image_url);
    } else {
      setEditingBanner(null);
      setForm({ image: null, url: "", status: true, course_id: "" });
      setPreviewImage(null);
    }
    setShowForm(true);
  };

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm((prev) => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Create / Update
  const handleSubmit = async () => {
    // if (!form.url.trim()) {
    //   toast.error("Please enter a valid URL");
    //   return;
    // }

    if (!editingBanner && !form.image) {
      toast.error("Please select an image");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading(
      editingBanner ? "Updating banner..." : "Creating banner..."
    );

    try {
      const formData = new FormData();
      if (form.image) formData.append("image", form.image);
      formData.append("url", form.url.trim());
      formData.append("status", form.status);
      if (form.course_id) formData.append("course_id", form.course_id);

      let endpoint = "/api/admin/banners/create";
      let method = "POST";

      if (editingBanner) {
        endpoint = "/api/admin/banners/update";
        formData.append("id", editingBanner.id);
        method = "PUT";
      }

      const response = await fetch(endpoint, { method, body: formData });
      const data = await response.json();

      if (data.success) {
        toast.success(
          editingBanner ? "Banner updated successfully!" : "Banner created successfully!",
          { duration: 3000 }
        );
        setShowForm(false);
        loadBanners();
      } else {
        toast.error(data.error || "Operation failed");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
      toast.dismiss(toastId);
    }
  };

  // Delete Banner with confirmation
  const deleteBanner = async (banner) => {
    if (!confirm(`Are you sure you want to delete this banner?`)) return;

    const toastId = toast.loading("Deleting banner...");
    
    try {
      const res = await fetch("/api/admin/banners/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: banner.id }),
      });

      const data = await res.json();
      
      if (data.success) {
        toast.success("Banner deleted successfully", { duration: 3000 });
        loadBanners();
      } else {
        toast.error(data.error || "Failed to delete banner");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      toast.dismiss(toastId);
    }
  };

  // Pagination controls
  const changePage = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: page }));
    }
  };

  // Loading skeleton
  const renderSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="p-4 rounded-xl border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 animate-pulse">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-lg w-full h-48"></div>
          <div className="mt-4 space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="flex justify-between">
              <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex gap-2">
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
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

      {/* Main Container */}
      <div className=" mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent">
                Banner Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage promotional banners and their visibility
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <select
                value={courseFilter}
                onChange={(e) => {
                  setCourseFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, currentPage: 1 }));
                }}
                className="px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-w-[180px]"
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => openForm(null)}
                className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl flex items-center gap-3 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
                <span className="font-semibold">Add New Banner</span>
              </motion.button>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Banners</p>
              <p className="text-2xl font-bold dark:text-white mt-1">{pagination.totalItems}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Active Banners</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                {banners.filter(b => b.status).length}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow border border-gray-200 dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Page {pagination.currentPage}</p>
              <p className="text-2xl font-bold dark:text-white mt-1">
                {banners.length} Displayed
              </p>
            </div>
          </div>
        </div>

        {/* Banner Grid */}
        {loading ? (
          renderSkeleton()
        ) : banners.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-24 h-24 mx-auto mb-4 text-gray-400">
              <ImageIcon className="w-full h-full opacity-50" />
            </div>
            <h3 className="text-xl font-semibold dark:text-white mb-2">No banners yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Get started by creating your first banner</p>
            <button
              onClick={() => openForm(null)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Create First Banner
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {banners.map((banner) => (
                <motion.div
                  key={banner.id}
                  layoutId={banner.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  whileHover={{ y: -5 }}
                  className="group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300"
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={banner.image_url}
                      alt="Banner"
                      className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {!banner.status && (
                      <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
                        <span className="px-3 py-1 bg-gray-800 text-white rounded-full text-sm font-medium flex items-center gap-2">
                          <EyeOff className="w-4 h-4" /> Inactive
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <LinkIcon className="w-4 h-4 text-blue-500" />
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        {banner.url}
                      </p>
                    </div>

                    <div className="flex justify-between items-center mb-2">
                      <span
                        className={`px-3 py-1.5 text-xs font-medium rounded-full flex items-center gap-1.5 ${
                          banner.status
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {banner.status ? (
                          <>
                            <Eye className="w-3.5 h-3.5" /> Active
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" /> Inactive
                          </>
                        )}
                      </span>

                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => openForm(banner)}
                          className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                          title="Edit banner"
                        >
                          <Edit3 className="w-4 h-4" />
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => deleteBanner(banner)}
                          className="p-2.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                          title="Delete banner"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>

                    {banner.course_id && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Course: {courses.find((c) => c.id === banner.course_id)?.name || "Unknown"}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-10 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {(pagination.currentPage - 1) * 9 + 1} to{" "}
                  {Math.min(pagination.currentPage * 9, pagination.totalItems)} of{" "}
                  {pagination.totalItems} banners
                </div>
                
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => changePage(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </motion.button>

                  <div className="flex items-center gap-1">
                    {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => changePage(page)}
                          className={`w-10 h-10 rounded-xl font-medium ${
                            pagination.currentPage === page
                              ? "bg-blue-600 text-white"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => changePage(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Banner Modal */}
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
              className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold dark:text-white">
                    {editingBanner ? "Edit Banner" : "Create New Banner"}
                  </h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 mb-3">
                    Banner Image
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-8 text-center hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="banner-upload"
                    />
                    <label
                      htmlFor="banner-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      {previewImage ? (
                        <div className="relative w-full max-w-xs mx-auto">
                          <img
                            src={previewImage}
                            alt="Preview"
                            className="rounded-lg w-full h-48 object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                            <Upload className="w-8 h-8 text-white" />
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-12 h-12 text-gray-400 mb-4" />
                          <p className="text-gray-600 dark:text-gray-400 mb-2">
                            Click to upload image
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-500">
                            PNG, JPG, WEBP up to 5MB
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* URL Input */}
                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 mb-3">
                    Destination URL
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={form.url}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, url: e.target.value }))
                      }
                      placeholder="https://example.com/promotion"
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Course Select */}
                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 mb-3">
                    Course (optional)
                  </label>
                  <select
                    value={form.course_id}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, course_id: e.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">Select course (optional)</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`p-1 rounded-full ${form.status ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-200 dark:bg-gray-600'}`}>
                      {form.status ? (
                        <Eye className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <EyeOff className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium dark:text-white">Banner Status</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {form.status ? "Visible to users" : "Hidden from users"}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.status}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, status: e.target.checked }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {editingBanner ? "Updating..." : "Creating..."}
                    </>
                  ) : editingBanner ? (
                    <>
                      <Check className="w-4 h-4" />
                      Update Banner
                    </>
                  ) : (
                    "Create Banner"
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}