"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
    FileText, Plus, Pencil, Trash2, Loader2, Upload, Download,
    Users, CheckCircle, XCircle, Clock, ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Papa from "papaparse";

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

export default function ExamDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params;

    const [exam, setExam] = useState(null);
    const [loadingExam, setLoadingExam] = useState(true);

    const [activeTab, setActiveTab] = useState("questions");

    // Questions state
    const [questions, setQuestions] = useState([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [questionForm, setQuestionForm] = useState({
        question: "", option_a: "", option_b: "", option_c: "", option_d: "",
        option_e: "", option_f: "", correct_option: "a", marks: 1, explanation: ""
    });

    // CSV upload state
    const [csvContent, setCsvContent] = useState("");
    const [csvPreviewData, setCsvPreviewData] = useState([]);
    const [uploading, setUploading] = useState(false);

    // Attempts state
    const [attempts, setAttempts] = useState([]);
    const [loadingAttempts, setLoadingAttempts] = useState(false);

    // Exam Edit Form state
    const [isExamModalOpen, setIsExamModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [examForm, setExamForm] = useState({
        name: "", subjects: "", description: "", duration_minutes: 60, status: "draft",
        plan_id: "", academic_year: ""
    });
    const [assignedPlans, setAssignedPlans] = useState([]);
    const [courses, setCourses] = useState([]);

    useEffect(() => {
        if (!id) return;
        fetchExamDetails();
        fetchPlansAndCourses();
    }, [id]);

    useEffect(() => {
        if (!exam) return;
        if (activeTab === "questions") fetchQuestions();
        if (activeTab === "attempts") fetchAttempts();
    }, [exam, activeTab]);

    const fetchExamDetails = async () => {
        setLoadingExam(true);
        try {
            const res = await fetch(`/api/university/exams/${id}`);
            const json = await res.json();
            if (json.success) {
                setExam(json.data);
            } else {
                toast.error("Failed to load exam details");
                router.push("/university/exams");
            }
        } catch (err) {
            toast.error("Network error");
        } finally {
            setLoadingExam(false);
        }
    };

    const fetchPlansAndCourses = async () => {
        try {
            const studentsRes = await fetch("/api/university/students");
            const studentsJson = await studentsRes.json();
            if (studentsJson.success) setAssignedPlans(studentsJson.data.assignedPlans || []);

            const coursesRes = await fetch("/api/admin/courses");
            const coursesJson = await coursesRes.json();
            if (coursesJson.success) setCourses(coursesJson.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchQuestions = async () => {
        setLoadingQuestions(true);
        try {
            const res = await fetch(`/api/university/exams/${id}/questions`);
            const json = await res.json();
            if (json.success) setQuestions(json.data || []);
        } catch (err) {
            toast.error("Failed to load questions");
        } finally {
            setLoadingQuestions(false);
        }
    };

    const fetchAttempts = async () => {
        setLoadingAttempts(true);
        try {
            const res = await fetch(`/api/university/exams/${id}/attempts`);
            const json = await res.json();
            if (json.success) setAttempts(json.data?.attempts || []);
        } catch (err) {
            toast.error("Failed to load attempts");
        } finally {
            setLoadingAttempts(false);
        }
    };

    // ========== Exam Editing ==========
    const openExamModal = () => {
        if (!exam) return;
        setExamForm({
            name: exam.name || "",
            subjects: exam.subjects || "",
            description: exam.description || "",
            duration_minutes: exam.duration_minutes || 60,
            status: exam.status || "draft",
            plan_id: exam.plan_id || "",
            academic_year: exam.academic_year || "",
        });
        setIsExamModalOpen(true);
    };

    const handleExamSubmit = async (e) => {
        e.preventDefault();
        if (!exam) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/university/exams/${exam.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(examForm)
            });
            const json = await res.json();
            if (json.success) {
                toast.success("Exam updated successfully");
                setIsExamModalOpen(false);
                fetchExamDetails();
            } else {
                toast.error(json.error || "Failed to update exam");
            }
        } catch (err) {
            toast.error("An error occurred");
        } finally {
            setSaving(false);
        }
    };

    const isFMGEPlan = (() => {
        if (!examForm.plan_id) return false;
        const plan = assignedPlans.find(p => p.id === examForm.plan_id);
        if (!plan) return false;
        const courseName = plan.course_name || courses.find(c => c.id === plan.course_id)?.name || "";
        return courseName.toUpperCase().includes("FMGE");
    })();

    // ========== Questions Management ==========
    const openQuestionModal = (q = null) => {
        if (q) {
            setEditingQuestion(q);
            setQuestionForm({
                question: q.question || "", option_a: q.option_a || "", option_b: q.option_b || "",
                option_c: q.option_c || "", option_d: q.option_d || "", option_e: q.option_e || "",
                option_f: q.option_f || "", correct_option: q.correct_option || "a",
                marks: q.marks || 1, explanation: q.explanation || "",
            });
        } else {
            setEditingQuestion(null);
            setQuestionForm({
                question: "", option_a: "", option_b: "", option_c: "", option_d: "",
                option_e: "", option_f: "", correct_option: "a", marks: 1, explanation: ""
            });
        }
        setIsQuestionModalOpen(true);
    };

    const handleQuestionSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = `/api/university/exams/${id}/questions`;
            const method = editingQuestion ? "PUT" : "POST";
            const payload = editingQuestion ? { ...questionForm, question_id: editingQuestion.id } : questionForm;
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            const json = await res.json();
            if (json.success) {
                toast.success(editingQuestion ? "Question updated" : "Question added");
                setIsQuestionModalOpen(false);
                fetchQuestions();
            } else {
                toast.error(json.error || "Failed");
            }
        } catch (err) {
            toast.error("Error saving question");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        if (!confirm("Delete this question?")) return;
        try {
            const res = await fetch(`/api/university/exams/${id}/questions?question_id=${questionId}`, { method: "DELETE" });
            const json = await res.json();
            if (json.success) {
                toast.success("Question deleted");
                fetchQuestions();
            } else {
                toast.error(json.error);
            }
        } catch (err) {
            toast.error("Failed to delete question");
        }
    };

    // ========== CSV Upload ==========
    const handleCSVFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) {
            setCsvContent("");
            setCsvPreviewData([]);
            return;
        }

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => setCsvPreviewData(results.data),
            error: (err) => { toast.error("Error parsing CSV"); console.error(err); }
        });

        const reader = new FileReader();
        reader.onload = (ev) => setCsvContent(ev.target.result);
        reader.readAsText(file);
    };

    const handleCSVUpload = async () => {
        if (!csvContent.trim()) return;
        setUploading(true);
        try {
            const res = await fetch(`/api/university/exams/${id}/questions/bulk-upload`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ csv_content: csvContent }),
            });
            const json = await res.json();
            if (json.success) {
                toast.success(json.message || "Questions uploaded");
                setCsvContent("");
                setCsvPreviewData([]);
                setActiveTab("questions");
                fetchQuestions();
            } else {
                toast.error(json.error || "Upload failed");
            }
        } catch (err) {
            toast.error("Upload error");
        } finally {
            setUploading(false);
        }
    };

    const downloadSampleCSV = () => {
        const csv = `question,option_a,option_b,option_c,option_d,option_e,option_f,correct_option,marks,explanation\n"What is the capital of India?","Mumbai","Delhi","Chennai","Kolkata","","","b",1,"New Delhi is the capital"\n"Which vitamin is produced by sunlight?","Vitamin A","Vitamin B","Vitamin C","Vitamin D","","","d",1,"Vitamin D is synthesized by skin"`;
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "questions_template.csv"; a.click();
        URL.revokeObjectURL(url);
    };

    if (loadingExam) {
        return <div className="py-24 flex justify-center"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>;
    }

    if (!exam) return null;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/university/exams')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{exam.name}</h1>
                        <p className="text-sm text-gray-500">{exam.subjects || "No subjects"} • {exam.duration_minutes} min</p>
                    </div>
                    <StatusBadge status={exam.status} />
                </div>
                <div className="flex gap-2">
                    <button onClick={openExamModal} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors">
                        <Pencil size={14} /> Edit Exam
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-full max-w-md">
                {["questions", "upload", "attempts"].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 px-4 text-sm font-medium rounded-lg transition-all ${activeTab === tab ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        {tab === "questions" && "Questions"}
                        {tab === "upload" && "CSV Upload"}
                        {tab === "attempts" && "Attempts"}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === "questions" && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-500">{questions.length} questions</p>
                        <button onClick={() => openQuestionModal()} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md">
                            <Plus size={14} /> Add Question
                        </button>
                    </div>

                    {loadingQuestions ? (
                        <div className="py-16 text-center"><Loader2 className="animate-spin inline" /> Loading...</div>
                    ) : questions.length === 0 ? (
                        <div className="py-16 text-center text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
                            <FileText className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                            <p>No questions yet. Add one or upload a CSV.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {questions.map((q, idx) => (
                                <div key={q.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                <span className="text-gray-400 mr-2">Q{idx + 1}.</span>
                                                {q.question}
                                            </p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                                                {["a", "b", "c", "d", "e", "f"].map(key => {
                                                    const val = q[`option_${key}`];
                                                    if (!val) return null;
                                                    const isCorrect = q.correct_option === key;
                                                    return (
                                                        <div key={key} className={`px-4 py-2 rounded-lg text-[13px] border ${isCorrect ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold" : "bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-900 dark:border-gray-600 dark:text-gray-300"}`}>
                                                            <strong>{key.toUpperCase()}.</strong> {val}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {q.explanation && (
                                                <p className="text-sm text-gray-500 mt-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800/30">
                                                    <span className="font-semibold text-blue-700 dark:text-blue-400">Explanation:</span> {q.explanation}
                                                </p>
                                            )}
                                            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mt-3">Marks: {q.marks}</p>
                                        </div>
                                        <div className="flex gap-1 ml-4 mt-1">
                                            <button onClick={() => openQuestionModal(q)} className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors tooltip" title="Edit Question"><Pencil size={14} /></button>
                                            <button onClick={() => handleDeleteQuestion(q.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors tooltip" title="Delete Question"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === "upload" && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
                    <div className="max-w-xl mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Bulk Upload Questions</h3>
                        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                            Upload a CSV file to add multiple questions at once. Ensure your file matches the required format exactly.
                        </p>

                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800 mb-6">
                            <div className="mb-2">
                                <span className="text-[11px] uppercase font-bold text-gray-400 tracking-wider">Required Columns</span>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                    {['question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option'].map(col => (
                                        <span key={col} className="bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded text-xs font-mono">{col}</span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="text-[11px] uppercase font-bold text-gray-400 tracking-wider">Optional Columns</span>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                    {['option_e', 'option_f', 'marks', 'explanation'].map(col => (
                                        <span key={col} className="bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded text-xs font-mono">{col}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button onClick={downloadSampleCSV} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline mb-6">
                            <Download size={16} /> Download Template CSV
                        </button>

                        <div className="mb-6">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleCSVFileChange}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:cursor-pointer file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                        </div>
                    </div>

                    {csvPreviewData.length > 0 && (
                        <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 overflow-hidden shadow-sm mb-6">
                            <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                <h4 className="font-semibold text-sm text-gray-900 dark:text-white">Data Preview</h4>
                                <span className="text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">{csvPreviewData.length} questions identified</span>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                                <table className="w-full text-left text-xs whitespace-nowrap">
                                    <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 sticky top-0 shadow-sm z-10">
                                        <tr>
                                            <th className="px-4 py-2 font-medium">Question</th>
                                            <th className="px-3 py-2 font-medium">Opt A</th>
                                            <th className="px-3 py-2 font-medium">Opt B</th>
                                            <th className="px-3 py-2 font-medium">Opt C</th>
                                            <th className="px-3 py-2 font-medium">Opt D</th>
                                            <th className="px-3 py-2 font-medium text-center">Correct</th>
                                            <th className="px-3 py-2 font-medium text-center">Marks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {csvPreviewData.map((row, i) => (
                                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-4 py-2 truncate max-w-[200px]" title={row.question}>{row.question}</td>
                                                <td className="px-3 py-2 truncate max-w-[100px]" title={row.option_a}>{row.option_a}</td>
                                                <td className="px-3 py-2 truncate max-w-[100px]" title={row.option_b}>{row.option_b}</td>
                                                <td className="px-3 py-2 truncate max-w-[100px]" title={row.option_c}>{row.option_c}</td>
                                                <td className="px-3 py-2 truncate max-w-[100px]" title={row.option_d}>{row.option_d}</td>
                                                <td className="px-3 py-2 font-bold text-center uppercase text-emerald-600 dark:text-emerald-400">{row.correct_option}</td>
                                                <td className="px-3 py-2 text-center text-gray-500">{row.marks || 1}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="flex border-t border-gray-100 dark:border-gray-800 pt-6">
                        <button onClick={handleCSVUpload} disabled={!csvContent || uploading} className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:shadow-none">
                            {uploading ? <Loader2 className="animate-spin w-4 h-4" /> : <Upload className="w-4 h-4" />}
                            Process & Upload CSV
                        </button>
                    </div>
                </div>
            )}

            {activeTab === "attempts" && (
                <div className="space-y-4">
                    {loadingAttempts ? (
                        <div className="py-16 text-center"><Loader2 className="animate-spin inline" /> Loading...</div>
                    ) : attempts.length === 0 ? (
                        <div className="py-16 text-center text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
                            <Users className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                            <p>No students have attempted this exam yet.</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/50">
                                    <tr>
                                        <th className="px-5 py-4 font-semibold text-gray-600 dark:text-gray-300">Attempted By</th>
                                        <th className="px-5 py-4 font-semibold text-gray-600 dark:text-gray-300">Score</th>
                                        <th className="px-5 py-4 font-semibold text-gray-600 dark:text-gray-300">Result</th>
                                        <th className="px-5 py-4 font-semibold text-gray-600 dark:text-gray-300">Submitted On</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {attempts.map(a => (
                                        <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="font-medium text-gray-900 dark:text-white">{a.student_name}</div>
                                                <div className="text-xs text-gray-500">{a.student_email}</div>
                                            </td>
                                            <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">
                                                {a.score} <span className="text-gray-400 font-normal text-xs">/ {a.total_marks}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 dark:border-blue-800/30 dark:bg-blue-900/20 dark:text-blue-400">
                                                    {a.result}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-gray-500 text-sm">
                                                {new Date(a.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Question Modal */}
            <AnimatePresence>
                {isQuestionModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setIsQuestionModalOpen(false)}>
                        <motion.div
                            initial={{ y: 20, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 10, opacity: 0, scale: 0.95 }}
                            className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white pb-4 border-b border-gray-100 dark:border-gray-800">
                                {editingQuestion ? "Edit Question" : "Create New Question"}
                            </h3>
                            <form onSubmit={handleQuestionSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">Question Text</label>
                                    <textarea value={questionForm.question} onChange={e => setQuestionForm({ ...questionForm, question: e.target.value })} required rows={3} placeholder="Enter the complete question..." className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow shadow-xs text-sm" />
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Options</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {["a", "b", "c", "d", "e", "f"].map(key => (
                                            <div key={key}>
                                                <label className="block text-xs font-semibold mb-1.5 text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                                    Option {key.toUpperCase()} {["a", "b", "c", "d"].includes(key) && <span className="text-red-500">*</span>}
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{key.toUpperCase()}.</span>
                                                    <input
                                                        value={questionForm[`option_${key}`]}
                                                        onChange={e => setQuestionForm({ ...questionForm, [`option_${key}`]: e.target.value })}
                                                        required={["a", "b", "c", "d"].includes(key)}
                                                        placeholder={`Enter option text...`}
                                                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs transition-shadow"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">Correct Answer</label>
                                        <select value={questionForm.correct_option} onChange={e => setQuestionForm({ ...questionForm, correct_option: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                            {["a", "b", "c", "d", "e", "f"]
                                                .filter(o => ["a", "b", "c", "d"].includes(o) || (questionForm[`option_${o}`] && questionForm[`option_${o}`].trim() !== ""))
                                                .map(o => <option key={o} value={o}>Option {o.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">Marks Allocated</label>
                                        <input type="number" min={1} value={questionForm.marks} onChange={e => setQuestionForm({ ...questionForm, marks: parseInt(e.target.value) || 1 })} placeholder="1" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">Explanation (Optional)</label>
                                    <textarea value={questionForm.explanation} onChange={e => setQuestionForm({ ...questionForm, explanation: e.target.value })} rows={2} placeholder="Clarify why the correct answer is right. This will be shown to users after attempting." className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow shadow-xs text-sm" />
                                </div>

                                <div className="flex justify-end gap-3 pt-5 border-t border-gray-100 dark:border-gray-800">
                                    <button type="button" onClick={() => setIsQuestionModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-md transition-all">
                                        {saving && <Loader2 className="animate-spin w-4 h-4" />}
                                        {editingQuestion ? "Save Changes" : "Create Question"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Exam Edit Modal */}
            <AnimatePresence>
                {isExamModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setIsExamModalOpen(false)}>
                        <motion.div
                            initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }}
                            className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-semibold mb-4">Edit Exam Definition</h3>
                            <form onSubmit={handleExamSubmit} className="space-y-4">
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
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-2">
                                    <button type="button" onClick={() => setIsExamModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                                        {saving && <Loader2 className="animate-spin" size={14} />}
                                        Save Changes
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
