"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { Folder, ArrowRight } from "lucide-react";

export default function PodcastsSubjectsPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.courseId;
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    loadData();
  }, [courseId]);

  async function loadData() {
    setLoading(true);
    try {
      const [subjectsRes, podcastsRes] = await Promise.all([
        fetch(`/api/admin/subjects?course_id=${courseId}&limit=1000`),
        fetch(`/api/admin/podcasts?course_id=${courseId}`),
      ]);
      const subjectsData = await subjectsRes.json();
      const podcastsData = await podcastsRes.json();

      if (!subjectsData.success) throw new Error(subjectsData.error || "Failed to load subjects");
      if (!podcastsData.success) throw new Error(podcastsData.error || "Failed to load podcasts");

      const podcasts = podcastsData.data || [];
      const enrichedSubjects = (subjectsData.data || []).map((s) => ({
        ...s,
        podcasts_count: podcasts.filter((p) => p.subject_id === s.id).length,
      }));

      setSubjects(enrichedSubjects);
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Select Subject
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Choose a subject to manage podcasts for this course.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          </div>
        ) : subjects.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <Folder className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No subjects found for this course.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => router.push(`/admin/podcasts/${courseId}/${subject.id}`)}
                className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg hover:border-orange-400 dark:hover:border-orange-500 transition-all duration-200 text-left flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                    <Folder className="text-orange-600 dark:text-orange-400" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                      {subject.name}
                    </h3>
                    {subject.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-1">
                        {subject.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {subject.podcasts_count} podcast{subject.podcasts_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <ArrowRight className="text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" size={20} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
