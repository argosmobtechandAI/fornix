"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/Modal";
import { Zap, ArrowLeft, Plus, Trash2, GripVertical, Check } from "lucide-react";

export default function MockTestDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.id;

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [modal, setModal] = useState({
    open: false,
    saving: false,
  });
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    questionId: null,
  });

  useEffect(() => {
    if (testId) {
      loadData();
    }
  }, [testId]);

  async function loadData() {
    try {
      setLoading(true);
      
      // Load test details
      const testRes = await fetch(`/api/admin/mock-tests/${testId}`);
      const testJson = await testRes.json();
      if (!testJson.success) throw new Error(testJson.error || "Failed to load test");
      
      const testData = testJson.test;
      if (!testData) throw new Error("Test not found");
      
      setTest(testData);

      // Load test questions
      const questionsRes = await fetch(`/api/admin/mock-tests/${testId}/questions`);
      const questionsJson = await questionsRes.json();
      if (questionsJson.success) setQuestions(questionsJson.questions || []);

      // Load all questions for subjects in this test to add
      // Use subject_ids array from API
      let subjectIds = [];
      
      if (testData.subject_ids && testData.subject_ids.length > 0) {
        subjectIds = testData.subject_ids.filter(Boolean);
      } else if (testData.subjects && testData.subjects.length > 0) {
        subjectIds = testData.subjects.map(s => s.id).filter(Boolean);
      }
      
      if (subjectIds.length > 0) {
        // Fetch questions from all subjects
        const questionsPromises = subjectIds.map(subjectId =>
          fetch(`/api/admin/questions?subject_id=${subjectId}`)
            .then(res => res.json())
        );
        
        const allQuestionsResponses = await Promise.all(questionsPromises);
        const allQuestionsData = allQuestionsResponses
          .filter(json => json.success)
          .flatMap(json => json.data || []);
        
        setAllQuestions(allQuestionsData);
      } else {
        console.warn("Test has no subjects:", testData);
        setAllQuestions([]);
      }
    } catch (e) {
      console.error("Load error:", e);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  function openAddQuestion() {
    setSelectedQuestions(new Set());
    setModal({ open: true, saving: false });
  }

  function closeModal() {
    setModal({ open: false, saving: false });
    setSelectedQuestions(new Set());
  }

  function toggleQuestionSelection(questionId) {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
  }

  async function addSelectedQuestions() {
    if (selectedQuestions.size === 0) {
      toast.error("Please select at least one question");
      return;
    }

    try {
      setModal((m) => ({ ...m, saving: true }));
      const questionsToAdd = Array.from(selectedQuestions);
      
      let added = 0;
      for (const questionId of questionsToAdd) {
        const payload = { 
          question_id: questionId,
          order: questions.length + added + 1 
        };
        
        const res = await fetch(`/api/admin/mock-tests/${testId}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Failed to add question");
        added++;
      }

      toast.success(`${added} question${added !== 1 ? "s" : ""} added`);
      closeModal();
      loadData();
    } catch (e) {
      console.error("Add questions error:", e);
      toast.error(e.message);
      setModal((m) => ({ ...m, saving: false }));
    }
  }

  function openDeleteConfirm(questionId) {
    setDeleteConfirm({ open: true, questionId });
  }

  function closeDeleteConfirm() {
    setDeleteConfirm({ open: false, questionId: null });
  }

  async function confirmDelete() {
    const questionId = deleteConfirm.questionId;
    if (!questionId) return;

    try {
      const question = questions.find(q => q.id === questionId);
      const res = await fetch(`/api/admin/mock-tests/${testId}/questions/${question.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to remove question");

      toast.success("Question removed");
      closeDeleteConfirm();
      loadData();
    } catch (e) {
      toast.error(e.message);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 p-10">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading test...</span>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 p-10 text-center">
        <p className="text-gray-500 dark:text-gray-400">Test not found.</p>
      </div>
    );
  }

  // Questions already in the test
  const questionsInTest = questions.map(q => q.question_id);
  // Available questions to add
  const availableQuestions = allQuestions.filter(q => !questionsInTest.includes(q.id));
  
  return (
    <div className="min-h-screen">
      <div className="mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push("/admin/mock-tests")}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 mb-4"
          >
            <ArrowLeft size={18} />
            Back to Tests
          </button>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Zap className="text-yellow-600 dark:text-yellow-400" />
            {test.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {test.description}
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-2">
            <span>{test.course?.name}</span>
            <span>•</span>
            <span>{test.subjects?.map(s => s.name).join(", ") || "No subjects"}</span>
            <span>•</span>
            <span>{test.duration_minutes} mins</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Questions List */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {questions.length} of {test.total_questions} questions
                </div>
              </div>

              {questions.length === 0 ? (
                <div className="p-10 text-center text-gray-500 dark:text-gray-400">
                  No questions added yet.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {questions.map((q, idx) => {
                    const question = q.questions;
                    if (!question) {
                      return (
                        <div key={q.id || idx} className="p-5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                          Question data missing for ID: {q.question_id}
                        </div>
                      );
                    }
                    
                    return (
                      <div key={q.id} className="p-5 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition">
                        <div className="flex items-start gap-4">
                          <div className="flex items-center gap-3 text-gray-400 flex-shrink-0 pt-1">
                            <GripVertical size={18} />
                            <span className="text-base font-bold text-gray-600 dark:text-gray-400">{idx + 1}</span>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {/* Question Text */}
                            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-relaxed mb-3">
                              {question.question_text}
                            </p>

                            {/* Metadata Badges */}
                            <div className="flex items-center gap-2 flex-wrap mb-3">
                              {question.subjects && (
                                <span className="text-xs px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                  📚 {question.subjects.name}
                                </span>
                              )}
                              {question.chapters && (
                                <span className="text-xs px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                                  📖 {question.chapters.name}
                                </span>
                              )}
                              {question.topics && (
                                <span className="text-xs px-2 py-1 rounded bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">
                                  📝 {question.topics.name}
                                </span>
                              )}
                              <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                {question.question_type}
                              </span>
                            </div>

                            {/* Options */}
                            {question.question_options && question.question_options.length > 0 && (
                              <div className="space-y-1.5 mb-3">
                                {question.question_options.map((opt) => {
                                  const isCorrect = opt.option_key?.toLowerCase() === question.correct_option?.toLowerCase();
                                  return (
                                    <div
                                      key={opt.option_key}
                                      className={`text-xs px-3 py-2 rounded-lg flex items-start gap-2 ${
                                        isCorrect
                                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-medium border border-green-300 dark:border-green-700"
                                          : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                      }`}
                                    >
                                      <span className="font-bold min-w-[22px]">
                                        {opt.option_key?.toUpperCase()}.
                                      </span>
                                      <span className="flex-1">{opt.content}</span>
                                      {isCorrect && (
                                        <Check size={14} className="flex-shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Explanation */}
                            {question.explanation && (
                              <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-1">
                                  💡 Explanation:
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                                  {question.explanation}
                                </p>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => openDeleteConfirm(q.id)}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex-shrink-0 transition"
                            title="Remove"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Add Questions Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sticky top-4">
              <button
                onClick={openAddQuestion}
                disabled={loading || (allQuestions.length === 0 && !loading)}
                className="w-full px-4 py-3 rounded-xl bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                {loading ? "Loading..." : "Add Question"}
              </button>

              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Question Statistics
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Added:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{questions.length}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Total Required:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{test.total_questions}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Available:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{availableQuestions.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Modal
          open={modal.open}
          onClose={closeModal}
          title="Add Questions to Test"
          size="lg"
        >
          <div className="flex flex-col h-full">
            {availableQuestions.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No available questions to add.
              </p>
            ) : (
              <>
                {/* Header with Counter and Add Button - Always Visible */}
                <div className="sticky top-0 bg-white dark:bg-gray-900 pb-4 border-b border-gray-200 dark:border-gray-700 mb-4 -mx-6 px-6 pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                        <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                          {selectedQuestions.size}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Selected
                      </span>
                    </div>
                    <button
                      onClick={addSelectedQuestions}
                      disabled={selectedQuestions.size === 0 || modal.saving}
                      className="px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold flex items-center gap-2 transition whitespace-nowrap"
                    >
                      <Plus size={18} />
                      {modal.saving ? "Adding..." : "Add Selected"}
                    </button>
                  </div>
                </div>

                {/* Questions List - Scrollable */}
                <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                  {availableQuestions.map((q) => (
                    <div
                      key={q.id}
                      className={`border rounded-xl transition ${
                        selectedQuestions.has(q.id)
                          ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 shadow-md"
                          : "border-gray-200 dark:border-gray-700 hover:border-yellow-300 dark:hover:border-yellow-700 hover:shadow-sm"
                      }`}
                    >
                      <div 
                        className="p-4 cursor-pointer"
                        onClick={() => toggleQuestionSelection(q.id)}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedQuestions.has(q.id)}
                            onChange={() => toggleQuestionSelection(q.id)}
                            className="mt-1 w-5 h-5 accent-yellow-600 cursor-pointer flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            {/* Question Text */}
                            <p className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed mb-3">
                              {q.question_text}
                            </p>

                            {/* Metadata Badges */}
                            <div className="flex items-center gap-2 flex-wrap mb-3">
                              {q.subjects && (
                                <span className="text-xs px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                  📚 {q.subjects.name}
                                </span>
                              )}
                              {q.chapters && (
                                <span className="text-xs px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                                  📖 {q.chapters.title}
                                </span>
                              )}
                              {q.topics && (
                                <span className="text-xs px-2 py-1 rounded bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">
                                  📝 {q.topics.title}
                                </span>
                              )}
                              <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                {q.question_type}
                              </span>
                            </div>

                            {/* Options */}
                            {q.question_options && q.question_options.length > 0 && (
                              <div className="space-y-1.5 mb-2">
                                {q.question_options.map((opt) => {
                                  const isCorrect = opt.option_key?.toLowerCase() === q.correct_option?.toLowerCase();
                                  return (
                                    <div
                                      key={opt.option_key}
                                      className={`text-xs px-3 py-2 rounded-lg flex items-start gap-2 ${
                                        isCorrect
                                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-medium"
                                          : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                      }`}
                                    >
                                      <span className="font-semibold min-w-[20px]">
                                        {opt.option_key?.toUpperCase()}.
                                      </span>
                                      <span className="flex-1">{opt.content}</span>
                                      {isCorrect && (
                                        <Check size={14} className="flex-shrink-0 mt-0.5" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Correct Answer Badge */}
                            {q.correct_option && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 flex items-center gap-1 font-semibold">
                                  <Check size={12} />
                                  Correct Answer: {q.correct_option.toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          open={deleteConfirm.open}
          onClose={closeDeleteConfirm}
          title="Confirm Delete"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to remove this question from the test? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={closeDeleteConfirm}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium flex items-center gap-2 transition"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
