"use client";
import { useEffect, useState } from "react";
import { Folder, Plus, Pencil, Trash2, Loader2, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import Modal from "@/components/Modal";
import { SubjectForm } from "@/components/Forms";
import { useSearchParams } from "next/navigation";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [modal, setModal] = useState({ open: false, mode: "create", item: null, saving: false });

  // Get query parameters
  const searchParams = useSearchParams();
  const courseIdFromQuery = searchParams.get('course_id');

  // Build API URL with query parameters
  const buildApiUrl = () => {
    const params = new URLSearchParams();
    params.append('page', currentPage.toString());
    params.append('limit', itemsPerPage.toString());
    
    if (searchTerm) params.append('search', searchTerm);
    if (selectedCourse !== "all") params.append('course_id', selectedCourse);
    
    return `/api/admin/subjects?${params.toString()}`;
  };

  // Fetch subjects with pagination and filters
  async function fetchSubjects() {
    try {
      setLoading(true);
      
      // Fetch subjects with pagination
      const [subjectsRes, coursesRes] = await Promise.all([
        fetch(buildApiUrl()),
        fetch("/api/admin/courses")
      ]);
      
      const subjectsJson = await subjectsRes.json();
      const coursesJson = await coursesRes.json();
      
      if (!subjectsJson.success) throw new Error(subjectsJson.error || "Failed to fetch subjects");
      if (!coursesJson.success) throw new Error(coursesJson.error || "Failed to fetch courses");
      
      setSubjects(subjectsJson.data || []);
      setTotalCount(subjectsJson.pagination?.total || 0);
      setTotalPages(subjectsJson.pagination?.totalPages || 0);
      setCourses(coursesJson.data || []);
      
      // Auto-select course if provided in query params and courses are loaded
      if (courseIdFromQuery && coursesJson.data.length > 0 && selectedCourse === "all") {
        const courseExists = coursesJson.data.find(c => c.id === courseIdFromQuery);
        if (courseExists) {
          setSelectedCourse(courseIdFromQuery);
          toast.success(`Showing subjects for "${courseExists.name}"`);
        }
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSubjects();
  }, [currentPage, itemsPerPage, searchTerm, selectedCourse]);

  const openCreate = () => setModal({ open: true, mode: "create", item: null });
  const openEdit = (item) => setModal({ open: true, mode: "edit", item });
  const closeModal = () => setModal({ open: false, mode: "create", item: null });

  async function uploadSubjectIcon(subjectId, file) {
    try {
      const formData = new FormData();
      formData.append("id", subjectId);
      formData.append("icon", file);

      const res = await fetch("/api/admin/subjects/update-icon", {
        method: "PUT",
        body: formData,
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to upload subject icon");
      }
    } catch (err) {
      toast.error(err.message || "Subject saved, but icon upload failed");
    }
  }

  async function createOrUpdate(payload) {
    try {
      setModal((m) => ({ ...m, saving: true }));
      const method = modal.mode === "create" ? "POST" : "PUT";
      const url = modal.mode === "create"
        ? "/api/admin/subjects"
        : `/api/admin/subjects/${modal.item.id}`;
      const { iconFile, ...data } = payload || {};
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Save failed");
      const saved = json.subject || json.data;

      if (iconFile && saved?.id) {
        await uploadSubjectIcon(saved.id, iconFile);
      }
      toast.success(`Subject ${modal.mode === "create" ? "created" : "updated"} successfully`);
      closeModal();
      fetchSubjects();
    } catch (err) {
      toast.error(err.message);
      setModal((m) => ({ ...m, saving: false }));
    }
  }

  async function deleteSubject(id) {
    if (!confirm("Are you sure you want to delete this subject? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/subjects/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Subject deleted successfully");
      fetchSubjects();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // Get current course name
  const getCurrentCourseName = () => {
    if (selectedCourse === "all") return "";
    const course = courses.find(c => c.id === selectedCourse);
    return course ? course.name : "";
  };

  // Pagination controls
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // Handle filter changes
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleCourseChange = (value) => {
    setSelectedCourse(value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 transition-colors duration-200">
      <Toaster position="top-right" />
      <div className="mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Folder className="text-blue-600 dark:text-blue-400" size={28} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  Subjects
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Manage your subjects and course materials
                  {selectedCourse !== "all" && (
                    <span className="block text-blue-600 dark:text-blue-400 font-medium mt-1">
                      Course: {getCurrentCourseName()}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Plus size={20} /> 
              <span>Add Subject</span>
            </button>
          </div>

          {/* Filters Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search subjects..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Course Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <select
                value={selectedCourse}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="all">All Courses</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Items Per Page */}
            <div className="relative">
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-lg">Loading subjects...</p>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
              <p className="text-gray-600 dark:text-gray-400">
                Showing {subjects.length} of {totalCount} subject{totalCount !== 1 ? 's' : ''}
                {selectedCourse !== "all" && ` in ${getCurrentCourseName() || "selected course"}`}
              </p>
              
              {(searchTerm || selectedCourse !== "all") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCourse("all");
                    setCurrentPage(1);
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>

            {/* Empty State */}
            {subjects.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <Folder className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {searchTerm || selectedCourse !== "all" ? "No subjects found" : "No subjects yet"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  {searchTerm || selectedCourse !== "all" 
                    ? "Try adjusting your search terms or filters."
                    : "Get started by creating your first subject to organize your questions."
                  }
                </p>
                {!searchTerm && selectedCourse === "all" && (
                  <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 mx-auto"
                  >
                    <Plus size={20} /> 
                    <span>Create Your First Subject</span>
                  </button>
                )}
                {selectedCourse !== "all" && (
                  <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 mx-auto"
                  >
                    <Plus size={20} /> 
                    <span>Create Subject for {getCurrentCourseName()}</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Subjects Grid */}
                <div className="grid gap-4 md:gap-6 mb-8">
                  {subjects.map((sub) => (
                    <div
                      key={sub.id}
                      className="group bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <Link 
                          href={`/admin/questions/${sub.id}`}
                          className="flex-1 flex items-start gap-4 hover:no-underline group"
                        >
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors flex items-center justify-center">
                            {sub.icon_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={sub.icon_url}
                                alt={sub.name}
                                className="w-8 h-8 rounded object-cover"
                              />
                            ) : (
                              <Folder className="text-blue-600 dark:text-blue-400" size={24} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                              {sub.name}
                            </h3>
                            {sub.description && (
                              <p className="text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                                {sub.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                              {sub.course && (
                                <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-3 py-1 rounded-full font-medium">
                                  {sub.course.name}
                                </span>
                              )}
                              <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                                ID: {sub.id}
                              </span>
                              {sub.chapters_count !== undefined && (
                                <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-3 py-1 rounded-full">
                                  {sub.chapters_count} chapter{sub.chapters_count !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                        
                        <div className="flex gap-2 sm:flex-col sm:gap-1">
                          <button 
                            onClick={() => openEdit(sub)}
                            className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 px-3 py-2 rounded-lg transition-colors duration-200"
                            title="Edit subject"
                          >
                            <Pencil size={16} />
                            <span className="sm:hidden">Edit</span>
                          </button>
                          <button 
                            onClick={() => deleteSubject(sub.id)}
                            className="flex items-center gap-2 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg transition-colors duration-200"
                            title="Delete subject"
                          >
                            <Trash2 size={16} />
                            <span className="sm:hidden">Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Page {currentPage} of {totalPages} • {totalCount} total subjects
                      {selectedCourse !== "all" && ` in ${getCurrentCourseName()}`}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={prevPage}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={16} />
                        Previous
                      </button>
                      
                      {/* Page Numbers */}
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => goToPage(pageNum)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === pageNum
                                  ? "bg-blue-600 text-white"
                                  : "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Modal */}
        <Modal
          open={modal.open}
          onClose={closeModal}
          title={`${modal.mode === "create" ? "Add New" : "Edit"} Subject`}
        >
          <SubjectForm
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