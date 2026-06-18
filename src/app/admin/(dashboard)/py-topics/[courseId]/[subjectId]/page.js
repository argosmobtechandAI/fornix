"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/Modal";
import { FileText, Plus, Trash2, Edit2, ArrowLeft, Calendar, Tag, BookOpen } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";

export default function PyTopicsListPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId;
  const subjectId = params.subjectId;

  const [course, setCourse] = useState(null);
  const [subject, setSubject] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, saving: false, editId: null });
  const [form, setForm] = useState({ years: [], topic: "", subTopics: [""], extraExplanation: "" });

  useEffect(() => {
    if (courseId && subjectId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, subjectId]);

  async function loadData() {
    setLoading(true);
    try {
      // Load course details
      const courseRes = await fetch(`/api/admin/courses/${courseId}`);
      const courseJson = await courseRes.json();
      if (courseJson.success) setCourse(courseJson.data);

      // Load subject details
      const subjectRes = await fetch(`/api/admin/subjects/${subjectId}`);
      const subjectJson = await subjectRes.json();
      if (subjectJson.success) setSubject(subjectJson.data);

      // Load topics
      await loadTopics();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTopics() {
    try {
      const res = await fetch(`/api/admin/py-topics?subject_id=${subjectId}`);
      const json = await res.json();
      setTopics(json.data || []);
    } catch (e) {
      toast.error(e.message);
    }
  }

  function openAddTopic() {
    setForm({ years: [], topic: "", subTopics: [""], extraExplanation: "" });
    setModal({ open: true, saving: false, editId: null });
  }

  function openEditTopic(t) {
    setForm({
      years: t.years || [],
      topic: t.topic,
      subTopics: t.sub_topics && t.sub_topics.length > 0 ? t.sub_topics : [""],
      extraExplanation: t.extra_explanation || "",
    });
    setModal({ open: true, saving: false, editId: t.id });
  }

  function closeModal() {
    setModal({ open: false, saving: false, editId: null });
  }

  function handleFormChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleYearChange(y) {
    setForm((f) => ({
      ...f,
      years: f.years.includes(y) ? f.years.filter((v) => v !== y) : [...f.years, y],
    }));
  }

  function handleSubTopicChange(idx, value) {
    setForm((f) => ({
      ...f,
      subTopics: f.subTopics.map((s, i) => (i === idx ? value : s)),
    }));
  }

  function addSubTopic() {
    setForm((f) => ({ ...f, subTopics: [...f.subTopics, ""] }));
  }

  function removeSubTopic(idx) {
    setForm((f) => ({ ...f, subTopics: f.subTopics.filter((_, i) => i !== idx) }));
  }

  async function saveTopic(e) {
    e.preventDefault();
    setModal((m) => ({ ...m, saving: true }));
    try {
      const payload = {
        course_id: courseId,
        subject_id: subjectId,
        years: form.years,
        topic: form.topic,
        sub_topics: form.subTopics.filter((s) => s.trim()),
        extra_explanation: form.extraExplanation,
      };

      let res;
      if (modal.editId) {
        res = await fetch(`/api/admin/py-topics/${modal.editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/py-topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Save failed");
      toast.success(modal.editId ? "PY Topic updated" : "PY Topic saved");
      closeModal();
      await loadTopics();
    } catch (e) {
      toast.error(e.message);
      setModal((m) => ({ ...m, saving: false }));
    }
  }

  async function deleteTopic(id) {
    if (!confirm("Are you sure you want to delete this topic?")) return;
    try {
      const res = await fetch(`/api/admin/py-topics/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Delete failed");
      toast.success("PY Topic deleted");
      await loadTopics();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 9 + i);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push(`/admin/py-topics/${courseId}`)}
          className="mb-6 inline-flex items-center gap-2 text-yellow-600 hover:text-yellow-700 dark:hover:text-yellow-500 font-semibold transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Back to Subjects
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <div className="text-sm text-yellow-600 dark:text-yellow-400 font-medium mb-1">
              {course?.name}
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
              <FileText className="text-yellow-600 dark:text-yellow-400" size={32} />
              {subject?.name || "PY Topics"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage past year topics for this subject
            </p>
          </div>
          <button
            onClick={openAddTopic}
            className="px-6 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-700 text-white font-bold flex items-center gap-2 shadow-lg transition-all"
          >
            <Plus size={20} />
            Add Topic
          </button>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
          </div>
        ) : topics.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">No PY topics found.</p>
            <button
              onClick={openAddTopic}
              className="px-6 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white font-semibold inline-flex items-center gap-2"
            >
              <Plus size={18} />
              Create First Topic
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((t) => (
              <div
                key={t.id}
                className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-xl hover:border-yellow-400 dark:hover:border-yellow-500 transition-all duration-300 flex flex-col"
              >
                <div className="flex-1">
                  {/* Topic Name */}
                  <h3 className="font-bold text-gray-900 dark:text-white text-xl mb-4 line-clamp-2">
                    {t.topic}
                  </h3>

                  {/* Years */}
                  {(t.years || []).length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <Calendar size={14} />
                        <span>Years</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {t.years.sort((a, b) => a - b).map((y) => (
                          <span
                            key={y}
                            className="px-3 py-1 text-sm font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full"
                          >
                            {y}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sub Topics */}
                  {t.sub_topics && t.sub_topics.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <Tag size={14} />
                        <span>Sub Topics</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {t.sub_topics.slice(0, 4).map((st, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg"
                          >
                            {st}
                          </span>
                        ))}
                        {t.sub_topics.length > 4 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg">
                            +{t.sub_topics.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Extra Explanation */}
                  {t.extra_explanation && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 italic bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                      {t.extra_explanation.replace(/<[^>]*>?/gm, '')}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => openEditTopic(t)}
                    className="flex-1 px-4 py-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-xl transition-colors font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTopic(t.id)}
                    className="flex-1 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={modal.open} onClose={closeModal}>
        <div className="rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl w-full mx-auto border border-yellow-200 dark:border-yellow-700">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
            {modal.editId ? (
              <>
                <Edit2 className="text-yellow-600" size={24} /> Edit PY Topic
              </>
            ) : (
              <>
                <Plus className="text-yellow-600" size={24} /> Add PY Topic
              </>
            )}
          </h2>

          <form onSubmit={saveTopic} className="space-y-5">
            {/* Topic Name */}
            <div>
              <label className="block font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Topic Name <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border border-gray-300 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all"
                value={form.topic}
                onChange={(e) => handleFormChange("topic", e.target.value)}
                required
                placeholder="Enter topic name"
              />
            </div>

            {/* Years */}
            <div>
              <label className="block font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Years (Last 10)
              </label>
              <div className="flex flex-wrap gap-2">
                {yearOptions.map((y) => (
                  <label
                    key={y}
                    className={`flex items-center gap-1 px-4 py-2 rounded-full border cursor-pointer transition-all text-sm font-medium ${
                      form.years.includes(y)
                        ? "bg-yellow-500 text-white border-yellow-600 shadow-md"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                    }`}
                  >
                    <input
                      type="checkbox"
                      value={y}
                      checked={form.years.includes(y)}
                      onChange={() => handleYearChange(y)}
                      className="hidden"
                    />
                    {y}
                  </label>
                ))}
              </div>
            </div>

            {/* Sub Topics */}
            <div>
              <label className="block font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Sub Topics
              </label>
              {form.subTopics.map((s, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input
                    className="flex-1 border border-gray-300 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-400"
                    value={s}
                    onChange={(e) => handleSubTopicChange(idx, e.target.value)}
                    placeholder={`Sub Topic ${idx + 1}`}
                  />
                  {form.subTopics.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSubTopic(idx)}
                      className="px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addSubTopic}
                className="text-yellow-600 hover:text-yellow-700 font-medium text-sm mt-1 flex items-center gap-1"
              >
                <Plus size={16} /> Add Sub Topic
              </button>
            </div>

            {/* Extra Explanation / Content */}
            <RichTextEditor
              label="Content / Extra Explanation"
              value={form.extraExplanation}
              onChange={(val) => handleFormChange("extraExplanation", val)}
            />

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
              disabled={modal.saving}
            >
              {modal.saving ? "Saving..." : modal.editId ? "Update Topic" : "Save Topic"}
            </button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
