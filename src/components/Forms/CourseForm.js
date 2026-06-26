"use client";

import { useState, useEffect } from "react";
import { Save, X, BookOpen } from "lucide-react";

export function CourseForm({ initial, saving, onCancel, onSubmit }) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [tutorialVideoUrl, setTutorialVideoUrl] = useState(initial?.tutorial_video_url || "");
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(initial?.icon_url || "");
  const [categoryId, setCategoryId] = useState(initial?.category_id || "");
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/admin/course-categories");
        const json = await res.json();
        if (json.success) setCategories(json.data);
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setDescription(initial.description || "");
      setTutorialVideoUrl(initial.tutorial_video_url || "");
      setCategoryId(initial.category_id || "");
      setIconPreview(initial.icon_url || "");
      setIconFile(null);
    }
  }, [initial]);

  function handleIconChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconFile(file);
    const url = URL.createObjectURL(file);
    setIconPreview(url);
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ name, description, tutorial_video_url: tutorialVideoUrl, category_id: categoryId, iconFile });
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="w-full mx-auto">
        {/* Header Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-lg">
            <BookOpen className="text-white" size={28} />
          </div>
        </div>

        {/* Form Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {initial ? "Edit Course" : "Create New Course"}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {initial ? "Update your course details" : "Add a new course to your catalog"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Course Name Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Course Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Enter course name"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 shadow-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Course Category
            </label>
            <div className="relative">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={saving}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 shadow-sm appearance-none"
              >
                <option value="">-- No Category (Uncategorized) --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Description
            </label>
            <div className="relative">
              <textarea
                placeholder="Describe what students will learn..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 shadow-sm resize-none"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {description.length}/500
              </div>
            </div>
          </div>

          {/* Tutorial / Ads Video URL Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Tutorial / Ads Video URL
              <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                (one video per course, optional)
              </span>
            </label>
            <div className="relative">
              <input
                type="url"
                placeholder="https://... (YouTube, Vimeo, or direct video URL)"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 shadow-sm"
                value={tutorialVideoUrl}
                onChange={(e) => setTutorialVideoUrl(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          {/* Course Icon Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Course Icon
              <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                (optional)
              </span>
            </label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-white dark:bg-gray-900">
                {iconPreview || initial?.icon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={iconPreview || initial?.icon_url}
                    alt="Course icon preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen className="text-gray-400" size={28} />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <span>Upload Icon</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleIconChange}
                    disabled={saving}
                  />
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Recommended: square PNG/JPG/WebP, max 5MB.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X size={18} />
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-700 hover:to-amber-800 text-white rounded-xl shadow-sm hover:shadow transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-orange-600 disabled:hover:to-amber-700"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  {initial ? "Update" : "Create"} Course
                </>
              )}
            </button>
          </div>

          {/* Form Tips */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-xs text-amber-800 dark:text-amber-200 text-center">
              <strong>Tip:</strong> Make your course name clear and descriptive to help students find what they need.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}