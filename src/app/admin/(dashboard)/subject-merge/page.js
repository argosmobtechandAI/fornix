"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";

export default function SubjectMergePage() {
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const [destinationId, setDestinationId] = useState("");
  const [sourceIds, setSourceIds] = useState([]);
  const [search, setSearch] = useState("");

  const [mergeByName, setMergeByName] = useState(true);
  const [deleteSources, setDeleteSources] = useState(false);

  const [plan, setPlan] = useState(null);
  const [running, setRunning] = useState(false);

  async function fetchCourses() {
    try {
      setLoadingCourses(true);
      const res = await fetch("/api/admin/courses");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load courses");
      setCourses(json.data || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoadingCourses(false);
    }
  }

  async function fetchSubjects(courseId) {
    try {
      if (!courseId) return;
      setLoadingSubjects(true);
      setPlan(null);
      setDestinationId("");
      setSourceIds([]);
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "5000");
      params.set("course_id", courseId);
      const res = await fetch(`/api/admin/subjects?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load subjects");
      setSubjects(json.data || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoadingSubjects(false);
    }
  }

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) fetchSubjects(selectedCourseId);
  }, [selectedCourseId]);

  const filteredSubjects = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return subjects;
    return subjects.filter((sub) => (sub.name || "").toLowerCase().includes(s));
  }, [subjects, search]);

  const destination = useMemo(
    () => subjects.find((s) => s.id === destinationId) || null,
    [subjects, destinationId]
  );

  const sources = useMemo(
    () => subjects.filter((s) => sourceIds.includes(s.id)),
    [subjects, sourceIds]
  );

  function toggleSource(id) {
    setPlan(null);
    setSourceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function preview() {
    try {
      if (!destinationId) return toast.error("Select destination subject");
      if (!sourceIds.length) return toast.error("Select at least 1 source subject");
      if (sourceIds.includes(destinationId))
        return toast.error("Source subjects cannot include destination subject");

      setRunning(true);
      const res = await fetch("/api/admin/subjects/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination_subject_id: destinationId,
          source_subject_ids: sourceIds,
          options: {
            merge_chapters_by_name: mergeByName,
            delete_sources: deleteSources,
            dry_run: true,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || "Preview failed");
      setPlan(json.plan);
      toast.success("Preview generated");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setRunning(false);
    }
  }

  async function runMerge() {
    try {
      if (!destinationId) return toast.error("Select destination subject");
      if (!sourceIds.length) return toast.error("Select at least 1 source subject");

      const confirmMsg = deleteSources
        ? "This will MERGE and DELETE the source subjects after moving data. Continue?"
        : "This will MERGE and move all data into the destination subject. Continue?";
      if (!confirm(confirmMsg)) return;

      setRunning(true);
      const res = await fetch("/api/admin/subjects/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination_subject_id: destinationId,
          source_subject_ids: sourceIds,
          options: {
            merge_chapters_by_name: mergeByName,
            delete_sources: deleteSources,
            dry_run: false,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || "Merge failed");

      setPlan(json.plan || null);
      toast.success("Subjects merged successfully");

      // Refresh subject list (destination remains)
      await fetchSubjects(selectedCourseId);
      setDestinationId(destinationId);
      setSourceIds([]);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3">
          <Link
            href="/admin/subjects"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline w-fit"
          >
            <ArrowLeft size={18} />
            Back to Subjects
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <ArrowRightLeft className="text-blue-600 dark:text-blue-400" />
                Merge Subjects
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Merge chapters, topics, questions, and doctor assignments from multiple subjects into one.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: selectors */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Settings2 size={18} />
                Select Course & Subjects
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Course
                  </label>
                  <div className="mt-2 relative">
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full appearance-none p-3 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">Select a course</option>
                      {(courses || []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    {loadingCourses && (
                      <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 animate-spin text-gray-400" size={18} />
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Destination Subject (keep this one)
                  </label>
                  <div className="mt-2 relative">
                    <select
                      value={destinationId}
                      onChange={(e) => {
                        setPlan(null);
                        setDestinationId(e.target.value);
                        // auto-remove destination from sources if selected
                        setSourceIds((prev) => prev.filter((x) => x !== e.target.value));
                      }}
                      disabled={!selectedCourseId || loadingSubjects}
                      className="w-full appearance-none p-3 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-60"
                    >
                      <option value="">Select destination subject</option>
                      {(subjects || []).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    {loadingSubjects && (
                      <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 animate-spin text-gray-400" size={18} />
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Source Subjects (move these into destination)
                  </label>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search subjects..."
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="mt-3 max-h-[340px] overflow-auto rounded-xl border border-gray-200 dark:border-gray-800">
                  {loadingSubjects ? (
                    <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                      <Loader2 className="mx-auto mb-2 animate-spin" />
                      Loading subjects...
                    </div>
                  ) : filteredSubjects.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                      No subjects found.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredSubjects.map((s) => {
                        const disabled = s.id === destinationId;
                        const checked = sourceIds.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className={`flex items-center gap-3 p-3 cursor-pointer ${
                              disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={disabled}
                              checked={checked}
                              onChange={() => !disabled && toggleSource(s.id)}
                              className="h-4 w-4 accent-blue-600"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {s.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {s.id}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Merge Options
              </h2>

              <div className="space-y-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={mergeByName}
                    onChange={(e) => {
                      setPlan(null);
                      setMergeByName(e.target.checked);
                    }}
                    className="h-4 w-4 mt-1 accent-blue-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Merge chapters with same name
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      If destination already has a chapter with the same name, topics/questions from source chapter will be moved into it (avoids duplicate chapters).
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={deleteSources}
                    onChange={(e) => {
                      setPlan(null);
                      setDeleteSources(e.target.checked);
                    }}
                    className="h-4 w-4 mt-1 accent-red-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <Trash2 size={16} className="text-red-600" />
                      Delete source subjects after merge
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Recommended only after preview looks correct.
                    </div>
                  </div>
                </label>
              </div>

              <div className="mt-5 flex items-center gap-3 flex-wrap">
                <button
                  onClick={preview}
                  disabled={running || !destinationId || sourceIds.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-60"
                >
                  {running ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  Preview
                </button>
                <button
                  onClick={runMerge}
                  disabled={running || !destinationId || sourceIds.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-60"
                >
                  {running ? <Loader2 className="animate-spin" size={18} /> : <ArrowRightLeft size={18} />}
                  Run Merge
                </button>
              </div>
            </div>
          </div>

          {/* Right: preview */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Preview Summary
              </h2>

              {!plan ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Click <span className="font-semibold">Preview</span> to see what will be moved.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-sm">
                    <div className="text-gray-500 dark:text-gray-400">Destination</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {plan.destination?.name}
                    </div>
                  </div>

                  <div className="text-sm">
                    <div className="text-gray-500 dark:text-gray-400">Sources</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {(plan.sources || []).map((s) => s.name).join(", ")}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Counts</div>
                    <div className="mt-2 space-y-1 text-sm text-gray-900 dark:text-white">
                      <div>
                        Source subjects: <span className="font-semibold">{plan.counts?.source_subjects || 0}</span>
                      </div>
                      <div>
                        Chapters to move: <span className="font-semibold">{plan.counts?.source_chapters || 0}</span>
                      </div>
                      <div>
                        Direct questions to move:{" "}
                        <span className="font-semibold">{plan.counts?.direct_questions_to_move || 0}</span>
                      </div>
                      <div>
                        Chapter questions to repoint:{" "}
                        <span className="font-semibold">{plan.counts?.chapter_questions_to_repoint_subject || 0}</span>
                      </div>
                    </div>
                  </div>

                  {mergeByName && plan.chapter_name_merges?.length > 0 && (
                    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 p-4">
                      <div className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                        Chapter name merges
                      </div>
                      <div className="mt-2 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                        {plan.chapter_name_merges.slice(0, 8).map((m) => (
                          <div key={m.source_chapter_id}>
                            {m.source_chapter_name} → {m.destination_chapter_name}
                          </div>
                        ))}
                        {plan.chapter_name_merges.length > 8 && (
                          <div>…and {plan.chapter_name_merges.length - 8} more</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



