"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/Modal";
import { BookOpen, FileText, ChevronRight, Plus } from "lucide-react";

export default function NotesCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({
    open: false,
    saving: false,
  });

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/courses");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load courses");
      
      // Fetch notes count for each course
      const coursesWithCounts = await Promise.all(
        (json.data || []).map(async (course) => {
          const [subjectsRes, notesRes] = await Promise.all([
            fetch(`/api/admin/subjects?course_id=${course.id}&limit=1000`),
            fetch(`/api/admin/notes?course_id=${course.id}`)
          ]);
          
          const subjectsData = await subjectsRes.json();
          const notesData = await notesRes.json();
          
          return {
            ...course,
            subjects_count: subjectsData.success ? (subjectsData.data?.length || 0) : 0,
            notes_count: notesData.success ? (notesData.notes?.length || 0) : 0
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

  function openAddNote() {
    setModal({ open: true, saving: false });
  }

  function closeModal() {
    setModal({ open: false, saving: false });
  }

  async function saveNote({ course_id, subject_id, title, note_type, pdfFile }) {
    try {
      setModal((m) => ({ ...m, saving: true }));
      const fd = new FormData();
      fd.set("course_id", course_id);
      fd.set("subject_id", subject_id);
      fd.set("title", title);
      fd.set("note_type", note_type);
      if (pdfFile) fd.set("pdf", pdfFile);

      const res = await fetch("/api/admin/notes", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Save failed");

      toast.success("Note created");
      closeModal();
      loadCourses();
    } catch (e) {
      toast.error(e.message);
      setModal((m) => ({ ...m, saving: false }));
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <FileText className="text-yellow-600 dark:text-yellow-400" />
              Notes Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Select a course to manage notes
            </p>
          </div>
          <button
            onClick={openAddNote}
            className="px-4 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-700 text-white font-semibold flex items-center gap-2 shadow-lg shadow-yellow-500/20"
          >
            <Plus size={20} />
            Add Note
          </button>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading courses...</span>
            </div>
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 text-center">
            <p className="text-gray-500 dark:text-gray-400">No courses found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <button
                key={course.id}
                onClick={() => router.push(`/admin/notes/courses/${course.id}`)}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:border-yellow-500 dark:hover:border-yellow-500 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <BookOpen className="text-yellow-600 dark:text-yellow-400" size={20} />
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {course.name}
                      </h3>
                    </div>
                    {course.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                        {course.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {course.subjects_count}
                        </span>
                        <span>Subjects</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {course.notes_count}
                        </span>
                        <span>Notes</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight 
                    className="text-gray-400 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors flex-shrink-0" 
                    size={20} 
                  />
                </div>
              </button>
            ))}
          </div>
        )}

        <Modal
          open={modal.open}
          onClose={closeModal}
          title="Add Note"
          size="lg"
        >
          <AddNoteForm
            courses={courses}
            saving={modal.saving}
            onCancel={closeModal}
            onSubmit={saveNote}
          />
        </Modal>
      </div>
    </div>
  );
}

function AddNoteForm({ courses, saving, onCancel, onSubmit }) {
  const [course_id, setCourseId] = useState("");
  const [subject_id, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [note_type, setNoteType] = useState("sample");
  const [pdfFile, setPdfFile] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Fetch subjects when course changes
  useEffect(() => {
    if (!course_id) {
      setSubjects([]);
      return;
    }
    
    async function fetchSubjects() {
      try {
        setLoadingSubjects(true);
        const res = await fetch(`/api/admin/subjects?course_id=${course_id}&limit=1000`);
        const json = await res.json();
        if (json.success) {
          setSubjects(json.data || []);
        }
      } catch (err) {
        console.error("Failed to load subjects:", err);
      } finally {
        setLoadingSubjects(false);
      }
    }
    
    fetchSubjects();
  }, [course_id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!course_id) return toast.error("Course is required");
    if (!subject_id) return toast.error("Subject is required");
    if (!title.trim()) return toast.error("Title is required");
    if (!pdfFile) return toast.error("PDF is required");
    onSubmit({ course_id, subject_id, title: title.trim(), note_type, pdfFile });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Course
        </div>
        <select
          value={course_id}
          onChange={(e) => {
            setCourseId(e.target.value);
            setSubjectId(""); // Reset subject when course changes
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
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Subject
        </div>
        <select
          value={subject_id}
          onChange={(e) => setSubjectId(e.target.value)}
          disabled={!course_id || loadingSubjects}
          className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
        >
          <option value="">{loadingSubjects ? "Loading subjects..." : "Select subject"}</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Title
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          placeholder="e.g., AMC Notes - Chapter 1"
        />
      </div>

      <div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Note Type
        </div>
        <select
          value={note_type}
          onChange={(e) => setNoteType(e.target.value)}
          className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="sample">Sample (Free)</option>
          <option value="premium">Premium (Paid)</option>
        </select>
      </div>

      <div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          PDF File
        </div>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
          className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

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



