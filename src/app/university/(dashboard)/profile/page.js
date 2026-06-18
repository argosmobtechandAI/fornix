"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Save,
    Camera,
    Loader2,
    Eye,
    EyeOff,
    CheckCircle2
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function UniversityProfile() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [form, setForm] = useState({
        university_name: "",
        country: "",
        contact_details: "",
        email: "",
        password: ""
    });

    const [logoPreview, setLogoPreview] = useState(null);
    const [newLogo, setNewLogo] = useState(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await fetch("/api/university/profile");
            const json = await res.json();

            if (json.success && json.data) {
                setForm({
                    university_name: json.data.university_name || "",
                    country: json.data.country || "",
                    contact_details: json.data.contact_details || "",
                    email: json.data.email || "",
                    password: ""
                });

                if (json.data.logo_url) {
                    setLogoPreview(json.data.logo_url);
                }
            } else {
                toast.error(json.error || "Failed to load profile");
            }
        } catch (err) {
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error("Logo must be under 2MB");
                return;
            }
            setNewLogo(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.email.trim()) {
            toast.error("Email is required");
            return;
        }

        if (form.password && form.password.length < 6) {
            toast.error("New password must be at least 6 characters");
            return;
        }

        setSubmitting(true);
        const toastId = toast.loading("Updating profile...");

        try {
            const formData = new FormData();
            formData.append("contact_details", form.contact_details);
            formData.append("email", form.email);

            if (form.password) {
                formData.append("password", form.password);
            }

            if (newLogo) {
                formData.append("logo", newLogo);
            }

            const res = await fetch("/api/university/profile", {
                method: "PUT",
                body: formData
            });

            const json = await res.json();

            if (json.success) {
                toast.success("Profile updated successfully!");
                if (json.logo_url) {
                    setLogoPreview(json.logo_url);
                }
                setForm(prev => ({ ...prev, password: "" })); // Clear password field
                setNewLogo(null);
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
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 px-4">
            <Toaster position="top-right" />

            <div className="max-w-full mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
                        University Profile
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Manage your institution's details, logo, and login credentials.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Header Card (Logo & Main Info) */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8">
                        <div className="flex flex-col md:flex-row gap-8 items-start">

                            {/* Logo Upload */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative group rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 w-32 h-32 flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors hover:border-amber-500">
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-gray-400 flex flex-col items-center">
                                            <Camera className="w-8 h-8 mb-1" />
                                            <span className="text-xs">No Logo</span>
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm cursor-pointer">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            title="Upload new logo"
                                        />
                                        <Camera className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">University Logo</p>
                                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</p>
                                </div>
                            </div>

                            {/* Main Details */}
                            <div className="flex-1 space-y-5 w-full">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        University Name
                                    </label>
                                    <div className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 font-medium">
                                        {form.university_name || (loading ? "Loading..." : "N/A")}
                                    </div>
                                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1.5 flex items-center gap-1">
                                        Cannot be changed directly
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Country / Location
                                    </label>
                                    <div className="w-full px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 font-medium">
                                        {form.country || (loading ? "Loading..." : "N/A")}
                                    </div>
                                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1.5 flex items-center gap-1">
                                        Cannot be changed directly
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact & Contact Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8 space-y-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white pb-4 border-b border-gray-100 dark:border-gray-700">
                            Contact Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Account Email (Login ID)
                                </label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                                    placeholder="university@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Contact Details / Phone
                                </label>
                                <input
                                    type="text"
                                    value={form.contact_details}
                                    onChange={e => setForm({ ...form, contact_details: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                                    placeholder="+1 234 567 8900"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Security Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 p-6 md:p-8 space-y-6">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white pb-4 border-b border-gray-100 dark:border-gray-700">
                            Security & Password
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
                                    className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                                    placeholder="Leave blank to keep current"
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
                                If you enter a new password, it will be updated immediately upon saving.
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
                            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-orange-500/20 transition-all disabled:opacity-50"
                        >
                            {submitting ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            Save Changes
                        </motion.button>
                    </div>

                </form>
            </div>
        </div>
    );
}
