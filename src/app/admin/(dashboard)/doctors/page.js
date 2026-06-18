"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Plus,
  Edit3,
  Trash2,
  MoreVertical,
  UserCheck,
  UserX,
  Mail,
  BookOpen,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Upload,
  Shield,
  AlertTriangle,
  X,
  Check,
  BookMarked,
  GraduationCap,
  Star,
  Clock,
  Zap,
  Grid,
  List,
  BookKey,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// Enhanced Course Selection Component
const CourseSelectionModal = ({ isOpen, onClose, onConfirm, selectedCourses = [], allCourses = [] }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState(new Set(selectedCourses));
  const [recentCourses, setRecentCourses] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("name");
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load recent courses from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentCourses');
    if (saved) {
      setRecentCourses(JSON.parse(saved));
    }
  }, []);

  // Save to recent courses when selected
  const saveToRecent = (courseId) => {
    const course = allCourses.find(c => c.id === courseId);
    if (course) {
      const updated = [course, ...recentCourses.filter(c => c.id !== courseId)].slice(0, 5);
      setRecentCourses(updated);
      localStorage.setItem('recentCourses', JSON.stringify(updated));
    }
  };

  // Filter and sort courses
  const filteredCourses = allCourses
    .filter(course =>
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "recent":
          return new Date(b.created_at) - new Date(a.created_at);
        case "subjects":
          return (b.subject_count || 0) - (a.subject_count || 0);
        default:
          return 0;
      }
    });

  const toggleCourse = (courseId) => {
    const newSelected = new Set(selected);
    if (newSelected.has(courseId)) {
      newSelected.delete(courseId);
    } else {
      newSelected.add(courseId);
      saveToRecent(courseId);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    const allIds = new Set(filteredCourses.map(c => c.id));
    setSelected(allIds);
  };

  const clearAll = () => {
    setSelected(new Set());
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selected));
    onClose();
  };

  const quickSelect = (type) => {
    let courseIds = [];
    switch (type) {
      case "active":
        courseIds = allCourses.filter(c => c.is_active).map(c => c.id);
        break;
      case "popular":
        courseIds = allCourses
          .filter(c => (c.subject_count || 0) > 0)
          .sort((a, b) => (b.subject_count || 0) - (a.subject_count || 0))
          .slice(0, 5)
          .map(c => c.id);
        break;
      default:
        return;
    }
    setSelected(new Set(courseIds));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <BookMarked className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                Select Courses
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Choose courses for assignment • {selected.size} selected
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 sm:p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Main Content - Responsive Layout */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          {/* Sidebar - Hidden on mobile, shown as drawer or top bar */}
          {!isMobile && (
            <div className=" w-full md:w-80 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4 md:p-6 flex-shrink-0">
              <div className="space-y-4 md:space-y-6">
                {/* Quick Actions */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    Quick Actions
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={selectAll}
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Select All Visible
                    </button>
                    <button
                      onClick={clearAll}
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Quick Select */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    Quick Select
                  </h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => quickSelect("active")}
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    >
                      <Star className="w-4 h-4" />
                      All Active Courses
                    </button>
                    <button
                      onClick={() => quickSelect("popular")}
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                    >
                      <Zap className="w-4 h-4" />
                      Top 5 Popular
                    </button>
                  </div>
                </div>

                {/* View Options */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    View Options
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode("grid")}
                      type="button"
                      className={`flex-1 flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                        viewMode === "grid"
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      <Grid className="w-4 h-4" />
                      Grid
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      type="button"
                      className={`flex-1 flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                        viewMode === "list"
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      <List className="w-4 h-4" />
                      List
                    </button>
                  </div>
                </div>

                {/* Sort Options */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    Sort By
                  </h3>
                  <div className="space-y-2">
                    {[
                      { value: "name", label: "Name (A-Z)" },
                      { value: "recent", label: "Recently Added" },
                      { value: "subjects", label: "Most Subjects" }
                    ].map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSortBy(option.value)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                          sortBy === option.value
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full border-2 ${
                          sortBy === option.value ? "bg-blue-500 border-blue-500" : "border-gray-400"
                        }`} />
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent Courses */}
                {recentCourses.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                      Recently Used
                    </h3>
                    <div className="space-y-2">
                      {recentCourses.map(course => (
                        <button
                          key={course.id}
                          onClick={() => toggleCourse(course.id)}
                          type="button"
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                            selected.has(course.id)
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span className="truncate">{course.name}</span>
                          {course.code && (
                            <span className="text-xs text-gray-400 bg-gray-200 dark:bg-gray-600 px-1 rounded flex-shrink-0">
                              {course.code}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile Top Bar - Quick Actions */}
          {isMobile && (
            <div className=" flex flex-wrap gap-2 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
              <button
                onClick={selectAll}
                type="button"
                className="flex items-center gap-1 px-3 py-2 text-xs text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
              >
                <Check className="w-3 h-3" />
                Select All
              </button>
              <button
                onClick={clearAll}
                type="button"
                className="flex items-center gap-1 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <X className="w-3 h-3" />
                Clear All
              </button>
              <select
                value={viewMode}

                onChange={(e) => setViewMode(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                <option value="grid">Grid View</option>
                <option value="list">List View</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                <option value="name">Sort: Name</option>
                <option value="recent">Sort: Recent</option>
                <option value="subjects">Sort: Subjects</option>
              </select>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search Bar */}
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  placeholder="Search courses by name, code, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors text-sm sm:text-base"
                />
              </div>
            </div>

            {/* Course Count and Info */}
            <div className="px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    <strong>{selected.size}</strong> of <strong>{filteredCourses.length}</strong> selected
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{filteredCourses.length} matches</span>
                </div>
              </div>
            </div>

            {/* Courses List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {filteredCourses.length === 0 ? (
                <div className="text-center py-8 sm:py-16 text-gray-500 dark:text-gray-400">
                  <BookMarked className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-sm sm:text-lg font-medium mb-2">No courses found</p>
                  <p className="text-xs sm:text-sm">
                    {searchTerm ? "Try adjusting your search terms" : "No courses available"}
                  </p>
                </div>
              ) : viewMode === "grid" ? (
                <div className={`grid gap-3 sm:gap-4 ${
                  isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                }`}>
                  {filteredCourses.map(course => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      isSelected={selected.has(course.id)}
                      onToggle={toggleCourse}
                      isMobile={isMobile}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {filteredCourses.map(course => (
                    <CourseListItem
                      key={course.id}
                      course={course}
                      isSelected={selected.has(course.id)}
                      onToggle={toggleCourse}
                      isMobile={isMobile}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Always Visible */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 text-sm">
            <div className="flex items-center gap-1 sm:gap-2 text-green-600 dark:text-green-400">
              <Check className="w-4 h-4" />
              <span className="text-xs sm:text-sm">
                <strong>{selected.size}</strong> courses selected
              </span>
            </div>
            {selected.size > 0 && (
              <button
                onClick={clearAll}
                type="button"
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs sm:text-sm font-medium"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={onClose}
              type="button"
              className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg sm:rounded-xl transition-colors border border-gray-300 dark:border-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              type="button"
              disabled={selected.size === 0}
              className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg sm:rounded-xl transition-all duration-200 flex items-center gap-1 sm:gap-2 shadow-lg shadow-blue-500/25"
            >
              <Check className="w-3 h-3 sm:w-4 sm:h-4" />
              Confirm ({selected.size})
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Responsive Course Card Component
const CourseCard = ({ course, isSelected, onToggle, isMobile }) => (
  <motion.div
    whileHover={{ scale: isMobile ? 1 : 1.02, y: isMobile ? 0 : -2 }}
    whileTap={{ scale: 0.98 }}
    className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all duration-200 group ${
      isSelected
        ? "border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 shadow-lg shadow-blue-500/10"
        : "border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
    }`}
    onClick={() => onToggle(course.id)}
  >
    <div className="flex items-start justify-between mb-2 sm:mb-3">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10 sm:w-12 sm:h-12'} rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg transition-all duration-200 ${
          isSelected 
            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white" 
            : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-600 dark:text-gray-400 group-hover:from-blue-100 group-hover:to-blue-200 dark:group-hover:from-blue-900/30 dark:group-hover:to-blue-800/30"
        }`}>
          <GraduationCap className={isMobile ? "w-4 h-4" : "w-5 h-5 sm:w-6 sm:h-6"} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-gray-900 dark:text-white ${
            isMobile ? "text-sm" : "text-base"
          } leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate`}>
            {course.name}
          </h3>
          {course.code && (
            <p className={`text-gray-500 dark:text-gray-400 mt-1 font-mono ${
              isMobile ? "text-xs" : "text-sm"
            }`}>
              {course.code}
            </p>
          )}
        </div>
      </div>
      <div className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
        isSelected 
          ? "bg-blue-500 border-blue-500 shadow-lg shadow-blue-500/50" 
          : "border-gray-300 dark:border-gray-500 group-hover:border-blue-400"
      }`}>
        {isSelected && <Check className={isMobile ? "w-3 h-3" : "w-4 h-4"} />}
      </div>
    </div>

    {course.description && !isMobile && (
      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">
        {course.description}
      </p>
    )}

    <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-600">
      <div className="flex items-center gap-2 sm:gap-3 text-xs">
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <BookOpen className="w-3 h-3" />
          <span>{course.description || ''}</span>
        </div>
        
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        {course.is_active && (
          <div className={`flex items-center gap-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1 sm:px-2 py-0.5 sm:py-1 rounded-full ${
            isMobile ? "text-xs" : "text-xs"
          }`}>
            <Star className="w-2 h-2 sm:w-3 sm:h-3 fill-current" />
            {!isMobile && <span>Active</span>}
          </div>
        )}
      </div>
    </div>
  </motion.div>
);

// Responsive Course List Item Component
const CourseListItem = ({ course, isSelected, onToggle, isMobile }) => (
  <motion.div
    whileHover={{ x: isMobile ? 0 : 4 }}
    className={`p-3 rounded-lg sm:rounded-xl border cursor-pointer transition-all duration-200 group ${
      isSelected
        ? "border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20"
        : "border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
    }`}
    onClick={() => onToggle(course.id)}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} rounded-lg flex items-center justify-center transition-colors ${
          isSelected 
            ? "bg-blue-500 text-white" 
            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30"
        }`}>
          <GraduationCap className={isMobile ? "w-4 h-4" : "w-5 h-5"} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 sm:gap-2 mb-1">
            <h3 className={`font-semibold text-gray-900 dark:text-white ${
              isMobile ? "text-sm" : "text-sm"
            } group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate`}>
              {course.name}
            </h3>
            {course.code && (
              <span className={`text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1 sm:px-2 py-0.5 rounded font-mono flex-shrink-0 ${
                isMobile ? "text-xs" : "text-xs"
              }`}>
                {course.code}
              </span>
            )}
          </div>
          
          {course.description && !isMobile && (
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {course.description}
            </p>
          )}
          
          <div className="flex items-center gap-2 sm:gap-3 mt-1">
            
            {course.is_active && !isMobile && (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
                <Star className="w-3 h-3 fill-current" />
                <span>Active</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`${isMobile ? 'w-5 h-5' : 'w-5 h-5'} rounded border-2 flex items-center justify-center transition-colors ml-2 ${
        isSelected 
          ? "bg-blue-500 border-blue-500" 
          : "border-gray-300 dark:border-gray-500 group-hover:border-blue-400"
      }`}>
        {isSelected && <Check className={isMobile ? "w-3 h-3" : "w-3 h-3"} />}
      </div>
    </div>
  </motion.div>
);

// Enhanced Course Selection Field for Forms
const EnhancedCourseSelection = ({ value = [], onChange, courses = [], maxSelection = null, label = "Select Courses" }) => {
  const [showModal, setShowModal] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");

  const selectedCourses = courses.filter(course => value.includes(course.id));
  
  const filteredCourses = courses.filter(course =>
    course.name.toLowerCase().includes(quickSearch.toLowerCase()) ||
    course.code?.toLowerCase().includes(quickSearch.toLowerCase())
  );

  const removeCourse = (courseId) => {
    onChange(value.filter(id => id !== courseId));
  };

  const addCourse = (courseId) => {
    if (maxSelection && value.length >= maxSelection) {
      toast.error(`Maximum ${maxSelection} courses allowed`);
      return;
    }
    if (!value.includes(courseId)) {
      onChange([...value, courseId]);
    }
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label} {maxSelection && `(Max: ${maxSelection})`}
        </label>
        <div className="flex items-center gap-2">
          {value.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Quick Search and Add - Now opens modal on click */}
      <div className="space-y-2">
        <div 
          className="relative cursor-pointer"
          onClick={() => setShowModal(true)}
        >
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <div className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20">
            Click to browse and select courses...
          </div>
        </div>

      </div>

      {/* Selected Courses Chips */}
      {selectedCourses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCourses.map(course => (
            <div
              key={course.id}
              className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-800 group hover:bg-blue-200 dark:hover:bg-blue-800/30 transition-colors"
            >
              <GraduationCap className="w-3 h-3" />
              <span className="max-w-32 truncate">{course.name}</span>
              <button
                type="button"
                onClick={() => removeCourse(course.id)}
                className="hover:text-blue-900 dark:hover:text-blue-300 transition-colors opacity-60 hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Selection Info */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          {value.length} course{value.length !== 1 ? 's' : ''} selected
        </span>
        {maxSelection && (
          <span className={value.length >= maxSelection ? "text-red-500" : ""}>
            {value.length}/{maxSelection}
          </span>
        )}
      </div>

      {/* Course Selection Modal */}
      <AnimatePresence>
        {showModal && (
          <CourseSelectionModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onConfirm={onChange}
            selectedCourses={value}
            allCourses={courses}
          />
        )}
      </AnimatePresence>
    </div>
  );
};


// Custom Confirmation Modal Component
const ConfirmationModal = ({ isOpen, onClose, onConfirm, doctor }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center gap-4 p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Delete Doctor
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              This action cannot be undone
            </p>
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            Are you sure you want to delete{" "}
            <strong>Dr. {doctor?.full_name}</strong>?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            This will permanently remove the doctor and all their subject
            assignments from the system.
          </p>

          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Warning
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  All associated data including subject assignments will be
                  permanently deleted.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl transition-colors border border-gray-300 dark:border-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-500/25"
          >
            <Trash2 className="w-4 h-4" />
            Delete Doctor
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Doctor Form Modal Component (Updated to remove Browse Courses button)
const DoctorFormModal = ({ isOpen, onClose, doctor, onSubmit, subjects, courses }) => {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    is_active: true,
    subject_ids: [],
    course_ids: [],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (doctor) {
      setFormData({
        full_name: doctor.full_name || "",
        email: doctor.email || "",
        password: "",
        is_active: doctor.is_active ?? true,
        subject_ids: doctor.subjects?.map((s) => s.id) || [],
        course_ids: doctor.courses?.map((c) => c.id) || [],
      });
    } else {
      setFormData({
        full_name: "",
        email: "",
        password: "",
        is_active: true,
        subject_ids: [],
        course_ids: [],
      });
    }
  }, [doctor]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subjectId) => {
    setFormData((prev) => ({
      ...prev,
      subject_ids: prev.subject_ids.includes(subjectId)
        ? prev.subject_ids.filter((id) => id !== subjectId)
        : [...prev.subject_ids, subjectId],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {doctor ? "Edit Doctor" : "Add New Doctor"}
              </h2>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {doctor
                  ? "Update doctor information"
                  : "Create a new medical professional account"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
          >
            <span className="text-2xl text-gray-500 dark:text-gray-400">×</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    full_name: e.target.value,
                  }))
                }
                className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                placeholder="Dr. John Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                placeholder="doctor@hospital.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password {doctor ? "(leave blank to keep current)" : "*"}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required={!doctor}
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white pr-12 transition-colors"
                placeholder={
                  doctor ? "Enter new password" : "Create secure password"
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {!doctor && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                🔒 Password must be at least 8 characters with uppercase,
                lowercase, number, and special character
              </p>
            )}
          </div>

          {/* Enhanced Course Selection - Now opens modal when clicking the search field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Assign Courses
            </label>
            <EnhancedCourseSelection
              value={formData.course_ids}
              onChange={(course_ids) => setFormData(prev => ({ ...prev, course_ids }))}
              courses={courses}
              maxSelection={20}
              label="Select courses for this doctor"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Click the search field above to browse and select courses. Selected courses will filter available specializations below.
            </p>
          </div>

          {/* Subjects Selection (filtered by selected courses) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Assign Specializations ({formData.subject_ids.length} selected)
            </label>
            <div className="max-h-64 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
              {subjects
                .filter(subject => 
                  formData.course_ids.length === 0 || 
                  formData.course_ids.includes(subject.course_id)
                )
                .map((subject) => (
                <label
                  key={subject.id}
                  className="flex items-start space-x-3 p-3 hover:bg-white dark:hover:bg-gray-600 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800 mb-2 last:mb-0"
                >
                  <input
                    type="checkbox"
                    checked={formData.subject_ids.includes(subject.id)}
                    onChange={() => toggleSubject(subject.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 mt-1 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                      {subject.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                      Course: {subject.course_name}
                    </span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    formData.subject_ids.includes(subject.id) 
                      ? "bg-green-500" 
                      : "bg-gray-300 dark:bg-gray-600"
                  }`} />
                </label>
              ))}
              {formData.course_ids.length > 0 && subjects.filter(subject => 
                formData.course_ids.includes(subject.course_id)
              ).length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium mb-1">No subjects found</p>
                  <p className="text-xs">No subjects available in the selected courses.</p>
                </div>
              )}
              {formData.course_ids.length === 0 && subjects.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium mb-1">No subjects available</p>
                  <p className="text-xs">Please add subjects to the system first.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  is_active: e.target.checked,
                }))
              }
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5"
            />
            <label
              htmlFor="is_active"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Active Account - Doctor can login and access the system
            </label>
          </div>
        </form>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl transition-colors border border-gray-300 dark:border-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all duration-200 flex items-center gap-2 shadow-lg shadow-blue-500/25"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <UserCheck className="w-5 h-5" />
            )}
            {doctor ? "Update Doctor" : "Create Doctor"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Doctor Card Component (same as before)
const DoctorCard = ({ doctor, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 group relative overflow-hidden"
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 ${
                doctor.is_active
                  ? "bg-gradient-to-br from-green-500 to-green-600 text-white shadow-green-500/25"
                  : "bg-gradient-to-br from-gray-400 to-gray-500 text-white shadow-gray-500/25"
              }`}
            >
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-gray-800 dark:group-hover:text-white transition-colors">
                {doctor.full_name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {doctor.email}
                </span>
              </div>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors group/menu"
            >
              <MoreVertical className="w-5 h-5 text-gray-400 group-hover/menu:text-gray-600 dark:group-hover/menu:text-gray-300" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden"
                >
                  <button
                    onClick={() => {
                      onEdit(doctor);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Doctor
                  </button>
                  <button
                    onClick={() => {
                      onDelete(doctor);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Doctor
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${
                doctor.is_active
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600"
              }`}
            >
              {doctor.is_active ? (
                <UserCheck className="w-3 h-3" />
              ) : (
                <UserX className="w-3 h-3" />
              )}
              <span className="text-xs font-semibold">
                {doctor.is_active ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-600">
              <BookOpen className="w-3 h-3" />
              <span className="text-xs font-semibold">
                {doctor.subjects?.length || 0} subjects
              </span>
            </div>

            {doctor.courses && doctor.courses.length > 0 && (
              <div className="flex items-center gap-1 text-blue-500 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800">
                <GraduationCap className="w-3 h-3" />
                <span className="text-xs font-semibold">
                  {doctor.courses.length} courses
                </span>
              </div>
            )}
          </div>

          <div className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-lg">
            Joined {new Date(doctor.created_at).toLocaleDateString()}
          </div>
        </div>

        {doctor.courses && doctor.courses.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide flex items-center gap-2">
              <GraduationCap className="w-3 h-3" />
              Assigned Courses
            </p>
            <div className="flex flex-wrap gap-2">
              {doctor.courses.slice(0, 3).map((course) => (
                <div
                  key={course.id}
                  className="group relative"
                  title={`${course.name}${course.code ? ` (${course.code})` : ''}`}
                >
                  <span className="px-2 py-1 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-semibold border border-blue-200 dark:border-blue-800 shadow-sm">
                    {course.name}
                  </span>
                  {/* Tooltip with course info */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                    {course.name}
                    {course.code && ` (${course.code})`}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              ))}
              {doctor.courses.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-semibold">
                  +{doctor.courses.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {doctor.subjects && doctor.subjects.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
              Specializations
            </p>
            <div className="flex flex-wrap gap-2">
              {doctor.subjects.slice(0, 4).map((subject) => (
                <div
                  key={subject.id}
                  className="group relative"
                  title={`${subject.name} (${subject.course_name})`}
                >
                  <span className="px-2 py-1 bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 text-purple-700 dark:text-purple-400 rounded-lg text-xs font-semibold border border-purple-200 dark:border-purple-800 shadow-sm">
                    {subject.name}
                  </span>
                  {/* Tooltip with course info */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                    {subject.course_name}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              ))}
              {doctor.subjects.length > 4 && (
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-semibold">
                  +{doctor.subjects.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Pagination Component (same as before)
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pages = [];
  const maxVisiblePages = 5;

  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-6">
      <div className="flex justify-between sm:justify-between w-full items-center">
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-400">
            Showing page <span className="font-semibold">{currentPage}</span> of{" "}
            <span className="font-semibold">{totalPages}</span>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </button>

          <div className="hidden sm:flex space-x-1">
            {pages.map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  currentPage === page
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                    : "border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Main ManageDoctors Component (same as before)
export default function page() {
  const [doctors, setDoctors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [editingDoctor, setEditingDoctor] = useState(null);

  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalDoctors: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  useEffect(() => {
    loadDoctors();
    loadSubjects();
    loadCourses();
  }, [pagination.currentPage, searchTerm, statusFilter]);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: "9",
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });

      const response = await fetch(`/api/admin/doctors/get?${params}`);
      const data = await response.json();

      if (data.success) {
        setDoctors(data.doctors);
        setPagination(data.pagination);
      } else {
        console.error("Failed to load doctors:", data.error);
        toast.error("Failed to load doctors");
      }
    } catch (error) {
      console.error("Error loading doctors:", error);
      toast.error("Error loading doctors");
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async () => {
    try {
      const response = await fetch("/api/admin/subjects/get");
      const data = await response.json();
 
      if (data.success) {
        setSubjects(data.subjects);
      } else {
        toast.error("Failed to load subjects");
      }
    } catch (error) {
      console.error("Error loading subjects:", error);
      toast.error("Error loading subjects");
    }
  };

  const loadCourses = async () => {
    try {
      const response = await fetch("/api/admin/courses");
      const data = await response.json();
      if (data.success) {
        setCourses(data.data || []);
      }
    } catch (error) {
      console.error("Error loading courses:", error);
      toast.error("Failed to load courses");
    }
  };

  const handleCreateDoctor = async (formData) => {
    const loadingToast = toast.loading("Creating doctor...");

    try {
      const response = await fetch("/api/admin/doctors/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.dismiss(loadingToast);
        await loadDoctors();

        if (data.plainPassword) {
          toast.success(
            <div>
              <p className="font-semibold">Doctor created successfully! 🎉</p>
              <p className="text-sm mt-1">
                Temporary password: <strong>{data.plainPassword}</strong>
              </p>
              <p className="text-xs mt-1 text-gray-600">
                Share this with the doctor and ask them to change it
                immediately.
              </p>
            </div>,
            { duration: 8000 }
          );
        } else {
          toast.success("Doctor created successfully!");
        }
      } else {
        toast.dismiss(loadingToast);
        toast.error(`Failed to create doctor: ${data.error}`);
        throw new Error(data.error);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Failed to create doctor");
      throw error;
    }
  };

  const handleUpdateDoctor = async (formData) => {
    const loadingToast = toast.loading("Updating doctor...");

    try {
      const response = await fetch("/api/admin/doctors/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, id: editingDoctor.id }),
      });

      const data = await response.json();

      if (data.success) {
        toast.dismiss(loadingToast);
        await loadDoctors();
        toast.success("Doctor updated successfully! ✅");
      } else {
        toast.dismiss(loadingToast);
        toast.error(`Failed to update doctor: ${data.error}`);
        throw new Error(data.error);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Failed to update doctor");
      throw error;
    }
  };

  const handleDeleteDoctor = async (doctor) => {
    setSelectedDoctor(doctor);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedDoctor) return;

    const loadingToast = toast.loading("Deleting doctor...");

    try {
      const response = await fetch(
        `/api/admin/doctors/delete?id=${selectedDoctor.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.dismiss(loadingToast);
        await loadDoctors();
        toast.success(`Dr. ${selectedDoctor.full_name} deleted successfully!`);
        setShowConfirmModal(false);
        setSelectedDoctor(null);
      } else {
        toast.dismiss(loadingToast);
        toast.error(`Failed to delete doctor: ${data.error}`);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error deleting doctor:", error);
      toast.error("Error deleting doctor");
    }
  };

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleStatusFilter = (value) => {
    setStatusFilter(value);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  if (loading && doctors.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Toaster position="top-right" />
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium text-lg">
            Loading Medical Team...
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
            Fetching doctor records
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "var(--background)",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
          },
          success: {
            duration: 5000,
            iconTheme: {
              primary: "#10B981",
              secondary: "white",
            },
          },
          error: {
            duration: 6000,
            iconTheme: {
              primary: "#EF4444",
              secondary: "white",
            },
          },
          loading: {
            duration: Infinity,
          },
        }}
      />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              Manage Medical Team
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-lg">
                Manage doctors and their specializations
              </p>
            </div>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold flex items-center gap-2 transition-all duration-200 shadow-lg shadow-blue-500/25"
          >
            <Plus className="w-5 h-5" />
            Add New Doctor
          </motion.button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Doctors</p>
              <p className="text-3xl font-bold mt-2">
                {pagination.totalDoctors}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Active</p>
              <p className="text-3xl font-bold mt-2">
                {doctors.filter((d) => d.is_active).length}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-100 text-sm font-medium">Inactive</p>
              <p className="text-3xl font-bold mt-2">
                {doctors.filter((d) => !d.is_active).length}
              </p>
            </div>
            <UserX className="w-8 h-8 text-gray-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">
                Avg. Courses
              </p>
              <p className="text-3xl font-bold mt-2">
                {doctors.length > 0
                  ? Math.round(
                      doctors.reduce(
                        (acc, doc) => acc + (doc.courses?.length || 0),
                        0
                      ) / doctors.length
                    )
                  : 0}
              </p>
            </div>
            <GraduationCap className="w-8 h-8 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex-1 relative w-full lg:max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search doctors by name or email..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Doctors Grid */}
      {doctors.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <Users className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            No doctors found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {searchTerm || statusFilter !== "all"
              ? "No doctors match your search criteria. Try adjusting your filters."
              : "Start building your medical team by adding the first doctor."}
          </p>
          {!searchTerm && statusFilter === "all" && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowForm(true)}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold text-lg flex items-center gap-3 transition-all duration-200 shadow-lg shadow-blue-500/25 mx-auto"
            >
              <Plus className="w-6 h-6" />
              Add Your First Doctor
            </motion.button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {doctors.map((doctor, index) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                onEdit={(doc) => {
                  setEditingDoctor(doc);
                  setShowForm(true);
                }}
                onDelete={handleDeleteDoctor}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <DoctorFormModal
            isOpen={showForm}
            onClose={() => {
              setShowForm(false);
              setEditingDoctor(null);
            }}
            doctor={editingDoctor}
            onSubmit={editingDoctor ? handleUpdateDoctor : handleCreateDoctor}
            subjects={subjects}
            courses={courses}
          />
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <ConfirmationModal
            isOpen={showConfirmModal}
            onClose={() => {
              setShowConfirmModal(false);
              setSelectedDoctor(null);
            }}
            onConfirm={confirmDelete}
            doctor={selectedDoctor}
          />
        )}
      </AnimatePresence>
    </div>
  );
}