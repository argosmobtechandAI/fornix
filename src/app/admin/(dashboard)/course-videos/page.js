"use client";

import { useEffect, useState } from "react";
import { Video, Folder, Search, Loader2, Pencil, X, Save } from "lucide-react";
import toast from "react-hot-toast";
import Modal from "@/components/Modal";

export default function CourseVideosPage() {
  const [courses, setCourses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState({
    open: false,
    saving: false,
    course: null,
    videoUrl: "",
    uploadFile: null,
    uploadProgress: 0,
  });

  const openModalForCourse = (course) => {
    setModal({
      open: true,
      saving: false,
      course,
      videoUrl: course.tutorial_video_url || "",
      uploadFile: null,
      uploadProgress: 0,
    });
  };

  const closeModal = () => {
    setModal({ open: false, saving: false, course: null, videoUrl: "", uploadFile: null, uploadProgress: 0 });
  };

  async function fetchCourses() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/courses");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load courses");
      setCourses(json.data || []);
      setFiltered(json.data || []);
    } catch (err) {
      toast.error(err.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(courses);
    } else {
      const q = search.toLowerCase();
      setFiltered(
        (courses || []).filter(
          (c) =>
            c.name?.toLowerCase().includes(q) ||
            c.description?.toLowerCase().includes(q) ||
            c.id?.toString().includes(q)
        )
      );
    }
  }, [search, courses]);

  async function saveVideoUrl() {
    if (!modal.course) return;

    try {
      setModal((m) => ({ ...m, saving: true }));
      const body = {
        name: modal.course.name,
        description: modal.course.description,
        tutorial_video_url: modal.videoUrl || null,
      };

      const res = await fetch(`/api/admin/courses/${modal.course.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to update course video");

      toast.success("Course video updated successfully");
      closeModal();
      fetchCourses();
    } catch (err) {
      toast.error(err.message || "Failed to update course video");
      setModal((m) => ({ ...m, saving: false }));
    }
  }

  async function uploadVideoFile() {
    if (!modal.course) return;
    if (!modal.uploadFile) {
      toast.error("Please choose a video file to upload");
      return;
    }

    try {
      setModal((m) => ({ ...m, saving: true, uploadProgress: 0 }));

      const formData = new FormData();
      formData.append("id", modal.course.id);
      formData.append("video", modal.uploadFile);

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", "/api/admin/courses/update-video");

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setModal((m) => ({ ...m, uploadProgress: percent }));
          }
        };

        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText || "{}");
            if (!json.success) {
              reject(new Error(json.error || "Video upload failed"));
              return;
            }
            resolve(null);
          } catch (e) {
            reject(e);
          }
        };

        xhr.onerror = () => {
          reject(new Error("Video upload failed"));
        };

        xhr.send(formData);
      });

      toast.success("Video uploaded successfully");
      closeModal();
      fetchCourses();
    } catch (err) {
      toast.error(err.message || "Video upload failed");
      setModal((m) => ({ ...m, saving: false }));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 ">
      <div className="mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500 rounded-xl shadow-lg">
              <Video className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Course Videos
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Set one tutorial or ads video URL for each course; this is used on the home screen per course.
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search courses by name, description, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 shadow-sm"
            />
          </div>
        </div>

        {/* Loading / Empty / List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <Loader2
                className="animate-spin text-orange-500 mx-auto mb-4"
                size={40}
              />
              <p className="text-gray-600 dark:text-gray-400">
                Loading courses...
              </p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <Folder className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No courses found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              There are no courses to configure videos for yet.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="hidden md:block">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">
                      Course
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200 w-2/5">
                      Tutorial / Ads Video URL
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filtered.map((course) => (
                    <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {course.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          ID: {course.id}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-gray-700 dark:text-gray-200 break-all">
                        {course.tutorial_video_url ? (
                          <>
                            <div className="line-clamp-2 mb-1">
                              {course.tutorial_video_url}
                            </div>
                            <a
                              href={course.tutorial_video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-orange-600 dark:text-orange-400 text-xs underline"
                            >
                              Open link
                            </a>
                          </>
                        ) : (
                          <span className="italic text-gray-400">
                            No video set
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <button
                          onClick={() => openModalForCourse(course)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium shadow-sm transition-colors"
                        >
                          <Pencil size={14} />
                          Set Video
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((course) => (
                <div key={course.id} className="p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {course.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        ID: {course.id}
                      </div>
                    </div>
                    <button
                      onClick={() => openModalForCourse(course)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium shadow-sm transition-colors"
                    >
                      <Pencil size={14} />
                      Set Video
                    </button>
                  </div>

                  <div className="mt-1 text-xs text-gray-700 dark:text-gray-200 break-all">
                    {course.tutorial_video_url ? (
                      <>
                        <div className="line-clamp-2 mb-1">
                          {course.tutorial_video_url}
                        </div>
                        <a
                          href={course.tutorial_video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 dark:text-orange-400 text-xs underline"
                        >
                          Open link
                        </a>
                      </>
                    ) : (
                      <span className="italic text-gray-400">No video set</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit Video Modal */}
        <Modal
          open={modal.open}
          onClose={modal.saving ? () => {} : closeModal}
          title={modal.course ? `Set Video for ${modal.course.name}` : "Set Course Video"}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Paste a full video URL (YouTube, Vimeo, or a direct video link). This video will be shown on the home
              screen for this course.
            </p>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Video URL
              </label>
              <input
                type="url"
                value={modal.videoUrl}
                onChange={(e) => setModal((m) => ({ ...m, videoUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                disabled={modal.saving}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Or Upload Video File
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) =>
                  setModal((m) => ({
                    ...m,
                    uploadFile: e.target.files?.[0] || null,
                    uploadProgress: 0,
                  }))
                }
                disabled={modal.saving}
                className="w-full text-sm text-gray-700 dark:text-gray-200 file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Supported: MP4, WebM, OGG, MOV, MKV. Max size 500MB.
              </p>

              {modal.uploadProgress > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Upload progress</span>
                    <span>{modal.uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-orange-500 transition-all"
                      style={{ width: `${modal.uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={modal.saving}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                type="button"
                onClick={saveVideoUrl}
                disabled={modal.saving}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-sm text-white font-medium shadow-sm disabled:opacity-50"
              >
                {modal.saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Save URL
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={uploadVideoFile}
                disabled={modal.saving || !modal.uploadFile}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-orange-400 text-sm text-orange-600 dark:text-orange-400 font-medium shadow-sm disabled:opacity-50"
              >
                {modal.saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Video size={14} />
                    Upload Video
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
