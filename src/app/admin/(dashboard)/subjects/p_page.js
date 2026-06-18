"use client";

import { useEffect, useState } from "react";
import {
  Folder,
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  FileQuestion,
  Save,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

/* ----------------------- Small UI helpers ----------------------- */

function IconButton({ children, title, onClick, className, disabled }) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-2 py-1 text-sm rounded transition-all ${className} ${
        disabled ? "opacity-60 pointer-events-none" : "hover:brightness-95 active:scale-95"
      }`}
    >
      {children}
    </button>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/60 p-4">
      <motion.div
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -8, opacity: 0 }}
        className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition-colors">
            ✕
          </button>
        </div>
        <div>{children}</div>
      </motion.div>
    </div>
  );
}

/* ----------------------- Forms ----------------------- */

function SubjectForm({ initial = null, onCancel, onSubmit, saving }) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");

  useEffect(() => {
    setName(initial?.name || "");
    setDescription(initial?.description || "");
  }, [initial]);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name required");
    onSubmit({ name: name.trim(), description: description.trim() });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <div className="text-sm font-medium mb-1">Subject Name</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </label>

      <label className="block">
        <div className="text-sm font-medium mb-1">Description</div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          rows={3}
        />
      </label>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-2 rounded bg-blue-600 text-white flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={14} />}{" "}
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

function ChapterForm({ initial = null, parentSubjectId = "", onCancel, onSubmit, saving }) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name required");
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      subject_id: parentSubjectId,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <div className="text-sm font-medium mb-1">Chapter Name</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </label>

      <label className="block">
        <div className="text-sm font-medium mb-1">Description</div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          rows={3}
        />
      </label>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-2 rounded bg-blue-600 text-white flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={14} />}{" "}
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

function TopicForm({ initial = null, parentChapterId = "", onCancel, onSubmit, saving }) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name required");
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      chapter_id: parentChapterId,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <div className="text-sm font-medium mb-1">Topic Name</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </label>

      <label className="block">
        <div className="text-sm font-medium mb-1">Description</div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          rows={3}
        />
      </label>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-2 rounded bg-blue-600 text-white flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={14} />}{" "}
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

function QuestionForm({ initial = null, parent = {}, onCancel, onSubmit, saving }) {
  const [question_text, setQuestionText] = useState(initial?.question_text || "");
  const [explanation, setExplanation] = useState(initial?.explanation || "");
  const [image_url, setImageUrl] = useState(initial?.image_url || "");
  const [options, setOptions] = useState(
    initial?.options?.length
      ? initial.options
      : [
          { option_key: "a", content: "" },
          { option_key: "b", content: "" },
          { option_key: "c", content: "" },
          { option_key: "d", content: "" },
        ]
  );
  const [correct_key, setCorrectKey] = useState(initial?.correct_option || "");

  const updateOptionContent = (key, val) => {
    setOptions((prev) =>
      prev.map((o) => (o.option_key === key ? { ...o, content: val } : o))
    );
  };

  const submit = (e) => {
    e.preventDefault();
    if (!question_text.trim()) return toast.error("Question text required");
    const validOptions = options.filter((o) => o.content.trim());
    if (validOptions.length < 2)
      return toast.error("At least 2 options required");

    onSubmit({
      question_text: question_text.trim(),
      explanation: explanation.trim() || null,
      image_url: image_url.trim() || null,
      subject_id: parent.subject_id,
      chapter_id: parent.chapter_id,
      topic_id: parent.topic_id || null,
      options: options.map((o) => ({
        option_key: o.option_key,
        content: o.content.trim(),
      })),
      correct_key: correct_key || null,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <div className="text-sm font-medium mb-1">Question</div>
        <textarea
          value={question_text}
          onChange={(e) => setQuestionText(e.target.value)}
          className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all h-24"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((opt) => (
          <div key={opt.option_key}>
            <div className="text-xs font-medium mb-1">
              Option {opt.option_key.toUpperCase()}
            </div>
            <input
              value={opt.content}
              onChange={(e) =>
                updateOptionContent(opt.option_key, e.target.value)
              }
              className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="block">
          <div className="text-xs font-medium mb-1">Correct key (a|b|c|d)</div>
          <input
            value={correct_key}
            onChange={(e) => setCorrectKey(e.target.value.trim().toLowerCase())}
            className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="a"
          />
        </label>
        <label className="block">
          <div className="text-xs font-medium mb-1">Image URL (optional)</div>
          <input
            value={image_url}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </label>
      </div>

      <label className="block">
        <div className="text-xs font-medium mb-1">Explanation (optional)</div>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          rows={3}
        />
      </label>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-2 rounded bg-blue-600 text-white flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={14} />}{" "}
          {saving ? "Saving..." : "Save Question"}
        </button>
      </div>
    </form>
  );
}

/* ----------------------- Enhanced Question Display ----------------------- */

function QuestionItem({ question, onEdit, onDelete, onToggle, isExpanded }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-2">
      <div className="flex justify-between items-start p-3 bg-gray-50 dark:bg-gray-800">
        <div 
          className="flex-1 flex items-start gap-3 cursor-pointer"
          onClick={onToggle}
        >
          <FileQuestion className="text-purple-500 mt-1 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm break-words">{question.question_text}</div>
            <div className="text-xs text-gray-500 mt-1">
              Correct: {question.correct_option?.toUpperCase() || "—"}
            </div>
          </div>
        </div>
        <div className="flex gap-1 ml-2 flex-shrink-0">
          <IconButton
            title="Edit"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20"
          >
            <Pencil size={14} />
          </IconButton>
          <IconButton
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-red-600 bg-red-50 dark:bg-red-900/20"
          >
            <Trash2 size={14} />
          </IconButton>
        </div>
      </div>
      
      {isExpanded && (
        <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {question.options?.map((opt) => (
              <div
                key={opt.option_key}
                className={`p-2 rounded border ${
                  question.correct_option === opt.option_key
                    ? "bg-green-50 border-green-400 dark:bg-green-900/20"
                    : "bg-gray-50 border-gray-200 dark:bg-gray-800"
                }`}
              >
                <strong className="text-sm">{opt.option_key.toUpperCase()}.</strong> 
                <span className="text-sm ml-1">{opt.content}</span>
              </div>
            ))}
          </div>
          
          {question.explanation && (
            <div className="text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded mb-2">
              <strong>Explanation:</strong> {question.explanation}
            </div>
          )}
          
          {question.image_url && (
            <div className="mt-2">
              <button
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                onClick={() => setImagePreview(question.image_url)}
              >
                <Eye size={14} /> View image
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ----------------------- Main Page ----------------------- */

export default function SubjectsManagerPage() {
  const [tree, setTree] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loadingTree, setLoadingTree] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [modal, setModal] = useState({
    open: false,
    kind: "",
    mode: "create",
    parent: null,
    item: null,
    saving: false,
  });
  const [imagePreview, setImagePreview] = useState(null);

  const toggle = (key) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const fetchTree = async () => {
    try {
      setLoadingTree(true);
      const res = await fetch("/api/admin/subjects/tree");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setTree(json.tree || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingTree(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, []);

  /* ---- CRUD Operations ---- */
  const createSubject = async (payload) => {
    try {
      setModal(prev => ({ ...prev, saving: true }));
      const res = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Subject created");
      setModal({ open: false, kind: "", mode: "create", parent: null, item: null, saving: false });
      await fetchTree();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const updateSubject = async (id, payload) => {
    try {
      setModal(prev => ({ ...prev, saving: true }));
      const res = await fetch(`/api/admin/subjects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Subject updated");
      setModal({ open: false, kind: "", mode: "create", parent: null, item: null, saving: false });
      await fetchTree();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const createChapter = async (payload) => {
    try {
      setModal(prev => ({ ...prev, saving: true }));
      const res = await fetch("/api/admin/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Chapter created");
      setModal({ open: false, kind: "", mode: "create", parent: null, item: null, saving: false });
      await fetchTree();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const updateChapter = async (id, payload) => {
    try {
      setModal(prev => ({ ...prev, saving: true }));
      const res = await fetch(`/api/admin/chapters/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Chapter updated");
      setModal({ open: false, kind: "", mode: "create", parent: null, item: null, saving: false });
      await fetchTree();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const createTopic = async (payload) => {
    try {
      setModal(prev => ({ ...prev, saving: true }));
      const res = await fetch("/api/admin/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Topic created");
      setModal({ open: false, kind: "", mode: "create", parent: null, item: null, saving: false });
      await fetchTree();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const updateTopic = async (id, payload) => {
    try {
      setModal(prev => ({ ...prev, saving: true }));
      const res = await fetch(`/api/admin/topics/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Topic updated");
      setModal({ open: false, kind: "", mode: "create", parent: null, item: null, saving: false });
      await fetchTree();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const createQuestion = async (payload) => {
    try {
      setModal(prev => ({ ...prev, saving: true }));
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Question created");
      setModal({ open: false, kind: "", mode: "create", parent: null, item: null, saving: false });
      await fetchTree();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const updateQuestion = async (id, payload) => {
    try {
      setModal(prev => ({ ...prev, saving: true }));
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Question updated");
      setModal({ open: false, kind: "", mode: "create", parent: null, item: null, saving: false });
      await fetchTree();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (kind, id) => {
    if (!confirm(`Delete this ${kind}?`)) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/${kind}s/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`${kind} deleted`);
      await fetchTree();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openCreate = (kind, parent = null) =>
    setModal({ open: true, kind, mode: "create", parent, item: null, saving: false });
  const openEdit = (kind, item, parent = null) =>
    setModal({ open: true, kind, mode: "edit", parent, item, saving: false });

  return (
    <div className="p-4 sm:p-6 dark:bg-gray-900 min-h-screen">
      <Toaster position="top-right" />
      <div className="mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Folder className="text-blue-600" /> Subject Manager
          </h1>
          <button
            onClick={() => openCreate("subject")}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors w-full sm:w-auto justify-center"
          >
            <Plus size={14} /> Add Subject
          </button>
        </div>

        {loadingTree ? (
          <div className="py-16 text-center text-gray-500">
            <Loader2 className="animate-spin inline" /> Loading...
          </div>
        ) : tree.length === 0 ? (
          <div className="py-16 text-center text-gray-500">No subjects found.</div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
            {tree.map((subject) => (
              <div key={subject.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                {/* Subject */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div
                    className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                    onClick={() => toggle(subject.id)}
                  >
                    {expanded[subject.id] ? <ChevronDown /> : <ChevronRight />}
                    <Folder className="text-blue-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{subject.name}</div>
                      {subject.description && (
                        <div className="text-xs text-gray-500 truncate">
                          {subject.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 sm:gap-2 w-full sm:w-auto justify-end">
                    <IconButton
                      title="Add Chapter"
                      onClick={() => openCreate("chapter", { subject_id: subject.id })}
                      className="text-blue-600 bg-blue-50 dark:bg-blue-900/20 text-xs"
                    >
                      + Chapter
                    </IconButton>
                    <IconButton
                      title="Edit"
                      onClick={() => openEdit("subject", subject)}
                      className="text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20"
                    >
                      <Pencil size={14} />
                    </IconButton>
                    <IconButton
                      title="Delete"
                      onClick={() => handleDelete("subject", subject.id)}
                      className="text-red-600 bg-red-50 dark:bg-red-900/20"
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                    </IconButton>
                  </div>
                </div>

                {/* Chapters */}
                {expanded[subject.id] &&
                  subject.chapters?.map((ch) => (
                    <div key={ch.id} className="mt-4 ml-2 sm:ml-6 pl-3 sm:pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div
                          className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                          onClick={() => toggle(ch.id)}
                        >
                          {expanded[ch.id] ? <ChevronDown /> : <ChevronRight />}
                          <Folder className="text-indigo-500 flex-shrink-0" size={16} />
                          <div className="min-w-0">
                            <div className="font-medium truncate">{ch.name}</div>
                            {ch.description && (
                              <div className="text-xs text-gray-500 truncate">{ch.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 sm:gap-2 w-full sm:w-auto justify-end">
                          <IconButton
                            title="Add Topic"
                            onClick={() => openCreate("topic", { chapter_id: ch.id })}
                            className="text-blue-600 bg-blue-50 dark:bg-blue-900/20 text-xs"
                          >
                            + Topic
                          </IconButton>
                          <IconButton
                            title="Add Question"
                            onClick={() =>
                              openCreate("question", {
                                subject_id: subject.id,
                                chapter_id: ch.id,
                              })
                            }
                            className="text-green-600 bg-green-50 dark:bg-green-900/20 text-xs"
                          >
                            + Q
                          </IconButton>
                          <IconButton
                            title="Edit"
                            onClick={() => openEdit("chapter", ch, { subject_id: subject.id })}
                            className="text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20"
                          >
                            <Pencil size={14} />
                          </IconButton>
                          <IconButton
                            title="Delete"
                            onClick={() => handleDelete("chapter", ch.id)}
                            className="text-red-600 bg-red-50 dark:bg-red-900/20"
                            disabled={actionLoading}
                          >
                            {actionLoading ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                          </IconButton>
                        </div>
                      </div>

                      {expanded[ch.id] && (
                        <div className="ml-2 sm:ml-6 mt-3 space-y-4">
                          {/* Chapter-level questions */}
                          {ch.questions?.length > 0 && (
                            <div>
                              <div className="font-medium text-sm mb-2 text-gray-600">
                                Chapter Questions:
                              </div>
                              {ch.questions.map((q) => (
                                <QuestionItem
                                  key={q.id}
                                  question={q}
                                  onEdit={() => openEdit("question", q, { 
                                    subject_id: subject.id, 
                                    chapter_id: ch.id 
                                  })}
                                  onDelete={() => handleDelete("question", q.id)}
                                  onToggle={() => toggle(`q-${q.id}`)}
                                  isExpanded={expanded[`q-${q.id}`]}
                                />
                              ))}
                            </div>
                          )}

                          {/* Topics and their questions */}
                          {ch.topics?.length > 0 && (
                            <div>
                              <div className="font-medium text-sm mb-2 text-gray-600">Topics:</div>
                              {ch.topics.map((t) => (
                                <div key={t.id} className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <div 
                                      className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                                      onClick={() => toggle(t.id)}
                                    >
                                      {expanded[t.id] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                      <div className="font-medium truncate">{t.name}</div>
                                    </div>
                                    <div className="flex gap-1 sm:gap-2 w-full sm:w-auto justify-end">
                                      <IconButton
                                        title="Add Question"
                                        onClick={() =>
                                          openCreate("question", {
                                            subject_id: subject.id,
                                            chapter_id: ch.id,
                                            topic_id: t.id,
                                          })
                                        }
                                        className="text-green-600 bg-green-50 dark:bg-green-900/20 text-xs"
                                      >
                                        + Q
                                      </IconButton>
                                      <IconButton
                                        title="Edit"
                                        onClick={() => openEdit("topic", t, { chapter_id: ch.id })}
                                        className="text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20"
                                      >
                                        <Pencil size={14} />
                                      </IconButton>
                                      <IconButton
                                        title="Delete"
                                        onClick={() => handleDelete("topic", t.id)}
                                        className="text-red-600 bg-red-50 dark:bg-red-900/20"
                                        disabled={actionLoading}
                                      >
                                        {actionLoading ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                                      </IconButton>
                                    </div>
                                  </div>

                                  {expanded[t.id] && (
                                    <div className="ml-2 sm:ml-4 mt-3">
                                      {t.questions?.length ? (
                                        t.questions.map((q) => (
                                          <QuestionItem
                                            key={q.id}
                                            question={q}
                                            onEdit={() => openEdit("question", q, {
                                              subject_id: subject.id,
                                              chapter_id: ch.id,
                                              topic_id: t.id,
                                            })}
                                            onDelete={() => handleDelete("question", q.id)}
                                            onToggle={() => toggle(`q-${q.id}`)}
                                            isExpanded={expanded[`q-${q.id}`]}
                                          />
                                        ))
                                      ) : (
                                        <div className="text-xs text-gray-500 p-2 text-center">
                                          No topic questions
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {!ch.questions?.length && !ch.topics?.length && (
                            <div className="text-xs text-gray-500 p-4 text-center border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                              No questions or topics yet.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setImagePreview(null)}
          >
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Image Preview</h3>
                <button
                  onClick={() => setImagePreview(null)}
                  className="text-gray-500 hover:text-red-500 transition-colors"
                >
                  ✕
                </button>
              </div>
              <img
                src={imagePreview}
                alt="preview"
                className="w-full h-auto object-contain rounded"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CRUD Modal */}
      <Modal
        open={modal.open}
        onClose={() =>
          setModal({
            open: false,
            kind: "",
            mode: "create",
            parent: null,
            item: null,
            saving: false,
          })
        }
        title={`${modal.mode === "create" ? "Create" : "Edit"} ${
          modal.kind ? modal.kind.charAt(0).toUpperCase() + modal.kind.slice(1) : ""
        }`}
      >
        {modal.kind === "subject" && (
          <SubjectForm
            initial={modal.mode === "edit" ? modal.item : null}
            onCancel={() => setModal({ open: false, kind: "", mode: "create", parent: null, item: null, saving: false })}
            onSubmit={modal.mode === "create" ? createSubject : (payload) => updateSubject(modal.item.id, payload)}
            saving={modal.saving}
          />
        )}
        {modal.kind === "chapter" && (
          <ChapterForm
            initial={modal.mode === "edit" ? modal.item : null}
            parentSubjectId={modal.parent?.subject_id || ""}
            onCancel={() => setModal({ open: false, kind: "", mode: "create", parent: null, item: null, saving: false })}
            onSubmit={modal.mode === "create" ? createChapter : (payload) => updateChapter(modal.item.id, payload)}
            saving={modal.saving}
          />
        )}
        {modal.kind === "topic" && (
          <TopicForm
            initial={modal.mode === "edit" ? modal.item : null}
            parentChapterId={modal.parent?.chapter_id || ""}
            onCancel={() => setModal({ open: false, kind: "", mode: "create", parent: null, item: null, saving: false })}
            onSubmit={modal.mode === "create" ? createTopic : (payload) => updateTopic(modal.item.id, payload)}
            saving={modal.saving}
          />
        )}
        {modal.kind === "question" && (
          <QuestionForm
            initial={modal.mode === "edit" ? modal.item : null}
            parent={modal.parent || {}}
            onCancel={() => setModal({ open: false, kind: "", mode: "create", parent: null, item: null, saving: false })}
            onSubmit={modal.mode === "create" ? createQuestion : (payload) => updateQuestion(modal.item.id, payload)}
            saving={modal.saving}
          />
        )}
      </Modal>
    </div>
  );
}