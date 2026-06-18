"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, Image, Settings, BookOpen, GraduationCap, Folder, Plus, X } from "lucide-react";
import toast from "react-hot-toast";

// Custom scrollbar styles with saffron accent
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #fff4e6;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #ffb347 0%, #f77f00 70%);
    border-radius: 9999px;
    border: 2px solid #fff4e6;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #ffc56d 0%, #ff9100 70%);
  }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #ff9100 0%, #d36800 70%);
  }
  .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #ffae42 0%, #e67300 70%);
  }
  
  .textarea-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .textarea-scrollbar::-webkit-scrollbar-track {
    background: #fff4e6;
  }
  .textarea-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #ffb347 0%, #f77f00 70%);
    border-radius: 9999px;
  }
  .textarea-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #ffc56d 0%, #ff9100 70%);
  }
  .dark .textarea-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #ff9100 0%, #d36800 70%);
  }
  .dark .textarea-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #ffae42 0%, #e67300 70%);
  }
`;

// Inject custom scrollbar styles
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = scrollbarStyles;
  document.head.appendChild(styleSheet);
}

/* Small inputs used across forms */
function TextInput({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
}) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, rows = 3, placeholder = "" }) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
        {label}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 resize-vertical textarea-scrollbar overflow-y-auto"
      />
    </label>
  );
}

function SelectInput({ label, value, onChange, options }) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}



export function QuestionForm({
  initial = null,
  parent = {},
  onCancel,
  onSubmit,
  saving = false,
}) {
  const [question_text, setQuestionText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [question_image_url, setQuestionImageUrl] = useState("");
  const [image_url, setExplanationImageUrl] = useState("");
  const [status, setStatus] = useState("pending");
  const [question_type, setQuestionType] = useState("easy");
  const [correct_key, setCorrectKey] = useState("");
  const [marks, setMarks] = useState(1);
  const [negative_marks, setNegativeMarks] = useState(0);
  const [isAMCCourse, setIsAMCCourse] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [loadingCourse, setLoadingCourse] = useState(false);

  // Chapter/Topic selection state (used when adding from subject page)
  const needsChapterSelection = !parent?.chapter_id && !initial?.chapter_id;
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  // Inline creation state
  const [showNewChapter, setShowNewChapter] = useState(false);
  const [newChapterName, setNewChapterName] = useState("");
  const [creatingChapter, setCreatingChapter] = useState(false);
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [creatingTopic, setCreatingTopic] = useState(false);

  const [options, setOptions] = useState([
    { option_key: "a", content: "", chance_percent: null },
    { option_key: "b", content: "", chance_percent: null },
    { option_key: "c", content: "", chance_percent: null },
    { option_key: "d", content: "", chance_percent: null },
    { option_key: "e", content: "", chance_percent: null },
    { option_key: "f", content: "", chance_percent: null },
    { option_key: "g", content: "", chance_percent: null },
    { option_key: "h", content: "", chance_percent: null },
  ]);

  // Fetch subject and course name from API
  useEffect(() => {
    const fetchSubjectAndCourse = async () => {
      const subjectId = parent?.subject_id || initial?.subject_id;

      if (!subjectId) {
        return;
      }

      try {
        setLoadingCourse(true);
        const response = await fetch(`/api/admin/subjects/${subjectId}`);
        const data = await response.json();

        // Support both shapes: { success, subject } and { success, data }
        const subjectFromApi = data.subject || data.data;

        if (data.success && subjectFromApi) {
          const subject = subjectFromApi;
          const course = subject.course || subject.courses?.[0]; // Handle both formats

          // Set subject name
          setSubjectName(subject.name || "");

          // Set course name (if available)
          if (course && course.name) {
            setCourseName(course.name);

            // Check if it's an AMC Course
            // You can adjust this logic based on how you identify AMC courses
            const courseNameLower = course.name.toLowerCase();
            const isAMC = courseNameLower.includes("amc") ||
              courseNameLower.includes("american mathematics") ||
              courseNameLower.includes("amc course") ||
              courseNameLower.includes("amc prep") ||
              courseNameLower.includes("american mathematics competition");

            setIsAMCCourse(isAMC);
          } else {
            setCourseName("No Course Assigned");
            setIsAMCCourse(false);
          }
        } else {
          console.warn("Subject details not found or invalid for id", subjectId, data);
          setCourseName("Unknown Course");
          setSubjectName("Unknown Subject");
        }
      } catch (error) {
        console.error("Error fetching subject/course:", error);
        toast.error("Failed to load course information");
        setCourseName("Error loading course");
        setSubjectName("Error loading subject");
      } finally {
        setLoadingCourse(false);
      }
    };

    fetchSubjectAndCourse();
  }, [parent, initial]);

  // Fetch chapters for subject (when adding from subject page)
  useEffect(() => {
    if (!needsChapterSelection) return;
    const subjectId = parent?.subject_id || initial?.subject_id;
    if (!subjectId) return;
    async function loadChapters() {
      try {
        setLoadingChapters(true);
        const res = await fetch(`/api/admin/subjects/${subjectId}/chapters`);
        const json = await res.json();
        if (json.success) setChapters(json.chapters || []);
      } catch (err) {
        console.error("Error loading chapters:", err);
      } finally {
        setLoadingChapters(false);
      }
    }
    loadChapters();
  }, [needsChapterSelection, parent?.subject_id, initial?.subject_id]);

  // Fetch topics when chapter is selected
  useEffect(() => {
    if (!selectedChapterId) { setTopics([]); setSelectedTopicId(""); return; }
    async function loadTopics() {
      try {
        setLoadingTopics(true);
        const res = await fetch(`/api/admin/chapters/${selectedChapterId}/topics`);
        const json = await res.json();
        if (json.success) setTopics(json.topics || []);
      } catch (err) {
        console.error("Error loading topics:", err);
      } finally {
        setLoadingTopics(false);
      }
    }
    loadTopics();
  }, [selectedChapterId]);

  // Create new chapter inline
  async function handleCreateChapter() {
    if (!newChapterName.trim()) return toast.error("Chapter name is required");
    const subjectId = parent?.subject_id || initial?.subject_id;
    try {
      setCreatingChapter(true);
      const res = await fetch("/api/admin/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_id: subjectId, name: newChapterName.trim() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const newCh = json.data || json.chapter;
      setChapters(prev => [...prev, newCh]);
      setSelectedChapterId(newCh.id);
      setNewChapterName("");
      setShowNewChapter(false);
      toast.success("Chapter created!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreatingChapter(false);
    }
  }

  // Create new topic inline
  async function handleCreateTopic() {
    if (!newTopicName.trim()) return toast.error("Topic name is required");
    if (!selectedChapterId) return toast.error("Select a chapter first");
    try {
      setCreatingTopic(true);
      const res = await fetch("/api/admin/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapter_id: selectedChapterId, name: newTopicName.trim() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const newTp = json.data || json.topic;
      setTopics(prev => [...prev, newTp]);
      setSelectedTopicId(newTp.id);
      setNewTopicName("");
      setShowNewTopic(false);
      toast.success("Topic created!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreatingTopic(false);
    }
  }

  // Initialize form with initial data
  useEffect(() => {
    if (initial) {
      setQuestionText(initial.question_text || "");
      setExplanation(initial.explanation || "");
      setQuestionImageUrl(initial.question_image_url || "");
      setExplanationImageUrl(initial.image_url || "");
      setStatus(initial.status || "pending");
      setQuestionType(initial.question_type || "easy");
      setCorrectKey(initial.correct_answers?.correct_key || "");
      setMarks(initial.marks || 1);
      setNegativeMarks(initial.negative_marks || 0);

      // Handle options initialization for A-H with chance_percent
      if (initial.question_options && initial.question_options.length > 0) {
        const initializedOptions = ["a", "b", "c", "d", "e", "f", "g", "h"].map(
          (key) => {
            const foundOption = initial.question_options.find(
              (opt) => opt.option_key === key
            );
            return {
              option_key: key,
              content: foundOption ? foundOption.content : "",
              chance_percent: foundOption ? foundOption.chance_percent : null
            };
          }
        );
        setOptions(initializedOptions);
      } else {
        setOptions([
          { option_key: "a", content: "", chance_percent: null },
          { option_key: "b", content: "", chance_percent: null },
          { option_key: "c", content: "", chance_percent: null },
          { option_key: "d", content: "", chance_percent: null },
          { option_key: "e", content: "", chance_percent: null },
          { option_key: "f", content: "", chance_percent: null },
          { option_key: "g", content: "", chance_percent: null },
          { option_key: "h", content: "", chance_percent: null },
        ]);
      }
    } else {
      // Reset form for create mode
      setQuestionText("");
      setExplanation("");
      setQuestionImageUrl("");
      setExplanationImageUrl("");
      setStatus("pending");
      setQuestionType("easy");
      setCorrectKey("");
      setMarks(1);
      setNegativeMarks(0);
      setOptions([
        { option_key: "a", content: "", chance_percent: null },
        { option_key: "b", content: "", chance_percent: null },
        { option_key: "c", content: "", chance_percent: null },
        { option_key: "d", content: "", chance_percent: null },
        { option_key: "e", content: "", chance_percent: null },
        { option_key: "f", content: "", chance_percent: null },
        { option_key: "g", content: "", chance_percent: null },
        { option_key: "h", content: "", chance_percent: null },
      ]);
    }
  }, [initial]);

  function updateOptionContent(key, val) {
    setOptions((prev) =>
      prev.map((o) => (o.option_key === key ? { ...o, content: val } : o))
    );
  }

  function updateOptionChancePercent(key, val) {
    // Only allow numbers between 0 and 100, or null
    let normalizedVal = val;
    if (val === "" || val === null || val === undefined) {
      normalizedVal = null;
    } else {
      const num = parseFloat(val);
      if (isNaN(num)) {
        normalizedVal = null;
      } else if (num < 0) {
        normalizedVal = 0;
      } else if (num > 100) {
        normalizedVal = 100;
      } else {
        normalizedVal = num;
      }
    }

    setOptions((prev) =>
      prev.map((o) => (o.option_key === key ? {
        ...o,
        chance_percent: normalizedVal
      } : o))
    );
  }

  const submit = (e) => {
    e.preventDefault();

    // Validate chapter selection when adding from subject page
    if (needsChapterSelection && !selectedChapterId) {
      return toast.error("Please select a chapter for this question");
    }

    if (!question_text.trim()) return toast.error("Question text is required");

    // collect non-empty options
    const normalized = options
      .map((o) => ({
        option_key: o.option_key,
        content: String(o.content || "").trim(),
        chance_percent: isAMCCourse ? o.chance_percent : null
      }))
      .filter((o) => o.content);

    if (normalized.length < 2)
      return toast.error("At least two options are required");

    // For AMC Course, chance_percent is optional and not enforced

    // if correct_key provided, validate it (now supports A-H)
    const ck = String(correct_key || "").toLowerCase();
    if (ck && !["a", "b", "c", "d", "e", "f", "g", "h"].includes(ck)) {
      return toast.error("Correct key must be a letter from A to H");
    }

    // Validate correct key exists in options
    if (ck && !normalized.some(opt => opt.option_key === ck)) {
      return toast.error("Selected correct option must have content");
    }

    // Validate marks and negative marks
    if (marks < 0) {
      return toast.error("Marks cannot be negative");
    }

    if (!isAMCCourse && negative_marks < 0) {
      return toast.error("Negative marks cannot be negative");
    }

    // build payload — use selected chapter/topic when adding from subject page
    const finalChapterId = needsChapterSelection ? (selectedChapterId || null) : (parent?.chapter_id || initial?.chapter_id || null);
    const finalTopicId = needsChapterSelection ? (selectedTopicId || null) : (parent?.topic_id !== undefined ? parent.topic_id : initial?.topic_id || null);

    const payload = {
      subject_id: parent?.subject_id || initial?.subject_id || null,
      chapter_id: finalChapterId,
      topic_id: finalTopicId,
      question_text: question_text.trim(),
      explanation: explanation?.trim() || null,
      question_image_url: question_image_url?.trim() || null,
      image_url: image_url?.trim() || null,
      status: status,
      question_type: question_type || "easy",
      marks: parseFloat(marks) || 0,
      negative_marks: !isAMCCourse ? parseFloat(negative_marks) || 0 : 0, // No negative marks for AMC
      options: normalized,
      correct_key: ck || null,
    };

    onSubmit(payload);
  };

  const statusOptions = [
    { value: "pending", label: "🟡 Pending" },
    { value: "approved", label: "🟢 Approved" },
    { value: "rejected", label: "🔴 Rejected" },
  ];

  // Generate correct answer options dynamically based on available options
  const availableOptions = options.filter((opt) => opt.content.trim());
  const correctAnswerOptions = [
    { value: "", label: "Select correct option" },
    ...availableOptions.map((opt) => ({
      value: opt.option_key,
      label: `Option ${opt.option_key.toUpperCase()}`,
    })),
  ];

  // Calculate total chance percent for AMC Course
  const totalChancePercent = options
    .filter(opt => opt.content.trim())
    .reduce((sum, opt) => sum + (opt.chance_percent || 0), 0);

  return (
    <div className="w-full max-w-6xl mx-auto">
      <form
        onSubmit={submit}
        className="space-y-6 bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-8 shadow-xl border border-gray-200 dark:border-gray-700"
      >
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {initial ? "Edit Question" : "Create New Question"}
            </h2>
            {loadingCourse ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="animate-spin" size={16} />
                <span>Loading course info...</span>
              </div>
            ) : isAMCCourse ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                <GraduationCap size={12} className="mr-1" />
                AMC Course
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                <BookOpen size={12} className="mr-1" />
                Regular Course
              </span>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {initial
              ? "Update the question details"
              : "Add a new question with options and explanation"}
          </p>
        </div>

        <div className="space-y-6">
          {/* Chapter / Topic Selection (when adding from subject page) */}
          {needsChapterSelection && (
            <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/50 rounded-xl space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <Folder size={16} className="text-orange-500" />
                Assign to Chapter & Topic
              </div>

              {/* Chapter Select */}
              <div>
                <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Chapter *</div>
                {showNewChapter ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newChapterName}
                      onChange={(e) => setNewChapterName(e.target.value)}
                      placeholder="New chapter name"
                      className="flex-1 p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleCreateChapter}
                      disabled={creatingChapter}
                      className="px-3 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                    >
                      {creatingChapter ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowNewChapter(false); setNewChapterName(""); }}
                      className="p-2.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedChapterId}
                      onChange={(e) => { setSelectedChapterId(e.target.value); setSelectedTopicId(""); }}
                      className="flex-1 p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    >
                      <option value="">-- Select Chapter --</option>
                      {chapters.map((ch) => (
                        <option key={ch.id} value={ch.id}>{ch.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewChapter(true)}
                      className="px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-orange-100 dark:hover:bg-orange-900/20 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors whitespace-nowrap"
                    >
                      <Plus size={14} />
                      New
                    </button>
                  </div>
                )}
                {loadingChapters && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Loading chapters...</p>}
              </div>

              {/* Topic Select (only when chapter selected) */}
              {selectedChapterId && (
                <div>
                  <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Topic <span className="text-gray-400 font-normal">(optional)</span></div>
                  {showNewTopic ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newTopicName}
                        onChange={(e) => setNewTopicName(e.target.value)}
                        placeholder="New topic name"
                        className="flex-1 p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleCreateTopic}
                        disabled={creatingTopic}
                        className="px-3 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                      >
                        {creatingTopic ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowNewTopic(false); setNewTopicName(""); }}
                        className="p-2.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedTopicId}
                        onChange={(e) => setSelectedTopicId(e.target.value)}
                        className="flex-1 p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                      >
                        <option value="">-- No Topic (optional) --</option>
                        {topics.map((tp) => (
                          <option key={tp.id} value={tp.id}>{tp.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowNewTopic(true)}
                        className="px-3 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-orange-100 dark:hover:bg-orange-900/20 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors whitespace-nowrap"
                      >
                        <Plus size={14} />
                        New
                      </button>
                    </div>
                  )}
                  {loadingTopics && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Loading topics...</p>}
                </div>
              )}
            </div>
          )}
          {/* Course/Subject Info Banner */}
          {!loadingCourse && (subjectName || courseName) && (
            <div className={`p-4 rounded-xl border ${isAMCCourse ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'}`}>
              <div className="flex items-start gap-3">
                {isAMCCourse ? (
                  <GraduationCap className="text-purple-600 dark:text-purple-400 mt-1" size={20} />
                ) : (
                  <BookOpen className="text-blue-600 dark:text-blue-400 mt-1" size={20} />
                )}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {subjectName || "Unknown Subject"}
                    </h3>
                    {courseName && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {courseName}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {isAMCCourse
                      ? "This is an AMC Course question. You can optionally use chance percentages (0-100%) for options (not required)."
                      : "Regular course question format with marks and negative marks."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Question Text */}
          <TextArea
            label="Question Text *"
            value={question_text}
            onChange={setQuestionText}
            rows={4}
            placeholder="Enter your question here..."
          />

          {/* Question Image URL */}
          <div>
            <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Image size={16} />
              Question Image URL
            </div>
            <input
              value={question_image_url}
              onChange={(e) => setQuestionImageUrl(e.target.value)}
              placeholder="https://example.com/question-image.jpg"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
            {question_image_url && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This image will be displayed with the question
              </p>
            )}
          </div>

          {/* Options Grid - Now 8 options */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Options * (At least 2 required, supports up to 8 options A-H)
              </div>
              {isAMCCourse && (
                <div className={`text-sm font-medium ${Math.abs(totalChancePercent - 100) <= 0.1 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                  Total Chance: {totalChancePercent.toFixed(2)}%
                  {Math.abs(totalChancePercent - 100) > 0.1 && (
                    <span className="ml-2">
                      (100% recommended, but not required)
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {options.map((opt) => (
                <div key={opt.option_key} className="relative space-y-2">
                  <div className="flex items-center justify-between">
                    <div
                      className={`px-3 py-1 text-xs font-medium rounded-full ${opt.content.trim()
                        ? isAMCCourse
                          ? "bg-purple-600 text-white"
                          : "bg-blue-600 text-white"
                        : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                        }`}
                    >
                      Option {opt.option_key.toUpperCase()}
                    </div>
                    {isAMCCourse && opt.content.trim() && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Chance:
                        </span>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={opt.chance_percent || ""}
                            onChange={(e) => updateOptionChancePercent(opt.option_key, e.target.value)}
                            placeholder="0.00"
                            className="w-20 pl-2 pr-6 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                          />
                          <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                            %
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    value={opt.content}
                    onChange={(e) =>
                      updateOptionContent(opt.option_key, e.target.value)
                    }
                    placeholder={`Enter option ${opt.option_key.toUpperCase()}...`}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Only options with content will be saved. Options A and B are required.
              </p>
              {isAMCCourse && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <p>
                    For AMC Course: Chance percentages (0-100%) are optional. If you use them, a total of 100% is recommended but not required.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Settings Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Settings size={16} />
                Correct Answer *
              </div>
              <select
                value={correct_key}
                onChange={(e) => setCorrectKey(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                {correctAnswerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {correct_key &&
                !availableOptions.some(
                  (opt) => opt.option_key === correct_key
                ) && (
                  <p className="text-xs text-red-500 mt-1">
                    Selected option is empty. Please add content to this option.
                  </p>
                )}
            </div>

            <div>
              <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Settings size={16} />
                Question Type *
              </div>
              <select
                value={question_type}
                onChange={(e) => setQuestionType(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="easy">Easy</option>
                <option value="moderate">Moderate</option>
                <option value="difficult">Difficult</option>
              </select>
            </div>

            <div>
              <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Settings size={16} />
                Marks *
              </div>
              <input
                type="number"
                min="0"
                step="0.25"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Marks for correct answer"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Points awarded for correct answer
              </p>
            </div>

            {!isAMCCourse && (
              <div>
                <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Settings size={16} />
                  Negative Marks
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={negative_marks}
                  onChange={(e) => setNegativeMarks(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Deduction for wrong answer"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Points deducted for wrong answer
                </p>
              </div>
            )}

            <div>
              <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Settings size={16} />
                Status
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Explanation */}
          <TextArea
            label="Explanation"
            value={explanation}
            onChange={setExplanation}
            rows={4}
            placeholder="Enter detailed explanation for the correct answer (optional)..."
          />

          {/* Explanation Image URL */}
          <div>
            <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Image size={16} />
              Explanation Image URL
            </div>
            <input
              value={image_url}
              onChange={(e) => setExplanationImageUrl(e.target.value)}
              placeholder="https://example.com/explanation-image.jpg"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
            {image_url && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This image will be displayed with the explanation
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] justify-center"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={20} />
                <span>{initial ? "Update" : "Create"} Question</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

/* -----------------------
   Subject Form
   ----------------------- */
/* -----------------------
   Subject Form
   ----------------------- */
export function SubjectForm({
  initial = null,
  onCancel,
  onSubmit,
  saving = false,
}) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [courseId, setCourseId] = useState(initial?.course_id || "");
  const [academicYear, setAcademicYear] = useState(initial?.academic_year || "");
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(initial?.icon_url || "");

  const FMGE_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Final Year"];

  // Fetch courses on component mount
  useEffect(() => {
    async function fetchCourses() {
      try {
        setLoadingCourses(true);
        const res = await fetch("/api/admin/courses");
        const json = await res.json();
        if (json.success) {
          setCourses(json.data || []);
        } else {
          toast.error("Failed to load courses");
        }
      } catch (err) {
        toast.error("Error loading courses");
      } finally {
        setLoadingCourses(false);
      }
    }

    fetchCourses();
  }, []);

  // Initialize form with initial data
  useEffect(() => {
    setName(initial?.name || "");
    setDescription(initial?.description || "");
    setCourseId(initial?.course_id || "");
    setAcademicYear(initial?.academic_year || "");
    setIconPreview(initial?.icon_url || "");
    setIconFile(null);
  }, [initial]);

  const handleIconChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconFile(file);
    const url = URL.createObjectURL(file);
    setIconPreview(url);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Subject name is required");
    if (!courseId) return toast.error("Please select a course");

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      course_id: courseId,
      academic_year: academicYear || null,
      iconFile,
    });
  };

  return (
    <div className="w-full mx-auto">
      <form
        onSubmit={submit}
        className="space-y-6 bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-gray-700"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {initial ? "Edit Subject" : "Create New Subject"}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {initial
              ? "Update the subject details"
              : "Add a new subject to organize your content"}
          </p>
        </div>

        <div className="space-y-4">
          <TextInput
            label="Subject Name *"
            value={name}
            onChange={setName}
            placeholder="Enter subject name"
          />

          {/* Course Selection */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Course *
            </label>
            {loadingCourses ? (
              <div className="flex items-center gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                <Loader2 className="animate-spin text-gray-400" size={16} />
                <span className="text-gray-500 dark:text-gray-400">
                  Loading courses...
                </span>
              </div>
            ) : (
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
              >
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            )}
            {courses.length === 0 && !loadingCourses && (
              <p className="text-xs text-red-500 mt-1">
                No courses available. Please create a course first.
              </p>
            )}
          </div>

          <TextArea
            label="Description"
            value={description}
            onChange={setDescription}
            rows={3}
            placeholder="Enter subject description (optional)"
          />

          {/* Academic Year */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Academic Year
            </label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              <option value="">Select Year</option>
              {FMGE_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              ⚠️ This is applicable only for FMGE courses. Leave empty for other courses.
            </p>
          </div>

          {/* Subject Icon */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Subject Icon
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
                <label className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <span>Upload Icon</span>
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
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !courseId || courses.length === 0}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] justify-center"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={20} />
                <span>{initial ? "Update" : "Create"} Subject</span>
              </>
            )}
          </button>
        </div>

        {/* Help text */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Note:</strong> Each subject must be associated with a
            course. This helps organize your content and enables better
            filtering.
          </p>
        </div>
      </form>
    </div>
  );
}

/* -----------------------
   Chapter Form
   ----------------------- */
export function ChapterForm({
  initial = null,
  parentSubjectId = "",
  onCancel,
  onSubmit,
  saving = false,
}) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");

  useEffect(() => {
    setName(initial?.name || "");
    setDescription(initial?.description || "");
  }, [initial]);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Chapter name is required");
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      subject_id: parentSubjectId,
    });
  };

  return (
    <div className="w-full mx-auto">
      <form
        onSubmit={submit}
        className="space-y-6 bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-gray-700"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {initial ? "Edit Chapter" : "Create New Chapter"}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {initial
              ? "Update the chapter details"
              : "Add a new chapter to organize your questions"}
          </p>
        </div>

        <div className="space-y-4">
          <TextInput
            label="Chapter Name"
            value={name}
            onChange={setName}
            placeholder="Enter chapter name"
          />
          <TextArea
            label="Description"
            value={description}
            onChange={setDescription}
            rows={3}
            placeholder="Enter chapter description (optional)"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] justify-center"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={20} />
                <span>{initial ? "Update" : "Create"} Chapter</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

/* -----------------------
   Topic Form
   ----------------------- */
export function TopicForm({
  initial = null,
  parentChapterId = "",
  onCancel,
  onSubmit,
  saving = false,
}) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");

  useEffect(() => {
    setName(initial?.name || "");
    setDescription(initial?.description || "");
  }, [initial]);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Topic name is required");
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      chapter_id: parentChapterId,
    });
  };

  return (
    <div className="w-full mx-auto">
      <form
        onSubmit={submit}
        className="space-y-6 bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-gray-700"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {initial ? "Edit Topic" : "Create New Topic"}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {initial
              ? "Update the topic details"
              : "Add a new topic to organize your questions"}
          </p>
        </div>

        <div className="space-y-4">
          <TextInput
            label="Topic Name"
            value={name}
            onChange={setName}
            placeholder="Enter topic name"
          />
          <TextArea
            label="Description"
            value={description}
            onChange={setDescription}
            rows={3}
            placeholder="Enter topic description (optional)"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] justify-center"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={20} />
                <span>{initial ? "Update" : "Create"} Topic</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
