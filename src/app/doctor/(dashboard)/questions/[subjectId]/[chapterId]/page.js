"use client";

import { useEffect, useState, useRef } from "react";
import {
  Folder,
  Plus,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Loader2,
  BookOpen,
  Search,
  Filter,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Venus,
  Mars,
  PlayCircle,
  RefreshCw,
  SlidersHorizontal,
  Volume2,
  Pause,
  Play,
  Download,
  Waves,
  Sparkles,
  Headphones,
  Music,
  Zap,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import Modal from "@/components/Modal";
import { TopicForm, QuestionForm } from "@/components/Forms";
import { useParams } from "next/navigation";

// Modern Audio Player Component
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
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleDownload = () => {
    if (src) {
      const link = document.createElement('a');
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
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
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
        {/* Play/Pause Button */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handlePlayPause}
            className={`${colorClasses[color]} p-3 rounded-full text-white shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 active:scale-95`}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          
          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {isMuted ? <Volume2 size={16} /> : <Volume2 size={16} />}
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

        {/* Progress Bar */}
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
          
          {/* Time Display */}
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Wave Visualization */}
        <div className="flex items-center justify-center h-8 gap-0.5 mt-2">
          {Array.from({ length: 30 }).map((_, i) => {
            const baseHeight = 4;
            const height = baseHeight + Math.sin(i * 0.5) * 10 + (isPlaying ? Math.random() * 8 : 0);
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-200 ${
                  isPlaying ? `${colorClasses[color]}` : 'bg-gray-300 dark:bg-gray-600'
                }`}
                style={{
                  height: `${isPlaying ? Math.max(height, 4) : baseHeight}px`,
                  transitionDelay: `${i * 20}ms`,
                  opacity: isPlaying ? Math.min(1, 0.2 + i * 0.03) : 0.5,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Enhanced MediaManager Component for Doctor
function DoctorMediaManager({ question, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("explanation");
  const [regeneratingVoice, setRegeneratingVoice] = useState(null);
  const [deletingVoice, setDeletingVoice] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const femaleUrl = question?.female_explanation_audio_url;
  const maleUrl = question?.male_explanation_audio_url;
  const explanation = question?.explanation;

  async function handleAction(action, params = {}) {
    try {
      setBusy(true);
      
      if (action === "regenExplanation") {
        const res = await fetch(`/api/doctor/questions/${question.id}/explanation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ regenerate: true }),
        });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to regenerate");
        toast.success("✨ Explanation regenerated successfully!");
      }
      
      else if (action === "deleteExplanation") {
        const res = await fetch(`/api/doctor/questions/${question.id}/explanation`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to delete");
        toast.success("🗑️ Explanation deleted successfully!");
      }
      
      else if (action === "generateVoice") {
        setRegeneratingVoice(params.voice);
        const res = await fetch(`/api/doctor/questions/${question.id}/voice`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voice: params.voice, regenerate: params.regenerate }),
        });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to generate audio");
        toast.success(`🎵 ${params.voice === "female" ? "Female" : "Male"} audio ${params.regenerate ? "regenerated" : "generated"} successfully!`);
      }
      
      else if (action === "deleteVoice") {
        setDeletingVoice(params.voice);
        const res = await fetch(`/api/doctor/questions/${question.id}/voice?voice=${params.voice}`, { 
          method: "DELETE" 
        });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to delete audio");
        toast.success(`🗑️ ${params.voice === "female" ? "Female" : "Male"} audio deleted successfully!`);
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
      {/* Question Preview */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-blue-100 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <BookOpen size={16} className="text-blue-600 dark:text-blue-400" />
              Question Preview
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-2">
              {question?.question_text}
            </p>
          </div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
          >
            {showPreview ? "Hide Full" : "Show Full"}
          </button>
        </div>
        
        {showPreview && (
          <div className="mt-3 p-3 bg-white/50 dark:bg-gray-700/30 rounded-lg">
            <p className="text-gray-800 dark:text-gray-200 text-sm">
              {question?.question_text}
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex-1 justify-center ${
                activeTab === tab.id
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

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Explanation Tab */}
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
                    <p className="text-gray-500 dark:text-gray-400 mb-3">No explanation available</p>
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

        {/* Female Voice Tab */}
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
                  onClick={() => handleAction("generateVoice", { voice: "female", regenerate: !!femaleUrl })}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                >
                  <Music size={14} />
                  {busy && regeneratingVoice === "female" 
                    ? "Generating..." 
                    : femaleUrl ? "Regenerate" : "Generate"}
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

        {/* Male Voice Tab */}
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
                  onClick={() => handleAction("generateVoice", { voice: "male", regenerate: !!maleUrl })}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium"
                >
                  <Music size={14} />
                  {busy && regeneratingVoice === "male" 
                    ? "Generating..." 
                    : maleUrl ? "Regenerate" : "Generate"}
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

        {/* Preview Tab */}
        {activeTab === "preview" && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Venus className="text-pink-600 dark:text-pink-400" size={16} />
                  Female Voice
                </h4>
                <ModernAudioPlayer
                  src={femaleUrl}
                  title=""
                  color="pink"
                />
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Mars className="text-indigo-600 dark:text-indigo-400" size={16} />
                  Male Voice
                </h4>
                <ModernAudioPlayer
                  src={maleUrl}
                  title=""
                  color="indigo"
                />
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

      {/* Stats Footer */}
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

// Question Card Component with Modern Audio Player
function QuestionCard({
  question,
  showExplanation,
  onToggleExplanation,
  onEdit,
  onDelete,
  onManage,
}) {
  const audioRef = useRef(null);
  const [isMaleLoading, setIsMaleLoading] = useState(false);
  const [isFemaleLoading, setIsFemaleLoading] = useState(false);
  const [isExplLoading, setIsExplLoading] = useState(false);

  const handleVoice = async (voice, generateNew = false) => {
    try {
      voice === "female" ? setIsFemaleLoading(true) : setIsMaleLoading(true);

      const existingUrl = voice === "female"
        ? question.female_explanation_audio_url
        : question.male_explanation_audio_url;

      // Play existing if available and not forcing regenerate
      if (existingUrl && !generateNew) {
        if (!audioRef.current) {
          const el = document.createElement("audio");
          el.preload = "auto";
          el.style.display = "none";
          document.body.appendChild(el);
          audioRef.current = el;
        }
        const el = audioRef.current;
        el.pause();
        el.src = `${existingUrl}?v=${Date.now()}`;
        try {
          await el.play();
        } catch (err) {
          if (!(err && err.name === "AbortError")) {
            throw err;
          }
        }
        return;
      }

      // Otherwise generate new via API
      const res = await fetch(`/api/doctor/questions/${question.id}/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice, regenerate: generateNew }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        const errMsg = data?.error || "Failed to generate audio";
        throw new Error(errMsg);
      }
      const url = data.url;

      // Update question object locally so UI toggles to Play on subsequent clicks
      if (voice === "female") {
        question.female_explanation_audio_url = url;
      } else {
        question.male_explanation_audio_url = url;
      }

      if (!audioRef.current) {
        const el = document.createElement("audio");
        el.preload = "auto";
        el.style.display = "none";
        document.body.appendChild(el);
        audioRef.current = el;
      }
      const el = audioRef.current;
      el.pause();
      el.src = `${url}?v=${Date.now()}`;
      try {
        await el.play();
      } catch (err) {
        if (!(err && err.name === "AbortError")) {
          throw err;
        }
      }
    } catch (e) {
      toast.error(e.message || "Audio unavailable");
    } finally {
      voice === "female" ? setIsFemaleLoading(false) : setIsMaleLoading(false);
    }
  };

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

  const correctAnswer = question.correct_answers?.correct_key;
  const correctOption = question.question_options?.find(
    (opt) => opt.option_key === correctAnswer
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
      {/* Question Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <FileText className="text-blue-600 dark:text-blue-400" size={20} />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                question.status
              )}`}
            >
              {getStatusIcon(question.status)}
              {question.status || "pending"}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border border text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              {question?.status_user?.full_name || "Waiting for approved"}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onToggleExplanation}
            className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            {showExplanation ? <EyeOff size={16} /> : <Eye size={16} />}
            <span className="text-sm">
              {showExplanation ? "Hide" : "Show"} Explanation
            </span>
          </button>
          <button
            onClick={() => onManage?.(question.id)}
            className="flex items-center gap-1 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1 rounded-lg transition-colors"
            title="Manage explanation & audio"
          >
            <SlidersHorizontal size={16} />
            <span className="text-sm">Audio & Explanation</span>
          </button>
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
          {question.question_text}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <div className="order-1 md:order-2">
          {/* Question Image */}
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
                key={option.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  option.option_key === correctAnswer
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                }`}
              >
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                    option.option_key === correctAnswer
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
                />
              </a>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={async () => {
                try {
                  setIsExplLoading(true);
                  const res = await fetch(`/api/doctor/questions/${question.id}/explanation`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ regenerate: true }),
                  });
                  const data = await res.json();
                  if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to regenerate explanation");
                  toast.success("Explanation regenerated");
                } catch (e) {
                  toast.error(e.message);
                } finally {
                  setIsExplLoading(false);
                }
              }}
              disabled={isExplLoading}
              className="flex items-center gap-2 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1 rounded-lg disabled:opacity-60 transition-colors"
              title="Regenerate explanation"
            >
              <RefreshCw size={16} />
              <span className="text-sm">{isExplLoading ? "Regenerating…" : "Regenerate Explanation"}</span>
            </button>
            <button
              onClick={async () => {
                if (!confirm("Delete explanation text?")) return;
                try {
                  setIsExplLoading(true);
                  const res = await fetch(`/api/doctor/questions/${question.id}/explanation`, {
                    method: "DELETE",
                  });
                  const data = await res.json();
                  if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to delete explanation");
                  toast.success("Explanation deleted");
                } catch (e) {
                  toast.error(e.message);
                } finally {
                  setIsExplLoading(false);
                }
              }}
              disabled={isExplLoading}
              className="flex items-center gap-2 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1 rounded-lg disabled:opacity-60 transition-colors"
              title="Delete explanation"
            >
              <Trash2 size={16} />
              <span className="text-sm">Delete Explanation</span>
            </button>
          </div>
        </div>
      )}

      
    </div>
  );
}

// Topic Accordion Component
function TopicAccordion({
  topic,
  subjectId,
  chapterId,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onAddQuestion,
  showExplanation,
  onToggleExplanation,
  openModal,
  deleteQuestion,
  onManage,
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-300">
      {/* Topic Header */}
      <div
        className="p-6 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-2xl transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
            {isExpanded ? (
              <ChevronDown
                className="text-indigo-600 dark:text-indigo-400"
                size={20}
              />
            ) : (
              <ChevronRight
                className="text-indigo-600 dark:text-indigo-400"
                size={20}
              />
            )}
          </div>
          <Folder className="text-indigo-600 dark:text-indigo-400" size={24} />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
              {topic?.name || "Unnamed Topic"}
            </h3>
            {topic.description && (
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                {topic?.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
            {topic.questions?.length || 0} questions
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddQuestion();
            }}
            className="text-green-600 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 p-2 rounded-lg transition-colors"
            title="Add question to topic"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="text-yellow-600 dark:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 p-2 rounded-lg transition-colors"
            title="Edit topic"
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
            title="Delete topic"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Topic Content */}
      {isExpanded && (
        <div className="px-6 pb-6">
          {(topic.questions?.length || 0) > 0 ? (
            <div className="grid gap-4">
              {topic.questions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  showExplanation={showExplanation[question.id]}
                  onToggleExplanation={() => onToggleExplanation(question.id)}
                  onEdit={() =>
                    openModal("question", "edit", question, {
                      subject_id: subjectId,
                      chapter_id: chapterId,
                      topic_id: topic.id,
                    })
                  }
                  onDelete={() => deleteQuestion(question.id)}
                  onManage={() => onManage?.(question.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FileText className="mx-auto mb-2" size={32} />
              <p>No questions in this topic yet.</p>
              <button
                onClick={onAddQuestion}
                className="mt-3 text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium"
              >
                Add the first question
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ChapterDetailsPage() {
  const { subjectId, chapterId } = useParams();

  const [chapter, setChapter] = useState(null);
  const [topics, setTopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [filteredTopics, setFilteredTopics] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showExplanation, setShowExplanation] = useState({});
  const [saving, setSaving] = useState(false);
  const [mediaModal, setMediaModal] = useState({ open: false, loading: false, q: null });

  const [modal, setModal] = useState({
    open: false,
    type: "", // "topic" or "question"
    mode: "create", // create/update
    item: null,
    parent: null,
  });

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleExplanation = (questionId) => {
    setShowExplanation((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/doctor/chapters/${chapterId}/topics`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setChapter(json.chapter);

      // Ensure topics have questions array
      const topicsWithQuestions = (json.topics || []).map((topic) => ({
        ...topic,
        questions: topic.questions || [],
      }));

      setTopics(topicsWithQuestions);
      setQuestions(json.questions || []);
      setFilteredQuestions(json.questions || []);
      setFilteredTopics(topicsWithQuestions);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [chapterId]);

  async function openMediaModal(questionId) {
    try {
      setMediaModal((m) => ({ ...m, open: true, loading: true, q: null }));
      const res = await fetch(`/api/doctor/questions/${questionId}`);
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Failed to load question");
      setMediaModal({ open: true, loading: false, q: data.question });
    } catch (e) {
      toast.error(e.message);
      setMediaModal({ open: false, loading: false, q: null });
    }
  }

  function closeMediaModal() {
    setMediaModal({ open: false, loading: false, q: null });
  }
  // Apply search and filter
  useEffect(() => {
    let filteredDirectQuestions = [...questions];
    let filteredTopicQuestions = topics.map((topic) => ({
      ...topic,
      questions: topic.questions || [],
    }));

    // Apply search filter to direct questions
    if (searchTerm) {
      filteredDirectQuestions = questions.filter(
        (q) =>
          q.question_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.explanation?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      // Apply search filter to topic questions
      filteredTopicQuestions = topics.map((topic) => ({
        ...topic,
        questions: (topic.questions || []).filter(
          (q) =>
            q.question_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.explanation?.toLowerCase().includes(searchTerm.toLowerCase())
        ),
      }));
    }

    // Apply status filter to direct questions
    if (statusFilter !== "all") {
      filteredDirectQuestions = filteredDirectQuestions.filter(
        (q) => q.status === statusFilter
      );

      // Apply status filter to topic questions
      filteredTopicQuestions = filteredTopicQuestions.map((topic) => ({
        ...topic,
        questions: (topic.questions || []).filter(
          (q) => q.status === statusFilter
        ),
      }));
    }

    setFilteredQuestions(filteredDirectQuestions);
    setFilteredTopics(filteredTopicQuestions);
  }, [searchTerm, statusFilter, questions, topics]);

  // Open modal
  const openModal = (type, mode, item = null, parent = null) => {
    setModal({ open: true, type, mode, item, parent });
  };

  const closeModal = () =>
    setModal({
      open: false,
      type: "",
      mode: "create",
      item: null,
      parent: null,
    });

  // API Callers with loading states
  async function deleteTopic(id) {
    if (
      !confirm(
        "Are you sure you want to delete this topic? All questions under this topic will also be deleted."
      )
    )
      return;
    try {
      const res = await fetch(`/api/doctor/topics/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Topic deleted successfully");
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function deleteQuestion(id) {
    if (
      !confirm(
        "Are you sure you want to delete this question? This action cannot be undone."
      )
    )
      return;
    try {
      const res = await fetch(`/api/doctor/questions/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Question deleted successfully");
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // Handle form submissions with loading states
  const handleTopicSubmit = async (payload) => {
    setSaving(true);
    try {
      const url =
        modal.mode === "create"
          ? "/api/doctor/topics"
          : `/api/doctor/topics/${modal.item.id}`;

      const method = modal.mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        toast.error(json.error);
        return;
      }

      toast.success(
        modal.mode === "create"
          ? "Topic created successfully!"
          : "Topic updated successfully!"
      );
      closeModal();
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleQuestionSubmit = async (payload) => {
    setSaving(true);
    try {
      const url =
        modal.mode === "create"
          ? "/api/doctor/questions"
          : `/api/doctor/questions/${modal.item.id}`;

      const method = modal.mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        toast.error(json.error);
        return;
      }

      toast.success(
        modal.mode === "create"
          ? "Question added successfully!"
          : "Question updated successfully!"
      );
      closeModal();
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "text-green-600 bg-green-50 dark:bg-green-900/20";
      case "rejected":
        return "text-red-600 bg-red-50 dark:bg-red-900/20";
      default:
        return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
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

  // Calculate stats based on filtered data
  const totalFilteredQuestions =
    filteredQuestions.length +
    filteredTopics.reduce(
      (total, topic) => total + (topic?.questions?.length || 0),
      0
    );

  const approvedFilteredQuestions =
    filteredQuestions.filter((q) => q.status === "approved").length +
    filteredTopics.reduce(
      (total, topic) =>
        total +
        (topic?.questions?.filter((q) => q.status === "approved").length || 0),
      0
    );

  const pendingFilteredQuestions =
    filteredQuestions.filter((q) => q.status === "pending").length +
    filteredTopics.reduce(
      (total, topic) =>
        total +
        (topic?.questions?.filter((q) => q.status === "pending").length || 0),
      0
    );

  // Check if we have any topics with questions to display
  const hasTopicsWithQuestions = filteredTopics.some(
    (topic) => topic.questions?.length > 0
  );
  const hasAnyTopics = topics.length > 0;

  return (
    <div className="min-h-screen dark:from-gray-900 dark:to-gray-800 p-6 transition-colors duration-200">
      <div className="mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6 mb-8">
            <div className="flex-1">
              {/* Back Button */}
              <Link
                href={`/doctor/questions/${subjectId}`}
                className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-4 py-2 rounded-lg transition-all duration-200 mb-6 group"
              >
                <ArrowLeft
                  size={20}
                  className="group-hover:-translate-x-1 transition-transform"
                />
                <span className="font-medium">Back to Chapters</span>
              </Link>

              {/* Chapter Title */}
              <div className="flex items-center gap-4 mb-2">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
                  <Folder
                    className="text-blue-600 dark:text-blue-400"
                    size={36}
                  />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                    {chapter?.name || "Loading..."}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Manage topics and questions for this chapter
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 h-fit">
              <button
                onClick={() => openModal("topic", "create")}
                className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Plus size={20} />
                <span>Add Topic</span>
              </button>
              <button
                onClick={() =>
                  openModal("question", "create", null, {
                    subject_id: subjectId,
                    chapter_id: chapterId,
                    topic_id: null,
                  })
                }
                className="flex items-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Plus size={20} />
                <span>Add Question</span>
              </button>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search questions by text or explanation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* Status Filter */}
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                {(searchTerm || statusFilter !== "all") && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                    }}
                    className="px-4 py-3 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FileText
                    className="text-blue-600 dark:text-blue-400"
                    size={16}
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Filtered Questions
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {totalFilteredQuestions || 0}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle2
                    className="text-green-600 dark:text-green-400"
                    size={16}
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Approved
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {approvedFilteredQuestions || 0}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Clock
                    className="text-yellow-600 dark:text-yellow-400"
                    size={16}
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Pending
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {pendingFilteredQuestions || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-lg">Loading chapter content...</p>
          </div>
        ) : (
          <>
            {/* Direct Chapter Questions */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <FileText
                    className="text-blue-600 dark:text-blue-400"
                    size={24}
                  />
                  Direct Questions
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                    {filteredQuestions.length} questions
                  </span>
                </h2>
              </div>

              {filteredQuestions.length > 0 ? (
                <div className="grid gap-4">
                  {filteredQuestions.map((q) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      showExplanation={showExplanation[q.id]}
                      onToggleExplanation={() => toggleExplanation(q.id)}
                      onEdit={() =>
                        openModal("question", "edit", q, {
                          subject_id: subjectId,
                          chapter_id: chapterId,
                          topic_id: null,
                        })
                      }
                      onDelete={() => deleteQuestion(q.id)}
                      onManage={() => openMediaModal(q.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50">
                  <FileText
                    className="mx-auto text-gray-300 dark:text-gray-600 mb-4"
                    size={48}
                  />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {searchTerm || statusFilter !== "all"
                      ? "No matching direct questions"
                      : "No direct questions yet"}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    {searchTerm || statusFilter !== "all"
                      ? "Try adjusting your search or filter criteria"
                      : "Start by adding questions directly to this chapter."}
                  </p>
                  {!(searchTerm || statusFilter !== "all") && (
                    <button
                      onClick={() =>
                        openModal("question", "create", null, {
                          subject_id: subjectId,
                          chapter_id: chapterId,
                          topic_id: null,
                        })
                      }
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-medium transition-colors duration-200 mx-auto"
                    >
                      <Plus size={20} />
                      <span>Add First Question</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Topics Section - FIXED: Always show topics section */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <Folder
                    className="text-indigo-600 dark:text-indigo-400"
                    size={24}
                  />
                  Topics
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                    {hasTopicsWithQuestions
                      ? `${
                          filteredTopics.filter(
                            (topic) => topic.questions?.length > 0
                          ).length
                        } topics with questions`
                      : `${topics.length} topics`}
                  </span>
                </h2>
              </div>

              {/* Show all topics, not just those with questions */}
              {topics.length > 0 ? (
                <div className="space-y-4">
              {topics.map((topic) => (
                    <TopicAccordion
                      key={topic.id}
                      topic={topic}
                      subjectId={subjectId}
                      chapterId={chapterId}
                      isExpanded={expanded[topic.id]}
                      onToggle={() => toggle(topic.id)}
                      onEdit={() => openModal("topic", "edit", topic)}
                      onDelete={() => deleteTopic(topic.id)}
                      onAddQuestion={() =>
                        openModal("question", "create", null, {
                          subject_id: subjectId,
                          chapter_id: chapterId,
                          topic_id: topic.id,
                        })
                      }
                      showExplanation={showExplanation}
                      onToggleExplanation={toggleExplanation}
                      openModal={openModal}
                      deleteQuestion={deleteQuestion}
                      onManage={openMediaModal}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50">
                  <Folder
                    className="mx-auto text-gray-300 dark:text-gray-600 mb-4"
                    size={48}
                  />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    No topics yet
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Organize your questions by creating topics.
                  </p>
                  <button
                    onClick={() => openModal("topic", "create")}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium transition-colors duration-200 mx-auto"
                  >
                    <Plus size={20} />
                    <span>Create First Topic</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Modals */}
        <Modal
          open={modal.open}
          title={
            <div className="flex items-center gap-3">
              {modal.type === "topic" ? (
                <Folder className="text-indigo-600" size={24} />
              ) : (
                <FileText className="text-green-600" size={24} />
              )}
              {modal.mode === "create"
                ? `Add New ${modal.type}`
                : `Edit ${modal.type}`}
            </div>
          }
          onClose={closeModal}
          size={modal.type === "question" ? "2xl" : "xl"}
        >
          {modal.type === "topic" && (
            <TopicForm
              initial={modal.mode === "edit" ? modal.item : null}
              parentChapterId={chapterId}
              onCancel={closeModal}
              onSubmit={handleTopicSubmit}
              saving={saving}
            />
          )}

          {modal.type === "question" && (
            <QuestionForm
              initial={modal.mode === "edit" ? modal.item : null}
              parent={modal.parent}
              onCancel={closeModal}
              onSubmit={handleQuestionSubmit}
              saving={saving}
            />
          )}
        </Modal>
        {/* Media Modal for Doctor */}
        <Modal
          open={mediaModal.open}
          onClose={closeMediaModal}
          title={
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
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
                <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 rounded-full"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 dark:border-blue-400 rounded-full animate-spin border-t-transparent"></div>
              </div>
              <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Loading question data...</p>
            </div>
          ) : mediaModal.q ? (
            <DoctorMediaManager
              question={mediaModal.q}
              onUpdated={async () => {
                await openMediaModal(mediaModal.q.id);
                fetchData();
              }}
            />
          ) : (
            <div className="text-center py-12">
              <XCircle className="mx-auto text-red-500 mb-4" size={48} />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Failed to load question</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Please try again or contact support if the issue persists.</p>
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