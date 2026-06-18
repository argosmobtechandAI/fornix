"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { BookOpen, FileText, ChevronRight, ArrowLeft } from "lucide-react";

export default function CourseSubjectsPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId;
  
  const [course, setCourse] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId) {
      loadData();
    }
  }, [courseId]);

  async function loadData() {
    try {
      setLoading(true);
      
      // Load course details
      const courseRes = await fetch(`/api/admin/courses/${courseId}`);
      const courseJson = await courseRes.json();
      if (!courseJson.success) {
        throw new Error(courseJson.error || "Failed to load course");
      }
      setCourse(courseJson.data);
      
      // Load subjects with notes count
      const subjectsRes = await fetch(`/api/admin/subjects?course_id=${courseId}&limit=1000`);
      const subjectsJson = await subjectsRes.json();
      if (!subjectsJson.success) {
        throw new Error(subjectsJson.error || "Failed to load subjects");
      }
      
      if (!subjectsJson.data || subjectsJson.data.length === 0) {
        setSubjects([]);
        return;
      }
      
      // Fetch all notes for this course once
      const notesRes = await fetch(`/api/admin/notes?course_id=${courseId}`);
      const notesData = await notesRes.json();
      const allNotes = notesData.success ? (notesData.notes || []) : [];
      // Count notes for each subject
      const subjectsWithCounts = (subjectsJson.data || []).map(subject => {
        const subjectNotes = allNotes.filter(n => String(n.subject_id) === String(subject.id));
        return {
          ...subject,
          notes_count: subjectNotes.length
        };
      });
      
      setSubjects(subjectsWithCounts);
    } catch (e) {
      console.error("Load data error:", e);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push("/admin/notes")}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 mb-4"
          >
            <ArrowLeft size={18} />
            Back to Courses
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BookOpen className="text-yellow-600 dark:text-yellow-400" />
            {course?.name || "Course Subjects"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Select a subject to manage notes
          </p>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading subjects...</span>
            </div>
          </div>
        ) : subjects.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 text-center">
            <p className="text-gray-500 dark:text-gray-400">No subjects found for this course.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => router.push(`/admin/notes/courses/${courseId}/subjects/${subject.id}`)}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:border-yellow-500 dark:hover:border-yellow-500 hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <FileText className="text-yellow-600 dark:text-yellow-400" size={20} />
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {subject.name}
                      </h3>
                    </div>
                    {subject.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                        {subject.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {subject.notes_count}
                      </span>
                      <span>Notes</span>
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
      </div>
    </div>
  );
}
