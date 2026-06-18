"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/Modal";
import { Zap, Plus, Trash2, Pencil, Eye } from "lucide-react";

export default function MockTestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({
    open: false,
    mode: "create",
    item: null,
    saving: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [testsRes, coursesRes] = await Promise.all([
        fetch("/api/admin/mock-tests"),
        fetch("/api/admin/courses"),
      ]);

      const testsJson = await testsRes.json();
      const coursesJson = await coursesRes.json();

      if (testsJson.success) setTests(testsJson.tests);
      if (coursesJson.success) setCourses(coursesJson.data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setModal({ open: true, mode: "create", item: null, saving: false });
  }

  function openEdit(item) {
    setModal({ open: true, mode: "edit", item, saving: false });
  }

  function closeModal() {
    setModal({ open: false, mode: "create", item: null, saving: false });
  }

  async function saveTest(data) {
    try {
      setModal((m) => ({ ...m, saving: true }));

      const isEdit = modal.mode === "edit" && modal.item?.id;
      const url = isEdit ? `/api/admin/mock-tests/${modal.item.id}` : "/api/admin/mock-tests";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Save failed");

      if (isEdit) {
        toast.success("Test updated");
      } else {
        const count = json.tests?.length || 1;
        toast.success(`Created ${count} test${count !== 1 ? "s" : ""}`);
      }
      closeModal();
      loadData();
    } catch (e) {
      toast.error(e.message);
      setModal((m) => ({ ...m, saving: false }));
    }
  }

  async function deleteTest(id) {
    if (!confirm("Delete this mock test?")) return;
    try {
      const res = await fetch(`/api/admin/mock-tests/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Delete failed");
      toast.success("Test deleted");
      loadData();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Zap className="text-yellow-600 dark:text-yellow-400" />
              Mock Tests
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Create and manage mock tests for students
            </p>
          </div>
          <button
            onClick={openCreate}
            className="px-4 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-700 text-white font-semibold flex items-center gap-2 shadow-lg shadow-yellow-500/20"
          >
            <Plus size={20} />
            Create Test
          </button>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading tests...</span>
            </div>
          </div>
        ) : tests.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 text-center">
            <p className="text-gray-500 dark:text-gray-400">No mock tests found.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {tests.length} test{tests.length !== 1 ? "s" : ""}
              </div>
            </div>

            <div className="flex flex-col">
              {tests.map((test) => (
                <div key={test.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-0">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {test.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {test.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-2 flex-wrap">
                        <span>{test.course?.name}</span>
                        <span>•</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {(test.subjects || []).map((subject, idx) => (
                            <span key={subject?.id || idx} className="px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                              {subject?.name}
                            </span>
                          ))}
                        </div>
                        <span>•</span>
                        <span>{test.total_questions} Questions</span>
                        <span>•</span>
                        <span>{test.duration_minutes} mins</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => router.push(`/admin/mock-tests/${test.id}`)}
                        className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                        title="View/Edit"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => openEdit(test)}
                        className="p-2 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => deleteTest(test.id)}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Modal
          open={modal.open}
          onClose={closeModal}
          title={modal.mode === "edit" ? "Edit Mock Test" : "Create Mock Test"}
          size="lg"
        >
          <CreateTestForm
            courses={courses}
            initial={modal.item}
            saving={modal.saving}
            onCancel={closeModal}
            onSubmit={saveTest}
          />
        </Modal>
      </div>
    </div>
  );
}

function CreateTestForm({ courses, initial, saving, onCancel, onSubmit }) {
  const isEdit = Boolean(initial?.id);
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [course_id, setCourseId] = useState(initial?.course_id || "");
  const [subjectIds, setSubjectIds] = useState(
    initial?.subject_id ? [initial.subject_id] : []
  );
  const [subjects, setSubjects] = useState([]);
  const [total_questions, setTotalQuestions] = useState(initial?.total_questions || "");
  const [duration_minutes, setDurationMinutes] = useState(initial?.duration_minutes || "60");
  const [autoFill, setAutoFill] = useState(false);

  useEffect(() => {
    if (course_id) {
      fetch(`/api/admin/subjects?course_id=${course_id}&limit=1000`)
        .then(res => res.json())
        .then(json => {
          if (json.success) {
            setSubjects(json.data || []);
            // Prune selected subjects that are not in the new course
            const allowedIds = new Set((json.data || []).map((s) => s.id));
            setSubjectIds((prev) => prev.filter((id) => allowedIds.has(id)));
          }
        });
    } else {
      setSubjects([]);
      setSubjectIds([]);
    }
  }, [course_id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required");
    if (!course_id) return toast.error("Course is required");
    if (!isEdit && subjectIds.length === 0) return toast.error("Select at least one subject");
    if (isEdit && subjectIds.length === 0) return toast.error("Subject is required");
    if (!total_questions) return toast.error("Number of questions is required");

    const payload = {
      title: title.trim(),
      description: description.trim(),
      course_id,
      total_questions: parseInt(total_questions),
      duration_minutes: parseInt(duration_minutes),
    };

    if (isEdit) {
      payload.subject_id = subjectIds[0];
    } else {
      payload.subject_ids = subjectIds;
      payload.auto_fill = autoFill;
    }

    onSubmit(payload);
  };

  const toggleSubject = (id) => {
    if (isEdit) {
      setSubjectIds([id]);
      return;
    }

    setSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return Array.from(next);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
          Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          placeholder="e.g., Biology Chapter 1 Mock Test"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          placeholder="Optional description"
          rows="3"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
            Course
          </label>
          <select
            value={course_id}
            onChange={(e) => {
              setCourseId(e.target.value);
              setSubjectIds([]);
            }}
            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">Select course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
            {isEdit ? "Subject" : "Subjects (select one or many)"}
          </label>
          {!course_id ? (
            <div className="p-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
              Select a course to see subjects
            </div>
          ) : subjects.length === 0 ? (
            <div className="p-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
              No subjects found for this course
            </div>
          ) : (
            <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
              {subjects.map((s) => {
                const checked = subjectIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      checked
                        ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-yellow-300 dark:hover:border-yellow-700"
                    }`}
                  >
                    <input
                      type={isEdit ? "radio" : "checkbox"}
                      checked={checked}
                      onChange={() => toggleSubject(s.id)}
                      className="w-5 h-5 accent-yellow-600"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{s.name}</p>
                      {s.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{s.description}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
            Total Questions
          </label>
          <input
            type="number"
            value={total_questions}
            onChange={(e) => setTotalQuestions(e.target.value)}
            min="1"
            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="50"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
            Duration (minutes)
          </label>
          <input
            type="number"
            value={duration_minutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            min="1"
            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="60"
          />
        </div>
      </div>

      {!isEdit && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
          <input
            type="checkbox"
            checked={autoFill}
            onChange={(e) => setAutoFill(e.target.checked)}
            className="mt-1 w-5 h-5 accent-yellow-600"
          />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Auto-fill questions (shuffle)</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              System will randomly select questions from each chosen subject to fill the test up to the total questions count. If fewer questions exist, it will add all available.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-yellow-600 hover:bg-yellow-700 text-white font-semibold disabled:opacity-60"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
