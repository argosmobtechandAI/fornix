"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
    FileText, Plus, Pencil, Trash2, Loader2,
    Search, CheckCircle, XCircle, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EXAM_STATUSES = ["draft", "published", "closed"];
const FMGE_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Final Year"];

function StatusBadge({ status }) {
    const colors = {
        draft: "bg-yellow-50 text-yellow-700 border-yellow-200",
        published: "bg-emerald-50 text-emerald-700 border-emerald-200",
        closed: "bg-gray-100 text-gray-600 border-gray-200",
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[status] || colors.draft}`}>
            {status === "draft" && <Clock size={12} />}
            {status === "published" && <CheckCircle size={12} />}
            {status === "closed" && <XCircle size={12} />}
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

export default function UniversityExamsPage() {
    const router = useRouter();
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal states
    const [isExamModalOpen, setIsExamModalOpen] = useState(false);
    const [editingExam, setEditingExam] = useState(null);
    const [saving, setSaving] = useState(false);

    // Exam form
    const [examForm, setExamForm] = useState({
        name: "", subjects: "", description: "", duration_minutes: 60, status: "draft",
        plan_id: "", academic_year: ""
    });

    // Plans & Courses for dropdown
    const [assignedPlans, setAssignedPlans] = useState([]);
    const [courses, setCourses] = useState([]);

    // ========== Fetch functions ==========
    const fetchExams = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/university/exams");
            const json = await res.json();
            if (json.success) setExams(json.data || []);
        } catch (err) {
            toast.error("Failed to load exams");
        } finally {
            setLoading(false);
        }
    };

    const fetchPlansAndCourses = async () => {
        try {
            const studentsRes = await fetch("/api/university/students");
            const studentsJson = await studentsRes.json();
            if (studentsJson.success) {
                setAssignedPlans(studentsJson.data.assignedPlans || []);
            }
            const coursesRes = await fetch("/api/admin/courses");
            const coursesJson = await coursesRes.json();
            if (coursesJson.success) {
                setCourses(coursesJson.data || []);
            }
        } catch (err) {
            console.error("Failed to load plans/courses", err);
        }
    };

    useEffect(() => { fetchExams(); fetchPlansAndCourses(); }, []);

    const openExamModal = (exam = null) => {
        if (exam) {
            setEditingExam(exam);
            setExamForm({
                name: exam.name || "",
                subjects: exam.subjects || "",
                description: exam.description || "",
                duration_minutes: exam.duration_minutes || 60,
                status: exam.status || "draft",
                plan_id: exam.plan_id || "",
                academic_year: exam.academic_year || "",
            });
        } else {
            setEditingExam(null);
            setExamForm({
                name: "", subjects: "", description: "", duration_minutes: 60, status: "draft",
                plan_id: "", academic_year: ""
            });
        }
        setIsExamModalOpen(true);
    };

    const handleExamSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = editingExam ? `/api/university/exams/${editingExam.id}` : `/api/university/exams`;
            const method = editingExam ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(examForm)
            });
            const json = await res.json();
            if (json.success) {
                toast.success(editingExam ? "Exam updated" : "Exam created successfully");
                setIsExamModalOpen(false);
                fetchExams();
            } else {
                toast.error(json.error || "Failed to save exam");
            }
        } catch (err) {
            toast.error("Error saving exam");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteExam = async (id) => {
        if (!confirm("Are you sure you want to delete this exam?")) return;
        try {
            const res = await fetch(`/api/university/exams/${id}`, { method: "DELETE" });
            const json = await res.json();
            if (json.success) {
                toast.success("Exam deleted");
                fetchExams();
            } else {
                toast.error(json.error || "Failed to delete");
            }
        } catch (err) {
            toast.error("Error deleting exam");
        }
    };

    // Helper: check if selected plan is FMGE
    const isFMGEPlan = (() => {
        if (!examForm.plan_id) return false;
        const plan = assignedPlans.find(p => p.id === examForm.plan_id);
        if (!plan) return false;
        const courseName = plan.course_name || courses.find(c => c.id === plan.course_id)?.name || "";
        return courseName.toUpperCase().includes("FMGE");
    })();

    const filteredExams = exams.filter(e =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.subjects || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ========== RENDER ==========

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                        <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Exams</h1>
                        <p className="text-sm text-gray-500">{exams.length} exam{exams.length !== 1 ? "s" : ""} total</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push("/university/exams/manual-quiz")} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl shadow-lg hover:shadow-xl transition-all">
                        <Search size={16} /> Manual Quiz Builder
                    </button>
                    <button onClick={() => openExamModal()} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-lg hover:shadow-xl transition-all">
                        <Plus size={16} /> Create Exam
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Search exams..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                />
            </div>

            {/* Exam Cards */}
            {loading ? (
                <div className="py-16 text-center text-gray-500"><Loader2 className="animate-spin inline" /> Loading exams...</div>
            ) : filteredExams.length === 0 ? (
                <div className="py-16 text-center text-gray-500 border-2 border-dashed rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="font-medium">No exams found</p>
                    <p className="text-sm">Create your first exam to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredExams.map(exam => (
                        <motion.div
                            key={exam.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow cursor-pointer group"
                            onClick={() => router.push(`/university/exams/${exam.id}`)}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{exam.name}</h3>
                                <StatusBadge status={exam.status} />
                            </div>
                            {exam.subjects && <p className="text-xs text-gray-500 mb-2">📚 {exam.subjects}</p>}
                            {exam.description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{exam.description}</p>}
                            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                                <span className="text-xs text-gray-400">⏱ {exam.duration_minutes} min</span>
                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => openExamModal(exam)} className="p-1.5 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"><Pencil size={14} /></button>
                                    <button onClick={() => handleDeleteExam(exam.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Exam Create/Edit Modal */}
            <AnimatePresence>
                {isExamModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setIsExamModalOpen(false)}>
                        <motion.div
                            initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }}
                            className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-semibold mb-4">{editingExam ? "Edit Exam" : "Create Exam"}</h3>
                            <form onSubmit={handleExamSubmit} className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Exam Name <span className="text-red-500">*</span></label>
                                    <input value={examForm.name} onChange={e => setExamForm({ ...examForm, name: e.target.value })} required placeholder="e.g. Anatomy Mid-Term Exam" className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Subjects (comma separated)</label>
                                    <input value={examForm.subjects} onChange={e => setExamForm({ ...examForm, subjects: e.target.value })} placeholder="Anatomy, Physiology" className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Description</label>
                                    <textarea value={examForm.description} onChange={e => setExamForm({ ...examForm, description: e.target.value })} rows={2} placeholder="Brief description about this exam..." className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className={`grid grid-cols-${isFMGEPlan ? '2' : '1'} gap-3`}>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Assign Plan <span className="text-red-500">*</span></label>
                                        <select
                                            value={examForm.plan_id}
                                            onChange={e => {
                                                const newPlanId = e.target.value;
                                                setExamForm({ ...examForm, plan_id: newPlanId, academic_year: "" });
                                            }}
                                            required
                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select a plan</option>
                                            {assignedPlans.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} — {p.course_name}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[11px] text-gray-400 mt-1">Only students enrolled in this plan can attempt this exam</p>
                                    </div>
                                    {isFMGEPlan && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Academic Year <span className="text-red-500">*</span></label>
                                            <select
                                                value={examForm.academic_year}
                                                onChange={e => setExamForm({ ...examForm, academic_year: e.target.value })}
                                                required
                                                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">Select Year</option>
                                                {FMGE_YEARS.map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                                        <input type="number" min={1} value={examForm.duration_minutes} onChange={e => setExamForm({ ...examForm, duration_minutes: parseInt(e.target.value) || 60 })} placeholder="e.g. 60" className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Status</label>
                                        <select value={examForm.status} onChange={e => setExamForm({ ...examForm, status: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 outline-none">
                                            {EXAM_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-3 border-t">
                                    <button type="button" onClick={() => setIsExamModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                                        {saving && <Loader2 className="animate-spin" size={14} />}
                                        {editingExam ? "Update" : "Create"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
