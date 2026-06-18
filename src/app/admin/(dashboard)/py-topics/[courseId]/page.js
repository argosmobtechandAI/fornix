"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { FileText, Layers, ArrowRight, ArrowLeft, BookOpen } from "lucide-react";

export default function PyTopicsSubjectsPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId;

  const [course, setCourse] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId) {
      loadCourseAndSubjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function loadCourseAndSubjects() {
    setLoading(true);
    try {
      // Load course details
      const courseRes = await fetch(`/api/admin/courses/${courseId}`);
      const courseJson = await courseRes.json();
      if (courseJson.success) {
        setCourse(courseJson.data);
      }

      // Load subjects
      const res = await fetch(`/api/admin/subjects?course_id=${courseId}&limit=1000`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load subjects");

      // Fetch topic counts for each subject
      const subjectsWithCounts = await Promise.all(
        (json.data || []).map(async (subject) => {
          const topicsRes = await fetch(`/api/admin/py-topics?subject_id=${subject.id}`);
          const topicsData = await topicsRes.json();
          return {
            ...subject,
            topics_count: topicsData.success ? (topicsData.data?.length || 0) : 0,
          };
        })
      );
      setSubjects(subjectsWithCounts);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push("/admin/py-topics")}
          className="mb-6 inline-flex items-center gap-2 text-yellow-600 hover:text-yellow-700 dark:hover:text-yellow-500 font-semibold transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Back to Courses
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
            <Layers className="text-yellow-600 dark:text-yellow-400" size={32} />
            {course?.name || "Subjects"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Select a subject to view and manage PY topics
          </p>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
          </div>
        ) : subjects.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No subjects found for this course.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => router.push(`/admin/py-topics/${courseId}/${subject.id}`)}
                className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-xl hover:border-yellow-400 dark:hover:border-yellow-500 transition-all duration-300 text-left relative overflow-hidden"
              >
                {/* Decorative gradient */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-yellow-100 dark:from-yellow-900/20 to-transparent rounded-bl-full opacity-50 group-hover:opacity-100 transition-opacity"></div>

                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl group-hover:bg-yellow-100 dark:group-hover:bg-yellow-900/30 transition-colors">
                      <FileText className="text-yellow-600 dark:text-yellow-400" size={28} />
                    </div>
                    <ArrowRight className="text-gray-400 group-hover:text-yellow-600 group-hover:translate-x-1 transition-all" size={20} />
                  </div>

                  <h3 className="font-bold text-gray-900 dark:text-white text-xl mb-4 line-clamp-2">
                    {subject.name}
                  </h3>

                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                        {subject.topics_count}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        PY Topic{subject.topics_count !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
