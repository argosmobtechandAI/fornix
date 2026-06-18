"use client";
import { useEffect, useState, useRef } from "react";
import {
  Folder,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Grid,
  List,
  BookOpen,
  Upload,
  FileText,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Modal from "@/components/Modal";
import { CourseForm } from "@/components/Forms/CourseForm";
import { useRouter } from "next/navigation";

export default function page() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");

  const [modal, setModal] = useState({
    open: false,
    mode: "create",
    item: null,
    saving: false,
  });
  const [brochureUploading, setBrochureUploading] = useState({});
  const brochureInputRefs = useRef({});

  async function fetchCourses() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/courses");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setCourses(json.data);
      setFiltered(json.data);
    } catch (err) {
      toast.error(err.message);
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
      setFiltered(
        courses.filter(
          (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.description?.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, courses]);

  const openCreate = () => setModal({ open: true, mode: "create", item: null });
  const openEdit = (item) => setModal({ open: true, mode: "edit", item });
  const closeModal = () =>
    setModal({ open: false, mode: "create", item: null });

  async function uploadCourseIcon(courseId, file) {
    try {
      const formData = new FormData();
      formData.append("id", courseId);
      formData.append("icon", file);

      const res = await fetch("/api/admin/courses/update-icon", {
        method: "PUT",
        body: formData,
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to upload course icon");
      }
    } catch (err) {
      toast.error(err.message || "Course created, but icon upload failed");
    }
  }

  async function createOrUpdate(payload) {
    try {
      setModal((m) => ({ ...m, saving: true }));
      const method = modal.mode === "create" ? "POST" : "PUT";
      const url =
        modal.mode === "create"
          ? "/api/admin/courses"
          : `/api/admin/courses/${modal.item.id}`;

      const { iconFile, ...data } = payload || {};

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      const savedCourse = json.data;

      if (iconFile && savedCourse?.id) {
        await uploadCourseIcon(savedCourse.id, iconFile);
      }

      toast.success(
        `Course ${modal.mode === "create" ? "created" : "updated"} successfully`
      );
      closeModal();
      fetchCourses();
    } catch (err) {
      toast.error(err.message);
      setModal((m) => ({ ...m, saving: false }));
    }
  }

  async function deleteCourse(id) {
    if (
      !confirm(
        "Are you sure you want to delete this course? This action cannot be undone."
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/courses/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Course deleted successfully");
      fetchCourses();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // Navigate to subjects for a course
  const navigateToSubjects = (courseId) => {
    router.push(`/admin/questions?course_id=${courseId}`);
  };

  // Navigate to bulk upload for a course
  const navigateToBulkUpload = (courseId) => {
    router.push(`/admin/bulk-upload?course_id=${courseId}`);
  };

  async function uploadBrochure(courseId, file) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed for brochures");
      return;
    }
    const maxSizeMB = 25;
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Brochure PDF must be less than ${maxSizeMB}MB`);
      return;
    }
    setBrochureUploading((prev) => ({ ...prev, [courseId]: true }));
    try {
      const formData = new FormData();
      formData.append("id", courseId);
      formData.append("brochure", file);
      const res = await fetch("/api/admin/courses/update-brochure", {
        method: "PUT",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Upload failed");
      toast.success("Brochure uploaded successfully!");
      fetchCourses();
    } catch (err) {
      toast.error(err.message || "Brochure upload failed");
    } finally {
      setBrochureUploading((prev) => ({ ...prev, [courseId]: false }));
      // reset file input
      if (brochureInputRefs.current[courseId]) {
        brochureInputRefs.current[courseId].value = "";
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto">
        <Toaster position="top-right" />
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
              <Folder className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Courses
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage all your courses and learning modules
              </p>
            </div>
          </div>

          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium group"
          >
            <Plus
              size={20}
              className="group-hover:scale-110 transition-transform"
            />
            <span>Add Course</span>
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="flex-1 relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search courses by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700 shadow-sm">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all duration-200 ${
                viewMode === "grid"
                  ? "bg-blue-500 text-white shadow-md"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Grid size={20} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all duration-200 ${
                viewMode === "list"
                  ? "bg-blue-500 text-white shadow-md"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <List size={20} />
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            {filtered.length} course{filtered.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <Loader2
                className="animate-spin text-blue-500 mx-auto mb-4"
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
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {search
                ? "Try adjusting your search terms"
                : "Get started by creating your first course"}
            </p>
            {!search && (
              <button
                onClick={openCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow transition-colors duration-200 font-medium"
              >
                Create Your First Course
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Grid View */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((course) => (
                  <div
                    key={course.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden group"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                          {course.icon_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={course.icon_url}
                              alt={course.name}
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            <Folder
                              className="text-blue-600 dark:text-blue-400"
                              size={24}
                            />
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => openEdit(course)}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors duration-200"
                            title="Edit course"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => deleteCourse(course.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                            title="Delete course"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-2 line-clamp-2">
                        {course.name}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3">
                        {course.description || "No description provided"}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex gap-3 mb-3">
                        <button
                          onClick={() => navigateToSubjects(course.id)}
                          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 group"
                        >
                          <BookOpen size={16} className="group-hover:scale-110 transition-transform" />
                          Subjects
                        </button>
                        <button
                          onClick={() => navigateToBulkUpload(course.id)}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 group"
                        >
                          <Upload size={16} className="group-hover:scale-110 transition-transform" />
                          Bulk Upload
                        </button>
                      </div>
                      {/* Brochure Upload Row */}
                      <div className="flex items-center gap-2">
                        <label
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors duration-200 ${
                            brochureUploading[course.id]
                              ? "bg-purple-400 cursor-not-allowed"
                              : course.brochure_url
                              ? "bg-purple-600 hover:bg-purple-700"
                              : "bg-purple-500 hover:bg-purple-600"
                          } text-white`}
                          title={course.brochure_url ? "Replace Brochure PDF" : "Upload Brochure PDF"}
                        >
                          {brochureUploading[course.id] ? (
                            <><Loader2 size={15} className="animate-spin" /> Uploading...</>
                          ) : (
                            <><FileText size={15} /> {course.brochure_url ? "Replace PDF" : "Upload PDF"}</>
                          )}
                          <input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            ref={(el) => (brochureInputRefs.current[course.id] = el)}
                            disabled={brochureUploading[course.id]}
                            onChange={(e) => uploadBrochure(course.id, e.target.files?.[0])}
                          />
                        </label>
                        {course.brochure_url && (
                          <a
                            href={course.brochure_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 transition-colors"
                            title="View current brochure"
                          >
                            View
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List View */
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {filtered.map((course, index) => (
                  <div
                    key={course.id}
                    className={`flex items-center justify-between p-6 transition-colors duration-200 ${
                      index < filtered.length - 1
                        ? "border-b border-gray-200 dark:border-gray-700"
                        : ""
                    } hover:bg-gray-50 dark:hover:bg-gray-700/50`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                        {course.icon_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={course.icon_url}
                            alt={course.name}
                            className="w-8 h-8 rounded object-cover"
                          />
                        ) : (
                          <Folder
                            className="text-blue-600 dark:text-blue-400"
                            size={24}
                          />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                          {course.name}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm max-w-2xl">
                          {course.description || "No description provided"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex gap-2 mr-4">
                        <button
                          onClick={() => navigateToSubjects(course.id)}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                          title="Manage Subjects"
                        >
                          <BookOpen size={16} />
                          <span className="hidden sm:inline">Subjects</span>
                        </button>
                        <button
                          onClick={() => navigateToBulkUpload(course.id)}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                          title="Bulk Upload"
                        >
                          <Upload size={16} />
                          <span className="hidden sm:inline">Bulk Upload</span>
                        </button>
                        <label
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors duration-200 text-white ${
                            brochureUploading[course.id]
                              ? "bg-purple-400 cursor-not-allowed"
                              : "bg-purple-600 hover:bg-purple-700"
                          }`}
                          title={course.brochure_url ? "Replace Brochure PDF" : "Upload Brochure PDF"}
                        >
                          {brochureUploading[course.id] ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <FileText size={16} />
                          )}
                          <span className="hidden sm:inline">
                            {course.brochure_url ? "PDF ✓" : "Brochure"}
                          </span>
                          <input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            ref={(el) => (brochureInputRefs.current[`list_${course.id}`] = el)}
                            disabled={brochureUploading[course.id]}
                            onChange={(e) => uploadBrochure(course.id, e.target.files?.[0])}
                          />
                        </label>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(course)}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors duration-200"
                          title="Edit course"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => deleteCourse(course.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                          title="Delete course"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Modal */}
        <Modal
          open={modal.open}
          onClose={closeModal}
          title={`${modal.mode === "create" ? "Add New" : "Edit"} Course`}
        >
          <CourseForm
            initial={modal.item}
            saving={modal.saving}
            onCancel={closeModal}
            onSubmit={createOrUpdate}
          />
        </Modal>
      </div>
    </div>
  );
}