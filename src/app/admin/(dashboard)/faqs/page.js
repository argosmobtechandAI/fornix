"use strict";
"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Plus, Trash2, Edit, Loader2, X, Check, List, PlusCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

export default function FAQsCMSPage() {
  const [faqs, setFaqs] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("list"); // "list" or "form"
  const [selectedFaq, setSelectedFaq] = useState(null);

  // Form states
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [courseId, setCourseId] = useState("general");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/faqs");
      const json = await res.json();
      if (json.success) {
        setFaqs(json.data);
        setCourses(json.courses || []);
      }
    } catch (err) {
      toast.error("Failed to load FAQs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const handleAddNew = () => {
    setSelectedFaq(null);
    setQuestion("");
    setAnswer("");
    setCourseId("general");
    setSortOrder(faqs.length + 1);
    setIsActive(true);
    setActiveTab("form");
  };

  const handleEdit = (faq) => {
    setSelectedFaq(faq);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setCourseId(faq.course_id || "general");
    setSortOrder(faq.sort_order || 0);
    setIsActive(faq.is_active ?? true);
    setActiveTab("form");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question || !answer) {
      toast.error("Question and Answer are required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { question, answer, course_id: courseId, sort_order: Number(sortOrder), is_active: isActive };
      if (selectedFaq) {
        payload.id = selectedFaq.id;
      }
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch("/api/admin/faqs", {
        method: selectedFaq ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        toast.success(selectedFaq ? "FAQ updated successfully!" : "FAQ created successfully!");
        setActiveTab("list");
        fetchFaqs();
      } else {
        toast.error(json.error || "Save failed");
      }
    } catch (err) {
      toast.error("An error occurred while saving");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/admin/faqs?id=${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": token ? `Bearer ${token}` : ""
        }
      });
      const json = await res.json();
      if (json.success) {
        toast.success("FAQ deleted successfully");
        fetchFaqs();
      } else {
        toast.error(json.error || "Delete failed");
      }
    } catch (err) {
      toast.error("An error occurred while deleting");
    }
  };

  const getCourseName = (cId) => {
    if (!cId || cId === "general") return "General / Website";
    const found = courses.find(c => c.id === cId);
    return found ? found.name : "Unknown Course";
  };

  return (
    <div className="p-2 sm:p-2 w-full space-y-6">
      <Toaster position="top-right" />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-2 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm w-full">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400 shrink-0">
            <MessageCircle size={26} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">FAQ CMS Management</h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-0.5">Manage dynamic FAQs for the website homepage and specific exam courses</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl self-stretch md:self-auto w-full md:w-auto">
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-2 sm:px-2 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${activeTab === "list"
              ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
          >
            <List size={16} />
            Manage FAQs ({faqs.length})
          </button>
          <button
            onClick={handleAddNew}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-2 sm:px-2 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${activeTab === "form"
              ? "bg-orange-600 text-white shadow-xs"
              : "text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
              }`}
          >
            <PlusCircle size={16} />
            {selectedFaq ? "Edit FAQ" : "Add New FAQ"}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "list" ? (
        <div className="w-full">
          {loading ? (
            <div className="flex items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 w-full">
              <Loader2 size={36} className="animate-spin text-orange-600" />
            </div>
          ) : faqs.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900/50 shadow-sm w-full p-6">
              <MessageCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <h4 className="text-base font-bold text-gray-700 dark:text-gray-300">No FAQs found</h4>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">Get started by creating your first FAQ entry.</p>
              <button onClick={handleAddNew} className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all">
                Add FAQ
              </button>
            </div>
          ) : (
            <div className="space-y-4 w-full">
              {faqs.map(faq => (
                <div key={faq.id} className="p-4 sm:p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 hover:border-orange-300 dark:hover:border-orange-600/50 transition-all w-full">
                  <div className="space-y-2 flex-1 w-full overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold ${faq.course_id === 'general' ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'}`}>
                        {getCourseName(faq.course_id)}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${faq.is_active ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' : 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`}>
                        {faq.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white pt-1 break-words">{faq.question}</h4>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line break-words">{faq.answer}</p>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 self-end md:self-center shrink-0 w-full md:w-auto justify-end pt-2 md:pt-0 border-t border-gray-100 dark:border-gray-800 md:border-0">
                    <button
                      onClick={() => handleEdit(faq)}
                      className="flex-1 md:flex-initial justify-center px-4 py-2 sm:py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-all border border-gray-200 dark:border-gray-700 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold shadow-xs"
                    >
                      <Edit size={16} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(faq.id)}
                      className="p-2 sm:p-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl transition-all border border-red-200 dark:border-red-800 shadow-xs"
                      title="Delete FAQ"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-8 border border-gray-200 dark:border-gray-800 shadow-sm space-y-6 w-full"
        >
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              {selectedFaq ? "Edit FAQ Entry" : "Create New FAQ Entry"}
            </h3>
            {selectedFaq && (
              <span className="text-xs text-gray-500 font-medium bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                Editing Mode
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 w-full">
            <div className="w-full">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">
                Assigned Category / Exam Course
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-3.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-xs sm:text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400/20 transition-all"
              >
                <option value="general">General / Website FAQ</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="w-full">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">
                Question Text
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Can I access the courses on mobile?"
                required
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-3.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs sm:text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400/20 transition-all"
              />
            </div>

            <div className="w-full">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">
                Answer Text
              </label>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Provide a clear, detailed answer..."
                rows={5}
                required
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-3.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs sm:text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400/20 transition-all resize-y"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
              <div className="w-full">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">
                  Display Order (Sort Index)
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  min="0"
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-3.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs sm:text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400/20 transition-all"
                />
              </div>

              <div className="w-full">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">
                  Active Status
                </label>
                <select
                  value={isActive ? "true" : "false"}
                  onChange={(e) => setIsActive(e.target.value === "true")}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-3.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-xs sm:text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-400/20 transition-all"
                >
                  <option value="true">Active (Visible)</option>
                  <option value="false">Inactive (Hidden)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800 w-full">
              <button
                type="button"
                onClick={() => setActiveTab("list")}
                className="w-full sm:w-auto px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs sm:text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-orange-200 dark:shadow-none transition-all"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                {selectedFaq ? "Save FAQ Changes" : "Create FAQ Entry"}
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </div>
  );
}
