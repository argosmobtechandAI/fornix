"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/Modal";
import { BookOpen, FileText, ArrowRight, Plus, Trash2 } from "lucide-react";

export default function PyTopicsCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, saving: false });
  const [form, setForm] = useState({
    courseId: "",
    subjectId: "",
    years: [],
    topic: "",
    subTopics: [""],
    extraExplanation: "",
  });

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 9 + i);

  useEffect(() => {
    loadCourses();
  }, []);

  // Load subjects when course changes
  useEffect(() => {
    if (form.courseId) {
      loadSubjects(form.courseId);
    } else {
      setSubjects([]);
    }
  }, [form.courseId]);

  async function loadCourses() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/courses");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load courses");

      // Fetch counts for each course
      const coursesWithCounts = await Promise.all(
        (json.data || []).map(async (course) => {
          const [subjectsRes, topicsRes] = await Promise.all([
            fetch(`/api/admin/subjects?course_id=${course.id}&limit=1000`),
            fetch(`/api/admin/py-topics?course_id=${course.id}`),
          ]);
          const subjectsData = await subjectsRes.json();
          const topicsData = await topicsRes.json();
          return {
            ...course,
            subjects_count: subjectsData.success ? (subjectsData.data?.length || 0) : 0,
            topics_count: topicsData.success ? (topicsData.data?.length || 0) : 0,
          };
        })
      );
      setCourses(coursesWithCounts);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadSubjects(courseId) {
    try {
      const res = await fetch(`/api/admin/subjects?course_id=${courseId}&limit=1000`);
      const json = await res.json();
      if (json.success) {
        setSubjects(json.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function openModal() {
    setForm({
      courseId: "",
      subjectId: "",
      years: [],
      topic: "",
      subTopics: [""],
      extraExplanation: "",
    });
    setModal({ open: true, saving: false });
  }

  function closeModal() {
    setModal({ open: false, saving: false });
  }

  function handleFormChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleYearChange(y) {
    setForm((f) => ({
      ...f,
      years: f.years.includes(y) ? f.years.filter((v) => v !== y) : [...f.years, y],
    }));
  }

  function handleSubTopicChange(idx, value) {
    setForm((f) => ({
      ...f,
      subTopics: f.subTopics.map((s, i) => (i === idx ? value : s)),
    }));
  }

  function addSubTopic() {
    setForm((f) => ({ ...f, subTopics: [...f.subTopics, ""] }));
  }

  function removeSubTopic(idx) {
    setForm((f) => ({ ...f, subTopics: f.subTopics.filter((_, i) => i !== idx) }));
  }

  async function saveTopic(e) {
    e.preventDefault();
    if (!form.courseId || !form.subjectId) {
      toast.error("Please select course and subject");
      return;
    }
    setModal((m) => ({ ...m, saving: true }));
    try {
      const payload = {
        course_id: form.courseId,
        subject_id: form.subjectId,
        years: form.years,
        topic: form.topic,
        sub_topics: form.subTopics.filter((s) => s.trim()),
        extra_explanation: form.extraExplanation,
      };

      const res = await fetch("/api/admin/py-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Save failed");
      toast.success("PY Topic created successfully!");
      closeModal();
      loadCourses(); // Refresh counts
    } catch (e) {
      toast.error(e.message);
      setModal((m) => ({ ...m, saving: false }));
    }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
              <FileText className="text-yellow-600 dark:text-yellow-400" size={32} />
              PY Topics
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Select a course to manage Past Year topics
            </p>
          </div>
          <button
            onClick={openModal}
            className="px-6 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-700 text-white font-bold flex items-center gap-2 shadow-lg transition-all"
          >
            <Plus size={20} />
            Add PY Topic
          </button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No courses found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course) => (
              <button
                key={course.id}
                onClick={() => router.push(`/admin/py-topics/${course.id}`)}
                className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-xl hover:border-yellow-400 dark:hover:border-yellow-500 transition-all duration-300 text-left relative overflow-hidden"
              >
                {/* Decorative gradient */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-yellow-100 dark:from-yellow-900/20 to-transparent rounded-bl-full opacity-50 group-hover:opacity-100 transition-opacity"></div>

                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl group-hover:bg-yellow-100 dark:group-hover:bg-yellow-900/30 transition-colors">
                      <BookOpen className="text-yellow-600 dark:text-yellow-400" size={28} />
                    </div>
                    <ArrowRight className="text-gray-400 group-hover:text-yellow-600 group-hover:translate-x-1 transition-all" size={20} />
                  </div>

                  <h3 className="font-bold text-gray-900 dark:text-white text-xl mb-2 line-clamp-2">
                    {course.name}
                  </h3>

                  {course.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-6">
                      {course.description}
                    </p>
                  )}

                  <div className="flex gap-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                        {course.subjects_count}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide mt-1">
                        Subjects
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                        {course.topics_count}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide mt-1">
                        PY Topics
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add PY Topic Modal */}
      <Modal open={modal.open} onClose={closeModal}>
        <div className="rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl w-full mx-auto border border-yellow-200 dark:border-yellow-700">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
            <Plus className="text-yellow-600" size={24} /> Add PY Topic
          </h2>

          <form onSubmit={saveTopic} className="space-y-5">
            {/* Course Selection */}
            <div>
              <label className="block font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Course <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border border-gray-300 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-400"
                value={form.courseId}
                onChange={(e) => {
                  handleFormChange("courseId", e.target.value);
                  handleFormChange("subjectId", "");
                }}
                required
              >
                <option value="">Select Course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Subject Selection */}
            <div>
              <label className="block font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border border-gray-300 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
                value={form.subjectId}
                onChange={(e) => handleFormChange("subjectId", e.target.value)}
                required
                disabled={!form.courseId}
              >
                <option value="">Select Subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {!form.courseId && (
                <p className="text-sm text-gray-500 mt-1">Select a course first</p>
              )}
            </div>

            {/* Topic Name */}
            <div>
              <label className="block font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Topic Name <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border border-gray-300 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-400"
                value={form.topic}
                onChange={(e) => handleFormChange("topic", e.target.value)}
                required
                placeholder="Enter topic name"
              />
            </div>

            {/* Years */}
            <div>
              <label className="block font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Years (Last 10)
              </label>
              <div className="flex flex-wrap gap-2">
                {yearOptions.map((y) => (
                  <label
                    key={y}
                    className={`flex items-center gap-1 px-4 py-2 rounded-full border cursor-pointer transition-all text-sm font-medium ${
                      form.years.includes(y)
                        ? "bg-yellow-500 text-white border-yellow-600 shadow-md"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      value={y}
                      checked={form.years.includes(y)}
                      onChange={() => handleYearChange(y)}
                      className="hidden"
                    />
                    {y}
                  </label>
                ))}
              </div>
            </div>

            {/* Sub Topics */}
            <div>
              <label className="block font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Sub Topics
              </label>
              {form.subTopics.map((s, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input
                    className="flex-1 border border-gray-300 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-400"
                    value={s}
                    onChange={(e) => handleSubTopicChange(idx, e.target.value)}
                    placeholder={`Sub Topic ${idx + 1}`}
                  />
                  {form.subTopics.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSubTopic(idx)}
                      className="px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addSubTopic}
                className="text-yellow-600 hover:text-yellow-700 font-medium text-sm mt-1 flex items-center gap-1"
              >
                <Plus size={16} /> Add Sub Topic
              </button>
            </div>

            {/* Extra Explanation */}
            <div>
              <label className="block font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Extra Explanation
              </label>
              <textarea
                className="w-full border border-gray-300 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-400"
                value={form.extraExplanation}
                onChange={(e) => handleFormChange("extraExplanation", e.target.value)}
                rows={3}
                placeholder="Any extra notes or explanation..."
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
              disabled={modal.saving}
            >
              {modal.saving ? "Saving..." : "Save PY Topic"}
            </button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
