"use client";
import { useEffect, useState } from "react";
import {
  Copy,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  BookOpen,
  Image as ImageIcon,
  Video,
  ChevronRight,
  ChevronLeft,
  X,
  List,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function CloneCoursePage() {
  const router = useRouter();

  // Data State
  const [allCourses, setAllCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [courseSubjects, setCourseSubjects] = useState({}); // { courseId: [subjects...] }
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Wizard Step
  const [step, setStep] = useState(1);

  // Step 1: Basic Info
  const [cloneName, setCloneName] = useState("");
  const [cloneDesc, setCloneDesc] = useState("");
  const [tutorialVideoUrl, setTutorialVideoUrl] = useState("");
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState("");

  // Step 2: Course Selection
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);

  // Step 3: Subject Selection
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);

  // Step 4: Cloning Progress
  const [cloning, setCloning] = useState(false);
  const [cloneStatus, setCloneStatus] = useState("idle"); // idle, cloning, done, error
  const [cloneResult, setCloneResult] = useState(null);
  const [cloneError, setCloneError] = useState(null);

  // Fetch all courses on mount
  useEffect(() => {
    async function fetchCourses() {
      try {
        setLoadingCourses(true);
        const res = await fetch("/api/admin/courses");
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        setAllCourses(json.data);
      } catch (err) {
        toast.error("Failed to load courses");
      } finally {
        setLoadingCourses(false);
      }
    }
    fetchCourses();
  }, []);

  // Fetch subjects whenever selected courses change
  useEffect(() => {
    async function fetchSubjectsForCourses() {
      if (selectedCourseIds.length === 0) {
        setCourseSubjects({});
        setSelectedSubjectIds([]);
        return;
      }

      setLoadingSubjects(true);
      const subjectsMap = {};
      const newSubjectIds = [];

      try {
        // Fetch subjects for all selected courses (could be optimized with a single API call if backend supports it, but fetching individually works fine for few courses)
        for (const courseId of selectedCourseIds) {
          if (courseSubjects[courseId]) {
            subjectsMap[courseId] = courseSubjects[courseId];
            newSubjectIds.push(...courseSubjects[courseId].map(s => s.id));
            continue;
          }

          const res = await fetch(`/api/admin/subjects?course_id=${courseId}&limit=1000`);
          const json = await res.json();
          if (json.success) {
            subjectsMap[courseId] = json.data || [];
            newSubjectIds.push(...(json.data || []).map(s => s.id));
          }
        }
        setCourseSubjects(subjectsMap);
        // By default, select all newly fetched subjects
        setSelectedSubjectIds(newSubjectIds);
      } catch (err) {
        toast.error("Failed to load subjects for selected courses");
      } finally {
        setLoadingSubjects(false);
      }
    }

    fetchSubjectsForCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseIds]);

  const handleIconChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  };

  const toggleCourseSelection = (courseId) => {
    if (selectedCourseIds.includes(courseId)) {
      setSelectedCourseIds(prev => prev.filter(id => id !== courseId));
    } else {
      setSelectedCourseIds(prev => [...prev, courseId]);
    }
  };

  const toggleSubjectSelection = (subjectId) => {
    if (selectedSubjectIds.includes(subjectId)) {
      setSelectedSubjectIds(prev => prev.filter(id => id !== subjectId));
    } else {
      setSelectedSubjectIds(prev => [...prev, subjectId]);
    }
  };

  const toggleAllSubjectsForCourse = (courseId, selectAll) => {
    const subjectsInCourse = courseSubjects[courseId] || [];
    const ids = subjectsInCourse.map(s => s.id);

    if (selectAll) {
      // Add any missing IDs
      setSelectedSubjectIds(prev => {
        const set = new Set([...prev, ...ids]);
        return Array.from(set);
      });
    } else {
      // Remove all these IDs
      setSelectedSubjectIds(prev => prev.filter(id => !ids.includes(id)));
    }
  };

  const uploadIcon = async (courseId, file) => {
    try {
      const formData = new FormData();
      formData.append("id", courseId);
      formData.append("icon", file);

      const res = await fetch("/api/admin/courses/update-icon", {
        method: "PUT",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    } catch (err) {
      toast.error("Course created, but icon upload failed");
    }
  };

  const startClone = async () => {
    setCloning(true);
    setCloneStatus("cloning");
    setCloneError(null);

    try {
      // 1. Hit Clone API
      const res = await fetch("/api/admin/courses/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cloneName.trim(),
          description: cloneDesc,
          tutorial_video_url: tutorialVideoUrl,
          subject_ids: selectedSubjectIds,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      // 2. Upload Icon if present
      if (iconFile && json.new_course?.id) {
        await uploadIcon(json.new_course.id, iconFile);
      }

      setCloneResult(json);
      setCloneStatus("done");
      toast.success("Course cloned successfully!");
    } catch (err) {
      setCloneError(err.message);
      setCloneStatus("error");
      toast.error(err.message);
    } finally {
      setCloning(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setCloneName("");
    setCloneDesc("");
    setTutorialVideoUrl("");
    setIconFile(null);
    setIconPreview("");
    setSelectedCourseIds([]);
    setSelectedSubjectIds([]);
    setCloneStatus("idle");
    setCloneResult(null);
    setCloneError(null);
  };

  const navigateToSubjects = (courseId) => {
    router.push(`/admin/questions?course_id=${courseId}`);
  };

  return (
    <div className="min-h-screen  dark:from-gray-900 dark:to-gray-800 ">
      <Toaster position="top-right" />
      <div className="mx-auto max-w-full">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg">
              <Copy className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Advanced Course Cloning
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Create a new course by merging and copying subjects from multiple existing courses.
              </p>
            </div>
          </div>
        </div>

        {/* Wizard Progress Bar */}
        {cloneStatus === "idle" && (
          <div className="mb-12 px-2 sm:px-6">
            <div className="flex items-center">
              {[
                { num: 1, label: "Basic Details" },
                { num: 2, label: "Source Courses" },
                { num: 3, label: "Select Subjects" }
              ].map((s, index) => (
                <div key={s.num} className={`flex items-center ${index < 2 ? 'flex-1' : 'flex-none'}`}>
                  <div className="relative flex flex-col items-center justify-center">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-base border-4 transition-all duration-300 z-10 ${step >= s.num
                      ? "bg-orange-500 border-orange-100 dark:border-orange-900/50 text-white"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400"
                      }`}>
                      {step > s.num ? <CheckCircle2 size={20} /> : s.num}
                    </div>
                    <div className={`absolute top-12 sm:top-14 whitespace-nowrap text-xs sm:text-sm font-semibold transition-colors ${step >= s.num ? "text-orange-600 dark:text-orange-400" : "text-gray-400 dark:text-gray-500"}`}>
                      {s.label}
                    </div>
                  </div>
                  {index < 2 && (
                    <div className="flex-1 h-1.5 mx-2 sm:mx-4 rounded-full bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                      <div className={`absolute top-0 left-0 h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-500 ${step > s.num ? 'w-full' : 'w-0'}`}></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8">

          {/* STEP 1: Basic Information */}
          {step === 1 && cloneStatus === "idle" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  New Course Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={cloneName}
                    onChange={(e) => setCloneName(e.target.value)}
                    placeholder="E.g., NEET PG Grand Mix 2026"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  value={cloneDesc}
                  onChange={(e) => setCloneDesc(e.target.value)}
                  placeholder="Describe what this new cloned course offers..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Tutorial / Promo Video URL (Optional)
                </label>
                <div className="relative">
                  <Video className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="url"
                    value={tutorialVideoUrl}
                    onChange={(e) => setTutorialVideoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Course Icon (Optional)
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-900">
                    {iconPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={iconPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="text-gray-400" size={24} />
                    )}
                  </div>
                  <div>
                    <label className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors shadow-sm">
                      Upload Image
                      <input type="file" accept="image/*" onChange={handleIconChange} className="hidden" />
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Square PNG/JPG, max 5MB</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!cloneName.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-700 hover:to-amber-800 text-white rounded-xl shadow-md transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next Step <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Select Source Courses */}
          {step === 2 && cloneStatus === "idle" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Choose Source Courses</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Select one or more courses to pull subjects from.</p>
              </div>

              {loadingCourses ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin text-orange-500" size={32} />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto custom-scrollbar p-1">
                  {allCourses.map((course) => {
                    const isSelected = selectedCourseIds.includes(course.id);
                    return (
                      <div
                        key={course.id}
                        onClick={() => toggleCourseSelection(course.id)}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700"
                          }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? "bg-orange-500 border-orange-500 text-white" : "border-gray-300 dark:border-gray-600"
                          }`}>
                          {isSelected && <CheckCircle2 size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold truncate text-sm ${isSelected ? "text-orange-800 dark:text-orange-200" : "text-gray-900 dark:text-white"}`}>
                            {course.name}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-6 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-medium"
                >
                  <ChevronLeft size={20} /> Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={selectedCourseIds.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-700 hover:to-amber-800 text-white rounded-xl shadow-md transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Choose Subjects <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Select Subjects */}
          {step === 3 && cloneStatus === "idle" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Select Subjects to Clone</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Check the subjects you want to duplicate into your new course.</p>
              </div>

              {loadingSubjects ? (
                <div className="flex flex-col items-center py-12">
                  <Loader2 className="animate-spin text-orange-500 mb-4" size={32} />
                  <p className="text-gray-500">Fetching subjects from selected courses...</p>
                </div>
              ) : selectedCourseIds.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No courses selected.</div>
              ) : (
                <div className="space-y-6 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                  {selectedCourseIds.map(courseId => {
                    const course = allCourses.find(c => c.id === courseId);
                    const subjects = courseSubjects[courseId] || [];
                    const courseSubjectIds = subjects.map(s => s.id);
                    const allSelected = courseSubjectIds.length > 0 && courseSubjectIds.every(id => selectedSubjectIds.includes(id));

                    if (subjects.length === 0) return null;

                    return (
                      <div key={courseId} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                          <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <BookOpen size={18} className="text-orange-500" />
                            {course?.name}
                          </h4>
                          <button
                            onClick={() => toggleAllSubjectsForCourse(courseId, !allSelected)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300"
                          >
                            {allSelected ? "Deselect All" : "Select All"}
                          </button>
                        </div>
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {subjects.map(subject => {
                            const isSelected = selectedSubjectIds.includes(subject.id);
                            return (
                              <div
                                key={subject.id}
                                onClick={() => toggleSubjectSelection(subject.id)}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected
                                  ? "border-orange-500 bg-white dark:bg-gray-800 shadow-sm"
                                  : "border-gray-200 dark:border-gray-700 hover:border-orange-300 bg-white/50 dark:bg-gray-800/50 opacity-70 hover:opacity-100"
                                  }`}
                              >
                                <div className={`w-4 h-4 rounded-sm flex items-center justify-center border transition-colors ${isSelected ? "bg-orange-500 border-orange-500 text-white" : "border-gray-300 dark:border-gray-600"
                                  }`}>
                                  {isSelected && <CheckCircle2 size={12} />}
                                </div>
                                <span className={`text-sm font-medium truncate ${isSelected ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"}`}>
                                  {subject.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-4">
                <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <List size={18} />
                  <strong>{selectedSubjectIds.length}</strong> subjects selected to be cloned.
                </p>
              </div>

              <div className="pt-6 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-medium"
                >
                  <ChevronLeft size={20} /> Back
                </button>
                <button
                  onClick={startClone}
                  disabled={selectedSubjectIds.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-700 hover:to-amber-800 text-white rounded-xl shadow-md transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Copy size={20} /> Start Cloning
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Cloning Progress & Done */}
          {cloneStatus === "cloning" && (
            <div className="py-12 space-y-8 text-center max-w-lg mx-auto">
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-orange-100 dark:border-orange-900/30 flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-orange-600 dark:text-orange-500 animate-spin" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Cloning in Progress</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Deep copying {selectedSubjectIds.length} subjects. Please do not close this page.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-left max-w-sm mx-auto">
                {[
                  "Creating new course profile...",
                  "Duplicating selected subjects...",
                  "Cloning chapters & topics...",
                  "Copying questions & answers...",
                  "Finalizing and uploading icon...",
                ].map((stepLabel, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <Loader2 className="w-5 h-5 text-orange-500 animate-spin shrink-0" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{stepLabel}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cloneStatus === "error" && (
            <div className="py-12 text-center space-y-6 max-w-lg mx-auto">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-2">Clone Failed</h3>
                <p className="text-red-600 dark:text-red-400">{cloneError}</p>
              </div>
              <button
                onClick={() => setCloneStatus("idle")}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all font-medium"
              >
                Go Back & Try Again
              </button>
            </div>
          )}

          {cloneStatus === "done" && cloneResult && (
            <div className="py-8 space-y-8 max-w-2xl mx-auto animate-in zoom-in-95 duration-500">
              <div className="text-center space-y-4">
                <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto shadow-sm border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-green-800 dark:text-green-200">Clone Successful!</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    <strong>{cloneResult.new_course?.name}</strong> has been successfully generated.
                  </p>
                </div>
              </div>

              {/* Summary Grid */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 text-center">
                  Clone Summary
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Subjects", value: cloneResult.summary.subjects, color: "text-blue-600 dark:text-blue-400" },
                    { label: "Chapters", value: cloneResult.summary.chapters, color: "text-purple-600 dark:text-purple-400" },
                    { label: "Topics", value: cloneResult.summary.topics, color: "text-indigo-600 dark:text-indigo-400" },
                    { label: "Questions", value: cloneResult.summary.questions, color: "text-emerald-600 dark:text-emerald-400" },
                    { label: "Options", value: cloneResult.summary.options, color: "text-amber-600 dark:text-amber-400" },
                    { label: "Answers", value: cloneResult.summary.correct_answers, color: "text-teal-600 dark:text-teal-400" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center transition-all hover:scale-105 duration-200">
                      <p className={`text-3xl font-black ${color}`}>{value.toLocaleString()}</p>
                      <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <button
                  onClick={resetForm}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-medium"
                >
                  Create Another Clone
                </button>
                <button
                  onClick={() => navigateToSubjects(cloneResult.new_course?.id)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-700 hover:to-amber-800 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-medium"
                >
                  View New Subjects <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
