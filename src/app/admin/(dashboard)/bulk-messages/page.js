"use client";

import React, { useState, useEffect, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  History,
  User,
  Image as ImageIcon,
  FileText,
  ExternalLink,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  BookOpen,
  Info,
  Layers,
  ArrowRight,
  Upload
} from "lucide-react";

export default function BulkMessagesPage() {
  // Form State
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [filterType, setFilterType] = useState("all_users");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [recentDays, setRecentDays] = useState(7);

  // Dynamic Lists & Config
  const [courses, setCourses] = useState([]);
  const [audienceEstimate, setAudienceEstimate] = useState(0);
  const [estimating, setEstimating] = useState(false);

  // History State
  const [campaigns, setCampaigns] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(10);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

  // Modal / Logs State
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLimit] = useState(25);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsStatusFilter, setLogsStatusFilter] = useState("all");

  // General Sending UI State
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict 4.5MB limit check (4.5 * 1024 * 1024 = 4718592 bytes)
    const MAX_SIZE = 4.5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error(`File size exceeds 4.5MB limit. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`);
      return;
    }

    const setUploading = type === "image" ? setUploadingImage : setUploadingDocument;
    const setUrl = type === "image" ? setImageUrl : setDocumentUrl;

    setUploading(true);
    const toastId = toast.loading(`Uploading ${type}...`);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const res = await fetch("/api/admin/bulk-messages/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        setUrl(json.url);
        toast.success(`${type === "image" ? "Image" : "Document"} uploaded successfully!`);
      } else {
        toast.error(json.error || `Upload failed`);
      }
    } catch (err) {
      console.error(err);
      toast.error(`Upload failed due to network error`);
    } finally {
      setUploading(false);
      toast.dismiss(toastId);
    }
  };

  // 1. Fetch Courses
  useEffect(() => {
    async function loadCourses() {
      try {
        const res = await fetch("/api/admin/courses");
        const json = await res.json();
        if (json.success) {
          setCourses(json.data || []);
        }
      } catch (err) {
        console.error("Error loading courses:", err);
      }
    }
    loadCourses();
  }, []);

  // 2. Fetch Campaign History
  const loadHistory = useCallback(async (pageNum = 1) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/admin/bulk-messages/history?page=${pageNum}&limit=${historyLimit}`);
      const json = await res.json();
      if (json.success) {
        setCampaigns(json.campaigns || []);
        setHistoryTotal(json.pagination?.total || 0);
        setHistoryTotalPages(json.pagination?.totalPages || 1);
        setHistoryPage(pageNum);
      } else {
        toast.error(json.error || "Failed to load history");
      }
    } catch (err) {
      console.error("Error loading history:", err);
      toast.error("Network error while loading campaign history");
    } finally {
      setLoadingHistory(false);
    }
  }, [historyLimit]);

  useEffect(() => {
    loadHistory(1);
  }, [loadHistory]);

  // 3. Estimate Audience
  const triggerEstimate = useCallback(async () => {
    if (filterType === "course_students" && !selectedCourseId) {
      setAudienceEstimate(0);
      return;
    }
    setEstimating(true);
    try {
      const filterDetails = {};
      if (filterType === "course_students") {
        filterDetails.course_id = selectedCourseId;
      } else if (filterType === "recently_joined") {
        filterDetails.days = Number(recentDays);
      }

      const res = await fetch("/api/admin/bulk-messages/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filterType, filterDetails }),
      });
      const json = await res.json();
      if (json.success) {
        setAudienceEstimate(json.count);
      }
    } catch (err) {
      console.error("Estimate error:", err);
    } finally {
      setEstimating(false);
    }
  }, [filterType, selectedCourseId, recentDays]);

  // Trigger estimate on filter update
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      triggerEstimate();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [filterType, selectedCourseId, recentDays, triggerEstimate]);

  // 4. Send Message Form Submit
  const handleSendCampaign = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!message.trim()) {
      toast.error("Message body is required");
      return;
    }
    if (filterType === "course_students" && !selectedCourseId) {
      toast.error("Please select a target course");
      return;
    }
    if (audienceEstimate === 0) {
      toast.error("Target audience has 0 recipients. Campaign cannot be sent.");
      return;
    }

    if (!confirm(`Are you sure you want to send this campaign to ${audienceEstimate} recipient(s)?`)) {
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Launching campaign...");

    try {
      const filterDetails = {};
      if (filterType === "course_students") {
        filterDetails.course_id = selectedCourseId;
        const selectedCourseName = courses.find(c => c.id === selectedCourseId)?.name;
        filterDetails.course_name = selectedCourseName || "Selected Course";
      } else if (filterType === "recently_joined") {
        filterDetails.days = Number(recentDays);
      }

      const res = await fetch("/api/admin/bulk-messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message,
          imageUrl: imageUrl.trim() || null,
          documentUrl: documentUrl.trim() || null,
          externalLink: externalLink.trim() || null,
          filterType,
          filterDetails
        }),
      });

      const json = await res.json();
      if (json.success) {
        if (json.direct) {
          toast.success(`Sent directly! Successfully delivered: ${json.sentCount}, Failed: ${json.failedCount}`);
        } else {
          toast.success(json.message || "Campaign placed in execution queue successfully.");
        }
        // Reset form
        setTitle("");
        setMessage("");
        setImageUrl("");
        setDocumentUrl("");
        setExternalLink("");
        // Reload history
        loadHistory(1);
      } else {
        toast.error(json.error || "Failed to trigger campaign");
      }
    } catch (err) {
      console.error("Send error:", err);
      toast.error("Network error sending campaign");
    } finally {
      setSubmitting(false);
      toast.dismiss(toastId);
    }
  };

  // 5. Load Log Details Modal
  const loadLogs = useCallback(async (campaignId, pageNum = 1, status = "all") => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/admin/bulk-messages/queue-status?campaignId=${campaignId}&page=${pageNum}&limit=${logsLimit}&status=${status}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.queue || []);
        setLogsTotal(json.pagination?.total || 0);
        setLogsTotalPages(json.pagination?.totalPages || 1);
        setLogsPage(pageNum);
      } else {
        toast.error(json.error || "Failed to load delivery logs");
      }
    } catch (err) {
      console.error("Error loading logs:", err);
      toast.error("Network error loading logs");
    } finally {
      setLoadingLogs(false);
    }
  }, [logsLimit]);

  const openLogsModal = (campaign) => {
    setSelectedCampaign(campaign);
    setLogsStatusFilter("all");
    setLogsPage(1);
    setShowLogsModal(true);
    loadLogs(campaign.id, 1, "all");
  };

  const handleLogsStatusFilterChange = (status) => {
    setLogsStatusFilter(status);
    setLogsPage(1);
    if (selectedCampaign) {
      loadLogs(selectedCampaign.id, 1, status);
    }
  };

  // 6. Resume Campaign
  const handleResumeCampaign = async (campaignId) => {
    const toastId = toast.loading("Resuming campaign queue...");
    try {
      const res = await fetch("/api/admin/bulk-messages/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || "Queue worker resumed successfully!");
        loadHistory(historyPage);
      } else {
        toast.error(json.error || "Failed to resume campaign");
      }
    } catch (err) {
      console.error("Error resuming campaign:", err);
      toast.error("Network error trying to resume campaign");
    } finally {
      toast.dismiss(toastId);
    }
  };

  // Progress Bar Helper
  const getProgressPercentage = (sent, failed, total) => {
    if (!total || total === 0) return 0;
    return Math.min(100, Math.round(((sent + failed) / total) * 100));
  };

  // Formatted Label Helper
  const getFilterTypeLabel = (type, details) => {
    switch (type) {
      case "all_users": return "All System Users";
      case "all_students": return "All Students";
      case "recently_joined": return `Recently Joined (${details?.days || 7} Days)`;
      case "course_students": return `Course: ${details?.course_name || "Course Enrolled"}`;
      case "custom": return "Custom Target Group";
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-2 sm:p-4">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1f2937',
            color: '#fff',
            borderRadius: '0.75rem',
            border: '1px solid #374151',
          },
        }}
      />

      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent">
              Bulk Messaging & Push Notifications
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Send rich push notifications and in-app messages to selected student segments using our background queue.
            </p>
          </div>
          <button
            onClick={() => loadHistory(historyPage)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm self-start md:self-auto"
          >
            <RefreshCw size={16} className={`${loadingHistory ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Send Message Form - 5 Columns */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg p-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Send className="text-orange-500 w-5 h-5" />
                Compose Campaign
              </h2>

              <form onSubmit={handleSendCampaign} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Message Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter notification title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition text-sm outline-none"
                  />
                </div>

                {/* Body Message */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Message Body *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Type details of your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition text-sm outline-none resize-none"
                  />
                </div>

                {/* Filters Row */}
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl space-y-3 border border-gray-100 dark:border-gray-700/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Users size={16} className="text-orange-500" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">Target Audience</span>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Select Segment</label>
                    <select
                      value={filterType}
                      onChange={(e) => {
                        setFilterType(e.target.value);
                        setSelectedCourseId("");
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition text-sm outline-none cursor-pointer"
                    >
                      <option value="all_users">All Registered Users</option>
                      <option value="all_students">All Students Only</option>
                      <option value="recently_joined">Recently Joined Students</option>
                      <option value="course_students">Course Enrolled Students</option>
                    </select>
                  </div>

                  {/* Course Dropdown */}
                  {filterType === "course_students" && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-1"
                    >
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Select Specific Course</label>
                      <select
                        required
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition text-sm outline-none cursor-pointer"
                      >
                        <option value="">-- Choose Course --</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>{course.name}</option>
                        ))}
                      </select>
                    </motion.div>
                  )}

                  {/* Recently Joined days */}
                  {filterType === "recently_joined" && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-1"
                    >
                      <label className="block text-xs text-gray-500 dark:text-gray-400">Joined within last (Days)</label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        required
                        value={recentDays}
                        onChange={(e) => setRecentDays(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition text-sm outline-none"
                      />
                    </motion.div>
                  )}

                  {/* Audience Estimator Summary */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700/50">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Audience Size:</span>
                    {estimating ? (
                      <span className="flex items-center gap-1 text-xs text-gray-500 animate-pulse">
                        <Loader2 size={12} className="animate-spin" /> Calculating...
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        audienceEstimate > 0 
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" 
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                      }`}>
                        {audienceEstimate} Recipient{audienceEstimate !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Rich media attachments */}
                <div className="space-y-4">
                  <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Attachments & Links (Optional)
                  </span>

                  {/* Image Upload / URL Input */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                      Image Attachment (Max 4.5MB)
                    </label>
                    <div className="flex gap-2 items-center">
                      <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center shrink-0 border border-orange-100 dark:border-orange-900/50">
                        {uploadingImage ? (
                          <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-orange-500" />
                        )}
                      </div>
                      <input
                        type="url"
                        placeholder="Paste Image URL or upload →"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition text-xs outline-none"
                      />
                      <label className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold cursor-pointer transition select-none shrink-0 border border-gray-200 dark:border-gray-600">
                        <Upload size={13} />
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, "image")}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                      </label>
                    </div>
                    {imageUrl && (
                      <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-1 ml-11">
                        <span className="truncate max-w-[220px]">Active URL: {imageUrl}</span>
                        <button
                          type="button"
                          onClick={() => setImageUrl("")}
                          className="text-red-500 hover:text-red-600 font-semibold cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Document Upload / URL Input */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                      Document Attachment (Max 4.5MB)
                    </label>
                    <div className="flex gap-2 items-center">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50">
                        {uploadingDocument ? (
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        ) : (
                          <FileText className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <input
                        type="url"
                        placeholder="Paste Document URL or upload →"
                        value={documentUrl}
                        onChange={(e) => setDocumentUrl(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition text-xs outline-none"
                      />
                      <label className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold cursor-pointer transition select-none shrink-0 border border-gray-200 dark:border-gray-600">
                        <Upload size={13} />
                        Upload
                        <input
                          type="file"
                          accept=".pdf,.docx,.doc,.xlsx,.xls,.txt"
                          onChange={(e) => handleFileUpload(e, "document")}
                          className="hidden"
                          disabled={uploadingDocument}
                        />
                      </label>
                    </div>
                    {documentUrl && (
                      <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-1 ml-11">
                        <span className="truncate max-w-[220px]">Active URL: {documentUrl}</span>
                        <button
                          type="button"
                          onClick={() => setDocumentUrl("")}
                          className="text-red-500 hover:text-red-600 font-semibold cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {/* External URL */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                      External Link
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-950/20 flex items-center justify-center shrink-0 border border-green-100 dark:border-green-900/50">
                        <ExternalLink className="w-4 h-4 text-green-500" />
                      </div>
                      <input
                        type="url"
                        placeholder="External Website URL..."
                        value={externalLink}
                        onChange={(e) => setExternalLink(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting || audienceEstimate === 0}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-bold transition shadow-md bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Launching...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Campaign {audienceEstimate > 10 ? "(Queue)" : "(Direct)"}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Campaign History List - 7 Columns */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg p-5 flex flex-col h-full min-h-[580px]">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <History className="text-orange-500 w-5 h-5" />
                Campaign History Logs
              </h2>

              {loadingHistory && campaigns.length === 0 ? (
                <div className="flex-1 flex flex-col justify-center items-center py-20">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">Loading delivery campaigns...</p>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="flex-1 flex flex-col justify-center items-center text-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-900/10">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400 mb-4">
                    <Send size={24} />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base">No campaigns found</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mt-1">
                    You have not sent any bulk messages or push notifications yet.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          <th className="py-3 px-4">Campaign Info</th>
                          <th className="py-3 px-4">Target Group</th>
                          <th className="py-3 px-4">Progress / Delivery</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map((campaign) => {
                          const percentage = getProgressPercentage(campaign.sent_count, campaign.failed_count, campaign.total_recipients);
                          const isDone = campaign.status === "completed";
                          const isProcessing = campaign.status === "processing";
                          const isFailed = campaign.status === "failed";
                          const isQueued = campaign.status === "pending";

                          return (
                            <tr key={campaign.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-all">
                              {/* Title & Date */}
                              <td className="py-4 px-4">
                                <div className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">{campaign.title}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  {new Date(campaign.created_at).toLocaleDateString()} at {new Date(campaign.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>

                              {/* Target Group */}
                              <td className="py-4 px-4 text-xs font-medium text-gray-600 dark:text-gray-300">
                                {getFilterTypeLabel(campaign.filter_type, campaign.filter_details)}
                              </td>

                              {/* Progress */}
                              <td className="py-4 px-4">
                                <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400 mb-1 font-semibold">
                                  <span>
                                    {campaign.sent_count + campaign.failed_count} / {campaign.total_recipients}
                                  </span>
                                  <span>{percentage}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden flex">
                                  <div
                                    className="bg-green-500 h-full transition-all duration-300"
                                    style={{ width: `${(campaign.sent_count / campaign.total_recipients) * 100}%` }}
                                  />
                                  <div
                                    className="bg-red-500 h-full transition-all duration-300"
                                    style={{ width: `${(campaign.failed_count / campaign.total_recipients) * 100}%` }}
                                  />
                                </div>
                                <div className="mt-1 flex items-center gap-1.5">
                                  {isDone && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-green-600 dark:text-green-400">
                                      <CheckCircle2 size={10} /> Completed
                                    </span>
                                  )}
                                  {isProcessing && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 animate-pulse">
                                      <Loader2 size={10} className="animate-spin" /> Processing
                                    </span>
                                  )}
                                  {isQueued && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-500">
                                      <Layers size={10} /> Queued
                                    </span>
                                  )}
                                  {isFailed && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-500">
                                      <XCircle size={10} /> Interrupted
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="py-4 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => openLogsModal(campaign)}
                                    className="p-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                    title="View Delivery Log"
                                  >
                                    <Eye size={15} />
                                  </button>

                                  {(isFailed || (campaign.sent_count + campaign.failed_count < campaign.total_recipients && !isProcessing)) && (
                                    <button
                                      onClick={() => handleResumeCampaign(campaign.id)}
                                      className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition"
                                      title="Resume Delivery"
                                    >
                                      <RefreshCw size={15} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  {historyTotalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-4 mt-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Showing page {historyPage} of {historyTotalPages} ({historyTotal} campaigns)
                      </p>
                      <div className="flex gap-2">
                        <button
                          disabled={historyPage === 1}
                          onClick={() => loadHistory(historyPage - 1)}
                          className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          disabled={historyPage === historyTotalPages}
                          onClick={() => loadHistory(historyPage + 1)}
                          className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Logs Modal - Slideover */}
      <AnimatePresence>
        {showLogsModal && selectedCampaign && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogsModal(false)}
              className="fixed inset-0 bg-black z-40"
            />

            {/* Slideover panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-50 overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/30">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Campaign Delivery Reports
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                    {selectedCampaign.title}
                  </p>
                </div>
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition cursor-pointer"
                >
                  <XCircle size={20} />
                </button>
              </div>

              {/* Filtering Sub-header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-2 items-center justify-between bg-white dark:bg-gray-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status:</span>
                  <select
                    value={logsStatusFilter}
                    onChange={(e) => handleLogsStatusFilterChange(e.target.value)}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-orange-500 outline-none cursor-pointer"
                  >
                    <option value="all">All Recipients</option>
                    <option value="delivered">Delivered Only</option>
                    <option value="failed">Failed Only</option>
                    <option value="pending">Pending Only</option>
                    <option value="processing">Processing Only</option>
                  </select>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Total matches: <span className="font-semibold text-gray-900 dark:text-white">{logsTotal}</span>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingLogs && logs.length === 0 ? (
                  <div className="flex justify-center items-center py-20">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-20 text-gray-500 dark:text-gray-400 text-sm">
                    No logs found matching selected filter.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log) => {
                      const userDetails = log.users || {};
                      const isDelivered = log.status === "delivered";
                      const isFailed = log.status === "failed";
                      const isProcessing = log.status === "processing";

                      return (
                        <div
                          key={log.id}
                          className="flex items-start justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/10 hover:border-gray-200 dark:hover:border-gray-600 transition"
                        >
                          <div className="space-y-1">
                            <div className="font-semibold text-sm text-gray-900 dark:text-white">
                              {userDetails.full_name || "Unknown User"}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {userDetails.email || "No email"}
                            </div>
                            {isFailed && log.error_message && (
                              <div className="flex items-center gap-1 text-[11px] text-red-500 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-md mt-1.5 border border-red-100 dark:border-red-900/30">
                                <Info size={10} />
                                <span className="line-clamp-1">{log.error_message}</span>
                              </div>
                            )}
                          </div>

                          <div className="text-right space-y-1">
                            <div>
                              {isDelivered && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                  <CheckCircle2 size={10} /> Delivered
                                </span>
                              )}
                              {isFailed && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                  <XCircle size={10} /> Failed
                                </span>
                              )}
                              {isProcessing && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 animate-pulse">
                                  <Loader2 size={10} className="animate-spin" /> Sending
                                </span>
                              )}
                              {log.status === "pending" && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                  <Layers size={10} /> Queued
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-gray-500">
                              {log.sent_at 
                                ? new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                : "Waiting..."
                              }
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Pagination Footer */}
              {logsTotalPages > 1 && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Page {logsPage} of {logsTotalPages} ({logsTotal} logs)
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={logsPage === 1}
                      onClick={() => loadLogs(selectedCampaign.id, logsPage - 1, logsStatusFilter)}
                      className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      disabled={logsPage === logsTotalPages}
                      onClick={() => loadLogs(selectedCampaign.id, logsPage + 1, logsStatusFilter)}
                      className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
