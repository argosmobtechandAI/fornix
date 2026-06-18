"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Switch } from "@/components/Forms";
import { CheckCircle2, XCircle, SlidersHorizontal, Loader2 } from "lucide-react";

const FEATURES = [
  { key: "premium_plan", label: "Premium Plan", description: "Unlocks premium subscription for this course" },
  { key: "ccd_podcast", label: "CCD Podcast", description: "Access to CCD podcast content" },
  { key: "viva", label: "Viva", description: "Viva-style question practice" },
  { key: "kbc", label: "KBC", description: "KBC style game mode" },
  { key: "smart_tracking", label: "Smart Tracking", description: "Smart performance tracking tools" },
  { key: "t_and_d", label: "T & D", description: "Tests & Discussion features" },
];

export default function CourseFeaturesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingCourseId, setSavingCourseId] = useState(null);

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/course-features");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load course features");
      setCourses(json.data || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleFeature(courseId, featureKey) {
    setCourses((prev) =>
      prev.map((c) =>
        c.id === courseId
          ? {
              ...c,
              features: {
                ...c.features,
                [featureKey]: !c.features[featureKey],
              },
            }
          : c
      )
    );
  }

  async function saveCourseFeatures(course) {
    setSavingCourseId(course.id);
    try {
      const res = await fetch("/api/admin/course-features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: course.id, features: course.features }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Save failed");
      toast.success("Course features updated");
      await loadCourses();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSavingCourseId(null);
    }
  }

  const totalEnabledForCourse = (course) =>
    FEATURES.reduce((sum, f) => (course.features?.[f.key] ? sum + 1 : sum), 0);

  return (
    <div className="min-h-screen">
      <div className="w-full mx-auto">
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
              <SlidersHorizontal className="text-yellow-600 dark:text-yellow-400" size={30} />
              Course Features Manager
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
              Enable or disable special features for each course. Changes are applied per course and
              reflected in mobile and web experiences.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-yellow-600 animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No courses found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {courses.map((course) => {
              const enabledCount = totalEnabledForCourse(course);
              return (
                <div
                  key={course.id}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
                        {course.name}
                      </h2>
                      {course.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl mt-1">
                          {course.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800">
                        {enabledCount > 0 ? (
                          <CheckCircle2 className="text-yellow-600" size={18} />
                        ) : (
                          <XCircle className="text-gray-400" size={18} />
                        )}
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                          {enabledCount} feature{enabledCount === 1 ? "" : "s"} enabled
                        </span>
                      </div>
                      <button
                        onClick={() => saveCourseFeatures(course)}
                        disabled={savingCourseId === course.id}
                        className="px-4 py-2 rounded-xl bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-white text-sm font-semibold shadow-md flex items-center gap-2"
                      >
                        {savingCourseId === course.id && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        Save
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                    {FEATURES.map((f) => {
                      const enabled = !!course.features?.[f.key];
                      return (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => toggleFeature(course.id, f.key)}
                          className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                            enabled
                              ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700"
                              : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750"
                          }`}
                        >
                          <div
                            className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border ${
                              enabled
                                ? "bg-yellow-500 border-yellow-600 text-white"
                                : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-400"
                            }`}
                          >
                            {enabled ? "ON" : "OFF"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {f.label}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {f.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
