"use client";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileQuestion, CheckCircle, XCircle, Clock, Pencil, Trash2, Headphones } from "lucide-react";

export default function QuestionItem({ question, isExpanded, onToggle, onEdit, onDelete, onStatusChange }) {
  const audioRef = useRef(null);
  const [isMaleLoading, setIsMaleLoading] = useState(false);
  const [isFemaleLoading, setIsFemaleLoading] = useState(false);

  const playVoice = async (voice) => {
    try {
      voice === "female" ? setIsFemaleLoading(true) : setIsMaleLoading(true);
      const res = await fetch(`/api/admin/questions/${question.id}/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || "Failed to generate audio");
      const url = data.url;
      if (!audioRef.current) {
        audioRef.current = new Audio(url);
      } else {
        audioRef.current.pause();
        audioRef.current.src = url;
      }
      await audioRef.current.play();
    } catch (e) {
      alert(e.message || "Audio unavailable");
    } finally {
      voice === "female" ? setIsFemaleLoading(false) : setIsMaleLoading(false);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden mb-3">
      <div
        className="flex justify-between items-start bg-gray-50 dark:bg-gray-800 p-3 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex-1">
          <div className="font-medium flex items-center gap-2">
            <FileQuestion size={16} className="text-purple-500" />
            {question.question_text}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Correct: {question.correct_option?.toUpperCase() || "—"}
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="text-yellow-600"><Pencil size={14} /></button>
          <button onClick={onDelete} className="text-red-600"><Trash2 size={14} /></button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white dark:bg-gray-900 p-3 border-t"
          >
            {question.options?.map((opt) => (
              <div
                key={opt.option_key}
                className={`p-2 rounded mb-1 ${
                  question.correct_option === opt.option_key
                    ? "bg-green-50 border-l-4 border-green-500"
                    : "bg-gray-50"
                }`}
              >
                <strong>{opt.option_key.toUpperCase()}.</strong> {opt.content}
              </div>
            ))}

            <div className="flex flex-wrap gap-2 mt-3 items-center">
              <button onClick={() => onStatusChange(question.id, "approved")} className="text-green-700 text-xs">
                <CheckCircle size={14} /> Approve
              </button>
              <button onClick={() => onStatusChange(question.id, "pending")} className="text-yellow-700 text-xs">
                <Clock size={14} /> Pending
              </button>
              <button onClick={() => onStatusChange(question.id, "rejected")} className="text-red-700 text-xs">
                <XCircle size={14} /> Reject
              </button>
              <span className="mx-2 h-4 w-px bg-gray-200 dark:bg-gray-700" />
              <button
                onClick={() => playVoice("female")}
                disabled={isFemaleLoading}
                className="text-amber-700 text-xs flex items-center gap-1 disabled:opacity-60"
                title="Play Female Explanation"
              >
                <Headphones size={14} /> {isFemaleLoading ? "Generating Female..." : "Play Female"}
              </button>
              <button
                onClick={() => playVoice("male")}
                disabled={isMaleLoading}
                className="text-indigo-700 text-xs flex items-center gap-1 disabled:opacity-60"
                title="Play Male Explanation"
              >
                <Headphones size={14} /> {isMaleLoading ? "Generating Male..." : "Play Male"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
