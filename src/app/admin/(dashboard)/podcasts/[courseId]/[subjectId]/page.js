"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/Modal";
import { BookOpen, Mic, Video, Plus, Trash2, Loader2 } from "lucide-react";

function formatSize(bytes) {
  if (!bytes || bytes <= 0) return "-";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

export default function SubjectPodcastsPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.courseId;
  const subjectId = params?.subjectId;

  const [subject, setSubject] = useState(null);
  const [podcasts, setPodcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [activePodcast, setActivePodcast] = useState(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTopics, setEditTopics] = useState("");
  const [editPodcastId, setEditPodcastId] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topics, setTopics] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const mediaType = useMemo(() => {
    if (!file) return null;
    const mime = file.type || "";
    if (mime.startsWith("audio/")) return "audio";
    if (mime.startsWith("video/")) return "video";
    return null;
  }, [file]);

  useEffect(() => {
    if (!courseId || !subjectId) return;
    loadData();
  }, [courseId, subjectId]);

  async function loadData() {
    setLoading(true);
    try {
      const [subjectRes, podcastsRes] = await Promise.all([
        fetch(`/api/admin/subjects/${subjectId}`),
        fetch(`/api/admin/podcasts?course_id=${courseId}&subject_id=${subjectId}`),
      ]);
      const subjectJson = await subjectRes.json();
      const podcastsJson = await podcastsRes.json();

      if (!subjectJson.success) throw new Error(subjectJson.error || "Failed to load subject");
      if (!podcastsJson.success) throw new Error(podcastsJson.error || "Failed to load podcasts");

      const subj = subjectJson.data || subjectJson.subject || null;
      setSubject(subj);
      setPodcasts(podcastsJson.data || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required");
    if (!file) return toast.error("Audio or video file is required");

    try {
      setSaving(true);
      setUploadProgress(0);
      const fd = new FormData();
      fd.set("course_id", courseId);
      fd.set("subject_id", subjectId);
      fd.set("title", title.trim());
      if (description.trim()) fd.set("description", description.trim());
      if (topics.trim()) fd.set("topics", topics.trim());
      fd.set("media", file);
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/admin/podcasts");

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        };

        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText || "{}");
            if (!json.success) {
              reject(new Error(json.error || "Failed to create podcast"));
              return;
            }
            toast.success("Podcast created");
            setTitle("");
            setDescription("");
            setTopics("");
            setFile(null);
            setPreviewUrl("");
            setUploadProgress(0);
            resolve();
          } catch (err) {
            reject(new Error("Unexpected server response"));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Upload failed"));
        };

        xhr.send(fd);
      });

      await loadData();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deletePodcast(id) {
    if (!confirm("Delete this podcast?")) return;
    try {
      const res = await fetch(`/api/admin/podcasts/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Delete failed");
      toast.success("Podcast deleted");
      await loadData();
    } catch (e) {
      toast.error(e.message);
    }
  }

  function openViewModal(podcast) {
    setActivePodcast(podcast);
    setViewModalOpen(true);
  }

  function closeViewModal() {
    setViewModalOpen(false);
    setActivePodcast(null);
  }

  function openEditModal(podcast) {
    setEditPodcastId(podcast.id);
    setEditTitle(podcast.title || "");
    setEditDescription(podcast.description || "");
    setEditTopics(
      podcast.topics && podcast.topics.length ? podcast.topics.join(", ") : ""
    );
    setEditModalOpen(true);
  }

  function closeEditModal() {
    setEditModalOpen(false);
    setEditSaving(false);
    setEditPodcastId(null);
    setEditTitle("");
    setEditDescription("");
    setEditTopics("");
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editPodcastId) return;
    if (!editTitle.trim()) return toast.error("Title is required");

    try {
      setEditSaving(true);
      const res = await fetch(`/api/admin/podcasts/${editPodcastId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription,
          topics: editTopics,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to update podcast");

      toast.success("Podcast updated");
      closeEditModal();
      await loadData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="w-full mx-auto py-6">
        <button
          onClick={() => router.back()}
          className="mb-4 text-sm text-orange-600 dark:text-orange-400 hover:underline"
        >
          
← Back
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-lg">Loading subject & podcasts...</p>
          </div>
        ) : !subject ? (
          <p className="text-gray-600 dark:text-gray-400">Subject not found.</p>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                <Mic className="text-orange-600 dark:text-orange-400" />
                Podcasts for {subject.name}
              </h1>
              {subject.course && (
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Course: <span className="font-medium">{subject.course.name}</span>
                </p>
              )}
            </div>

            {/* Create podcast form */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-8 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Plus size={20} /> Add New Podcast
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Enter podcast title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Short description (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Topics
                  </label>
                  <input
                    type="text"
                    value={topics}
                    onChange={(e) => setTopics(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Comma-separated topics (e.g. ECG, Cardiology)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Audio / Video File
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer">
                      <span className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-dashed border-orange-400/60 bg-orange-50/40 dark:bg-orange-900/10 text-sm font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-100/70 dark:hover:bg-orange-900/30 transition-colors">
                        Choose audio / video file
                      </span>
                      <input
                        type="file"
                        accept="audio/*,video/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    {file && (
                      <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                        {file.name}
                      </span>
                    )}
                  </div>
                  {saving && uploadProgress > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                        <div
                          className="h-full bg-orange-500 transition-all duration-150"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {previewUrl && (
                    <div className="mt-3">
                      {mediaType === "audio" ? (
                        <audio controls src={previewUrl} className="w-full" />
                      ) : mediaType === "video" ? (
                        <video controls src={previewUrl} className="w-full max-h-64 bg-black" />
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTitle("");
                      setDescription("");
                      setTopics("");
                      setFile(null);
                      setPreviewUrl("");
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2 disabled:opacity-60"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{saving ? "Saving..." : "Save Podcast"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Existing podcasts */}
            <div className="space-y-4">
              {podcasts.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No podcasts yet for this subject.</p>
              ) : (
                podcasts.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {p.media_type === "audio" ? (
                          <Mic className="text-orange-600 dark:text-orange-400" size={18} />
                        ) : (
                          <Video className="text-orange-600 dark:text-orange-400" size={18} />
                        )}
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {p.title}
                        </h3>
                      </div>
                      {p.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 line-clamp-2">
                          {p.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatSize(p.media_size_bytes)}</span>
                        {p.topics && p.topics.length > 0 && (
                          <span>
                            Topics: {p.topics.join(", ")}
                          </span>
                        )}
                        <span>
                          Added {new Date(p.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex gap-2 self-start md:self-center">
                      <button
                        onClick={() => openViewModal(p)}
                        className="px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-1 text-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={() => openEditModal(p)}
                        className="px-3 py-2 rounded-lg border border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-700/60 dark:text-orange-300 dark:hover:bg-orange-900/20 flex items-center gap-1 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deletePodcast(p.id)}
                        className="px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1 text-sm"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <Modal
        open={viewModalOpen}
        onClose={closeViewModal}
        title={activePodcast ? activePodcast.title : "View Podcast"}
        size={activePodcast?.media_type === "video" ? "xl" : "md"}
      >
        {activePodcast && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              {activePodcast.media_type === "audio" ? (
                <Mic className="text-orange-600 dark:text-orange-400" size={18} />
              ) : (
                <Video className="text-orange-600 dark:text-orange-400" size={18} />
              )}
              <span>{formatSize(activePodcast.media_size_bytes)}</span>
              {activePodcast.topics && activePodcast.topics.length > 0 && (
                <span className="truncate">
                  Topics: {activePodcast.topics.join(", ")}
                </span>
              )}
            </div>
            {activePodcast.description && (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {activePodcast.description}
              </p>
            )}
            <div className="mt-2">
              {activePodcast.media_type === "audio" ? (
                <audio controls src={activePodcast.media_url} className="w-full" />
              ) : (
                <video
                  controls
                  src={activePodcast.media_url}
                  className="w-full max-h-[70vh] bg-black"
                />
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={editModalOpen}
        onClose={closeEditModal}
        title="Edit Podcast"
        size="md"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Enter podcast title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Short description (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Topics
            </label>
            <input
              type="text"
              value={editTopics}
              onChange={(e) => setEditTopics(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Comma-separated topics (e.g. ECG, Cardiology)"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeEditModal}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2 disabled:opacity-60"
            >
              {editSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{editSaving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
