"use client";
import { useEffect, useState, useRef } from "react";
import {
  Folder, Plus, Pencil, Trash2, ArrowLeft, BookOpen, Search, FileText,
  CheckCircle2, XCircle, Clock, Eye, EyeOff, SlidersHorizontal, RefreshCw,
  Music, Download, Volume2, Pause, Play, Venus, Mars, Sparkles, Zap, Headphones, Waves
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import Modal from "@/components/Modal";
import { ChapterForm, QuestionForm } from "@/components/Forms";
import { useParams } from "next/navigation";

// Modern Audio Player Component (same as chapter questions page)
function ModernAudioPlayer({ src, title, color = "blue", icon = <Volume2 size={16} /> }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const colorClasses = {
    blue: "bg-gradient-to-r from-blue-500 to-cyan-500",
    indigo: "bg-gradient-to-r from-indigo-500 to-purple-500",
    pink: "bg-gradient-to-r from-pink-500 to-rose-500",
    green: "bg-gradient-to-r from-emerald-500 to-teal-500",
    amber: "bg-gradient-to-r from-amber-500 to-orange-500",
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const total = audioRef.current.duration;
    setCurrentTime(current);
    setProgress((current / total) * 100);
  };

  const handleSeek = (e) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percentage = x / width;
    const time = percentage * duration;

    audioRef.current.currentTime = time;
    setProgress(percentage * 100);
    setCurrentTime(time);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleDownload = () => {
    if (src) {
      const link = document.createElement("a");
      link.href = src;
      link.download = `audio-${Date.now()}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  return (
    <div className="space-y-3">
      {title && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {icon}
            {title}
          </div>
          <button
            onClick={handleDownload}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Download audio"
          >
            <Download size={14} />
          </button>
        </div>
      )}

      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handlePlayPause}
            className={`${colorClasses[color]} p-3 rounded-full text-white shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 active:scale-95`}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Volume2 size={16} />
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-24 accent-blue-500 dark:accent-blue-400"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div
            className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer overflow-hidden"
            onClick={handleSeek}
          >
            <div
              className={`absolute h-full ${colorClasses[color]} rounded-full transition-all duration-300`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center h-8 gap-0.5 mt-2">
          {Array.from({ length: 30 }).map((_, i) => {
            const baseHeight = 4;
            const height =
              baseHeight +
              Math.sin(i * 0.5) * 10 +
              (isPlaying ? Math.random() * 8 : 0);
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-200 ${isPlaying
                  ? `${colorClasses[color]} opacity-${Math.min(100, 20 + i * 3)}`
                  : "bg-gray-300 dark:bg-gray-600"
                  }`}
                style={{
                  height: `${isPlaying ? height : baseHeight}px`,
                  transitionDelay: `${i * 20}ms`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Enhanced MediaManager Component (same as chapter questions page)
function MediaManager({ question, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("explanation");
  const [regeneratingVoice, setRegeneratingVoice] = useState(null);
  const [deletingVoice, setDeletingVoice] = useState(null);
  const [showPreviewExplanation, setShowPreviewExplanation] = useState(false);

  const femaleUrl = question?.female_explanation_audio_url;
  const maleUrl = question?.male_explanation_audio_url;
  const explanation = question?.explanation;
  const correctKey = question?.correct_answers?.correct_key || null;
  const correctOption = question?.question_options?.find(
    (o) => String(o.option_key || "").toLowerCase() === String(correctKey || "").toLowerCase()
  );

  async function handleAction(action, params = {}) {
    try {
      setBusy(true);

      if (action === "regenExplanation") {
        const res = await fetch(`/api/admin/questions/${question.id}/explanation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ regenerate: true }),
        });
        const data = await res.json();
        if (!res.ok || !data?.success)
          throw new Error(data?.error || "Failed to regenerate");
        toast.success("✨ Explanation regenerated successfully!");
      } else if (action === "deleteExplanation") {
        const res = await fetch(`/api/admin/questions/${question.id}/explanation`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok || !data?.success)
          throw new Error(data?.error || "Failed to delete");
        toast.success("🗑️ Explanation deleted successfully!");
      } else if (action === "generateVoice") {
        setRegeneratingVoice(params.voice);
        const res = await fetch(`/api/admin/questions/${question.id}/voice`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voice: params.voice, regenerate: params.regenerate }),
        });
        const data = await res.json();
        if (!res.ok || !data?.success)
          throw new Error(data?.error || "Failed to generate audio");
        toast.success(
          `🎵 ${params.voice === "female" ? "Female" : "Male"} audio ${params.regenerate ? "regenerated" : "generated"
          } successfully!`
        );
      } else if (action === "deleteVoice") {
        setDeletingVoice(params.voice);
        const res = await fetch(`/api/admin/questions/${question.id}/voice?voice=${params.voice}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok || !data?.success)
          throw new Error(data?.error || "Failed to delete audio");
        toast.success(
          `🗑️ ${params.voice === "female" ? "Female" : "Male"} audio deleted successfully!`
        );
      }

      onUpdated?.();
    } catch (e) {
      toast.error(`❌ ${e.message}`);
    } finally {
      setBusy(false);
      setRegeneratingVoice(null);
      setDeletingVoice(null);
    }
  }

  const tabs = [
    { id: "explanation", label: "Explanation", icon: <FileText size={16} /> },
    { id: "female", label: "Female Voice", icon: <Venus size={16} /> },
    { id: "male", label: "Male Voice", icon: <Mars size={16} /> },
    { id: "preview", label: "Preview", icon: <Eye size={16} /> },
  ];

  return (
    <div className="p-1">
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-blue-100 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <BookOpen size={16} className="text-blue-600 dark:text-blue-400" />
          Question Preview
        </h3>

        <div className="p-3 bg-white/60 dark:bg-gray-700/30 rounded-lg border border-blue-100/60 dark:border-gray-700/60">
          <p className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-line">
            {question?.question_text}
          </p>
        </div>

        {Array.isArray(question?.question_options) && question.question_options.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Options
            </div>
            <div className="grid gap-2">
              {question.question_options.map((opt) => {
                const isCorrect =
                  String(opt.option_key || "").toLowerCase() ===
                  String(correctKey || "").toLowerCase();
                return (
                  <div
                    key={`${question.id}-${opt.option_key}`}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${isCorrect
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      : "bg-white/70 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                      }`}
                  >
                    <div
                      className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${isCorrect
                        ? "bg-green-600 text-white"
                        : "bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
                        }`}
                    >
                      {String(opt.option_key || "").toUpperCase()}
                    </div>
                    <div className="text-gray-900 dark:text-white flex-1 text-sm">
                      {opt.content}
                    </div>
                    {isCorrect && (
                      <CheckCircle2 className="text-green-600 flex-shrink-0" size={18} />
                    )}
                  </div>
                );
              })}
            </div>

            {correctOption && (
              <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-800 dark:text-green-300 text-sm">
                  <CheckCircle2 size={16} />
                  <span className="font-semibold">Correct Answer:</span>
                  <span>
                    {String(correctKey || "").toUpperCase()}. {correctOption.content}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <FileText size={14} className="text-blue-600 dark:text-blue-400" />
              Explanation
            </div>
            <button
              type="button"
              onClick={() => setShowPreviewExplanation((v) => !v)}
              className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
            >
              {showPreviewExplanation ? "Hide Explanation" : "Show Explanation"}
            </button>
          </div>

          {showPreviewExplanation ? (
            explanation ? (
              <div className="bg-white/60 dark:bg-gray-700/30 rounded-lg border border-blue-100/60 dark:border-gray-700/60 p-3 max-h-48 overflow-auto">
                <pre className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 text-sm font-sans leading-relaxed">
                  {explanation}
                </pre>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center border-2 border-dashed border-gray-300 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No explanation available yet. Use “Regenerate” below to generate it.
                </p>
              </div>
            )
          ) : (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Explanation is hidden in preview. Click “Show Explanation” to view it.
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex-1 justify-center ${activeTab === tab.id
                ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {activeTab === "explanation" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="text-blue-600 dark:text-blue-400" size={18} />
                Explanation Content
              </h4>
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  onClick={() => handleAction("regenExplanation")}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                >
                  <Sparkles size={14} />
                  {busy ? "Generating..." : "Regenerate"}
                </button>
                {explanation && (
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this explanation?")) {
                        handleAction("deleteExplanation");
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full" />
              {explanation ? (
                <div className="ml-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 font-sans text-sm leading-relaxed">
                      {explanation}
                    </pre>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <Zap size={12} />
                    {explanation.length} characters
                  </div>
                </div>
              ) : (
                <div className="ml-4">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300 dark:border-gray-700">
                    <FileText className="mx-auto text-gray-400 dark:text-gray-600 mb-2" size={24} />
                    <p className="text-gray-500 dark:text-gray-400 mb-3">
                      No explanation available
                    </p>
                    <button
                      onClick={() => handleAction("regenExplanation")}
                      disabled={busy}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Sparkles size={14} />
                      Generate Explanation
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "female" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Venus className="text-pink-600 dark:text-pink-400" size={18} />
                Female Voice Audio
              </h4>
              <div className="flex gap-2">
                <button
                  disabled={busy && regeneratingVoice === "female"}
                  onClick={() =>
                    handleAction("generateVoice", {
                      voice: "female",
                      regenerate: !!femaleUrl,
                    })
                  }
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                >
                  <Music size={14} />
                  {busy && regeneratingVoice === "female"
                    ? "Generating..."
                    : femaleUrl
                      ? "Regenerate"
                      : "Generate"}
                </button>
                {femaleUrl && (
                  <button
                    disabled={busy && deletingVoice === "female"}
                    onClick={() => {
                      if (confirm("Are you sure you want to delete the female voice audio?")) {
                        handleAction("deleteVoice", { voice: "female" });
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    <Trash2 size={14} />
                    {busy && deletingVoice === "female" ? "Deleting..." : "Delete"}
                  </button>
                )}
              </div>
            </div>

            <ModernAudioPlayer
              src={femaleUrl}
              title="Female Voice Preview"
              color="pink"
              icon={<Venus size={16} className="text-pink-600 dark:text-pink-400" />}
            />

            {!femaleUrl && (
              <div className="mt-4 p-4 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-pink-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                    <Headphones className="text-pink-600 dark:text-pink-400" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">No audio generated yet</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Generate female voice audio for this explanation
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "male" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Mars className="text-indigo-600 dark:text-indigo-400" size={18} />
                Male Voice Audio
              </h4>
              <div className="flex gap-2">
                <button
                  disabled={busy && regeneratingVoice === "male"}
                  onClick={() =>
                    handleAction("generateVoice", {
                      voice: "male",
                      regenerate: !!maleUrl,
                    })
                  }
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                >
                  <Music size={14} />
                  {busy && regeneratingVoice === "male"
                    ? "Generating..."
                    : maleUrl
                      ? "Regenerate"
                      : "Generate"}
                </button>
                {maleUrl && (
                  <button
                    disabled={busy && deletingVoice === "male"}
                    onClick={() => {
                      if (confirm("Are you sure you want to delete the male voice audio?")) {
                        handleAction("deleteVoice", { voice: "male" });
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    <Trash2 size={14} />
                    {busy && deletingVoice === "male" ? "Deleting..." : "Delete"}
                  </button>
                )}
              </div>
            </div>

            <ModernAudioPlayer
              src={maleUrl}
              title="Male Voice Preview"
              color="indigo"
              icon={<Mars size={16} className="text-indigo-600 dark:text-indigo-400" />}
            />

            {!maleUrl && (
              <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-indigo-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <Waves className="text-indigo-600 dark:text-indigo-400" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">No audio generated yet</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Generate male voice audio for this explanation
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "preview" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Venus className="text-pink-600 dark:text-pink-400" size={16} />
                  Female Voice
                </h4>
                <ModernAudioPlayer src={femaleUrl} title="" color="pink" />
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Mars className="text-indigo-600 dark:text-indigo-400" size={16} />
                  Male Voice
                </h4>
                <ModernAudioPlayer src={maleUrl} title="" color="indigo" />
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-amber-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <Headphones className="text-amber-600 dark:text-amber-400" size={20} />
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold text-gray-900 dark:text-white">Audio Preview Tips</h5>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                      Click the colored play button to start/pause audio
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                      Drag on the progress bar to seek through the audio
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                      Use the volume slider to adjust playback volume
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                      Click the download icon to save audio file
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {explanation ? explanation.length : 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Characters</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {femaleUrl ? "✓" : "✗"}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Female Voice</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {maleUrl ? "✓" : "✗"}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Male Voice</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {explanation ? "✓" : "✗"}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Explanation</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChaptersPage({ params }) {
  const { subjectId } = useParams();
  const [subject, setSubject] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [filteredChapters, setFilteredChapters] = useState([]);
  const [subjectQuestions, setSubjectQuestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showExplanation, setShowExplanation] = useState({});
  const [questionSerialNumbers, setQuestionSerialNumbers] = useState({});
  const [modal, setModal] = useState({ open: false, mode: "create", item: null, saving: false, type: "chapter" });
  const [questionModal, setQuestionModal] = useState({ open: false, mode: "create", item: null, saving: false });
  const [mediaModal, setMediaModal] = useState({ open: false, loading: false, q: null });
  const [showDirectQuestions, setShowDirectQuestions] = useState(false);

  async function fetchData() {
    try {
      const [chaptersRes, questionsRes] = await Promise.all([
        fetch(`/api/admin/subjects/${subjectId}/chapters`),
        fetch(`/api/admin/questions?subject_id=${subjectId}`)
      ]);

      const chaptersJson = await chaptersRes.json();
      const questionsJson = await questionsRes.json();

      if (!chaptersJson.success) throw new Error(chaptersJson.error);
      if (!questionsJson.success) throw new Error(questionsJson.error);

      setSubject(chaptersJson.subject);
      setChapters(chaptersJson.chapters);
      setFilteredChapters(chaptersJson.chapters);
      const questions = questionsJson.data || [];
      setSubjectQuestions(questions);

      // Set serial numbers for questions
      const serialMap = {};
      questions.forEach((q, idx) => {
        serialMap[q.id] = idx + 1;
      });
      setQuestionSerialNumbers(serialMap);
    } catch (err) {
      toast.error(err.message);
    }
  }

  useEffect(() => {
    fetchData();
  }, [subjectId]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredChapters(chapters);
    } else {
      const filtered = chapters.filter(chapter =>
        chapter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        chapter.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredChapters(filtered);
    }
  }, [searchTerm, chapters]);

  const openCreate = () => setModal({ open: true, mode: "create", item: null, type: "chapter" });
  const openEdit = (item) => setModal({ open: true, mode: "edit", item, type: "chapter" });
  const closeModal = () => setModal({ open: false, item: null, type: "chapter" });

  const openQuestionCreate = () => setQuestionModal({ open: true, mode: "create", item: null });
  const openQuestionEdit = (item) => setQuestionModal({ open: true, mode: "edit", item });
  const closeQuestionModal = () => setQuestionModal({ open: false, item: null });

  async function createOrUpdate(payload) {
    try {
      setModal((m) => ({ ...m, saving: true }));
      const method = modal.mode === "create" ? "POST" : "PUT";
      const url =
        modal.mode === "create"
          ? `/api/admin/chapters`
          : `/api/admin/chapters/${modal.item.id}`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`Chapter ${modal.mode === "create" ? "added" : "updated"}`);
      closeModal();
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setModal((m) => ({ ...m, saving: false }));
    }
  }

  async function deleteChapter(id) {
    if (!confirm("Are you sure you want to delete this chapter? All related questions will also be deleted.")) return;
    try {
      const res = await fetch(`/api/admin/chapters/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Chapter deleted successfully");
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function createOrUpdateQuestion(payload) {
    try {
      setQuestionModal((m) => ({ ...m, saving: true }));
      const method = questionModal.mode === "create" ? "POST" : "PUT";
      const url = questionModal.mode === "create"
        ? "/api/admin/questions"
        : `/api/admin/questions/${questionModal.item.id}`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Save failed");
      toast.success(`Question ${questionModal.mode === "create" ? "created" : "updated"} successfully`);
      closeQuestionModal();
      fetchData();
    } catch (err) {
      toast.error(err.message);
      setQuestionModal((m) => ({ ...m, saving: false }));
    }
  }

  async function deleteQuestion(id) {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      const res = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Question deleted successfully");
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const toggleExplanation = (questionId) => {
    setShowExplanation((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  async function openMediaModal(questionId) {
    try {
      setMediaModal((m) => ({ ...m, open: true, loading: true, q: null }));
      const res = await fetch(`/api/admin/questions/${questionId}`);
      const data = await res.json();
      if (!res.ok || !data?.success)
        throw new Error(data?.error || "Failed to load question");
      const q = data.question || null;
      const options = Array.isArray(data.options) ? data.options : [];
      const correctKey = data.correct?.correct_key || null;
      setMediaModal({
        open: true,
        loading: false,
        q: q
          ? {
            ...q,
            question_options: options,
            correct_answers: { correct_key: correctKey },
          }
          : null,
      });
    } catch (e) {
      toast.error(e.message);
      setMediaModal({ open: false, loading: false, q: null });
    }
  }

  function closeMediaModal() {
    setMediaModal({ open: false, loading: false, q: null });
  }

  // QuestionCard Component
  function QuestionCard({ question, serialNumber, showExplanation, onToggleExplanation, onEdit, onDelete, onRefetch, onManage }) {

    const getStatusColor = (status) => {
      switch (status) {
        case "approved":
          return "text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
        case "rejected":
          return "text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
        default:
          return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
      }
    };

    const getStatusIcon = (status) => {
      switch (status) {
        case "approved":
          return <CheckCircle2 size={14} />;
        case "rejected":
          return <XCircle size={14} />;
        default:
          return <Clock size={14} />;
      }
    };

    const getQuestionTypeColor = (type) => {
      switch (type) {
        case "easy":
          return "text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
        case "moderate":
          return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
        case "difficult":
          return "text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
        default:
          return "text-gray-600 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800";
      }
    };

    const correctAnswer = question.correct_answers?.correct_key;
    const correctOption = question.question_options?.find(
      (opt) => opt.option_key === correctAnswer
    );

    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
        {/* Question Header */}
        <div className="flex justify-between flex-wrap items-start mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <FileText className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                  question.status
                )}`}
              >
                {getStatusIcon(question.status)}
                {question.status || "pending"}
              </span>
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getQuestionTypeColor(
                  question.question_type || "easy"
                )}`}
              >
                {question.question_type || "easy"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onManage}
              className="flex items-center gap-1 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1 rounded-lg transition-colors"
              title="Manage explanation & audio"
            >
              <SlidersHorizontal size={16} />
              <span className="text-sm">Audio & Explanation</span>
            </button>
            <button
              onClick={onToggleExplanation}
              className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              {showExplanation ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="text-sm">
                {showExplanation ? "Hide" : "Show"} Explanation
              </span>
            </button>
            <span className="w-px h-6 bg-gray-200 dark:bg-gray-700 my-auto" />
            <button
              onClick={onEdit}
              className="text-yellow-600 dark:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 p-2 rounded-lg transition-colors"
              title="Edit question"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={onDelete}
              className="text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
              title="Delete question"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Question Text */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 leading-relaxed">
            Q-{serialNumber}: {question.question_text}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="order-1 md:order-2">
            {question.question_image_url && (
              <div className="mb-4">
                <a
                  href={question.question_image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <img
                    src={question.question_image_url}
                    className="max-h-[290] rounded-md"
                    alt="Question"
                  />
                </a>
              </div>
            )}
          </div>
          <div className="order-2 md:order-1">
            {/* Options */}
            <div className="grid gap-2 mb-4">
              {question.question_options?.map((option) => (
                <div
                  key={`${question.id}-${option.option_key}`}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${option.option_key === correctAnswer
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                    }`}
                >
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${option.option_key === correctAnswer
                      ? "bg-green-600 text-white"
                      : "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                      }`}
                  >
                    {option.option_key}
                  </div>
                  <span className="text-gray-900 dark:text-white flex-1">
                    {option.content}
                  </span>
                  {option.option_key === correctAnswer && (
                    <CheckCircle2
                      className="text-green-600 flex-shrink-0"
                      size={16}
                    />
                  )}
                </div>
              ))}
            </div>
            {/* Correct Answer */}
            {correctOption && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-800 dark:text-green-300">
                  <CheckCircle2 size={16} />
                  <span className="font-medium">Correct Answer:</span>
                  <span>{correctOption.content}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Explanation */}
        {showExplanation && question.explanation && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
              <FileText size={16} />
              Explanation
            </h4>
            <p className="text-blue-800 dark:text-blue-200 leading-relaxed whitespace-pre-line">
              {question.explanation}
            </p>
            {question.image_url && (
              <div className="mt-3">
                <a
                  href={question.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <img
                    src={question.image_url}
                    className="max-h-[290] rounded-md"
                    alt="Explanation"
                  />
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen  dark:from-gray-900 dark:to-gray-800 p-6 transition-colors duration-200">
      <Toaster position="top-right" />
      <div className=" mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6 mb-8">
            <div className="flex-1">
              <Link
                href={subject?.course_id ? `/admin/questions?course_id=${subject.course_id}` : "/admin/questions"}
                className="inline-flex items-center gap-2 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30 px-4 py-2 rounded-lg transition-all duration-200 mb-6 group"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">Back to Subjects</span>
              </Link>

              {/* Subject Title */}
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
                  <BookOpen className="text-orange-600 dark:text-orange-400" size={32} />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                    {subject?.name || "Loading..."}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Manage chapters and organize your learning materials
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 h-fit">
              <button
                onClick={openCreate}
                className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Plus size={24} />
                <span>Chapter</span>
              </button>
              <button
                onClick={openQuestionCreate}
                className="flex items-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Plus size={24} />
                <span>Add Question</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-md">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search chapters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm transition-all duration-200"
              />
            </div>
          </div>
        </div>


        {/* Results Info */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            {filteredChapters.length} chapter{filteredChapters.length !== 1 ? 's' : ''} available
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-orange-600 dark:text-orange-400 hover:underline text-sm font-medium"
            >
              Clear search
            </button>
          )}
        </div>

        {/* Chapters Grid */}
        {filteredChapters.length === 0 ? (
          <div className="text-center py-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50">
            <Folder className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={80} />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              {searchTerm ? "No chapters found" : "No chapters yet"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto text-lg">
              {searchTerm
                ? "Try adjusting your search terms or create a new chapter."
                : "Start organizing your subject by adding the first chapter."
              }
            </p>
            {!searchTerm && (
              <button
                onClick={openCreate}
                className="flex items-center gap-3 bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500 text-white px-8 py-4 rounded-xl font-semibold transition-colors duration-200 mx-auto shadow-lg"
              >
                <Plus size={24} />
                <span>Create First Chapter</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredChapters.map((ch) => (
              <div
                key={ch.id}
                className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-gray-100 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-600 transition-all duration-300 transform hover:-translate-y-2"
              >
                {/* Chapter Icon and Actions */}
                <div className="flex justify-between items-start mb-4">
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/30 rounded-xl group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50 transition-colors">
                    <Folder className="text-orange-600 dark:text-orange-400" size={32} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => openEdit(ch)}
                      className="p-2 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                      title="Edit chapter"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => deleteChapter(ch.id)}
                      className="p-2 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete chapter"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Chapter Content */}
                <Link
                  href={`/admin/questions/${subjectId}/${ch.id}`}
                  className="block hover:no-underline group"
                >
                  <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-3 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2">
                    {ch.name}
                  </h3>

                  {ch.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3 leading-relaxed">
                      {ch.description}
                    </p>
                  )}

                  {/* Chapter Metadata */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded-full">
                      Chapter
                    </span>
                    <div className="text-orange-600 dark:text-orange-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                      View Questions →
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Chapter Modal */}
        <Modal
          open={modal.open}
          onClose={closeModal}
          title={
            <div className="flex items-center gap-3">
              <Folder className="text-orange-600" size={24} />
              {`${modal.mode === "create" ? "Create New" : "Edit"} Chapter`}
            </div>
          }
        >
          <ChapterForm
            parentSubjectId={subjectId}
            initial={modal.item}
            saving={modal.saving}
            onCancel={closeModal}
            onSubmit={createOrUpdate}
          />
        </Modal>

        {/* Question Modal */}
        <Modal
          open={questionModal.open}
          onClose={closeQuestionModal}
          title={`${questionModal.mode === "create" ? "Add" : "Edit"} Question`}
          size="2xl"
        >
          <QuestionForm
            initial={questionModal.item}
            parent={{ subject_id: subjectId, chapter_id: null, topic_id: null }}
            saving={questionModal.saving}
            onCancel={closeQuestionModal}
            onSubmit={createOrUpdateQuestion}
          />
        </Modal>

        {/* Media Management Modal (Audio & Explanation Studio) */}
        <Modal
          open={mediaModal.open}
          onClose={closeMediaModal}
          title={
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg">
                <Music className="text-white" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Audio & Explanation Studio</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage voice audio and explanations</p>
              </div>
            </div>
          }
          size="3xl"
        >
          {mediaModal.loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-orange-200 dark:border-orange-800 rounded-full"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-orange-500 dark:border-orange-400 rounded-full animate-spin border-t-transparent"></div>
              </div>
              <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">
                Loading question data...
              </p>
            </div>
          ) : mediaModal.q ? (
            <MediaManager
              question={mediaModal.q}
              onUpdated={async () => {
                await openMediaModal(mediaModal.q.id);
                fetchData();
              }}
            />
          ) : (
            <div className="text-center py-12">
              <XCircle className="mx-auto text-red-500 mb-4" size={48} />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Failed to load question
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Please try again or contact support if the issue persists.
              </p>
              <button
                onClick={closeMediaModal}
                className="px-6 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}