"use client";

import { useState, useEffect, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
    ArrowLeft, Filter, Search, Loader2, CheckSquare, Square,
    ChevronDown, ChevronUp, BookOpen, Layers, FileText, Zap, Save
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FMGE_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Final Year"];
const DIFFICULTY_LEVELS = [
    { value: "easy", label: "Easy", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
    { value: "moderate", label: "Moderate", color: "bg-amber-100 text-amber-700 border-amber-300" },
    { value: "difficult", label: "Difficult", color: "bg-red-100 text-red-700 border-red-300" },
];

export default function ManualQuizPage() {
    const router = useRouter();

    // Filter states
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [isFMGE, setIsFMGE] = useState(false);
    const [selectedYear, setSelectedYear] = useState("");

    const [subjects, setSubjects] = useState([]);
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [loadingSubjects, setLoadingSubjects] = useState(false);

    const [chapters, setChapters] = useState([]);
    const [selectedChapters, setSelectedChapters] = useState([]);
    const [loadingChapters, setLoadingChapters] = useState(false);

    const [selectedDifficulties, setSelectedDifficulties] = useState([]);

    // Questions states
    const [questions, setQuestions] = useState([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState(new Set());

    // Exam form
    const [examName, setExamName] = useState("");
    const [examDescription, setExamDescription] = useState("");
    const [examDuration, setExamDuration] = useState(60);
    const [saving, setSaving] = useState(false);

    // Plans
    const [assignedPlans, setAssignedPlans] = useState([]);
    const [selectedPlanId, setSelectedPlanId] = useState("");

    // Expanded/collapsed sections
    const [filtersExpanded, setFiltersExpanded] = useState(true);

    // ==================== Fetch ONLY assigned courses & plans ====================
    useEffect(() => {
        const init = async () => {
            try {
                // 1) Get university students API which returns assignedPlans with course_name & course_id
                const plansRes = await fetch("/api/university/students");
                const plansJson = await plansRes.json();

                let plans = [];
                if (plansJson.success) {
                    plans = plansJson.data?.assignedPlans || [];
                    setAssignedPlans(plans);
                }

                // 2) Extract unique courses from the assigned plans
                const courseMap = new Map();
                for (const plan of plans) {
                    if (plan.course_id && !courseMap.has(plan.course_id)) {
                        courseMap.set(plan.course_id, {
                            id: plan.course_id,
                            name: plan.course_name || "Unknown Course",
                        });
                    }
                }
                setCourses([...courseMap.values()]);
            } catch (e) {
                console.error(e);
            }
        };
        init();
    }, []);

    // ==================== When course changes, fetch subjects ====================
    useEffect(() => {
        if (!selectedCourse) {
            setSubjects([]);
            setSelectedSubjects([]);
            setChapters([]);
            setSelectedChapters([]);
            setQuestions([]);
            return;
        }

        const courseName = courses.find(c => c.id === selectedCourse)?.name || "";
        setIsFMGE(courseName.toUpperCase().includes("FMGE"));
        setSelectedYear("");
        setSelectedSubjects([]);
        setChapters([]);
        setSelectedChapters([]);
        setQuestions([]);

        fetchSubjects(selectedCourse, "");
    }, [selectedCourse]);

    // ==================== When year changes (FMGE), re-fetch subjects ====================
    useEffect(() => {
        if (selectedCourse && isFMGE) {
            setSelectedSubjects([]);
            setChapters([]);
            setSelectedChapters([]);
            setQuestions([]);
            fetchSubjects(selectedCourse, selectedYear);
        }
    }, [selectedYear]);

    const fetchSubjects = async (courseId, year) => {
        setLoadingSubjects(true);
        try {
            let url = `/api/university/subjects?course_id=${courseId}`;
            if (year) url += `&academic_year=${encodeURIComponent(year)}`;
            const res = await fetch(url);
            const json = await res.json();
            if (json.success) {
                setSubjects(json.data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingSubjects(false);
        }
    };

    // ==================== When subjects change, fetch chapters ====================
    useEffect(() => {
        if (selectedSubjects.length === 0) {
            setChapters([]);
            setSelectedChapters([]);
            return;
        }
        fetchChapters(selectedSubjects);
    }, [selectedSubjects]);

    const fetchChapters = async (subjectIds) => {
        setLoadingChapters(true);
        try {
            const allChapters = [];
            for (const subId of subjectIds) {
                const res = await fetch("/api/v1/chapters", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ subject_id: subId }),
                });
                const json = await res.json();
                if (json.success) {
                    const subjectName = subjects.find(s => s.id === subId)?.name || "";
                    for (const ch of json.data || []) {
                        allChapters.push({ ...ch, subject_name: subjectName, subject_id: subId });
                    }
                }
            }
            setChapters(allChapters);
            setSelectedChapters([]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingChapters(false);
        }
    };

    // ==================== Fetch questions ====================
    const fetchQuestions = useCallback(async (page = 1) => {
        if (!selectedCourse) {
            toast.error("Please select a course first");
            return;
        }

        setLoadingQuestions(true);
        setCurrentPage(page);
        try {
            const res = await fetch("/api/university/exams/manual-quiz/questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    course_id: selectedCourse,
                    academic_year: isFMGE ? selectedYear : null,
                    subject_ids: selectedSubjects,
                    chapter_ids: selectedChapters,
                    question_types: selectedDifficulties,
                    page,
                    limit: 20,
                }),
            });
            const json = await res.json();
            if (json.success) {
                setQuestions(json.data || []);
                setTotalQuestions(json.pagination?.total || 0);
                setTotalPages(json.pagination?.totalPages || 0);
            } else {
                toast.error(json.error || "Failed to fetch questions");
            }
        } catch (e) {
            toast.error("Error fetching questions");
        } finally {
            setLoadingQuestions(false);
        }
    }, [selectedCourse, isFMGE, selectedYear, selectedSubjects, selectedChapters, selectedDifficulties]);

    // ==================== Toggle selection ====================
    const toggleSubject = (id) => {
        setSelectedSubjects(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleChapter = (id) => {
        setSelectedChapters(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleDifficulty = (value) => {
        setSelectedDifficulties(prev =>
            prev.includes(value) ? prev.filter(x => x !== value) : [...prev, value]
        );
    };

    const toggleQuestionSelect = (id) => {
        setSelectedQuestionIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAllOnPage = () => {
        setSelectedQuestionIds(prev => {
            const next = new Set(prev);
            questions.forEach(q => next.add(q.id));
            return next;
        });
    };

    const deselectAllOnPage = () => {
        setSelectedQuestionIds(prev => {
            const next = new Set(prev);
            questions.forEach(q => next.delete(q.id));
            return next;
        });
    };

    // ==================== Create quiz ====================
    const handleCreateQuiz = async () => {
        if (!examName.trim()) {
            toast.error("Please enter an exam name");
            return;
        }
        if (selectedQuestionIds.size === 0) {
            toast.error("Please select at least one question");
            return;
        }

        setSaving(true);
        try {
            const subjectNames = selectedSubjects
                .map(id => subjects.find(s => s.id === id)?.name)
                .filter(Boolean)
                .join(", ");

            const res = await fetch("/api/university/exams/manual-quiz/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: examName.trim(),
                    description: examDescription.trim(),
                    duration_minutes: examDuration,
                    status: "draft",
                    plan_id: selectedPlanId || null,
                    academic_year: isFMGE ? selectedYear : null,
                    subjects: subjectNames,
                    question_ids: [...selectedQuestionIds],
                }),
            });
            const json = await res.json();
            if (json.success) {
                toast.success(json.message || "Quiz created!");
                router.push("/university/exams");
            } else {
                toast.error(json.error || "Failed to create quiz");
            }
        } catch (e) {
            toast.error("Error creating quiz");
        } finally {
            setSaving(false);
        }
    };

    // ==================== UI Helpers ====================
    const allPageSelected = questions.length > 0 && questions.every(q => selectedQuestionIds.has(q.id));

    const getDifficultyBadge = (type) => {
        const level = DIFFICULTY_LEVELS.find(d => d.value === type);
        if (!level) return "bg-gray-100 text-gray-600";
        return level.color;
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <Toaster />

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => router.push("/university/exams")}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                        Manual Quiz Builder
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Filter and select questions from the question bank to create a quiz
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT COLUMN: Filters */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Filter Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {/* Collapse Toggle */}
                        <button
                            onClick={() => setFiltersExpanded(!filtersExpanded)}
                            className="w-full flex items-center justify-between p-5 text-left"
                        >
                            <div className="flex items-center gap-3">
                                <Filter size={20} className="text-orange-500" />
                                <span className="font-semibold text-gray-900 dark:text-white">Filters</span>
                            </div>
                            {filtersExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>

                        <AnimatePresence>
                            {filtersExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-gray-100 dark:border-gray-700"
                                >
                                    <div className="p-5 space-y-5">

                                        {/* STEP 1: Course */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                <BookOpen size={14} className="inline mr-1.5" />
                                                Course / Exam
                                            </label>
                                            <select
                                                value={selectedCourse || ""}
                                                onChange={(e) => setSelectedCourse(e.target.value || null)}
                                                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 transition-colors"
                                            >
                                                <option value="">Select a course...</option>
                                                {courses.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* STEP 2: Year (FMGE only) */}
                                        {isFMGE && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                    <Layers size={14} className="inline mr-1.5" />
                                                    Academic Year
                                                </label>
                                                <select
                                                    value={selectedYear}
                                                    onChange={(e) => setSelectedYear(e.target.value)}
                                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 transition-colors"
                                                >
                                                    <option value="">All Years</option>
                                                    {FMGE_YEARS.map(y => (
                                                        <option key={y} value={y}>{y}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {/* STEP 3: Subjects (Multi-Select) */}
                                        {selectedCourse && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                    <FileText size={14} className="inline mr-1.5" />
                                                    Subjects
                                                    {selectedSubjects.length > 0 && (
                                                        <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                                            {selectedSubjects.length} selected
                                                        </span>
                                                    )}
                                                </label>
                                                {loadingSubjects ? (
                                                    <div className="flex items-center gap-2 text-gray-400 py-2">
                                                        <Loader2 size={16} className="animate-spin" /> Loading subjects...
                                                    </div>
                                                ) : subjects.length === 0 ? (
                                                    <p className="text-sm text-gray-400">No subjects found for this selection.</p>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                                                        {subjects.map(s => (
                                                            <button
                                                                key={s.id}
                                                                onClick={() => toggleSubject(s.id)}
                                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${selectedSubjects.includes(s.id)
                                                                    ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                                                                    : "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-orange-300"
                                                                    }`}
                                                            >
                                                                {s.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* STEP 4: Chapters (Multi-Select) */}
                                        {selectedSubjects.length > 0 && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                    <Layers size={14} className="inline mr-1.5" />
                                                    Chapters
                                                    {selectedChapters.length > 0 && (
                                                        <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                                            {selectedChapters.length} selected
                                                        </span>
                                                    )}
                                                </label>
                                                {loadingChapters ? (
                                                    <div className="flex items-center gap-2 text-gray-400 py-2">
                                                        <Loader2 size={16} className="animate-spin" /> Loading chapters...
                                                    </div>
                                                ) : chapters.length === 0 ? (
                                                    <p className="text-sm text-gray-400">No chapters found for the selected subjects.</p>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                                                        {chapters.map(ch => (
                                                            <button
                                                                key={ch.id}
                                                                onClick={() => toggleChapter(ch.id)}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedChapters.includes(ch.id)
                                                                    ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                                                                    : "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-orange-300"
                                                                    }`}
                                                                title={ch.subject_name}
                                                            >
                                                                {ch.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* STEP 5: Difficulty (Multi-Select) */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                                <Zap size={14} className="inline mr-1.5" />
                                                Difficulty Level
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {DIFFICULTY_LEVELS.map(dl => (
                                                    <button
                                                        key={dl.value}
                                                        onClick={() => toggleDifficulty(dl.value)}
                                                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${selectedDifficulties.includes(dl.value)
                                                            ? dl.color + " ring-2 ring-offset-1 shadow-sm"
                                                            : "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-400"
                                                            }`}
                                                    >
                                                        {dl.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Fetch Button */}
                                        <button
                                            onClick={() => { setSelectedQuestionIds(new Set()); fetchQuestions(1); }}
                                            disabled={!selectedCourse || loadingQuestions}
                                            className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                        >
                                            {loadingQuestions ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                                            {loadingQuestions ? "Searching..." : "Fetch Questions"}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Questions List */}
                    {(questions.length > 0 || loadingQuestions) && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                            {/* Question List Header */}
                            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">
                                        Questions
                                        <span className="ml-2 text-sm font-normal text-gray-500">
                                            ({totalQuestions} available)
                                        </span>
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={allPageSelected ? deselectAllOnPage : selectAllOnPage}
                                        className="text-sm text-orange-600 hover:text-orange-800 font-medium"
                                    >
                                        {allPageSelected ? "Deselect Page" : "Select All on Page"}
                                    </button>
                                </div>
                            </div>

                            {loadingQuestions ? (
                                <div className="flex items-center justify-center py-20">
                                    <Loader2 size={28} className="animate-spin text-orange-500" />
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {questions.map((q, idx) => (
                                        <div
                                            key={q.id}
                                            className={`p-4 flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer ${selectedQuestionIds.has(q.id) ? "bg-orange-50/50 dark:bg-orange-900/10" : ""
                                                }`}
                                            onClick={() => toggleQuestionSelect(q.id)}
                                        >
                                            {/* Checkbox */}
                                            <div className="pt-0.5 flex-shrink-0">
                                                {selectedQuestionIds.has(q.id)
                                                    ? <CheckSquare size={20} className="text-orange-500" />
                                                    : <Square size={20} className="text-gray-300" />
                                                }
                                            </div>

                                            {/* Question Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                                                    <span className="font-medium text-gray-500 mr-1.5">
                                                        {(currentPage - 1) * 20 + idx + 1}.
                                                    </span>
                                                    {q.question_text}
                                                </p>

                                                {/* Options */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-2">
                                                    {(q.options || []).map(opt => (
                                                        <div
                                                            key={opt.option_key}
                                                            className={`text-xs px-2 py-1 rounded ${opt.option_key === q.correct_answer
                                                                ? "bg-emerald-50 text-emerald-700 font-medium border border-emerald-200"
                                                                : "text-gray-500"
                                                                }`}
                                                        >
                                                            <span className="font-medium uppercase">{opt.option_key}.</span> {opt.content}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Meta Badge */}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getDifficultyBadge(q.question_type)}`}>
                                                        {q.question_type}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">{q.marks} mark{q.marks > 1 ? "s" : ""}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                    <button
                                        onClick={() => fetchQuestions(currentPage - 1)}
                                        disabled={currentPage <= 1}
                                        className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-sm text-gray-500">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => fetchQuestions(currentPage + 1)}
                                        disabled={currentPage >= totalPages}
                                        className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Exam Details + Selection Counter */}
                <div className="space-y-6">

                    {/* Selected Counter */}
                    <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-6 text-white shadow-lg">
                        <div className="text-center">
                            <p className="text-orange-200 text-sm font-medium mb-1">Selected Questions</p>
                            <p className="text-5xl font-bold">{selectedQuestionIds.size}</p>
                        </div>
                    </div>

                    {/* Exam Form */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Save size={16} className="text-orange-500" />
                            Quiz Details
                        </h3>

                        <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Quiz Name *</label>
                            <input
                                type="text"
                                value={examName}
                                onChange={(e) => setExamName(e.target.value)}
                                placeholder="e.g. Anatomy Mid-Term Quiz"
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Description</label>
                            <textarea
                                value={examDescription}
                                onChange={(e) => setExamDescription(e.target.value)}
                                rows={2}
                                placeholder="Optional description..."
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 transition-colors resize-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Duration (minutes)</label>
                            <input
                                type="number"
                                min={1}
                                value={examDuration}
                                onChange={(e) => setExamDuration(Number(e.target.value))}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Assign to Plan</label>
                            <select
                                value={selectedPlanId}
                                onChange={(e) => setSelectedPlanId(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 transition-colors"
                            >
                                <option value="">No plan (standalone)</option>
                                {assignedPlans.map(p => (
                                    <option key={p.id} value={p.id}>{p.name || p.plan_name || p.id}{p.course_name ? ` (${p.course_name})` : ""}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleCreateQuiz}
                            disabled={saving || selectedQuestionIds.size === 0 || !examName.trim()}
                            className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {saving ? "Creating Quiz..." : `Create Quiz (${selectedQuestionIds.size} questions)`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
