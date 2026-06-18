"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Save,
    Loader2,
    Eye,
    EyeOff,
    CheckCircle2,
    ShieldCheck,
    Clock,
    History,
    User,
    Key
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function AdminProfile() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [activeTab, setActiveTab] = useState("profile"); // "profile" or "logs"
    const [auditLogs, setAuditLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    const [form, setForm] = useState({
        full_name: "",
        email: "",
        password: ""
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await fetch("/api/admin/profile");
            const json = await res.json();

            if (json.success && json.data) {
                setForm({
                    full_name: json.data.full_name || "",
                    email: json.data.email || "",
                    password: ""
                });
            } else {
                toast.error(json.error || "Failed to load profile");
            }
        } catch (err) {
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    };

    const fetchAuditLogs = async () => {
        setLoadingLogs(true);
        try {
            const res = await fetch("/api/admin/profile?logs=true");
            const json = await res.json();
            if (json.success) {
                setAuditLogs(json.data || []);
            }
        } catch (err) {
            toast.error("Failed to load audit logs");
        } finally {
            setLoadingLogs(false);
        }
    };

    useEffect(() => {
        if (activeTab === "logs") {
            fetchAuditLogs();
        }
    }, [activeTab]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.full_name?.trim()) {
            toast.error("Name is required");
            return;
        }

        if (!form.email?.trim()) {
            toast.error("Email is required");
            return;
        }

        if (form.password && form.password.length < 6) {
            toast.error("New password must be at least 6 characters");
            return;
        }

        setSubmitting(true);
        const toastId = toast.loading("Updating profile credentials...");

        try {
            const res = await fetch("/api/admin/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    full_name: form.full_name,
                    email: form.email,
                    password: form.password
                })
            });

            const json = await res.json();

            if (json.success) {
                toast.success("Profile & credentials updated successfully!");
                setForm(prev => ({ ...prev, password: "" })); // Clear password field
            } else {
                toast.error(json.error || "Failed to update profile");
            }

        } catch (err) {
            toast.error("Network error");
        } finally {
            setSubmitting(false);
            toast.dismiss(toastId);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 px-2 sm:px-4 lg:px-4 w-full space-y-6">
            <Toaster position="top-right" />

            {/* Top Dashboard Header */}
            <div className="max-w-full mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                        <ShieldCheck className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Profile & Security</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Manage your super admin credentials, email ID, password, and view audit history</p>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-900 p-1.5 rounded-xl self-stretch md:self-auto">
                    <button
                        onClick={() => setActiveTab("profile")}
                        className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${activeTab === "profile"
                            ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            }`}
                    >
                        <User className="w-4 h-4" />
                        Credentials
                    </button>
                    <button
                        onClick={() => setActiveTab("logs")}
                        className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${activeTab === "logs"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            }`}
                    >
                        <History className="w-4 h-4" />
                        Audit Logs
                    </button>
                </div>
            </div>

            <div className="max-w-full mx-auto">
                <AnimatePresence mode="wait">
                    {activeTab === "profile" ? (
                        <motion.form
                            key="profile"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            onSubmit={handleSubmit}
                            className="space-y-6"
                        >
                            {/* Main Details */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white pb-4 border-b border-gray-100 dark:border-gray-700 mb-6 flex items-center gap-2">
                                    <User className="w-5 h-5 text-blue-500" /> Personal & Login Details
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            value={form.full_name}
                                            onChange={e => setForm({ ...form, full_name: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                            placeholder="Enter your name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            Account Email (Login ID)
                                        </label>
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={e => setForm({ ...form, email: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                            placeholder="admin@example.com"
                                            required
                                        />
                                        <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Editable login email ID
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Security Card */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 p-6 md:p-8 space-y-6">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white pb-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                                    <Key className="w-5 h-5 text-red-500" /> Security & Password
                                </h2>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Change Password
                                    </label>
                                    <div className="relative max-w-md">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={form.password}
                                            onChange={e => setForm({ ...form, password: e.target.value })}
                                            className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            placeholder="Leave blank to keep current password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        If you enter a new password, it will take effect immediately upon saving and will be recorded in the audit log.
                                    </p>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end pt-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    disabled={submitting}
                                    type="submit"
                                    className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-50 text-sm"
                                >
                                    {submitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Save className="w-5 h-5" />
                                    )}
                                    Save Profile & Credentials
                                </motion.button>
                            </div>
                        </motion.form>
                    ) : (
                        <motion.div
                            key="logs"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8 space-y-6"
                        >
                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <History className="w-5 h-5 text-blue-500" /> Security Audit Log History
                                </h2>
                                <button
                                    onClick={fetchAuditLogs}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    {loadingLogs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                                    Refresh Logs
                                </button>
                            </div>

                            {loadingLogs ? (
                                <div className="flex justify-center items-center py-20">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                </div>
                            ) : auditLogs.length === 0 ? (
                                <div className="text-center py-16 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <ShieldCheck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">No security audit logs found</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Audit events will appear here when credentials or profiles are updated.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {auditLogs.map((log, i) => (
                                        <div key={log.id || i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-700/60 gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${log.action === "UPDATED_CREDENTIALS"
                                                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                        }`}>
                                                        {log.action}
                                                    </span>
                                                    <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                                        {log.admin_email}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-600 dark:text-gray-300 font-medium pt-0.5">
                                                    Changes: <span className="font-bold text-gray-800 dark:text-gray-200">{log.details}</span>
                                                </p>
                                            </div>

                                            <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center text-[11px] text-gray-500 font-medium pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200 dark:border-gray-700">
                                                <span>{new Date(log.created_at).toLocaleString()}</span>
                                                <span className="bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded text-[10px] font-mono mt-0.5">
                                                    IP: {log.ip_address || "127.0.0.1"}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
