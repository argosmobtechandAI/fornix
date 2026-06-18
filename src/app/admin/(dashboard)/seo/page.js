"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Trash2,
  Edit,
  Save,
  Loader2,
  Globe,
  Settings,
  Info,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  BookOpen
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// Static standard pages to suggest
const DEFAULT_SUGGESTIONS = [
  { path: "/", name: "Homepage" },
  { path: "/about", name: "About Us" },
  { path: "/blogs", name: "Blogs List" },
  { path: "/contact", name: "Contact Us" },
  { path: "/terms-and-conditions", name: "Terms & Conditions" },
  { path: "/privacy-policy", name: "Privacy Policy" },
  { path: "/refund-policy", name: "Refund Policy" },
  { path: "/courses/:courseSlug", name: "Generic Course Template" }
];

export default function SEOPage() {
  const [seoRecords, setSeoRecords] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form fields
  const [pagePath, setPagePath] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [robots, setRobots] = useState("index, follow");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const seoRes = await fetch("/api/admin/seo");
      const seoJson = await seoRes.json();
      if (seoJson.success) {
        setSeoRecords(seoJson.data || []);
      } else {
        toast.error("Failed to load SEO records: " + seoJson.error);
      }

      const coursesRes = await fetch("/api/admin/courses");
      const coursesJson = await coursesRes.json();
      if (coursesJson.success) {
        setCourses(coursesJson.data || []);
      }
    } catch (err) {
      console.error("SEO Manager load error:", err);
      toast.error("An error occurred loading data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const KNOWN_COURSE_PATHS = {
    'cc613b33-3986-4d67-b33a-009b57a72dc8': '/courses/amc',
    'f6dd0d25-825f-4c9c-93fe-58cae47378f3': '/courses/FMGE',
    '1420d4d3-6d23-46f9-9182-726c808f5be4': '/courses/neet-pg',
    '8dc42a27-cf5f-4b08-83ff-809e4f3f6fba': '/courses/plab',
    'e5200234-5853-41c3-88c9-04e4c9213197': '/courses/neet-ug'
  };

  // Compute dynamic suggestions that are not already managed in seoRecords
  const suggestions = [
    ...DEFAULT_SUGGESTIONS,
    ...courses.map(c => {
      const path = KNOWN_COURSE_PATHS[c.id] || `/courses/${c.id}`;
      return {
        path,
        name: `Course: ${c.name}`
      };
    })
  ].filter(s => !seoRecords.some(r => r.page_path === s.path));

  // Handlers
  const handleOpenAddModal = (pathPreset = "") => {
    setIsEditing(false);
    setPagePath(pathPreset);
    setTitle("");
    setDescription("");
    setKeywords("");
    setOgTitle("");
    setOgDescription("");
    setOgImage("");
    setRobots("index, follow");
    setModalOpen(true);
  };

  const handleOpenEditModal = (record) => {
    setIsEditing(true);
    setPagePath(record.page_path);
    setTitle(record.title || "");
    setDescription(record.description || "");
    setKeywords(record.keywords || "");
    setOgTitle(record.og_title || "");
    setOgDescription(record.og_description || "");
    setOgImage(record.og_image || "");
    setRobots(record.robots || "index, follow");
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!pagePath || !title) {
      toast.error("Page Path and Meta Title are required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/seo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_path: pagePath,
          title,
          description,
          keywords,
          og_title: ogTitle,
          og_description: ogDescription,
          og_image: ogImage,
          robots
        })
      });

      const json = await res.json();
      if (json.success) {
        toast.success(isEditing ? "SEO Metadata updated!" : "SEO Metadata created!");
        setModalOpen(false);
        loadData();
      } else {
        toast.error(json.error || "Save failed");
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error("An error occurred during save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (recordPath) => {
    if (!confirm(`Are you sure you want to delete SEO settings for path "${recordPath}"?`)) return;

    try {
      const res = await fetch(`/api/admin/seo?page_path=${encodeURIComponent(recordPath)}`, {
        method: "DELETE"
      });
      const json = await res.json();
      if (json.success) {
        toast.success("SEO Metadata deleted");
        loadData();
      } else {
        toast.error(json.error || "Delete failed");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("An error occurred during delete");
    }
  };

  // Filter records based on search query
  const filteredRecords = seoRecords.filter(r => 
    r.page_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Statistics indicators
  const totalRoutes = seoRecords.length;
  const missingDescription = seoRecords.filter(r => !r.description || r.description.trim() === "").length;
  const missingOgImage = seoRecords.filter(r => !r.og_image || r.og_image.trim() === "").length;

  return (
    <div className="min-h-screen">
      <Toaster position="top-right" />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
            <Globe className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">SEO Manager</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Manage dynamic meta tags, crawler directives, and Open Graph tags</p>
          </div>
        </div>

        <button
          onClick={() => handleOpenAddModal()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-all shadow-md self-start md:self-auto"
        >
          <Plus size={16} />
          Add SEO Configuration
        </button>
      </div>

      {/* Analytics Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Total Managed Pages</span>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalRoutes}</h3>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
            <Globe size={24} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Missing Description</span>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{missingDescription}</h3>
          </div>
          <div className={`p-3 rounded-xl ${missingDescription > 0 ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"}`}>
            {missingDescription > 0 ? <AlertCircle size={24} /> : <CheckCircle size={24} />}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Missing Social Image</span>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{missingOgImage}</h3>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl">
            <Info size={24} />
          </div>
        </div>
      </div>

      {/* Suggested Additions */}
      {suggestions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs mb-8">
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <RefreshCw size={14} className="animate-spin-slow text-orange-500" />
            SEO Setup Suggestions
          </h3>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 10).map((preset) => (
              <button
                key={preset.path}
                onClick={() => handleOpenAddModal(preset.path)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-gray-600 dark:text-gray-300 hover:text-orange-700 dark:hover:text-orange-400 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-600 hover:border-orange-200 transition"
              >
                <Plus size={12} />
                <span>{preset.name}</span>
                <span className="text-[10px] opacity-60">({preset.path})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Table Filters */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50/50 dark:bg-gray-800/20">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-3.5 w-4.5 h-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by route path, page title, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition"
            />
          </div>
          <button 
            onClick={loadData}
            className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm font-semibold hover:bg-gray-50 transition w-full sm:w-auto"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-orange-500" : ""} />
            Refresh
          </button>
        </div>

        {/* Loading / Empty / Table Data */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={36} className="animate-spin text-orange-600" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl">
            <Globe size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">No SEO configurations found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">
              {searchQuery ? "No matches found for your search term." : "Click Add SEO Configuration or use one of the presets above to start optimizing your site."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-left bg-gray-50/50 dark:bg-gray-800/10">
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Page Route</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Meta Title</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Robots</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm block max-w-[200px] truncate">
                          {record.page_path}
                        </span>
                        {/* External link only if it's not a generic wildcard path */}
                        {!record.page_path.includes(":") && (
                          <a
                            href={`https://fornixacademy.com${record.page_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-orange-500"
                            title="Open live website link"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-800 dark:text-gray-200 text-sm font-medium line-clamp-1 max-w-[250px]">
                        {record.title}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-500 dark:text-gray-400 text-sm line-clamp-1 max-w-[300px]">
                        {record.description || <em className="text-gray-300 dark:text-gray-600">None defined</em>}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                        record.robots && record.robots.includes("noindex")
                          ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400"
                          : "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400"
                      }`}>
                        {record.robots || "index, follow"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(record)}
                          className="p-1.5 text-gray-500 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                          title="Edit meta tags"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(record.page_path)}
                          className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                          title="Delete record"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit/Add Modal Overlay */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 dark:border-gray-800">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings className="text-orange-500" size={20} />
                {isEditing ? "Modify SEO Metadata" : "Configure New Page SEO"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Page Route */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  Page Route Path <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. /about or /courses/neet-ug"
                  value={pagePath}
                  disabled={isEditing}
                  onChange={(e) => setPagePath(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition text-sm disabled:bg-gray-50 dark:disabled:bg-gray-800/50 dark:disabled:text-gray-500"
                  required
                />
                <p className="text-[10px] text-gray-400">
                  Must start with a slash `/`. Set as `/courses/:courseSlug` to target dynamic course pages globally.
                </p>
              </div>

              {/* Meta Title */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Meta Title <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-[10px] font-bold ${
                    title.length > 60 ? "text-red-500" : title.length >= 45 ? "text-green-500" : "text-gray-400"
                  }`}>
                    {title.length} / 60 characters (ideal: 50-60)
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Recommended: Title | Brand Name"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition text-sm"
                  maxLength={100}
                  required
                />
              </div>

              {/* Meta Description */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Meta Description
                  </label>
                  <span className={`text-[10px] font-bold ${
                    description.length > 160 ? "text-red-500" : description.length >= 120 ? "text-green-500" : "text-gray-400"
                  }`}>
                    {description.length} / 160 characters (ideal: 120-160)
                  </span>
                </div>
                <textarea
                  placeholder="Write a concise overview of the page content for search results..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition text-sm resize-y"
                  maxLength={300}
                />
              </div>

              {/* Keywords & Robots */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Meta Keywords
                  </label>
                  <input
                    type="text"
                    placeholder="medical exam, prep, coching, amc"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition text-sm"
                  />
                  <p className="text-[9px] text-gray-400">Comma-separated list of keywords</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Robots Directive
                  </label>
                  <select
                    value={robots}
                    onChange={(e) => setRobots(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition text-sm"
                  >
                    <option value="index, follow">index, follow (Default - Allow indexing & links)</option>
                    <option value="noindex, follow">noindex, follow (Hide page, follow links)</option>
                    <option value="index, nofollow">index, nofollow (Show page, ignore links)</option>
                    <option value="noindex, nofollow">noindex, nofollow (Strictly block search engines)</option>
                  </select>
                </div>
              </div>

              {/* Social Media Optimization (Open Graph) */}
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1">
                  Social Sharing Details (Open Graph / OG)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      OG Share Title
                    </label>
                    <input
                      type="text"
                      placeholder="Title for Facebook/Twitter share card"
                      value={ogTitle}
                      onChange={(e) => setOgTitle(e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      OG Share Description
                    </label>
                    <input
                      type="text"
                      placeholder="Snippet for Facebook/Twitter share card"
                      value={ogDescription}
                      onChange={(e) => setOgDescription(e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    OG Share Image URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://fornixacademy.com/assets/share-image.jpg"
                    value={ogImage}
                    onChange={(e) => setOgImage(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition text-sm"
                  />
                  <p className="text-[9px] text-gray-400">URL to image displayed on link shares (optimal dimension: 1200x630px)</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 sticky bottom-0 bg-white dark:bg-gray-900 z-10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md shadow-orange-200 dark:shadow-none text-sm"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? "Saving Changes..." : "Save Configuration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
