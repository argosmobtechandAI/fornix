"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { BookOpen, FileText, ArrowRight } from "lucide-react";

export default function PodcastsCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/courses");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load courses");

      const coursesWithCounts = await Promise.all(
        (json.data || []).map(async (course) => {
          const [subjectsRes, podcastsRes] = await Promise.all([
            fetch(`/api/admin/subjects?course_id=${course.id}&limit=1000`),
            fetch(`/api/admin/podcasts?course_id=${course.id}`),
          ]);
          const subjectsData = await subjectsRes.json();
          const podcastsData = await podcastsRes.json();
          return {
            ...course,
            subjects_count: subjectsData.success ? subjectsData.data?.length || 0 : 0,
            podcasts_count: podcastsData.success ? podcastsData.data?.length || 0 : 0,
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

  return (
    <div className="min-h-screen">
      <div className="w-full mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
            <FileText className="text-orange-600 dark:text-orange-400" size={32} />
            Podcasts
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Select a course to manage podcasts (audio & video)
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
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
                onClick={() => router.push(`/admin/podcasts/${course.id}`)}
                className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-xl hover:border-orange-400 dark:hover:border-orange-500 transition-all duration-300 text-left relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-100 dark:from-purple-900/20 to-transparent rounded-bl-full opacity-50 group-hover:opacity-100 transition-opacity"></div>

                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors">
                      <BookOpen className="text-orange-600 dark:text-orange-400" size={28} />
                    </div>
                    <ArrowRight className="text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" size={20} />
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
                      <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {course.subjects_count}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide mt-1">
                        Subjects
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {course.podcasts_count}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide mt-1">
                        Podcasts
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
