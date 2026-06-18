"use client";

import React, { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
    UserPlus,
    Mail,
    Phone,
    Lock,
    User,
    BookOpen,
    CreditCard,
    Calendar,
    AlertCircle,
    ArrowLeft,
    Search,
    Check,
    Building2,
    ChevronDown,
    MapPin
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AddStudentPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("new"); // "new" | "existing"
    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState([]);
    const [countries, setCountries] = useState([]);
    const [colleges, setColleges] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    // Custom dropdown states
    const [selectedCountry, setSelectedCountry] = useState("");
    const [searchCollege, setSearchCollege] = useState("");
    const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);

    // Search Existing User State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        // User fields
        full_name: "",
        email: "",
        phone: "",
        password: "",
        gender: "",
        role: "user",

        // Enrollment fields
        course_id: "",
        university_id: "",
        academic_year: "",
        plan_id: "",
        amount: "",
        payment_date: new Date().toISOString().split('T')[0],

        // Payment Details
        transaction_mode: "cash",
        transaction_id: ""
    });

    // Determine if the selected course is FMGE
    const [isFMGECourse, setIsFMGECourse] = useState(false);

    // Fetch Courses, Colleges, and Plans on Mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [coursesRes, countriesRes, plansRes] = await Promise.all([
                    fetch("/api/v1/mobile/courses"),
                    fetch("/api/admin/countries"),
                    fetch("/api/v1/mobile/courses?include_plans=1")
                ]);

                const coursesJson = await coursesRes.json();
                if (coursesJson.success) setCourses(coursesJson.data || []);

                const countriesJson = await countriesRes.json();
                if (countriesJson.success) {
                    setCountries(countriesJson.data || []);

                    const allColleges = [];
                    (countriesJson.data || []).forEach(country => {
                        if (country.colleges && country.colleges.length > 0) {
                            country.colleges.forEach(college => {
                                allColleges.push({
                                    ...college,
                                    country_name: country.name
                                });
                            });
                        }
                    });
                    // Sort alphabetically
                    allColleges.sort((a, b) => a.name.localeCompare(b.name));
                    setColleges(allColleges);
                }

                const plansJson = await plansRes.json();
                if (plansJson.success) {
                    const allPlans = [];
                    plansJson.data.forEach(course => {
                        if (course.plans && course.plans.length > 0) {
                            course.plans.forEach(plan => {
                                allPlans.push({
                                    ...plan,
                                    course_name: course.name,
                                    course_id: course.id
                                });
                            });
                        }
                    });
                    setPlans(allPlans);
                }
            } catch (err) {
                toast.error("Could not load form data");
            } finally {
                setLoadingData(false);
            }
        };
        fetchData();
    }, []);

    // Search Users Debounce
    useEffect(() => {
        if (!searchQuery || activeTab !== "existing") return;

        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(`/api/admin/users/get?search=${searchQuery}&limit=5`);
                const json = await res.json();
                if (json.success) {
                    setSearchResults(json.users || []);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setSearching(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, activeTab]);

    // Handle Input Change
    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "course_id") {
            const selectedCourse = courses.find(c => c.id === value);
            setIsFMGECourse(selectedCourse && selectedCourse.name.toUpperCase().includes("FMGE"));

            // Unset plan when course changes
            const updates = { [name]: value, plan_id: "", amount: "" };

            // Clear academic year if not FMGE
            if (selectedCourse && !selectedCourse.name.toUpperCase().includes("FMGE")) {
                updates.academic_year = "";
            }

            setFormData(prev => ({ ...prev, ...updates }));
            return;
        }

        // Auto-fill amount when plan changes
        if (name === "plan_id") {
            const selectedPlan = plans.find(p => p.id === value);
            if (selectedPlan) {
                setFormData(prev => ({
                    ...prev,
                    [name]: value,
                    // Only auto-fill course_id if it's not already manually selected
                    ...(prev.course_id ? {} : { course_id: selectedPlan.course_id }),
                    amount: selectedPlan.price || ""
                }));

                // If course was auto-filled, set FMGE logic
                if (!formData.course_id) {
                    setIsFMGECourse(selectedPlan.course_name.toUpperCase().includes("FMGE"));
                }
                return;
            }
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Filter colleges based on selected country and search query
    const filteredColleges = colleges.filter(c => {
        const matchesCountry = selectedCountry ? c.country_name === selectedCountry : true;
        const matchesSearch = searchCollege ? c.name.toLowerCase().includes(searchCollege.toLowerCase()) : true;
        return matchesCountry && matchesSearch;
    });

    const getSelectedCollegeName = () => {
        if (!formData.university_id) return "";
        const c = colleges.find(col => col.id === formData.university_id);
        return c ? `${c.name} (${c.country_name})` : "";
    };

    const handleUserSelect = (user) => {
        setSelectedUser(user);
        setSearchQuery(""); // Clear search to show selection UI
        setSearchResults([]);

        // Find if user has a university to set the country
        let userCountry = "";
        let userUniversityId = "";
        if (user.institute) {
             const c = colleges.find(col => col.name.toLowerCase() === user.institute?.toLowerCase());
             if (c) {
                 userCountry = c.country_name;
                 userUniversityId = c.id;
             }
        }

        setFormData(prev => ({
            ...prev,
            full_name: user.full_name || "",
            email: user.email || "",
            phone: user.phone || "",
            password: "", // hide for existing
            gender: user.gender || "",
            university_id: userUniversityId,
        }));
        setSelectedCountry(userCountry);
    };

    // Submit Handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const toastId = toast.loading(activeTab === "new" ? "Creating & Enrolling..." : "Enrolling Student...");

        try {
            let url = "/api/admin/users/create-student";
            let payload = { ...formData };

            if (activeTab === "existing") {
                if (!selectedUser) {
                    toast.error("Please select a user first");
                    setLoading(false);
                    toast.dismiss(toastId);
                    return;
                }
                url = "/api/admin/users/enroll";
                payload = {
                    user_id: selectedUser.id,
                    plan_id: formData.plan_id,
                    course_id: formData.course_id,
                    academic_year: formData.academic_year,
                    amount: formData.amount,
                    payment_date: formData.payment_date,
                    transaction_mode: formData.transaction_mode,
                    transaction_id: formData.transaction_id,
                    
                    full_name: formData.full_name,
                    email: formData.email,
                    phone: formData.phone,
                    gender: formData.gender,
                };

                if (formData.university_id) {
                    const c = colleges.find(col => col.id === formData.university_id);
                    if (c) {
                        payload.institute = c.name;
                    }
                } else {
                    payload.institute = "";
                }
            } else {
                // Validate new user fields
                if (!formData.full_name || !formData.email || !formData.password || !formData.phone) {
                    toast.error("Missing required user fields");
                    setLoading(false);
                    toast.dismiss(toastId);
                    return;
                }
                // Map the selected college to the user's institute string field
                if (payload.university_id) {
                    const c = colleges.find(col => col.id === payload.university_id);
                    if (c) {
                        payload.institute = c.name;
                    }
                }
                delete payload.university_id;
            }

            if (!formData.plan_id) {
                toast.error("Please select a plan to enroll");
                setLoading(false);
                toast.dismiss(toastId);
                return;
            }

            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const json = await res.json();

            if (json.success) {
                toast.success(json.message || "Operation successful!");
                setTimeout(() => router.push("/admin/users"), 1500);
            } else {
                toast.error(json.error || "Operation failed");
            }
        } catch (err) {
            toast.error("Network error occurred");
        } finally {
            setLoading(false);
            toast.dismiss(toastId);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <Toaster position="top-right" />

            <div className="max-w-full mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        href="/admin/users"
                        className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                            Student Enrollment
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Register new students or enroll existing ones
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 mb-8 max-w-md shadow-sm">
                    <button
                        onClick={() => setActiveTab("new")}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === "new"
                            ? "bg-blue-600 text-white shadow-md"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}
                    >
                        <UserPlus className="w-4 h-4" />
                        New Student
                    </button>
                    <button
                        onClick={() => setActiveTab("existing")}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === "existing"
                            ? "bg-blue-600 text-white shadow-md"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}
                    >
                        <User className="w-4 h-4" />
                        Existing Student
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column: User Details / Search */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 h-full">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2 pb-4 border-b border-gray-100 dark:border-gray-700">
                                <User className="w-5 h-5 text-blue-500" />
                                {activeTab === "new" ? "Student Details" : "Find Student"}
                            </h2>

                            {activeTab === "existing" && !selectedUser && (
                                <div className="space-y-6">
                                    {/* Search Existing */}
                                        <div className="relative">
                                            <div className="relative group">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Search by name, email, or phone..."
                                                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                                    autoFocus
                                                />
                                                {searching && (
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Results Dropdown */}
                                            {searchResults.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-20 max-h-60 overflow-y-auto">
                                                    {searchResults.map(user => (
                                                        <button
                                                            key={user.id}
                                                            type="button"
                                                            onClick={() => handleUserSelect(user)}
                                                            className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-3 border-b last:border-0 border-gray-100 dark:border-gray-700/50"
                                                        >
                                                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                                                {user.profile_picture ? (
                                                                    <img src={user.profile_picture} className="w-full h-full rounded-full object-cover" />
                                                                ) : (
                                                                    <span className="text-blue-600 font-bold text-sm">{user.full_name?.charAt(0)}</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900 dark:text-white">{user.full_name}</h4>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400">{user.email} • {user.phone}</p>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {searchQuery && !searching && searchResults.length === 0 && (
                                                <div className="text-center py-4 text-gray-500">No users found</div>
                                            )}
                                        </div>
                                </div>
                            )}

                            {(activeTab === "new" || (activeTab === "existing" && selectedUser)) && (
                                <div className={activeTab === "existing" ? "bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 border border-blue-100 dark:border-blue-900/30 mb-2" : ""}>
                                    {activeTab === "existing" && selectedUser && (
                                        <div className="flex items-center justify-between mb-6 pb-6 border-b border-blue-200 dark:border-blue-800/50">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                                                    {selectedUser.profile_picture ? (
                                                        <img src={selectedUser.profile_picture} className="w-full h-full rounded-full object-cover" />
                                                    ) : (
                                                        <User className="w-6 h-6 text-blue-500" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900 dark:text-white">{selectedUser.full_name}</h3>
                                                    <p className="text-sm text-gray-600 dark:text-gray-300">{selectedUser.email}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{selectedUser.phone}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedUser(null)}
                                                className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-blue-100 dark:border-gray-700"
                                            >
                                                Change User
                                            </button>
                                        </div>
                                    )}

                                    <div className="space-y-5">
                                        {activeTab === "existing" && (
                                            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Verify / Edit Details</h4>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name *</label>
                                            <div className="relative group">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                                <input
                                                    type="text"
                                                    name="full_name"
                                                    value={formData.full_name}
                                                    onChange={handleChange}
                                                    placeholder="John Doe"
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone Number *</label>
                                            <div className="relative group">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    placeholder="+91 98765 43210"
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address *</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder="john@example.com"
                                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {activeTab === "new" && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password *</label>
                                                <div className="relative group">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                                    <input
                                                        type="password"
                                                        name="password"
                                                        value={formData.password}
                                                        onChange={handleChange}
                                                        placeholder="••••••••"
                                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                        required={activeTab === "new"}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className={activeTab === "existing" ? "md:col-span-2" : ""}>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Gender (Optional)</label>
                                            <select
                                                name="gender"
                                                value={formData.gender}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                            >
                                                <option value="">Select Gender</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Additional Options */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-gray-100 dark:border-gray-700">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Course *</label>
                                            {loadingData ? (
                                                <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-full" />
                                            ) : (
                                                <select
                                                    name="course_id"
                                                    value={formData.course_id}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                >
                                                    <option value="">-- Select Course --</option>
                                                    {courses.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Country (Optional)</label>
                                            {loadingData ? (
                                                <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-full" />
                                            ) : (
                                                <div className="relative group">
                                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                                                    <select
                                                        value={selectedCountry}
                                                        onChange={(e) => {
                                                            setSelectedCountry(e.target.value);
                                                            // Clear selected university if it doesn't match the new country
                                                            if (formData.university_id) {
                                                                const currentUni = colleges.find(c => c.id === formData.university_id);
                                                                if (currentUni && e.target.value && currentUni.country_name !== e.target.value) {
                                                                    setFormData(p => ({ ...p, university_id: "" }));
                                                                }
                                                            }
                                                        }}
                                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all appearance-none"
                                                    >
                                                        <option value="">-- Any Country --</option>
                                                        {countries.map(c => (
                                                            <option key={c.id} value={c.name}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">University (Optional)</label>
                                            {loadingData ? (
                                                <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-full" />
                                            ) : (
                                                <div className="relative">
                                                    <div className="relative group">
                                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                                                        <input
                                                            type="text"
                                                            value={showCollegeDropdown ? searchCollege : getSelectedCollegeName()}
                                                            onChange={(e) => {
                                                                setSearchCollege(e.target.value);
                                                                if (!showCollegeDropdown) setShowCollegeDropdown(true);
                                                            }}
                                                            onFocus={() => {
                                                                setSearchCollege("");
                                                                setShowCollegeDropdown(true);
                                                            }}
                                                            placeholder="Search University..."
                                                            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all cursor-text text-sm"
                                                        />
                                                        <ChevronDown
                                                            className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none transition-transform duration-200 ${showCollegeDropdown ? "rotate-180" : ""}`}
                                                        />
                                                    </div>

                                                    {/* Custom Dropdown List */}
                                                    <AnimatePresence>
                                                        {showCollegeDropdown && (
                                                            <>
                                                                <div
                                                                    className="fixed inset-0 z-10"
                                                                    onClick={() => setShowCollegeDropdown(false)}
                                                                />
                                                                <motion.div
                                                                    initial={{ opacity: 0, y: -5 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    exit={{ opacity: 0, y: -5 }}
                                                                    transition={{ duration: 0.15 }}
                                                                    className="absolute mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto"
                                                                >
                                                                    {formData.university_id && searchCollege === "" && (
                                                                        <button
                                                                            type="button"
                                                                            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border-b border-gray-100 dark:border-gray-700"
                                                                            onClick={() => {
                                                                                setFormData(p => ({ ...p, university_id: "" }));
                                                                                setShowCollegeDropdown(false);
                                                                            }}
                                                                        >
                                                                            Clear Selection
                                                                        </button>
                                                                    )}
                                                                    {filteredColleges.length > 0 ? (
                                                                        filteredColleges.map((c) => (
                                                                            <button
                                                                                key={c.id}
                                                                                type="button"
                                                                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors flex flex-col ${formData.university_id === c.id ? "bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}
                                                                                onClick={() => {
                                                                                    setFormData(p => ({ ...p, university_id: c.id }));
                                                                                    // Auto-select country if not already selected
                                                                                    if (!selectedCountry) {
                                                                                        setSelectedCountry(c.country_name);
                                                                                    }
                                                                                    setShowCollegeDropdown(false);
                                                                                    setSearchCollege("");
                                                                                }}
                                                                            >
                                                                                <span className="font-medium truncate">{c.name}</span>
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400">{c.country_name}</span>
                                                                            </button>
                                                                        ))
                                                                    ) : (
                                                                        <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                                                                            No universities found
                                                                        </div>
                                                                    )}
                                                                </motion.div>
                                                            </>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}
                                        </div>

                                        {isFMGECourse && (
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Academic Year *</label>
                                                <select
                                                    name="academic_year"
                                                    value={formData.academic_year}
                                                    onChange={handleChange}
                                                    required={isFMGECourse}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                                >
                                                    <option value="">-- Select Year --</option>
                                                    <option value="1st Year">1st Year</option>
                                                    <option value="2nd Year">2nd Year</option>
                                                    <option value="3rd Year">3rd Year</option>
                                                    <option value="4th Year">4th Year</option>
                                                    <option value="5th Year">5th Year</option>
                                                    <option value="Final Year">Final Year</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Enrollment & Payment */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2 pb-4 border-b border-gray-100 dark:border-gray-700">
                                <BookOpen className="w-5 h-5 text-orange-500" />
                                Enrollment & Payment
                            </h2>

                            <div className="space-y-5 flex-1">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Select Plan (Optional)</label>
                                    {loadingData ? (
                                        <div className="animate-pulse h-12 bg-gray-200 dark:bg-gray-700 rounded-xl w-full" />
                                    ) : (
                                        <select
                                            name="plan_id"
                                            value={formData.plan_id}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all cursor-pointer"
                                        >
                                            <option value="">-- Choose a Plan --</option>
                                            {plans.filter(plan => !formData.course_id || plan.course_id === formData.course_id).map(plan => (
                                                <option key={plan.id} value={plan.id}>
                                                    {plan.course_name} - {plan.name} (₹{plan.price})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {formData.plan_id && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="space-y-5 pt-2"
                                    >
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount (₹)</label>
                                                <div className="relative group">
                                                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    <input
                                                        type="number"
                                                        name="amount"
                                                        value={formData.amount}
                                                        onChange={handleChange}
                                                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all font-semibold"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date</label>
                                                <div className="relative group">
                                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    <input
                                                        type="date"
                                                        name="payment_date"
                                                        value={formData.payment_date}
                                                        onChange={handleChange}
                                                        className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Payment Mode */}
                                        <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Mode</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {["upi", "card", "stripe", "apple", "google"].map(mode => (
                                                    <button
                                                        key={mode}
                                                        type="button"
                                                        onClick={() => setFormData(p => ({ ...p, transaction_mode: mode }))}
                                                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all capitalize ${formData.transaction_mode === mode
                                                            ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300"
                                                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300"
                                                            }`}
                                                    >
                                                        {mode}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Transaction ID / Reference</label>
                                            <div className="relative group">
                                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    name="transaction_id"
                                                    value={formData.transaction_id}
                                                    onChange={handleChange}
                                                    placeholder="e.g. UPI-1234567890"
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all uppercase tracking-wide"
                                                />
                                            </div>
                                        </div>

                                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl flex gap-3 border border-green-100 dark:border-green-900/30">
                                            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                                            <p className="text-xs text-green-700 dark:text-green-300 leading-relaxed">
                                                Payment will be recorded as <strong>Captured</strong> and subscription will be activated immediately.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    type="submit"
                                    disabled={loading || (activeTab === "existing" && !selectedUser)}
                                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg hover:shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-5 h-5" />
                                            {activeTab === "new" ? "Create & Enroll" : "Enroll User"}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    );
}

function CheckCircle({ className }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    )
}
