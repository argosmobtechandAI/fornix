"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/Modal";
import { FileText, Plus, Trash2, Pencil, Download, Search, ArrowLeft, Upload } from "lucide-react";

export default function SubjectNotesPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId;
  const subjectId = params.subjectId;
  
  const [course, setCourse] = useState(null);
  const [subject, setSubject] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [noteTypeFilter, setNoteTypeFilter] = useState("all");
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState({
    open: false,
    mode: "create",
    item: null,
    saving: false,
  });

  const limit = 10;

  useEffect(() => {
    if (courseId && subjectId) {
      loadData();
    }
  }, [courseId, subjectId]);

  async function loadData() {
    try {
      setLoading(true);
      
      // Load course and subject details
      const [courseRes, subjectRes, notesRes] = await Promise.all([
        fetch(`/api/admin/courses/${courseId}`),
        fetch(`/api/admin/subjects/${subjectId}`),
        fetch(`/api/admin/notes?course_id=${courseId}`)
      ]);
      
      const courseJson = await courseRes.json();
      const subjectJson = await subjectRes.json();
      const notesJson = await notesRes.json();
      
      if (courseJson.success) setCourse(courseJson.data);
      if (subjectJson.success) setSubject(subjectJson.data);
      
      if (notesJson.success) {
        const subjectNotes = (notesJson.notes || []).filter(
          n => String(n.subject_id) === String(subjectId)
        );
        setNotes(subjectNotes);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let result = notes;
    
    // Filter by note type
    if (noteTypeFilter !== "all") {
      result = result.filter(n => n.note_type === noteTypeFilter);
    }
    
    // Filter by search
    const s = search.trim().toLowerCase();
    if (s) {
      result = result.filter(n => String(n.title || "").toLowerCase().includes(s));
    }
    
    return result;
  }, [notes, search, noteTypeFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * limit;
    const end = start + limit;
    return filtered.slice(start, end);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / limit);

  function openCreate() {
    setModal({ open: true, mode: "create", item: null, saving: false });
  }

  function openEdit(item) {
    setModal({ open: true, mode: "edit", item, saving: false });
  }

  function closeModal() {
    setModal({ open: false, mode: "create", item: null, saving: false });
  }

  async function saveNote({ title, note_type, pdfFile }) {
    try {
      setModal((m) => ({ ...m, saving: true }));
      const fd = new FormData();
      fd.set("course_id", courseId);
      fd.set("subject_id", subjectId);
      fd.set("title", title);
      fd.set("note_type", note_type);
      if (pdfFile) fd.set("pdf", pdfFile);

      const isEdit = modal.mode === "edit" && modal.item?.id;
      const url = isEdit ? `/api/admin/notes/${modal.item.id}` : "/api/admin/notes";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, { method, body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Save failed");

      toast.success(isEdit ? "Note updated" : "Note created");
      closeModal();
      loadData();
    } catch (e) {
      toast.error(e.message);
      setModal((m) => ({ ...m, saving: false }));
    }
  }

  async function deleteNote(id) {
    if (!confirm("Delete this note?")) return;
    try {
      const res = await fetch(`/api/admin/notes/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Delete failed");
      toast.success("Note deleted");
      loadData();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function bulkDelete() {
    if (selectedNotes.length === 0) {
      return toast.error("No notes selected");
    }
    if (!confirm(`Delete ${selectedNotes.length} note(s)?`)) return;
    
    try {
      await Promise.all(
        selectedNotes.map(id => 
          fetch(`/api/admin/notes/${id}`, { method: "DELETE" })
        )
      );
      toast.success(`${selectedNotes.length} note(s) deleted`);
      setSelectedNotes([]);
      loadData();
    } catch (e) {
      toast.error(e.message);
    }
  }

  function toggleSelectNote(id) {
    setSelectedNotes(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectedNotes.length === paginated.length) {
      setSelectedNotes([]);
    } else {
      setSelectedNotes(paginated.map(n => n.id));
    }
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push(`/admin/notes/courses/${courseId}`)}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 mb-4"
          >
            <ArrowLeft size={18} />
            Back to Subjects
          </button>
          
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <FileText className="text-yellow-600 dark:text-yellow-400" />
                {subject?.name || "Subject Notes"}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {course?.name || "Course"}
              </p>
            </div>
            <button
              onClick={openCreate}
              className="px-4 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-700 text-white font-semibold flex items-center gap-2 shadow-lg shadow-yellow-500/20"
            >
              <Plus size={20} />
              Add Note
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search notes by title..."
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <select
                value={noteTypeFilter}
                onChange={(e) => { setNoteTypeFilter(e.target.value); setPage(1); }}
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="sample">Sample (Free)</option>
                <option value="premium">Premium (Paid)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedNotes.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-4 flex items-center justify-between">
            <span className="text-sm text-yellow-900 dark:text-yellow-200">
              {selectedNotes.length} note(s) selected
            </span>
            <button
              onClick={bulkDelete}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete Selected
            </button>
          </div>
        )}

        {/* Notes Table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={paginated.length > 0 && selectedNotes.length === paginated.length}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300"
              />
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {filtered.length} note{filtered.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-500 dark:text-gray-400">
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-gray-500 dark:text-gray-400">
              No notes found.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {paginated.map((n) => (
                <div key={n.id} className="p-4 flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selectedNotes.includes(n.id)}
                    onChange={() => toggleSelectNote(n.id)}
                    className="w-4 h-4 rounded border-gray-300 mt-1"
                  />
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                    <FileText className="text-yellow-600 dark:text-yellow-400" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-white truncate">
                          {n.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            n.note_type === 'premium' 
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' 
                              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          }`}>
                            {n.note_type === 'premium' ? 'Premium' : 'Sample'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={n.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          title="Open PDF"
                        >
                          <Download size={16} />
                          PDF
                        </a>
                        <button
                          onClick={() => openEdit(n)}
                          className="p-2 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => deleteNote(n.id)}
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      Updated: {new Date(n.updated_at || n.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Page {page} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        <Modal
          open={modal.open}
          onClose={closeModal}
          title={modal.mode === "edit" ? "Edit Note" : "Add Note"}
          size="lg"
        >
          <NoteForm
            initial={modal.mode === "edit" ? modal.item : null}
            saving={modal.saving}
            onCancel={closeModal}
            onSubmit={saveNote}
          />
        </Modal>
      </div>
    </div>
  );
}

function NoteForm({ initial, saving, onCancel, onSubmit }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [note_type, setNoteType] = useState(initial?.note_type || "sample");
  const [pdfFile, setPdfFile] = useState(null);

  useEffect(() => {
    setTitle(initial?.title || "");
    setNoteType(initial?.note_type || "sample");
    setPdfFile(null);
  }, [initial]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required");
    if (!initial && !pdfFile) return toast.error("PDF is required");
    onSubmit({ title: title.trim(), note_type, pdfFile });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Title
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          placeholder="e.g., AMC Notes - Chapter 1"
        />
      </div>

      <div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Note Type
        </div>
        <select
          value={note_type}
          onChange={(e) => setNoteType(e.target.value)}
          className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="sample">Sample (Free)</option>
          <option value="premium">Premium (Paid)</option>
        </select>
      </div>

      <div>
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          PDF
        </div>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
          className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
        {initial?.pdf_url && (
          <a
            href={initial.pdf_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-yellow-600 dark:text-yellow-400 hover:underline mt-2 inline-block"
          >
            View current PDF
          </a>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-yellow-600 hover:bg-yellow-700 text-white font-semibold disabled:opacity-60"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
