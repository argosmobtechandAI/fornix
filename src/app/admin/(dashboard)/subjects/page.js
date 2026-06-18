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
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import RichTextEditor from "@/components/RichTextEditor";

/* ============================
   Small UI helpers & components
   ============================ */

function IconButton({ children, title, onClick, className = "", disabled }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-2 py-1 text-sm rounded transition-all ${className} ${disabled
        ? "opacity-60 pointer-events-none"
        : "hover:brightness-95 active:scale-95"
        }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status = "pending" }) {
  const base =
    "inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border";
  if (status === "approved")
    return (
      <span className={`${base} bg-green-100 text-green-700 border-green-300`}>
        <CheckCircle size={12} /> Approved
      </span>
    );
  if (status === "rejected")
    return (
      <span className={`${base} bg-red-100 text-red-700 border-red-300`}>
        <XCircle size={12} /> Rejected
      </span>
    );
  return (
    <span className={`${base} bg-yellow-100 text-yellow-700 border-yellow-300`}>
      <Clock size={12} /> Pending
    </span>
  );
}

/* Modal component */
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/60 p-4">
      <motion.div
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -8, opacity: 0 }}
        className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-red-500"
          >
            ✕
          </button>
        </div>
        <div>{children}</div>
      </motion.div>
    </div>
  );
}

/* Small form inputs */
function TextInput({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-1">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </label>
  );
}
function TextArea({ label, value, onChange, rows = 3 }) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-1">{label}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </label>
  );
}

/* ============================
   CRUD Forms (Subject/Chapter/Topic/Question)
   ============================ */

function SubjectForm({ initial = null, onCancel, onSubmit, saving, courses = [] }) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [courseId, setCourseId] = useState(initial?.course_id || "");
  const [academicYear, setAcademicYear] = useState(initial?.academic_year || "");
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(initial?.icon_url || "");

  const FMGE_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Final Year"];

  // Detect if selected course is FMGE
  const selectedCourse = courses.find(c => String(c.id) === String(courseId));
  const isFMGE = selectedCourse && selectedCourse.name.toUpperCase().includes("FMGE");

  useEffect(() => {
    setName(initial?.name || "");
    setDescription(initial?.description || "");
    setCourseId(initial?.course_id || "");
    setAcademicYear(initial?.academic_year || "");
    setIconPreview(initial?.icon_url || "");
    setIconFile(null);
  }, [initial]);

  function handleIconChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconFile(file);
    const url = URL.createObjectURL(file);
    setIconPreview(url);
  }

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name required");
    if (!courseId) return toast.error("Course is required");
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      course_id: courseId,
      academic_year: academicYear || null,
      iconFile,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <div className="text-sm font-medium mb-1">Course</div>
        <select
          value={courseId}
          onChange={e => setCourseId(e.target.value)}
          required
          className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select Course</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <TextInput label="Subject name" value={name} onChange={setName} />
      <TextArea
        label="Description"
        value={description}
        onChange={setDescription}
        rows={3}
      />

      <div>
        <div className="text-sm font-medium mb-1">Academic Year</div>
        <select
          value={academicYear}
          onChange={e => setAcademicYear(e.target.value)}
          className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select Year</option>
          {FMGE_YEARS.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">⚠️ This is applicable only for FMGE courses. Leave empty for other courses.</p>
      </div>


      <div className="space-y-2">
        <label className="block text-sm font-medium mb-1">
          Subject icon
          <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
            (optional)
          </span>
        </label>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-900">
            {iconPreview || initial?.icon_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={iconPreview || initial?.icon_url}
                alt="Subject icon preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <Folder className="text-gray-400" size={20} />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="inline-flex items-center px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <span>Upload icon</span>
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

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded border"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-2 rounded bg-blue-600 text-white flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Save size={14} />
          )}{" "}
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

function ChapterForm({
  initial = null,
  parentSubjectId = "",
  onCancel,
  onSubmit,
  saving,
}) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");

  useEffect(() => {
    setName(initial?.name || "");
    setDescription(initial?.description || "");
  }, [initial]);

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
      <TextInput label="Chapter name" value={name} onChange={setName} />
      <TextArea
        label="Description"
        value={description}
        onChange={setDescription}
        rows={3}
      />
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded border"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-2 rounded bg-blue-600 text-white flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Save size={14} />
          )}{" "}
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

