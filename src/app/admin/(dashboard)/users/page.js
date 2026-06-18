"use client";

import React, { useEffect, useState, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Users,
  Image as ImageIcon,
  Check,
  CheckSquare,
  Square,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  Grid,
  List,
  Mail,
  Phone,
  UserCheck,
  UserX,
  Shield,
  Loader2,
  Upload,
  Star,
  Calendar,
  Eye,
  EyeOff,
  Key,
} from "lucide-react";

const VALID_ROLES = [
  { value: "admin", label: "Admin", color: "bg-red-500", icon: Shield },
  { value: "doctor", label: "Doctor", color: "bg-blue-500", icon: UserCheck },
  { value: "user", label: "User", color: "bg-green-500", icon: Users },
];

export default function ManageUsersPage() {
  // Data state
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // UI state
  const [viewMode, setViewMode] = useState("card");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showPictureModal, setShowPictureModal] = useState(false);
  const [pictureUser, setPictureUser] = useState(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Form states
  const emptyCreateForm = {
    full_name: "",
    email: "",
    phone: "",
    role: "user",
    password: "",
    is_active: true,
  };
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [showPassword, setShowPassword] = useState(false);

  const emptyEditForm = {
    id: null,
    full_name: "",
    email: "",
    phone: "",
    role: "user",
    is_active: true,
  };
  const [editForm, setEditForm] = useState(emptyEditForm);

  // Picture upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);

  // Load users with debounce
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(roleFilter !== "all" && { role: roleFilter }),
      });

      const res = await fetch(`/api/admin/users/get?${params}`);
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Failed to load users");
        setUsers([]);
        setTotal(0);
      } else {
        setUsers(json.users || []);
        setTotal(json.pagination?.total || json.total || 0);
        setTotalPages(Math.max(1, Math.ceil((json.pagination?.total || json.total || 0) / limit)));
      }
    } catch (err) {
      console.error("Error loading users:", err);
      toast.error("Network error while loading users");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, roleFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 400);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  // Pagination
  const goToPage = (pageNum) => {
    if (pageNum < 1 || pageNum > totalPages) return;
    setPage(pageNum);
  };

  // Validators
  const emailIsValid = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneIsValid = (phone) => /^[0-9]{10,15}$/.test(phone);

  // Create user
  const handleCreateSubmit = async (e) => {
    e?.preventDefault?.();

    if (!createForm.full_name.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!createForm.email || !emailIsValid(createForm.email)) {
      toast.error("Valid email is required");
      return;
    }
    if (!createForm.phone || !phoneIsValid(createForm.phone)) {
      toast.error("Phone must be 10-15 digits");
      return;
    }
    if (!createForm.password || createForm.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!VALID_ROLES.some(r => r.value === createForm.role)) {
      toast.error("Invalid role");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Creating user...");

    try {
      const res = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Create failed");
      } else {
        toast.success("User created successfully!");
        setShowCreateModal(false);
        setCreateForm(emptyCreateForm);
        loadUsers();
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
      toast.dismiss(toastId);
    }
  };

  // Open edit modal
  const openEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      id: user.id,
      full_name: user.full_name || "",
      email: user.email || "",
      phone: user.phone || "",
      role: user.role || "user",
      is_active: !!user.is_active,
    });
    setShowEditModal(true);
  };

  // Update user
  const handleEditSubmit = async (e) => {
    e?.preventDefault?.();

    if (!editForm.full_name.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!editForm.email || !emailIsValid(editForm.email)) {
      toast.error("Valid email is required");
      return;
    }
    if (!editForm.phone || !phoneIsValid(editForm.phone)) {
      toast.error("Phone must be 10-15 digits");
      return;
    }
    if (!VALID_ROLES.some(r => r.value === editForm.role)) {
      toast.error("Invalid role");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Updating user...");

    try {
      const res = await fetch("/api/admin/users/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Update failed");
      } else {
        toast.success("User updated successfully!");
        setShowEditModal(false);
        setEditingUser(null);
        loadUsers();
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
      toast.dismiss(toastId);
    }
  };

  // Delete user
  const askDelete = (user) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    setSubmitting(true);
    const toastId = toast.loading("Deleting user...");

    try {
      const res = await fetch(`/api/admin/users/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userToDelete.id }),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Delete failed");
      } else {
        toast.success("User deleted successfully!");
        setShowDeleteConfirm(false);
        setUserToDelete(null);
        loadUsers();
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
      toast.dismiss(toastId);
    }
  };

  // Handle picture upload
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP, and GIF images are allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUploadPicture = async (e) => {
    e?.preventDefault?.();
    if (!pictureUser || !selectedFile) {
      toast.error("Please select an image");
      return;
    }

    setUploadingPicture(true);
    const toastId = toast.loading("Uploading profile picture...");

    try {
      const formData = new FormData();
      formData.append("id", pictureUser.id);
      formData.append("profile_picture", selectedFile);

      const res = await fetch("/api/admin/users/update-picture", {
        method: "PUT",
        body: formData,
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Upload failed");
      } else {
        toast.success("Profile picture updated successfully!");
        setShowPictureModal(false);
        setSelectedFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        loadUsers();
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setUploadingPicture(false);
      toast.dismiss(toastId);
    }
  };

  // Cleanup URL object
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Bulk selection helpers
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map(u => u.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    const toastId = toast.loading(`Deleting ${selectedIds.size} user(s)...`);

    try {
      const res = await fetch("/api/admin/users/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Bulk delete failed");
      } else {
        toast.success(json.message || "Users deleted");
        setSelectedIds(new Set());
        setShowBulkDeleteConfirm(false);
        loadUsers();
      }
    } catch (err) {
      toast.error("Network error during bulk delete");
    } finally {
      setBulkDeleting(false);
      toast.dismiss(toastId);
    }
  };

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [search, statusFilter, roleFilter, page, limit]);
  const activeCount = users.filter(u => u.is_active).length;
  const adminCount = users.filter(u => u.role === "admin").length;
  const doctorCount = users.filter(u => u.role === "doctor").length;

  // Loading skeleton
  const renderSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              <div className="flex gap-2">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-20" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-20" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-20" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Role badge component
  const RoleBadge = ({ role }) => {
    const roleInfo = VALID_ROLES.find(r => r.value === role) || VALID_ROLES[2];
    const Icon = roleInfo.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : role === 'doctor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
        <Icon className="w-3 h-3" />
        {roleInfo.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-3">
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
                User Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage all system users, roles, and permissions
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
              {/* Filters and Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm w-full sm:w-64"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm cursor-pointer"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admins Only</option>
                  <option value="doctor">Doctors Only</option>
                  <option value="user">Users Only</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>

                <button
                  onClick={() => setViewMode(v => v === "card" ? "table" : "card")}
                  className="p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  title={`Switch to ${viewMode === "card" ? "list" : "card"} view`}
                >
                  {viewMode === "card" ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
                </button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Add User</span>
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
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold dark:text-white mt-1">{total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                  <p className="text-2xl font-bold dark:text-white mt-1">{activeCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Admins</p>
                  <p className="text-2xl font-bold dark:text-white mt-1">{adminCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <UserCheck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Doctors</p>
                  <p className="text-2xl font-bold dark:text-white mt-1">{doctorCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          renderSkeleton()
        ) : users.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-24 h-24 mx-auto mb-6 text-gray-400">
              <Users className="w-full h-full opacity-50" />
            </div>
            <h3 className="text-xl font-semibold dark:text-white mb-2">
              {search || statusFilter !== "all" ? "No matching users" : "No users yet"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Start by adding your first user to the system"
              }
            </p>
            {!search && statusFilter === "all" && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold"
              >
                Add First User
              </motion.button>
            )}
          </div>
        ) : viewMode === "card" ? (
          <>
            {/* Select All bar for card view */}
            <div className="flex items-center gap-3 mb-4 px-1">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {selectedIds.size === users.length && users.length > 0 ? (
                  <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
                {selectedIds.size === users.length && users.length > 0 ? "Deselect All" : "Select All"}
              </button>
              {selectedIds.size > 0 && (
                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  {selectedIds.size} selected
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {users.map((user) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -3, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.15)" }}
                  transition={{ duration: 0.2 }}
                  className={`relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden transition-all duration-300 group ${selectedIds.has(user.id) ? "ring-2 ring-blue-500 dark:ring-blue-400 shadow-blue-500/10 shadow-xl" : "shadow-md hover:shadow-xl border border-gray-200/80 dark:border-gray-700/80"}`}
                >
                  {/* Selection Checkbox - top left */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(user.id); }}
                    className="absolute top-3 left-3 z-10"
                  >
                    {selectedIds.has(user.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors" />
                    )}
                  </button>

                  {/* Status Indicator - top right */}
                  <div className="absolute top-3 right-3 z-10">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase backdrop-blur-sm ${user.is_active
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-gray-500/15 text-gray-500 dark:text-gray-400"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Top gradient banner */}
                  <div className={`h-20 w-full ${user.role === "admin" ? "bg-gradient-to-r from-red-500/10 via-rose-500/10 to-orange-500/10 dark:from-red-900/30 dark:via-rose-900/20 dark:to-orange-900/20" : user.role === "doctor" ? "bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-teal-500/10 dark:from-blue-900/30 dark:via-cyan-900/20 dark:to-teal-900/20" : "bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 dark:from-indigo-900/30 dark:via-purple-900/20 dark:to-blue-900/20"}`} />

                  {/* Avatar - overlapping the banner */}
                  <div className="flex justify-center -mt-10 relative z-10">
                    <div className={`w-20 h-20 rounded-2xl overflow-hidden shadow-lg ring-4 ${selectedIds.has(user.id) ? "ring-blue-200 dark:ring-blue-800" : "ring-white dark:ring-gray-800"} transition-all`}>
                      {user.profile_picture ? (
                        <img
                          src={user.profile_picture}
                          alt={user.full_name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                          <span className="text-white font-bold text-xl">{user.full_name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="px-5 pt-3 pb-4 text-center">
                    <h3 className="font-bold text-base text-gray-900 dark:text-white truncate">
                      {user.full_name}
                    </h3>
                    <div className="mt-1 mb-3">
                      <RoleBadge role={user.role} />
                    </div>

                    {/* Info rows */}
                    <div className="space-y-2 text-left bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3">
                      <div className="flex items-center gap-2.5 text-sm">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-gray-600 dark:text-gray-400 truncate text-xs">{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm">
                        <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                          <Phone className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-gray-600 dark:text-gray-400 truncate text-xs">{user.phone || "No phone"}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm">
                        <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                          <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="text-gray-600 dark:text-gray-400 text-xs">Joined {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="px-5 pb-4">
                    <div className="flex items-center justify-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => openEdit(user)}
                      className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                      title="Edit user"
                    >
                      <Edit3 className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowPictureModal(true) || setPictureUser(user)}
                      className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                      title="Update photo"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => askDelete(user)}
                      className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-4 w-12">
                      <button onClick={toggleSelectAll}>
                        {selectedIds.size === users.length && users.length > 0 ? (
                          <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role & Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user) => (
                    <tr key={user.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selectedIds.has(user.id) ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}>
                      <td className="px-4 py-4">
                        <button onClick={() => toggleSelect(user.id)}>
                          {selectedIds.has(user.id) ? (
                            <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-gray-700 dark:to-gray-800">
                            {user.profile_picture ? (
                              <img
                                src={user.profile_picture}
                                alt={user.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold dark:text-white">{user.full_name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              ID: {user.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="dark:text-gray-300">{user.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="dark:text-gray-300">{user.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <RoleBadge role={user.role} />
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${user.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                            }`}>
                            {user.is_active ? "Active" : "Inactive"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm dark:text-gray-300">
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(user.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => openEdit(user)}
                            className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                            title="Edit user"
                          >
                            <Edit3 className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setShowPictureModal(true) || setPictureUser(user)}
                            className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors"
                            title="Update photo"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => askDelete(user)}
                            className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                            title="Delete user"
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
        {users.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} users
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    const val = e.target.value === "all" ? total || 9999 : Number(e.target.value);
                    setLimit(val);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
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
                      className={`w-10 h-10 rounded-xl font-medium transition-colors ${page === pageNum
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
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
            )}
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => !submitting && (setShowCreateModal(false) || setCreateForm(emptyCreateForm) || setShowPassword(false))}
        title="Create New User"
        size="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={createForm.full_name}
                onChange={(e) => setCreateForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Enter full name"
                required
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Role *
              </label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm(f => ({ ...f, role: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={submitting}
              >
                {VALID_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="user@example.com"
                required
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={createForm.phone}
                onChange={(e) => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="10-15 digits"
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-2">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={createForm.password}
                onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none pr-10"
                placeholder="Minimum 6 characters"
                required
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${createForm.is_active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-200 dark:bg-gray-600'}`}>
                {createForm.is_active ? (
                  <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <UserX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                )}
              </div>
              <div>
                <p className="font-medium dark:text-white">Account Status</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {createForm.is_active ? "Active user can login" : "Inactive user cannot login"}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={createForm.is_active}
                onChange={(e) => setCreateForm(f => ({ ...f, is_active: e.target.checked }))}
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
              onClick={() => setShowCreateModal(false)}
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
                "Create User"
              )}
            </motion.button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => !submitting && (setShowEditModal(false) || setEditingUser(null))}
        title={`Edit User: ${editingUser?.full_name || ''}`}
        size="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={editForm.full_name}
                onChange={(e) => setEditForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Role *
              </label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm(f => ({ ...f, role: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                disabled={submitting}
              >
                {VALID_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${editForm.is_active ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-200 dark:bg-gray-600'}`}>
                {editForm.is_active ? (
                  <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <UserX className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                )}
              </div>
              <div>
                <p className="font-medium dark:text-white">Account Status</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {editForm.is_active ? "Active - Can login" : "Inactive - Cannot login"}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.is_active}
                onChange={(e) => setEditForm(f => ({ ...f, is_active: e.target.checked }))}
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
              onClick={() => setShowEditModal(false)}
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

      {/* Profile Picture Modal */}
      <Modal
        isOpen={showPictureModal}
        onClose={() => !uploadingPicture && (setShowPictureModal(false) || setPictureUser(null) || setSelectedFile(null) || (previewUrl && URL.revokeObjectURL(previewUrl)) || setPreviewUrl(null))}
        title={`Update Profile Picture: ${pictureUser?.full_name || ''}`}
        size="md"
      >
        <form onSubmit={handleUploadPicture} className="space-y-6">
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-48 h-48 rounded-2xl overflow-hidden border-4 border-gray-200 dark:border-gray-700">
              {previewUrl || pictureUser?.profile_picture ? (
                <img
                  src={previewUrl || pictureUser?.profile_picture}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                  <Users className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>

            <div className="text-center">
              <input
                type="file"
                id="profilePictureInput"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploadingPicture}
              />
              <label htmlFor="profilePictureInput">
                <div className="px-6 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-colors">
                  <div className="flex items-center justify-center gap-2">
                    <Upload className="w-5 h-5" />
                    <span className="font-medium">Choose New Image</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    JPG, PNG, WEBP, GIF • Max 5MB
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setShowPictureModal(false)}
              disabled={uploadingPicture}
              className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={uploadingPicture || !selectedFile}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {uploadingPicture ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload Picture"
              )}
            </motion.button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => !submitting && setShowDeleteConfirm(false)}
        title="Confirm Delete"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-bold dark:text-white mb-2">
            Delete User
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Are you sure you want to delete{" "}
            <strong className="text-gray-900 dark:text-white">{userToDelete?.full_name}</strong>?
            This action cannot be undone and will permanently remove the user from the system.
          </p>

          <div className="flex justify-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDeleteConfirm(false)}
              disabled={submitting}
              className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 flex-1"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDelete}
              disabled={submitting}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-medium flex-1"
            >
              {submitting ? "Deleting..." : "Delete User"}
            </motion.button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={showBulkDeleteConfirm}
        onClose={() => !bulkDeleting && setShowBulkDeleteConfirm(false)}
        title="Bulk Delete Users"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-bold dark:text-white mb-2">
            Delete {selectedIds.size} User{selectedIds.size > 1 ? "s" : ""}?
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This will permanently remove <strong className="text-gray-900 dark:text-white">{selectedIds.size}</strong> selected user{selectedIds.size > 1 ? "s" : ""} and their profile pictures. This action cannot be undone.
          </p>

          <div className="flex justify-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowBulkDeleteConfirm(false)}
              disabled={bulkDeleting}
              className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 flex-1"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-medium flex-1 flex items-center justify-center gap-2"
            >
              {bulkDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedIds.size} User${selectedIds.size > 1 ? "s" : ""}`
              )}
            </motion.button>
          </div>
        </div>
      </Modal>

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 dark:bg-gray-700 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-gray-700 dark:border-gray-600"
          >
            <span className="text-sm font-medium">
              {selectedIds.size} user{selectedIds.size > 1 ? "s" : ""} selected
            </span>
            <div className="w-px h-6 bg-gray-600" />
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              Clear
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
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
                  <X className="w-5 h-5" />
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