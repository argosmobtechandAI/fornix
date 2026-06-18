"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
    Users,
    Search,
    Upload,
    Download,
    Loader2,
    CheckCircle,
    XCircle,
    Eye,
    BookOpen,
    Trash2,
    Pencil,
    AlertTriangle,
    Check,
    Power
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += ch;
        }
    }
    result.push(current.trim());
    return result;
}

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
                        <XCircle className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </motion.div>
        </div>
    );
}

export default function UniversityStudentsPage() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Stats
    const [maxStudents, setMaxStudents] = useState(0);
    const [assignedPlans, setAssignedPlans] = useState([]);

    // Modal contexts
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    // CSV Upload State
    const [csvFile, setCsvFile] = useState(null);
    const [csvPreviewData, setCsvPreviewData] = useState([]);
    const [selectedPlanId, setSelectedPlanId] = useState("");
    const [uploading, setUploading] = useState(false);
    const [selectedYear, setSelectedYear] = useState("");
    const [editingRowIndex, setEditingRowIndex] = useState(null);

    // Upload results
    const [uploadResults, setUploadResults] = useState(null);

    // Row Actions State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [editForm, setEditForm] = useState({ full_name: "", email: "", phone: "", gender: "", password: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Info Modal State
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [infoStudent, setInfoStudent] = useState(null);

    // Multi-select & Bulk actions
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    const [isBulkActioning, setIsBulkActioning] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/university/students");
            const json = await res.json();
            if (json.success) {
                setStudents(json.data.students || []);
                setMaxStudents(json.data.maxStudents || 0);
                setAssignedPlans(json.data.assignedPlans || []);
            } else {
                toast.error("Failed to load students");
            }
        } catch (err) {
            toast.error("Error loading students");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCsvFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setCsvFile(file);
        setUploadResults(null);

        try {
            const text = await file.text();
            const lines = text.split("\n").map(l => l.replace(/\r$/, ""));
            const rows = [];

            // CSV headers: name, email, phone, password, gender
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const cols = parseCSVLine(line);
                if (cols.length >= 4) {
                    rows.push({
                        full_name: cols[0] || "",
                        email: cols[1] || "",
                        phone: cols[2] || "",
                        password: cols[3] || "",
                        gender: cols[4] || "other"
                    });
                }
            }

            if (rows.length === 0) {
                toast.error("No valid data found in CSV. Ensure it has: name, email, phone, password, gender.");
                setCsvFile(null);
                return;
            }

            setCsvPreviewData(rows);
        } catch (err) {
            toast.error("Failed to parse CSV file");
            setCsvFile(null);
        }
    };

    const handleEditField = (index, field, value) => {
        setCsvPreviewData(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleRemoveRow = (index) => {
        setCsvPreviewData(prev => prev.filter((_, i) => i !== index));
    };

    const getRowValidationErrors = (row) => {
        const errors = [];
        if (!row.full_name) errors.push("name");
        if (!row.email) errors.push("email");
        if (!row.phone) errors.push("phone");
        if (!row.password) errors.push("password");
        return errors;
    };

    const handleBulkUpload = async () => {
        if (!selectedPlanId) {
            toast.error("Please select a plan to assign to these students.");
            return;
        }

        if (csvPreviewData.length === 0) {
            toast.error("No students to upload from CSV preview.");
            return;
        }

        // Validate all rows
        const invalidRows = csvPreviewData.filter(row => getRowValidationErrors(row).length > 0);
        if (invalidRows.length > 0) {
            toast.error(`${invalidRows.length} row(s) have missing required fields. Please fix them first.`);
            return;
        }

        setUploading(true);
        try {
            const res = await fetch("/api/university/students/bulk-upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    students: csvPreviewData.map(s => ({
                        ...s,
                        academic_year: s.academic_year || selectedYear || ""
                    })),
                    plan_id: selectedPlanId
                })
            });

            const json = await res.json();
            if (json.success) {
                const summary = json.data.summary;
                toast.success(json.message);
                setUploadResults(json.data);
                // Clear preview after successful upload
                setCsvPreviewData([]);
                setCsvFile(null);
                fetchData();
            } else {
                toast.error(json.error || "Failed to upload students");
                if (json.details) {
                    setUploadResults(json.details);
                }
            }
        } catch (err) {
            toast.error("Network error during bulk upload");
        } finally {
            setUploading(false);
        }
    };

    const openEditModal = (student) => {
        setSelectedStudent(student);
        setEditForm({
            full_name: student.full_name || "",
            email: student.email || "",
            phone: student.phone || "",
            gender: student.gender || "other",
            password: ""
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/university/students/${selectedStudent.id}/update`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editForm)
            });
            const json = await res.json();
            if (json.success) {
                toast.success("Student updated successfully");
                setIsEditModalOpen(false);
                fetchData();
            } else {
                toast.error(json.error || "Failed to update student");
            }
        } catch (err) {
            toast.error("Network error updating student");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (student) => {
        if (!confirm(`Are you sure you want to ${student.is_active ? "suspend" : "activate"} ${student.full_name}?`)) return;
        try {
            const res = await fetch(`/api/university/students/${student.id}/toggle-status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_active: !student.is_active })
            });
            const json = await res.json();
            if (json.success) {
                toast.success(json.message);
                fetchData();
            } else {
                toast.error(json.error || "Failed to change status");
            }
        } catch (err) {
            toast.error("Network error toggling status");
        }
    };

    const handleDeleteStudent = async (student) => {
        if (!confirm(`WARNING: Are you sure you want to PERMANENTLY delete ${student.full_name}? This cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/university/students/${student.id}/delete`, {
                method: "DELETE"
            });
            const json = await res.json();
            if (json.success) {
                toast.success("Student deleted successfully");
                fetchData();
            } else {
                toast.error(json.error || "Failed to delete student");
            }
        } catch (err) {
            toast.error("Network error deleting student");
        }
    };

    const handleBulkAction = async (action) => {
        let confirmMessage;
        if (action === "suspend") confirmMessage = `Are you sure you want to suspend ${selectedStudentIds.length} student(s)?`;
        else if (action === "activate") confirmMessage = `Are you sure you want to activate ${selectedStudentIds.length} student(s)?`;
        else if (action === "delete") confirmMessage = `WARNING: Are you sure you want to PERMANENTLY delete ${selectedStudentIds.length} student(s)? This cannot be undone.`;

        if (!confirm(confirmMessage)) return;

        setIsBulkActioning(true);
        try {
            const res = await fetch("/api/university/students/bulk-actions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ student_ids: selectedStudentIds, action })
            });
            const json = await res.json();

            if (json.success) {
                toast.success(json.message);
                setSelectedStudentIds([]);
                fetchData();
            } else {
                toast.error(json.error || `Failed to ${action} students`);
            }
        } catch (err) {
            toast.error(`Error performing bulk ${action}`);
        } finally {
            setIsBulkActioning(false);
        }
    };

    const handleExportCsv = () => {
        if (students.length === 0) return;

        const headers = ["Name", "Email", "Phone", "Gender", "Status", "Joined"];
        const rows = students.map(s => [
            `"${s.full_name}"`,
            `"${s.email}"`,
            `"${s.phone || ''}"`,
            `"${s.gender || 'other'}"`,
            s.is_active ? "Active" : "Inactive",
            new Date(s.created_at).toLocaleDateString()
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `university_students_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const resetModal = () => {
        setIsUploadModalOpen(false);
        setCsvFile(null);
        setCsvPreviewData([]);
        setSelectedPlanId("");
        setSelectedYear("");
        setEditingRowIndex(null);
        setUploadResults(null);
        setIsEditModalOpen(false);
    };

    const filtered = students.filter(s =>
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                        Student Roster
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Manage your {students.length} students (Max limit: {maxStudents})
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportCsv}
                        disabled={students.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl shadow-sm transition-all"
                    >
                        <Upload className="w-4 h-4" /> Import Students
                    </button>
                </div>
            </div>

            {/* Roster Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search students by name or email..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-4 w-12 text-center">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                                        checked={filtered.length > 0 && selectedStudentIds.length === filtered.length}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedStudentIds(filtered.map(s => s.id));
                                            } else {
                                                setSelectedStudentIds([]);
                                            }
                                        }}
                                    />
                                </th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan / Year</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Account Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined At</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-500">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Loading roster...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-500">
                                        No students currently found in your roster.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(s => (
                                    <tr key={s.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-6 py-4 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                                                checked={selectedStudentIds.includes(s.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedStudentIds(prev => [...prev, s.id]);
                                                    } else {
                                                        setSelectedStudentIds(prev => prev.filter(id => id !== s.id));
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs uppercase">
                                                    {s.full_name?.charAt(0) || "S"}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{s.full_name}</p>
                                                    <p className="text-xs text-gray-500 capitalize">{s.gender}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-gray-900 dark:text-white">{s.email}</p>
                                            <p className="text-xs text-gray-500">{s.phone || 'N/A'}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {s.active_subscriptions && s.active_subscriptions.length > 0 ? (
                                                <div className="flex flex-col items-start">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                                        {s.active_subscriptions[0].plan_name}
                                                    </span>
                                                    {s.academic_year && (
                                                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                                            {s.academic_year}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400 italic">No Active Plan</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {s.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                                    <CheckCircle className="w-3 h-3" /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                                                    <XCircle className="w-3 h-3" /> Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(s.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 text-gray-400">
                                                <button
                                                    onClick={() => {
                                                        setInfoStudent(s);
                                                        setIsInfoModalOpen(true);
                                                    }}
                                                    className="p-1.5 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                                    title="View Subscriptions"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(s)}
                                                    className="p-1.5 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    title="Edit Details"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleStatus(s)}
                                                    className={`p-1.5 rounded-lg transition-colors ${s.is_active ? 'hover:text-amber-600 hover:bg-amber-50' : 'hover:text-emerald-600 hover:bg-emerald-50'}`}
                                                    title={s.is_active ? "Suspend Student" : "Activate Student"}
                                                >
                                                    <Power className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteStudent(s)}
                                                    className="p-1.5 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title="Permanently Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Floating Bulk Action Bar */}
            <AnimatePresence>
                {selectedStudentIds.length > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-40"
                    >
                        <div className="flex items-center gap-3 pr-2">
                            <span className="bg-orange-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
                                {selectedStudentIds.length}
                            </span>
                            <span className="text-sm font-medium text-gray-200">Students Selected</span>
                        </div>
                        <div className="w-px h-8 bg-gray-700"></div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleBulkAction('suspend')}
                                disabled={isBulkActioning}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 text-amber-400 hover:text-amber-300"
                            >
                                <Power className="w-4 h-4" /> Suspend
                            </button>
                            <button
                                onClick={() => handleBulkAction('activate')}
                                disabled={isBulkActioning}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 text-emerald-400 hover:text-emerald-300"
                            >
                                <CheckCircle className="w-4 h-4" /> Activate
                            </button>
                            <button
                                onClick={() => handleBulkAction('delete')}
                                disabled={isBulkActioning}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium hover:bg-red-900/30 transition-colors disabled:opacity-50 text-red-400 hover:text-red-300"
                            >
                                {isBulkActioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
                            </button>
                        </div>
                        <button
                            onClick={() => setSelectedStudentIds([])}
                            className="absolute -top-3 -right-3 bg-gray-800 text-gray-400 hover:text-white rounded-full p-1.5 border border-gray-700 shadow-xl transition-colors"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* CSV Upload Modal */}
            <AnimatePresence>
                <Modal
                    isOpen={isUploadModalOpen}
                    onClose={resetModal}
                    title="Import Students via CSV"
                    size="xl"
                >
                    <div className="space-y-6">

                        {/* CSV Format Info */}
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800">
                            <h4 className="font-semibold text-orange-900 dark:text-orange-300 flex items-center gap-2 mb-2">
                                <BookOpen className="w-4 h-4" /> Required CSV Format
                            </h4>
                            <p className="text-sm text-orange-700 dark:text-orange-400 mb-2">
                                Your CSV must have a header row with columns:
                                <span className="font-mono bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded mx-1 text-xs">name, email, phone, password, gender</span>
                            </p>
                            <a href="data:text/csv;charset=utf-8,name,email,phone,password,gender%0AJohn Doe,john@example.com,9876543210,Pass@123,male%0AJane Smith,jane@example.com,9876543211,Pass@456,female" download="students_template.csv" className="text-sm text-orange-600 hover:underline font-medium">
                                Download Template CSV
                            </a>
                        </div>

                        {/* Step 1: Plan Selection — Always visible, required first */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Step 1: Select Plan <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={selectedPlanId}
                                onChange={(e) => { setSelectedPlanId(e.target.value); setSelectedYear(""); }}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-orange-500"
                            >
                                <option value="">-- Select an authorized plan --</option>
                                {assignedPlans.map(plan => (
                                    <option key={plan.id} value={plan.id}>
                                        {plan.name} - {plan.course_name} ({plan.duration_in_days} days)
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                Each student will be enrolled in this plan. One student can be enrolled in one plan only.
                            </p>
                        </div>

                        {/* Step 1b: Academic Year — Only for FMGE plans */}
                        {(() => {
                            if (!selectedPlanId) return null;
                            const plan = assignedPlans.find(p => p.id === selectedPlanId);
                            const isFMGE = plan && (plan.course_name || "").toUpperCase().includes("FMGE");
                            if (!isFMGE) return null;
                            return (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Academic Year <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-orange-500"
                                    >
                                        <option value="">-- Select Academic Year --</option>
                                        <option value="1st Year">1st Year</option>
                                        <option value="2nd Year">2nd Year</option>
                                        <option value="3rd Year">3rd Year</option>
                                        <option value="4th Year">4th Year</option>
                                        <option value="5th Year">5th Year</option>
                                        <option value="Final Year">Final Year</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        All imported students will be assigned to this FMGE academic year.
                                    </p>
                                </div>
                            );
                        })()}

                        {/* Step 2: Upload CSV File — Only enabled after plan (and year if FMGE) selected */}
                        {(() => {
                            const plan = assignedPlans.find(p => p.id === selectedPlanId);
                            const isFMGE = plan && (plan.course_name || "").toUpperCase().includes("FMGE");
                            const stepDisabled = !selectedPlanId || (isFMGE && !selectedYear);
                            return (
                                <div className={stepDisabled ? "opacity-50 pointer-events-none" : ""}>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Step 2: Upload CSV File</label>
                                    {stepDisabled && (
                                        <p className="text-xs text-orange-600 dark:text-orange-400 mb-2">↑ Please {!selectedPlanId ? "select a plan" : "select an academic year"} first</p>
                                    )}
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleCsvFileSelect}
                                        disabled={stepDisabled}
                                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 disabled:cursor-not-allowed"
                                    />
                                </div>
                            );
                        })()}

                        {/* Step 3: Editable Preview Table */}
                        {csvPreviewData.length > 0 && (
                            <div className="animate-in fade-in slide-in-from-bottom-2">

                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-medium text-gray-700 dark:text-white">
                                        Step 3: Review & Edit — <span className="text-orange-600 font-bold">{csvPreviewData.length}</span> students parsed
                                    </p>
                                    <button
                                        onClick={() => { setCsvFile(null); setCsvPreviewData([]); }}
                                        className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                                    >
                                        <Trash2 className="w-3 h-3" /> Clear All
                                    </button>
                                </div>

                                <div className="max-h-72 overflow-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider">#</th>
                                                <th className="px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider">Name *</th>
                                                <th className="px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider">Email *</th>
                                                <th className="px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider">Phone *</th>
                                                <th className="px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider">Password *</th>
                                                <th className="px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider">Gender</th>
                                                <th className="px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wider text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {csvPreviewData.map((row, i) => {
                                                const validationErrors = getRowValidationErrors(row);
                                                const hasErrors = validationErrors.length > 0;
                                                const isEditing = editingRowIndex === i;

                                                return (
                                                    <tr key={i} className={`${hasErrors ? "bg-red-50/50 dark:bg-red-900/10" : ""} hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors`}>
                                                        <td className="px-3 py-2 text-gray-400 font-mono">
                                                            {i + 1}
                                                            {hasErrors && <AlertTriangle className="w-3 h-3 text-red-500 inline ml-1" />}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {isEditing ? (
                                                                <input
                                                                    type="text"
                                                                    value={row.full_name}
                                                                    onChange={e => handleEditField(i, "full_name", e.target.value)}
                                                                    className={`w-full px-2 py-1 rounded border ${!row.full_name ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"} dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-1 focus:ring-orange-400 text-xs`}
                                                                />
                                                            ) : (
                                                                <span className={`${!row.full_name ? "text-red-500 italic" : "text-gray-800 dark:text-gray-200"}`}>{row.full_name || "Missing"}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {isEditing ? (
                                                                <input
                                                                    type="email"
                                                                    value={row.email}
                                                                    onChange={e => handleEditField(i, "email", e.target.value)}
                                                                    className={`w-full px-2 py-1 rounded border ${!row.email ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"} dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-1 focus:ring-orange-400 text-xs`}
                                                                />
                                                            ) : (
                                                                <span className={`${!row.email ? "text-red-500 italic" : "text-gray-800 dark:text-gray-200"}`}>{row.email || "Missing"}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {isEditing ? (
                                                                <input
                                                                    type="text"
                                                                    value={row.phone}
                                                                    onChange={e => handleEditField(i, "phone", e.target.value)}
                                                                    className={`w-full px-2 py-1 rounded border ${!row.phone ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"} dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-1 focus:ring-orange-400 text-xs`}
                                                                />
                                                            ) : (
                                                                <span className={`${!row.phone ? "text-red-500 italic" : "text-gray-800 dark:text-gray-200"}`}>{row.phone || "Missing"}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {isEditing ? (
                                                                <input
                                                                    type="text"
                                                                    value={row.password}
                                                                    onChange={e => handleEditField(i, "password", e.target.value)}
                                                                    className={`w-full px-2 py-1 rounded border ${!row.password ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"} dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-1 focus:ring-orange-400 text-xs`}
                                                                />
                                                            ) : (
                                                                <span className={`${!row.password ? "text-red-500 italic" : "text-gray-800 dark:text-gray-200"}`}>{row.password ? "••••••" : "Missing"}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            {isEditing ? (
                                                                <select
                                                                    value={row.gender}
                                                                    onChange={e => handleEditField(i, "gender", e.target.value)}
                                                                    className="w-full px-2 py-1 rounded border border-gray-200 bg-white dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-1 focus:ring-orange-400 text-xs"
                                                                >
                                                                    <option value="male">Male</option>
                                                                    <option value="female">Female</option>
                                                                    <option value="other">Other</option>
                                                                </select>
                                                            ) : (
                                                                <span className="text-gray-600 dark:text-gray-300 capitalize">{row.gender || "other"}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                {isEditing ? (
                                                                    <button
                                                                        onClick={() => setEditingRowIndex(null)}
                                                                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                                                        title="Done editing"
                                                                    >
                                                                        <Check className="w-3.5 h-3.5" />
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => setEditingRowIndex(i)}
                                                                        className="p-1 text-orange-500 hover:bg-orange-50 rounded transition-colors"
                                                                        title="Edit row"
                                                                    >
                                                                        <Pencil className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleRemoveRow(i)}
                                                                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                                                    title="Remove row"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Selected plan confirmation badge */}
                                <div className="mt-4 flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                    <span className="text-sm text-emerald-800 dark:text-emerald-300">
                                        Enrolling into: <strong>{assignedPlans.find(plan => plan.id === selectedPlanId)?.name}</strong>
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="mt-4 flex justify-end gap-3">
                                    <button
                                        onClick={() => { setCsvFile(null); setCsvPreviewData([]); setUploadResults(null); }}
                                        className="px-6 py-2.5 rounded-xl font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                                    >
                                        Clear Batch
                                    </button>
                                    <button
                                        onClick={handleBulkUpload}
                                        disabled={uploading || !selectedPlanId}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-50"
                                    >
                                        {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Confirm & Upload {csvPreviewData.length} Students
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Upload Results Summary */}
                        {uploadResults && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 space-y-3 mt-4">
                                <h4 className="font-semibold text-gray-900 dark:text-white">Upload Results</h4>

                                {uploadResults.summary && (
                                    <div className="grid grid-cols-4 gap-3">
                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center border">
                                            <p className="text-lg font-bold text-gray-900 dark:text-white">{uploadResults.summary.total}</p>
                                            <p className="text-xs text-gray-500">Total</p>
                                        </div>
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center border border-emerald-100">
                                            <p className="text-lg font-bold text-emerald-700">{uploadResults.summary.created}</p>
                                            <p className="text-xs text-emerald-600">Enrolled</p>
                                        </div>
                                        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 text-center border border-yellow-100">
                                            <p className="text-lg font-bold text-yellow-700">{uploadResults.summary.skipped}</p>
                                            <p className="text-xs text-yellow-600">Skipped</p>
                                        </div>
                                        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center border border-red-100">
                                            <p className="text-lg font-bold text-red-700">{uploadResults.summary.failed}</p>
                                            <p className="text-xs text-red-600">Failed</p>
                                        </div>
                                    </div>
                                )}

                                {/* Skipped students */}
                                {uploadResults.skipped?.length > 0 && (
                                    <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-xl border border-yellow-100">
                                        <p className="text-sm font-medium text-yellow-800 mb-1">Skipped (already enrolled)</p>
                                        <ul className="text-xs text-yellow-700 space-y-0.5">
                                            {uploadResults.skipped.map((s, i) => (
                                                <li key={i}>• {s.full_name} ({s.email}) — {s.reason}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Error details */}
                                {uploadResults.errors?.length > 0 && (
                                    <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-xl border border-red-100">
                                        <p className="text-sm font-medium text-red-800 mb-1">Failed</p>
                                        <ul className="text-xs text-red-700 space-y-0.5">
                                            {uploadResults.errors.map((e, i) => (
                                                <li key={i}>• {e.full_name} ({e.email}) — {e.error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </Modal>
            </AnimatePresence>

            {/* Edit Student Modal */}
            <AnimatePresence>
                <Modal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    title="Edit Student Profile"
                    size="md"
                >
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                            <input
                                type="text"
                                value={editForm.full_name}
                                onChange={e => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                                placeholder="Enter full name"
                                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-orange-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                            <input
                                type="email"
                                value={editForm.email}
                                onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="student@example.com"
                                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-orange-500"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                                <input
                                    type="text"
                                    value={editForm.phone}
                                    onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="+91 9876543210"
                                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                                <select
                                    value={editForm.gender}
                                    onChange={e => setEditForm(prev => ({ ...prev, gender: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password (Optional)</label>
                            <input
                                type="password"
                                placeholder="Leave blank to keep current"
                                value={editForm.password}
                                onChange={e => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-5 py-2 text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors font-medium disabled:opacity-50"
                            >
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                </Modal>
            </AnimatePresence>

            {/* Student Detail Modal */}
            <AnimatePresence>
                <Modal
                    isOpen={isInfoModalOpen}
                    onClose={() => { setIsInfoModalOpen(false); setInfoStudent(null); }}
                    title="Student Details"
                    size="lg"
                >
                    {infoStudent && (
                        <div className="space-y-6">
                            {/* Header Card */}
                            <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-5 border border-orange-100 dark:border-orange-800/50">
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center font-bold text-xl uppercase shadow-lg">
                                        {infoStudent.full_name?.charAt(0) || "S"}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">{infoStudent.full_name}</h4>
                                            {infoStudent.is_active ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 w-fit">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 w-fit">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Suspended
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{infoStudent.email}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Personal Details Grid */}
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-blue-500" />
                                    Personal Information
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700">
                                        <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-1">Phone</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{infoStudent.phone || "N/A"}</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700">
                                        <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-1">Gender</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{infoStudent.gender || "Not specified"}</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700">
                                        <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-1">Academic Year</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{infoStudent.academic_year || "N/A"}</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700">
                                        <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-1">Joined</p>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {new Date(infoStudent.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700">
                                        <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-1">Account Status</p>
                                        <p className={`text-sm font-medium ${infoStudent.is_active ? "text-emerald-600" : "text-red-600"}`}>
                                            {infoStudent.is_active ? "✅ Active" : "🚫 Suspended"}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700">
                                        <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-1">Student ID</p>
                                        <p className="text-[11px] font-mono text-gray-600 dark:text-gray-400 break-all">{infoStudent.id}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Enrolled Plans */}
                            <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-purple-500" />
                                    Subscriptions & Plans
                                    {infoStudent.active_subscriptions?.length > 0 && (
                                        <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded-full">
                                            {infoStudent.active_subscriptions.length}
                                        </span>
                                    )}
                                </h4>
                                {infoStudent.active_subscriptions && infoStudent.active_subscriptions.length > 0 ? (
                                    <div className="space-y-3">
                                        {infoStudent.active_subscriptions.map((sub, idx) => {
                                            const now = new Date();
                                            const endDate = new Date(sub.end_date);
                                            const startDate = new Date(sub.start_date);
                                            const isExpired = endDate < now;
                                            const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                                            const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                                            const elapsedDays = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
                                            const progressPercent = totalDays > 0 ? Math.min(Math.max((elapsedDays / totalDays) * 100, 0), 100) : 0;

                                            return (
                                                <div key={idx} className="bg-white dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                                                        <div>
                                                            <h5 className="font-semibold text-gray-900 dark:text-white">{sub.plan_name}</h5>
                                                            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">{sub.course_name}</p>
                                                        </div>
                                                        {isExpired ? (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-100 dark:border-red-800">
                                                                Expired
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                                                                {daysLeft} days left
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Progress Bar */}
                                                    <div className="mb-3">
                                                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${isExpired ? "bg-red-400" : progressPercent > 80 ? "bg-yellow-400" : "bg-emerald-400"}`}
                                                                style={{ width: `${progressPercent}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                                        <div>
                                                            <span className="text-gray-400">Start Date</span>
                                                            <p className="font-medium text-gray-700 dark:text-gray-300">
                                                                {startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400">Expiry Date</span>
                                                            <p className="font-medium text-gray-700 dark:text-gray-300">
                                                                {endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-400">Duration</span>
                                                            <p className="font-medium text-gray-700 dark:text-gray-300">{totalDays} days</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                                        <BookOpen className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">No active plan subscriptions found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </Modal>
            </AnimatePresence>
        </div >
    );
}