function TopicForm({
  initial = null,
  parentChapterId = "",
  parentId = null,
  onCancel,
  onSubmit,
  saving,
}) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [content, setContent] = useState(initial?.content || "");

  useEffect(() => {
    setName(initial?.name || "");
    setDescription(initial?.description || "");
    setContent(initial?.content || "");
  }, [initial]);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name required");
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      content: content.trim(),
      chapter_id: parentChapterId,
      parent_id: initial?.parent_id || parentId || null,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <TextInput label="Topic name" value={name} onChange={setName} />
      <TextArea
        label="Description"
        value={description}
        onChange={setDescription}
        rows={2}
      />
      <RichTextEditor
        label="Content"
        value={content}
        onChange={setContent}
      />
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded border"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-2 rounded bg-blue-600 text-white flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Save size={14} />
          )}{" "}
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

/* Question form handles creating/updating question + options + image + correct key + status (set pending by default on save) */
function QuestionForm({
  initial = null,
  parent = {},
  onCancel,
  onSubmit,
  saving,
}) {
  const [question_text, setQuestionText] = useState(
    initial?.question_text || ""
  );
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

  useEffect(() => {
    setQuestionText(initial?.question_text || "");
    setExplanation(initial?.explanation || "");
    setImageUrl(initial?.image_url || "");
    setOptions(
      initial?.options?.length
        ? initial.options
        : [
          { option_key: "a", content: "" },
          { option_key: "b", content: "" },
          { option_key: "c", content: "" },
          { option_key: "d", content: "" },
        ]
    );
    setCorrectKey(initial?.correct_option || "");
  }, [initial]);

  function updateOptionContent(key, val) {
    setOptions((prev) =>
      prev.map((o) => (o.option_key === key ? { ...o, content: val } : o))
    );
  }

  const submit = (e) => {
    e.preventDefault();
    if (!question_text.trim()) return toast.error("Question text required");
    const validOptions = options.filter((o) => o.content && o.content.trim());
    if (validOptions.length < 2)
      return toast.error("At least two options required");

    onSubmit({
      subject_id: parent.subject_id,
      chapter_id: parent.chapter_id,
      topic_id: parent.topic_id || null,
      question_text: question_text.trim(),
      explanation: explanation.trim() || null,
      image_url: image_url?.trim() || null,
      options: options.map((o) => ({
        option_key: o.option_key,
        content: o.content?.trim() || "",
      })),
      correct_key: correct_key || null,
      status: "pending",
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <TextArea
        label="Question"
        value={question_text}
        onChange={setQuestionText}
        rows={3}
      />

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
              className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <TextInput
          label="Correct key (a|b|c|d)"
          value={correct_key}
          onChange={setCorrectKey}
          placeholder="a"
        />
        <TextInput
          label="Image URL (optional)"
          value={image_url}
          onChange={setImageUrl}
          placeholder="https://..."
        />
      </div>

      <TextArea
        label="Explanation (optional)"
        value={explanation}
        onChange={setExplanation}
        rows={3}
      />

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded border"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-2 rounded bg-blue-600 text-white flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Save size={14} />
          )}{" "}
          {saving ? "Saving..." : "Save Question"}
        </button>
      </div>
    </form>
  );
}

/* ============================
   Question Item (Accordion)
   ============================ */

