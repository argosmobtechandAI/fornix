"use client";

import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
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

function TopicForm({ initial = null, parentChapterId = "", onCancel, onSubmit, saving }) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Topic name required");
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
          className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800"
        />
      </label>

      <label className="block">
        <div className="text-sm font-medium mb-1">Description</div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800"
          rows={3}
        />
      </label>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-2 rounded border">
          Cancel
        </button>
        <button type="submit" className="px-3 py-2 rounded bg-orange-600 text-white flex items-center gap-2">
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
    setOptions((prev) => prev.map((o) => (o.option_key === key ? { ...o, content: val } : o)));
  };

  const submit = (e) => {
    e.preventDefault();
    if (!question_text.trim()) return toast.error("Question text required");
    const validOptions = options.filter((o) => o.content.trim());
    if (validOptions.length < 2) return toast.error("At least two options required");

    onSubmit({
      question_text: question_text.trim(),
      explanation: explanation.trim() || null,
      image_url: image_url.trim() || null,
      subject_id: parent.subject_id,
      chapter_id: parent.chapter_id,
      topic_id: parent.topic_id || null,
      options: options.map((o) => ({ option_key: o.option_key, content: o.content.trim() })),
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
          className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800 h-24"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => (
          <div key={opt.option_key}>
            <div className="text-xs font-medium mb-1">Option {opt.option_key.toUpperCase()}</div>
            <input
              value={opt.content}
              onChange={(e) => updateOptionContent(opt.option_key, e.target.value)}
              className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <div className="text-xs font-medium mb-1">Correct key (a|b|c|d)</div>
          <input
            value={correct_key}
            onChange={(e) => setCorrectKey(e.target.value.trim().toLowerCase())}
            className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800"
            placeholder="a"
          />
        </label>
        <label className="block">
          <div className="text-xs font-medium mb-1">Image URL (optional)</div>
          <input
            value={image_url}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800"
            placeholder="https://..."
          />
        </label>
      </div>

      <label className="block">
        <div className="text-xs font-medium mb-1">Explanation (optional)</div>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800"
          rows={3}
        />
      </label>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-2 rounded border">
          Cancel
        </button>
        <button type="submit" className="px-3 py-2 rounded bg-orange-600 text-white flex items-center gap-2">
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={14} />}{" "}
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

/* ----------------------- Helper: Question Accordion ----------------------- */
function renderQuestionAccordion(q, expanded, toggle, onEdit, onDelete, setImagePreview) {
  const isOpen = expanded[`q-${q.id}`];
  return (
    <div key={q.id} className="border border-gray-200 dark:border-gray-700 rounded mb-2 overflow-hidden">
      <div
        className="flex justify-between items-start p-3 bg-gray-50 dark:bg-gray-800 cursor-pointer"
        onClick={() => toggle(`q-${q.id}`)}
      >
        <div className="flex items-start gap-3 flex-1">
          <FileQuestion className="text-purple-500 flex-shrink-0 mt-1" />
          <div>
            <div className="font-medium">{q.question_text}</div>
            <div className="text-xs text-gray-500 mt-1">
              Correct: {q.correct_option?.toUpperCase() || "—"}
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <IconButton
            title="Edit"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="text-yellow-600"
          >
            <Pencil size={14} />
          </IconButton>
          {/* <IconButton
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-red-600"
          >
            <Trash2 size={14} />
          </IconButton> */}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="p-3 bg-white dark:bg-gray-900"
          >
            {q.options?.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                {q.options.map((opt) => (
                  <div
                    key={opt.option_key}
                    className={`p-2 rounded border ${
                      q.correct_option === opt.option_key
                        ? "bg-green-50 border-green-400 dark:bg-green-900/20"
                        : "bg-gray-50 border-gray-200 dark:bg-gray-800"
                    }`}
                  >
                    <strong>{opt.option_key.toUpperCase()}.</strong> {opt.content}
                  </div>
                ))}
              </div>
            )}

            {q.explanation && (
              <div className="text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded mb-2">
                <strong>Explanation:</strong> {q.explanation}
              </div>
            )}

            {q.image_url && (
              <div className="mt-2">
                <a
                  href={`${q.image_url}`}
                  target="_blank"
                  className="text-sm text-amber-700 hover:underline flex items-center gap-1"
                >
                  <Eye size={14} /> View image
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ----------------------- Main Page ----------------------- */
export default function DoctorSubjectsPage() {
  const [tree, setTree] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loadingTree, setLoadingTree] = useState(true);
  const [modal, setModal] = useState({ open: false, kind: "", mode: "create", parent: null, item: null, saving: false });
  const [imagePreview, setImagePreview] = useState(null);
  const [userInfo, setUserInfo] = useState({ user_id: "", name: "", email: "" });

  /* Decode JWT for doctor_id */
  useEffect(() => {
    const tokenCookie = document.cookie.split("; ").find((r) => r.startsWith("token="));
    if (tokenCookie) {
      try {
        const token = tokenCookie.split("=")[1];
        const decoded = jwtDecode(token);
        setUserInfo({
          user_id: decoded.sub || null,
          name: decoded.name || "Doctor",
          email: decoded.email || "",
        });
      } catch (err) {
        console.error("JWT decode failed", err);
      }
    }
  }, []);

  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const fetchTree = async () => {
    if (!userInfo.user_id) return;
    try {
      setLoadingTree(true);
      const res = await fetch(`/api/doctor/subjects/tree?doctor_id=${userInfo.user_id}`);
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
    if (userInfo.user_id) fetchTree();
  }, [userInfo.user_id]);

  /* CRUD for Topics + Questions */
  const createTopic = async (payload) => {
    try {
      setModal((m) => ({ ...m, saving: true }));
      const res = await fetch("/api/doctor/topics", {
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
      setModal((m) => ({ ...m, saving: true }));
      const res = await fetch(`/api/doctor/topics/${id}`, {
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
      setModal((m) => ({ ...m, saving: true }));
      const res = await fetch("/api/doctor/questions", {
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
      setModal((m) => ({ ...m, saving: true }));
      const res = await fetch(`/api/doctor/questions/${id}`, {
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
      const res = await fetch(`/api/doctor/${kind}s/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`${kind} deleted`);
      await fetchTree();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const openCreate = (kind, parent = null) => setModal({ open: true, kind, mode: "create", parent, item: null, saving: false });
  const openEdit = (kind, item, parent = null) => setModal({ open: true, kind, mode: "edit", parent, item, saving: false });

  /* ----------------------- Render ----------------------- */
  return (
    <div className="p-4 sm:p-6 dark:bg-gray-900 min-h-screen">
      <Toaster position="top-right" />
      <h1 className="text-2xl font-semibold mb-6 flex items-center gap-2">
        <Folder className="text-amber-700" /> My Subjects
      </h1>

      {loadingTree ? (
        <div className="text-center py-16 text-gray-500">
          <Loader2 className="animate-spin inline mr-2" /> Loading...
        </div>
      ) : tree.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No subjects assigned yet.</div>
      ) : (
        <div className="space-y-4">
          {tree.map((subject) => (
            <div key={subject.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggle(subject.id)}>
                  {expanded[subject.id] ? <ChevronDown /> : <ChevronRight />}
                  <Folder className="text-amber-600" /> <span>{subject.name}</span>
                </div>
                <span className="text-xs text-gray-400">(Read-only)</span>
              </div>

              {expanded[subject.id] && (
                <div className="ml-6 mt-3 space-y-3">
                  {subject.chapters.map((ch) => (
                    <div key={ch.id} className="border-l-2 border-gray-200 pl-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggle(ch.id)}>
                          {expanded[ch.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <Folder className="text-amber-500" size={16} />
                          <span>{ch.name}</span>
                        </div>
                        <span className="text-xs text-gray-400">(Read-only)</span>
                      </div>

                      {expanded[ch.id] && (
                        <div className="ml-4 mt-2 space-y-3">
                          {/* Chapter questions */}
                          {ch.questions?.length > 0 && (
                            <div>
                              {ch.questions.map((q) =>
                                renderQuestionAccordion(
                                  q,
                                  expanded,
                                  toggle,
                                  () => openEdit("question", q, { subject_id: subject.id, chapter_id: ch.id }),
                                  () => handleDelete("question", q.id),
                                  setImagePreview
                                )
                              )}
                            </div>
                          )}

                          {/* Topics */}
                          {ch.topics?.length > 0 && (
                            <div>
                              {ch.topics.map((t) => (
                                <div key={t.id} className="border border-gray-200 dark:border-gray-700 rounded p-3">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggle(t.id)}>
                                      {expanded[t.id] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                      <span>{t.name}</span>
                                    </div>
                                    <div className="flex gap-1">
                                      <IconButton
                                        title="Add Question"
                                        onClick={() =>
                                          openCreate("question", {
                                            subject_id: subject.id,
                                            chapter_id: ch.id,
                                            topic_id: t.id,
                                          })
                                        }
                                        className="text-green-600"
                                      >
                                        <Plus size={14} />
                                      </IconButton>
                                      <IconButton
                                        title="Edit Topic"
                                        onClick={() => openEdit("topic", t, { chapter_id: ch.id })}
                                        className="text-yellow-600"
                                      >
                                        <Pencil size={14} />
                                      </IconButton>
                                      {/* <IconButton
                                        title="Delete"
                                        onClick={() => handleDelete("topic", t.id)}
                                        className="text-red-600"
                                      >
                                        <Trash2 size={14} />
                                      </IconButton> */}
                                    </div>
                                  </div>

                                  {expanded[t.id] && (
                                    <div className="ml-3 mt-2 space-y-2">
                                      {t.questions?.length > 0 ? (
                                        t.questions.map((q) =>
                                          renderQuestionAccordion(
                                            q,
                                            expanded,
                                            toggle,
                                            () =>
                                              openEdit("question", q, {
                                                subject_id: subject.id,
                                                chapter_id: ch.id,
                                                topic_id: t.id,
                                              }),
                                            () => handleDelete("question", q.id),
                                            setImagePreview
                                          )
                                        )
                                      ) : (
                                        <div className="text-xs text-gray-500">No questions yet.</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
            <div
              className="bg-white dark:bg-gray-900 p-4 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Image Preview</h3>
                <button
                  onClick={() => setImagePreview(null)}
                  className="text-gray-500 hover:text-red-500 transition-colors"
                >
                  ✕
                </button>
              </div>
              <img src={imagePreview} alt="preview" className="w-full h-auto object-contain rounded" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CRUD Modal */}
      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, kind: "", mode: "create", parent: null, item: null, saving: false })}
        title={`${modal.mode === "create" ? "Create" : "Edit"} ${modal.kind}`}
      >
        {modal.kind === "topic" && (
          <TopicForm
            initial={modal.mode === "edit" ? modal.item : null}
            parentChapterId={modal.parent?.chapter_id || ""}
            onCancel={() => setModal({ open: false, kind: "", mode: "create", parent: null, item: null, saving: false })}
            onSubmit={(payload) =>
              modal.mode === "create" ? createTopic(payload) : updateTopic(modal.item.id, payload)
            }
            saving={modal.saving}
          />
        )}
        {modal.kind === "question" && (
          <QuestionForm
            initial={modal.mode === "edit" ? modal.item : null}
            parent={modal.parent || {}}
            onCancel={() => setModal({ open: false, kind: "", mode: "create", parent: null, item: null, saving: false })}
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
