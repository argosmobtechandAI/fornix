"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
    Plus,
    Edit2,
    Trash2,
    Search,
    Building,
    Users,
    Loader2,
    CheckCircle,
    XCircle,
    X,
    BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Simple Modal Component
function Modal({ isOpen, onClose, children, title, size = "md" }) {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: "max-w-md",
        md: "max-w-xl",
        lg: "max-w-3xl",
        xl: "max-w-5xl",
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className={`relative w-full ${sizeClasses[size]} bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden`}
            >
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </motion.div>
        </div>
    );
}

export default function UniversitiesPage() {
    const [universities, setUniversities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUniversity, setEditingUniversity] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deactivatingId, setDeactivatingId] = useState(null);

    // Form State
    const [form, setForm] = useState({
        university_name: "",
        country: "",
        max_students: 50,
        email: "",
        password: "",
        contact_details: "",
        assigned_courses: [], // Will be populated with Plan IDs
        year_wise_limits: {} // e.g. {"1st Year": 50, "2nd Year": 30}
    });

    // Course and Plan Options
    const [courses, setCourses] = useState([]);
    const [plans, setPlans] = useState([]);

    // Countries & Colleges
    const [countries, setCountries] = useState([]);

    // Create new college inline
    const [showNewCollege, setShowNewCollege] = useState(false);
    const [newCollegeName, setNewCollegeName] = useState("");
    const [newCollegeCity, setNewCollegeCity] = useState("");
    const [creatingCollege, setCreatingCollege] = useState(false);

    const handleCreateCollege = async () => {
        if (!newCollegeName.trim()) return toast.error("University/college name is required");
        if (!form.country) return toast.error("Please select a country first");

        const selectedCountry = countries.find(c => c.name === form.country);
        if (!selectedCountry) return toast.error("Country not found");

        setCreatingCollege(true);
        try {
            const res = await fetch("/api/admin/countries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "create_college",
                    country_id: selectedCountry.id,
                    name: newCollegeName.trim(),
                    city: newCollegeCity.trim() || null,
                }),
            });
            const json = await res.json();
            if (json.success) {
                toast.success("New college added successfully!");
                setForm(prev => ({ ...prev, university_name: newCollegeName.trim() }));
                setShowNewCollege(false);
                setNewCollegeName("");
                setNewCollegeCity("");
                // Refresh countries to include new college
                await fetchCountries();
            } else {
                toast.error(json.error || "Failed to create college");
            }
        } catch (err) {
            toast.error("Network error creating college");
        } finally {
            setCreatingCollege(false);
        }
    };

    const fetchUniversities = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/universities");
            const json = await res.json();
            if (json.success) {
                setUniversities(json.data || []);
            } else {
                toast.error("Failed to load universities");
            }
        } catch (err) {
            toast.error("Error loading universities");
        } finally {
            setLoading(false);
        }
    };

    const fetchCountries = async () => {
        try {
            const res = await fetch("/api/admin/countries");
            const json = await res.json();
            if (json.success && json.data) {
                setCountries(json.data);
            }
        } catch (err) {
            console.error("Failed to load countries");
        }
    };

    const fetchCourses = async () => {
        try {
            const res = await fetch("/api/admin/courses");
            const json = await res.json();
            if (json.success && json.data) {
                setCourses(json.data);
            }
        } catch (err) {
            console.error("Failed to load courses");
        }
    };

    const fetchPlans = async () => {
        try {
            const res = await fetch("/api/admin/plans/get?limit=100");
            const json = await res.json();
            if (json.success && json.plans) {
                setPlans(json.plans);
            }
        } catch (err) {
            console.error("Failed to load plans");
        }
    };

    useEffect(() => {
        fetchUniversities();
        fetchCourses();
        fetchPlans();
        fetchCountries();
    }, []);

    const openModal = (uni = null) => {
        if (uni) {
            setEditingUniversity(uni);
            setForm({
                university_name: uni.university_name || "",
                country: uni.country || "",
                max_students: uni.max_students || 50,
                email: uni.user?.email || "",
                password: "", // Leave blank on edit unless changing
                contact_details: uni.contact_details || "",
                assigned_courses: uni.assigned_courses || [],
                year_wise_limits: uni.year_wise_limits || {}
            });
        } else {
            setEditingUniversity(null);
            setForm({
                university_name: "",
                country: "",
                max_students: 50,
                email: "",
                password: "",
                contact_details: "",
                assigned_courses: [],
                year_wise_limits: {}
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUniversity(null);
    };

    const handleTogglePlan = (planId) => {
        setForm(prev => {
            const isSelected = prev.assigned_courses.includes(planId);
            if (isSelected) {
                return { ...prev, assigned_courses: prev.assigned_courses.filter(id => id !== planId) };
            } else {
                return { ...prev, assigned_courses: [...prev.assigned_courses, planId] };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const url = editingUniversity
                ? `/api/admin/universities/${editingUniversity.id}`
                : "/api/admin/universities";
            const method = editingUniversity ? "PUT" : "POST";

            const payload = { ...form };
            // If editing and password is empty, we typically don't update it in this simple flow, 
            // but our PUT endpoint doesn't handle password anyway. So we just pass it along.

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (json.success) {
                toast.success(editingUniversity ? "University updated" : "University created");
                fetchUniversities();
                closeModal();
            } else {
                toast.error(json.error || "Operation failed");
            }
        } catch (err) {
            toast.error("Network error");
        } finally {
            setSaving(false);
        }
    };

    const handleDeactivate = async (id) => {
        if (!confirm("Are you sure you want to deactivate this university account?")) return;

        setDeactivatingId(id);
        try {
            const res = await fetch(`/api/admin/universities/${id}`, { method: "DELETE" });
            const json = await res.json();
            if (json.success) {
                toast.success("University deactivated");
                fetchUniversities();
            } else {
                toast.error(json.error || "Failed to deactivate");
            }
        } catch (err) {
            toast.error("Network error");
        } finally {
            setDeactivatingId(null);
        }
    };

    const filtered = universities.filter(u =>
        u.university_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.user?.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-6 lg:p-8">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg">
                            <Building className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                                Universities
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Manage onboarded universities and their access limits
                            </p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md"
                >
                    <Plus className="w-5 h-5" /> Add University
                </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-800">
                    <p className="text-gray-500 text-sm font-medium">Total Universities</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{universities.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-800">
                    <p className="text-gray-500 text-sm font-medium">Active Accounts</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">{universities.filter(u => u.is_active).length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-800">
                    <p className="text-gray-500 text-sm font-medium">Total Allowed Students</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">
                        {universities.reduce((acc, u) => acc + (u.max_students || 0), 0)}
                    </p>
                </div>
            </div>

            {/* Search and Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search universities by name, country, or email..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">University Info</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Limits</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-500">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Loading...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-8 text-center text-gray-500">
                                        No universities found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(uni => (
                                    <tr key={uni.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-900 dark:text-white">{uni.university_name}</p>
                                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                                <Building className="w-3 h-3" /> {uni.country}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{uni.user?.email}</p>
                                            <p className="text-xs text-gray-500">{uni.user?.phone || uni.contact_details}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-medium">
                                                    <Users className="w-3 h-3 inline mr-1" />
                                                    {uni.max_students} Max
                                                </span>
                                                <span className="px-2.5 py-1 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-full text-xs font-medium" title="Assigned Courses">
                                                    <BookOpen className="w-3 h-3 inline mr-1" />
                                                    {uni.assigned_courses?.length || 0} Courses
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {uni.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                                                    <CheckCircle className="w-3.5 h-3.5" /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-100 dark:border-red-800">
                                                    <XCircle className="w-3.5 h-3.5" /> Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openModal(uni)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 bg-white hover:bg-blue-50 rounded-xl transition-all shadow-xs border border-gray-100"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                {uni.is_active && (
                                                    <button
                                                        onClick={() => handleDeactivate(uni.id)}
                                                        disabled={deactivatingId === uni.id}
                                                        className="p-2 text-gray-400 hover:text-red-600 bg-white hover:bg-red-50 rounded-xl transition-all shadow-xs border border-gray-100 disabled:opacity-50"
                                                    >
                                                        {deactivatingId === uni.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Form */}
            <AnimatePresence>
                <Modal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    title={editingUniversity ? "Edit University" : "Onboard New University"}
                    size="lg"
                >
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Left Column - General Info */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-900 dark:text-white border-b pb-2">Institution Details</h4>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                    <select
                                        value={form.country}
                                        onChange={e => { setForm({ ...form, country: e.target.value, university_name: "" }); setShowNewCollege(false); setNewCollegeName(""); setNewCollegeCity(""); }}
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Select Country</option>
                                        {countries.map(c => (
                                            <option key={c.id} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">University Name</label>
                                    {showNewCollege ? (
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={newCollegeName}
                                                onChange={e => setNewCollegeName(e.target.value)}
                                                placeholder="Enter university/college name"
                                                autoFocus
                                                className="w-full px-4 py-2.5 rounded-xl border border-blue-300 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <input
                                                type="text"
                                                value={newCollegeCity}
                                                onChange={e => setNewCollegeCity(e.target.value)}
                                                placeholder="City (optional)"
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleCreateCollege}
                                                    disabled={creatingCollege || !newCollegeName.trim()}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                                >
                                                    {creatingCollege ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                                    Save
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setShowNewCollege(false); setNewCollegeName(""); setNewCollegeCity(""); }}
                                                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <select
                                                value={form.university_name}
                                                onChange={e => {
                                                    if (e.target.value === "__CREATE_NEW__") {
                                                        setShowNewCollege(true);
                                                        return;
                                                    }
                                                    setForm({ ...form, university_name: e.target.value });
                                                }}
                                                required
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
                                                disabled={!form.country}
                                            >
                                                <option value="">{form.country ? "Select University/College" : "Select a country first"}</option>
                                                {form.country && (
                                                    <option value="__CREATE_NEW__" className="text-blue-600 font-medium">➕ Add New University/College</option>
                                                )}
                                                {form.country && countries.find(c => c.name === form.country)?.colleges?.map(college => (
                                                    <option key={college.id} value={college.name}>{college.name}{college.city ? `, ${college.city}` : ""}</option>
                                                ))}
                                            </select>
                                            {form.country && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Can&apos;t find it? Select &quot;➕ Add New&quot; from dropdown above.
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Max No. of Students</label>
                                    <input
                                        type="number"
                                        value={form.max_students}
                                        onChange={e => setForm({ ...form, max_students: parseInt(e.target.value) || 0 })}
                                        required
                                        min={1}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone Details</label>
                                    <input
                                        type="text"
                                        value={form.contact_details}
                                        onChange={e => setForm({ ...form, contact_details: e.target.value })}
                                        placeholder="+1 234 567 8900"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Right Column - Auth & Courses */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-900 dark:text-white border-b pb-2">Login Credentials</h4>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email ID</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        required
                                        disabled={!!editingUniversity}
                                        placeholder="admin@university.edu"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                    />
                                    {editingUniversity && <p className="text-xs text-gray-500 mt-1">Email cannot be changed after creation.</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <input
                                        type="password"
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        required={!editingUniversity}
                                        placeholder={editingUniversity ? "Leave blank to keep same" : "Secure password"}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <h4 className="font-semibold text-gray-900 dark:text-white border-b pb-2 pt-4">Assigned Plan Catalog</h4>
                                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-gray-50 custom-scrollbar">
                                    {plans.length === 0 ? (
                                        <p className="text-sm text-gray-500 italic">No plans available.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {plans.map(plan => {
                                                const relatedCourse = courses.find(c => c.id === plan.course_id);
                                                return (
                                                    <label key={plan.id} className="flex items-start gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-blue-100 shadow-xs">
                                                        <input
                                                            type="checkbox"
                                                            checked={form.assigned_courses.includes(plan.id)}
                                                            onChange={() => handleTogglePlan(plan.id)}
                                                            className="mt-1 rounded text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-gray-900">{plan.name}</p>
                                                            <p className="text-xs text-gray-500 truncate mt-0.5">
                                                                {relatedCourse ? `Course: ${relatedCourse.name}` : "Unknown Course"} • {plan.duration_in_days} days
                                                            </p>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Select the plans this university can assign to its students.</p>

                                {/* FMGE Year-wise Limits */}
                                {(() => {
                                    const FMGE_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Final Year"];
                                    const hasFMGEPlan = form.assigned_courses.some(planId => {
                                        const plan = plans.find(p => p.id === planId);
                                        const course = plan ? courses.find(c => c.id === plan.course_id) : null;
                                        return course && course.name.toUpperCase().includes("FMGE");
                                    });
                                    if (!hasFMGEPlan) return null;
                                    return (
                                        <div className="mt-4">
                                            <h4 className="font-semibold text-gray-900 dark:text-white border-b pb-2">FMGE Year-wise Student Limits</h4>
                                            <p className="text-xs text-gray-500 mt-1 mb-3">Set max students allowed per academic year for FMGE.</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                {FMGE_YEARS.map(year => (
                                                    <div key={year}>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">{year}</label>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={form.year_wise_limits?.[year] || ""}
                                                            onChange={e => setForm(prev => ({
                                                                ...prev,
                                                                year_wise_limits: {
                                                                    ...prev.year_wise_limits,
                                                                    [year]: parseInt(e.target.value) || 0
                                                                }
                                                            }))}
                                                            placeholder="0"
                                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="px-6 py-2.5 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving || (form.assigned_courses.length === 0)}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                {editingUniversity ? "Update University" : "Sign Up University"}
                            </button>
                        </div>
                        {form.assigned_courses.length === 0 && (
                            <p className="text-xs text-red-500 text-right">Please select at least one plan to assign.</p>
                        )}
                    </form>
                </Modal>
            </AnimatePresence>
        </div>
    );
}