function QuestionItem({
  question,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onStatusChange,
  onViewImage,
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-2">
      {/* Header is a div (not a button) to avoid nested <button> issues. Action buttons are separate */}
      <div className="flex justify-between items-start p-3 bg-gray-50 dark:bg-gray-800">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
          <div className="flex items-start gap-3">
            <FileQuestion className="text-purple-500 mt-1 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-sm break-words">
                {question.question_text}
              </div>
              <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                <StatusBadge status={question.status} />
                <span className="text-xs">
                  Correct:{" "}
                  {question.correct_option
                    ? question.correct_option.toUpperCase()
                    : "—"}
                </span>
              </div>
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
            className="text-yellow-600 bg-yellow-50"
          >
            <Pencil size={14} />
          </IconButton>
          <IconButton
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-red-600 bg-red-50"
          >
            <Trash2 size={14} />
          </IconButton>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              {question.options?.map((opt) => {
                const isCorrect = question.correct_option === opt.option_key;

                return (
                  <div
                    key={opt.option_key}
                    className={`p-2 rounded border transition 
          ${isCorrect
                        ? "bg-green-50 border-green-400 dark:bg-green-900/30 dark:border-green-500"
                        : "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"
                      }`}
                  >
                    <strong>{opt.option_key.toUpperCase()}.</strong>
                    <span className="ml-1">{opt.content}</span>
                  </div>
                );
              })}
            </div>

            {question.explanation && (
              <div className="text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded mb-2">
                <strong>Explanation:</strong> {question.explanation}
              </div>
            )}

            {question.image_url && (
              <div className="mb-2">
                <button
                  type="button"
                  onClick={() => onViewImage(question.image_url)}
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Eye size={14} /> View image
                </button>
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <IconButton
                onClick={() => onStatusChange(question.id, "approved")}
                className="bg-green-50 text-green-700 border"
              >
                {" "}
                <CheckCircle size={14} /> Approve
              </IconButton>
              <IconButton
                onClick={() => onStatusChange(question.id, "pending")}
                className="bg-yellow-50 text-yellow-700 border"
              >
                {" "}
                <Clock size={14} /> Pending
              </IconButton>
              <IconButton
                onClick={() => onStatusChange(question.id, "rejected")}
                className="bg-red-50 text-red-700 border"
              >
                {" "}
                <XCircle size={14} /> Reject
              </IconButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================
   Main Page component
   ============================ */

export default function page() {
  const [tree, setTree] = useState([]); // expected shape: subjects -> chapters -> topics -> questions
  const [expanded, setExpanded] = useState({}); // keys: subjectId | chapterId | topicId | `q-${questionId}`
  const [modal, setModal] = useState({
    open: false,
    kind: "",
    mode: "create",
    parent: null,
    item: null,
    saving: false,
  });
  const [loadingTree, setLoadingTree] = useState(true);
  const [imagePreview, setImagePreview] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [courses, setCourses] = useState([]);

  const toggle = (key) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  async function fetchTree() {
    try {
      setLoadingTree(true);
      const res = await fetch("/api/admin/subjects/tree");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load tree");
      setTree(json.tree || []);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to load subjects");
    } finally {
      setLoadingTree(false);
    }
  }

  useEffect(() => {
    fetchTree();
    // Fetch courses list for SubjectForm
    (async () => {
      try {
        const res = await fetch("/api/admin/courses");
        const json = await res.json();
        if (json.success) setCourses(json.data || json.courses || []);
      } catch (e) { console.error("Failed to fetch courses"); }
    })();
  }, []);

  /* Generic create/update functions that call API and refresh tree */
  async function apiPost(path, payload) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  }
  async function apiPut(path, payload) {
    const res = await fetch(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  }
  async function apiDelete(path) {
    const res = await fetch(path, { method: "DELETE" });
    return res.json();
  }

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

  /* Create / Update / Delete handlers for all entities */
  const createSubject = async (payload) => {
    try {
      setModal((m) => ({ ...m, saving: true }));
      const { iconFile, ...data } = payload || {};
      const json = await apiPost("/api/admin/subjects", data);
      if (!json.success) throw new Error(json.error || "Create failed");
      const created = json.subject || json.data;

      if (iconFile && created?.id) {
        await uploadSubjectIcon(created.id, iconFile);
      }

      toast.success("Subject created");
      setModal({
        open: false,
        kind: "",
        mode: "create",
        parent: null,
        item: null,
        saving: false,
      });
      await fetchTree();
    } catch (err) {
      toast.error(err.message || "Create subject failed");
      setModal((m) => ({ ...m, saving: false }));
    }
  };
  const updateSubject = async (id, payload) => {
    try {
      setModal((m) => ({ ...m, saving: true }));
      const { iconFile, ...data } = payload || {};
      const json = await apiPut(`/api/admin/subjects/${id}`, data);
      if (!json.success) throw new Error(json.error || "Update failed");

      if (iconFile) {
        await uploadSubjectIcon(id, iconFile);
      }

      toast.success("Subject updated");
      setModal({
        open: false,
        kind: "",
        mode: "create",
        parent: null,
        item: null,
        saving: false,
      });
      await fetchTree();
    } catch (err) {
      toast.error(err.message || "Update subject failed");
      setModal((m) => ({ ...m, saving: false }));
    }
  };
  const createChapter = async (payload) => {
    try {
      setModal((m) => ({ ...m, saving: true }));
      const json = await apiPost("/api/admin/chapters", payload);
      if (!json.success) throw new Error(json.error || "Create failed");
      toast.success("Chapter created");
      setModal({
        open: false,
        kind: "",
        mode: "create",
        parent: null,
        item: null,
        saving: false,
      });
      await fetchTree();
    } catch (err) {
      toast.error(err.message || "Create chapter failed");
      setModal((m) => ({ ...m, saving: false }));
    }
  };
  const updateChapter = async (id, payload) => {
    try {
      setModal((m) => ({ ...m, saving: true }));
      const json = await apiPut(`/api/admin/chapters/${id}`, payload);
      if (!json.success) throw new Error(json.error || "Update failed");
      toast.success("Chapter updated");
      setModal({
        open: false,
        kind: "",
        mode: "create",
        parent: null,
        item: null,
        saving: false,
      });
      await fetchTree();
    } catch (err) {
      toast.error(err.message || "Update chapter failed");
      setModal((m) => ({ ...m, saving: false }));
    }
  };
  const createTopic = async (payload) => {
    try {
      setModal((m) => ({ ...m, saving: true }));
      const json = await apiPost("/api/admin/topics", payload);
      if (!json.success) throw new Error(json.error || "Create failed");
      toast.success("Topic created");
      setModal({
        open: false,
        kind: "",
        mode: "create",
        parent: null,
        item: null,
        saving: false,
      });
      await fetchTree();
    } catch (err) {
      toast.error(err.message || "Create topic failed");
      setModal((m) => ({ ...m, saving: false }));
    }
  };
  const updateTopic = async (id, payload) => {
    try {
      setModal((m) => ({ ...m, saving: true }));
      const json = await apiPut(`/api/admin/topics/${id}`, payload);
      if (!json.success) throw new Error(json.error || "Update failed");
      toast.success("Topic updated");
      setModal({
        open: false,
        kind: "",
        mode: "create",
        parent: null,
        item: null,
        saving: false,
      });
      await fetchTree();
    } catch (err) {
      toast.error(err.message || "Update topic failed");
      setModal((m) => ({ ...m, saving: false }));
    }
  };

  const createQuestion = async (payload) => {
    try {
      setModal((m) => ({ ...m, saving: true }));
      const json = await apiPost("/api/admin/questions", payload);
      if (!json.success) throw new Error(json.error || "Create failed");
      toast.success("Question created");
      setModal({
        open: false,
        kind: "",
        mode: "create",
        parent: null,
        item: null,
        saving: false,
      });
      await fetchTree();
    } catch (err) {
      toast.error(err.message || "Create question failed");
      setModal((m) => ({ ...m, saving: false }));
    }
  };

  const updateQuestion = async (id, payload) => {
    try {
      setModal((m) => ({ ...m, saving: true }));
      const json = await apiPut(`/api/admin/questions/${id}`, payload);
      if (!json.success) throw new Error(json.error || "Update failed");
      toast.success("Question updated");
      setModal({
        open: false,
        kind: "",
        mode: "create",
        parent: null,
        item: null,
        saving: false,
      });
      await fetchTree();
    } catch (err) {
      toast.error(err.message || "Update question failed");
      setModal((m) => ({ ...m, saving: false }));
    }
  };

  const handleDelete = async (kind, id) => {
    if (!confirm(`Delete this ${kind}?`)) return;
    try {
      setActionLoading(true);
      const json = await apiDelete(`/api/admin/${kind}s/${id}`);
      if (!json.success) throw new Error(json.error || "Delete failed");
      toast.success(`${kind} deleted`);
      await fetchTree();
    } catch (err) {
      toast.error(err.message || "Delete failed");
    } finally {
      setActionLoading(false);
    }
  };

  /* Status update for question (admin endpoint) */
  const handleStatusChange = async (questionId, status) => {
    try {
      const json = await apiPut(`/api/admin/questions/${questionId}/status`, {
        status,
      });
      if (!json.success) throw new Error(json.error || "Status update failed");
      toast.success(`Status set to ${status}`);
      await fetchTree();
    } catch (err) {
      toast.error(err.message || "Status update failed");
    }
  };

  /* Helpers to open/close modal */
  const openCreate = (kind, parent = null) =>
    setModal({
      open: true,
      kind,
      mode: "create",
      parent,
      item: null,
      saving: false,
    });
  const openEdit = (kind, item, parent = null) =>
    setModal({ open: true, kind, mode: "edit", parent, item, saving: false });
  const closeModal = () =>
    setModal({
      open: false,
      kind: "",
      mode: "create",
      parent: null,
      item: null,
      saving: false,
    });

  /* Helper to render question item props (editing needs parent context) */
  const onEditQuestion = (q, parent) => openEdit("question", q, parent);

  return (
    <div className="p-6 dark:bg-gray-900 min-h-screen">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Folder className="text-blue-600" size={24} />
            <h1 className="text-2xl font-semibold">Subject Manager</h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => openCreate("subject")}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
            >
              <Plus size={14} /> Add Subject
            </button>
          </div>
        </div>

        {loadingTree ? (
          <div className="py-16 text-center text-gray-500">
            <Loader2 className="animate-spin inline" /> Loading...
          </div>
        ) : tree.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            No subjects found — add one to begin.
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
            {tree.map((subject) => (
              <div key={subject.id}>
                {/* Subject Header */}
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => toggle(subject.id)}
                  >
                    {expanded[subject.id] ? <ChevronDown /> : <ChevronRight />}
                    <Folder className="text-blue-500" />
                    <div>
                      <div className="font-medium">{subject.name}</div>
                      {subject.description && (
                        <div className="text-xs text-gray-500">
                          {subject.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <IconButton
                      title="Add chapter"
                      onClick={() =>
                        openCreate("chapter", { subject_id: subject.id })
                      }
                      className="text-blue-600"
                    >
                      + Chapter
                    </IconButton>
                    <IconButton
                      title="Edit subject"
                      onClick={() => openEdit("subject", subject)}
                      className="text-yellow-600"
                    >
                      <Pencil size={14} />
                    </IconButton>
                    <IconButton
                      title="Delete subject"
                      onClick={() => handleDelete("subject", subject.id)}
                      className="text-red-600"
                    >
                      {actionLoading ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </IconButton>
                  </div>
                </div>

                {/* Chapters */}
                {expanded[subject.id] && (
                  <div className="mt-3 ml-6 space-y-3">
                    {subject.chapters?.length ? (
                      subject.chapters.map((ch) => (
                        <div key={ch.id}>
                          <div className="flex items-center justify-between">
                            <div
                              className="flex items-center gap-3 cursor-pointer"
                              onClick={() => toggle(ch.id)}
                            >
                              {expanded[ch.id] ? (
                                <ChevronDown />
                              ) : (
                                <ChevronRight />
                              )}
                              <Folder className="text-indigo-500" />
                              <div>
                                <div className="font-medium">{ch.name}</div>
                                {ch.description && (
                                  <div className="text-xs text-gray-500">
                                    {ch.description}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <IconButton
                                title="Add topic"
                                onClick={() =>
                                  openCreate("topic", { chapter_id: ch.id })
                                }
                                className="text-blue-600"
                              >
                                + Topic
                              </IconButton>
                              <IconButton
                                title="Add question"
                                onClick={() =>
                                  openCreate("question", {
                                    subject_id: subject.id,
                                    chapter_id: ch.id,
                                  })
                                }
                                className="text-green-600"
                              >
                                + Question
                              </IconButton>
                              <IconButton
                                title="Edit chapter"
                                onClick={() =>
                                  openEdit("chapter", ch, {
                                    subject_id: subject.id,
                                  })
                                }
                                className="text-yellow-600"
                              >
                                <Pencil size={14} />
                              </IconButton>
                              <IconButton
                                title="Delete chapter"
                                onClick={() => handleDelete("chapter", ch.id)}
                                className="text-red-600"
                              >
                                {actionLoading ? (
                                  <Loader2 className="animate-spin" size={14} />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </IconButton>
                            </div>
                          </div>

                          {/* Chapter details */}
                          {expanded[ch.id] && (
                            <div className="mt-2 ml-6">
                              {/* direct (chapter) questions */}
                              {ch.questions?.length > 0 && (
                                <div className="mb-3">
                                  <div className="font-medium text-sm mb-2">
                                    Chapter Questions
                                  </div>
                                  {ch.questions.map((q) => (
                                    <QuestionItem
                                      key={q.id}
                                      question={q}
                                      isExpanded={expanded[`q-${q.id}`]}
                                      onToggle={() => toggle(`q-${q.id}`)}
                                      onEdit={() =>
                                        onEditQuestion(q, {
                                          subject_id: subject.id,
                                          chapter_id: ch.id,
                                        })
                                      }
                                      onDelete={() =>
                                        handleDelete("question", q.id)
                                      }
                                      onStatusChange={handleStatusChange}
                                      onViewImage={(url) =>
                                        setImagePreview(url)
                                      }
                                    />
                                  ))}
                                </div>
                              )}

                              {/* topics */}
                              {ch.topics?.length > 0 && (
                                <div>
                                  <div className="font-medium text-sm mb-2">
                                    Topics
                                  </div>
                                  {ch.topics.map((t) => (
                                    <div
                                      key={t.id}
                                      className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div
                                          className="flex items-center gap-3 cursor-pointer"
                                          onClick={() => toggle(t.id)}
                                        >
                                          {expanded[t.id] ? (
                                            <ChevronDown />
                                          ) : (
                                            <ChevronRight />
                                          )}
                                          <div className="font-medium">
                                            {t.name}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <IconButton
                                            title="Add sub-topic"
                                            onClick={() =>
                                              openCreate("topic", {
                                                chapter_id: ch.id,
                                                parent_id: t.id,
                                              })
                                            }
                                            className="text-blue-600"
                                          >
                                            + Sub-topic
                                          </IconButton>
                                          <IconButton
                                            title="Add question"
                                            onClick={() =>
                                              openCreate("question", {
                                                subject_id: subject.id,
                                                chapter_id: ch.id,
                                                topic_id: t.id,
                                              })
                                            }
                                            className="text-green-600"
                                          >
                                            + Question
                                          </IconButton>
                                          <IconButton
                                            title="Edit topic"
                                            onClick={() =>
                                              openEdit("topic", t, {
                                                chapter_id: ch.id,
                                              })
                                            }
                                            className="text-yellow-600"
                                          >
                                            <Pencil size={14} />
                                          </IconButton>
                                          <IconButton
                                            title="Delete topic"
                                            onClick={() =>
                                              handleDelete("topic", t.id)
                                            }
                                            className="text-red-600"
                                          >
                                            {actionLoading ? (
                                              <Loader2
                                                className="animate-spin"
                                                size={14}
                                              />
                                            ) : (
                                              <Trash2 size={14} />
                                            )}
                                          </IconButton>
                                        </div>
                                      </div>

                                      {expanded[t.id] && (
                                        <div className="mt-3 ml-4 space-y-4">
                                          {/* Sub topics */}
                                          {t.sub_topics?.length > 0 && (
                                            <div className="space-y-2 border-l-2 border-blue-100 pl-4">
                                              <div className="text-xs font-bold text-blue-600 uppercase tracking-tight">Sub-topics</div>
                                              {t.sub_topics.map(st => (
                                                <div key={st.id} className="bg-blue-50/30 p-2 rounded border border-blue-50 flex justify-between items-center group">
                                                  <div className="flex items-center gap-2">
                                                    <ChevronRight size={12} className="text-blue-400" />
                                                    <span className="text-sm font-medium">{st.name}</span>
                                                  </div>
                                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <IconButton
                                                      title="Edit sub-topic"
                                                      onClick={() => openEdit("topic", st, { chapter_id: ch.id })}
                                                      className="text-yellow-600 scale-75"
                                                    >
                                                      <Pencil size={14} />
                                                    </IconButton>
                                                    <IconButton
                                                      title="Delete sub-topic"
                                                      onClick={() => handleDelete("topic", st.id)}
                                                      className="text-red-600 scale-75"
                                                    >
                                                      <Trash2 size={14} />
                                                    </IconButton>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}

                                          {/* Topic questions */}
                                          <div className="space-y-2">
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-tight">Questions</div>
                                            {t.questions?.length ? (
                                              t.questions.map((q) => (
                                                <QuestionItem
                                                  key={q.id}
                                                  question={q}
                                                  isExpanded={
                                                    expanded[`q-${q.id}`]
                                                  }
                                                  onToggle={() =>
                                                    toggle(`q-${q.id}`)
                                                  }
                                                  onEdit={() =>
                                                    onEditQuestion(q, {
                                                      subject_id: subject.id,
                                                      chapter_id: ch.id,
                                                      topic_id: t.id,
                                                    })
                                                  }
                                                  onDelete={() =>
                                                    handleDelete("question", q.id)
                                                  }
                                                  onStatusChange={
                                                    handleStatusChange
                                                  }
                                                  onViewImage={(url) =>
                                                    setImagePreview(url)
                                                  }
                                                />
                                              ))
                                            ) : (
                                              <div className="text-xs text-gray-500 p-2 text-center">
                                                No topic questions
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {!ch.questions?.length && !ch.topics?.length && (
                                <div className="text-xs text-gray-500 p-4 text-center border border-dashed rounded-lg">
                                  No questions or topics yet.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500">
                        No chapters yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image preview */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setImagePreview(null)}
          >
            <div
              className="bg-white dark:bg-gray-900 p-4 rounded max-w-3xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Image Preview</h3>
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="text-gray-500 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
              {/* Use img tag — ensure CORS host allows embedding */}
              <img
                src={imagePreview}
                alt="preview"
                className="w-full object-contain rounded"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CRUD Modal */}
      <Modal
        open={modal.open}
        onClose={closeModal}
        title={`${modal.mode === "create" ? "Create" : "Edit"} ${modal.kind || ""
          }`}
      >
        {modal.kind === "subject" && (
          <SubjectForm
            initial={modal.mode === "edit" ? modal.item : null}
            onCancel={closeModal}
            onSubmit={(payload) =>
              modal.mode === "create"
                ? createSubject(payload)
                : updateSubject(modal.item.id, payload)
            }
            saving={modal.saving}
            courses={courses}
          />
        )}
        {modal.kind === "chapter" && (
          <ChapterForm
            initial={modal.mode === "edit" ? modal.item : null}
            parentSubjectId={modal.parent?.subject_id || ""}
            onCancel={closeModal}
            onSubmit={(payload) =>
              modal.mode === "create"
                ? createChapter(payload)
                : updateChapter(modal.item.id, payload)
            }
            saving={modal.saving}
          />
        )}
        {modal.kind === "topic" && (
          <TopicForm
            initial={modal.mode === "edit" ? modal.item : null}
            parentChapterId={modal.parent?.chapter_id || ""}
            parentId={modal.parent?.parent_id}
            onCancel={closeModal}
            onSubmit={(payload) =>
              modal.mode === "create"
                ? createTopic(payload)
                : updateTopic(modal.item.id, payload)
            }
            saving={modal.saving}
          />
        )}
        {modal.kind === "question" && (
          <QuestionForm
            initial={modal.mode === "edit" ? modal.item : null}
            parent={modal.parent || {}}
            onCancel={closeModal}
            onSubmit={(payload) =>
              modal.mode === "create"
                ? createQuestion(payload)
                : updateQuestion(modal.item.id, payload)
            }
            saving={modal.saving}
          />
        )}
      </Modal>
    </div>
  );
}
