"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  Edit2,
  Trash2,
  Globe,
  GraduationCap,
  Upload,
  FileText,
  X,
  Save,
  MapPin,
  Type,
  Users,
  BookOpen,
  Search,
  ChevronRight,
  ExternalLink,
  Filter,
  Download,
  Eye,
  Loader2,
  CheckSquare,
  Square,
  Table,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';

// Modal Component
const Modal = ({ isOpen, onClose, children, title, size = "md" }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    full: "max-w-7xl"
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-h-[100vh] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`relative w-full ${sizeClasses[size]} mx-auto max-h-[90vh] flex flex-col`}
          >
            <div className="relative rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto">
                {children}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default function CountriesPage() {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({ name: "", code: "", courses_csv: "" });
  const [collegeForm, setCollegeForm] = useState({ country_id: "", name: "", city: "", type: "" });
  const [csvText, setCsvText] = useState("");
  const [csvFile, setCsvFile] = useState(null);
  const [editingCountryId, setEditingCountryId] = useState(null);
  const [editingCollege, setEditingCollege] = useState(null);

  // Modal states
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isCsvPreviewOpen, setIsCsvPreviewOpen] = useState(false);
  const [csvPreviewData, setCsvPreviewData] = useState([]);
  const [csvPreviewText, setCsvPreviewText] = useState("");
  const [isCollegesModalOpen, setIsCollegesModalOpen] = useState(false);
  const [isCollegeModalOpen, setIsCollegeModalOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedCollege, setSelectedCollege] = useState(null);

  // Multi-select & processing states
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingCountry, setSavingCountry] = useState(false);
  const [savingCollege, setSavingCollege] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingCollegeId, setDeletingCollegeId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/countries", { method: "GET" });
      const json = await res.json();
      if (json?.success) setCountries(json.data || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Selection helpers
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCountries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCountries.map((c) => c.id)));
    }
  };

  // Bulk delete
  const onBulkDelete = async () => {
    const count = selectedIds.size;
    if (!count) return;
    if (!window.confirm(`Are you sure you want to delete ${count} selected country(ies) and all their associated colleges?`)) return;
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/admin/countries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk_delete_countries", ids: Array.from(selectedIds) }),
      });
      const json = await res.json();
      if (json?.success) {
        toast.success(`✓ ${count} country(ies) deleted successfully`);
        setSelectedIds(new Set());
        load();
      } else if (json?.error) {
        toast.error(json.error);
      }
    } catch (e) {
      toast.error("Failed to delete selected countries");
    } finally {
      setBulkDeleting(false);
    }
  };

  // Country Operations
  const onCreateCountry = async (e) => {
    e.preventDefault();
    setSavingCountry(true);
    try {
      const action = editingCountryId ? "update_country" : "create_country";
      const payload = editingCountryId
        ? { action, id: editingCountryId, ...form }
        : { action, ...form };

      const res = await fetch("/api/admin/countries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json?.success) {
        setForm({ name: "", code: "", courses_csv: "" });
        setEditingCountryId(null);
        setIsCountryModalOpen(false);
        load();
        toast.success(editingCountryId ? "✓ Country updated successfully" : "✓ Country created successfully");
      } else {
        if (json?.error) toast.error(json.error);
      }
    } catch (e) {
      toast.error("Something went wrong while saving the country.");
    } finally {
      setSavingCountry(false);
    }
  };

  const startEditCountry = (country) => {
    setEditingCountryId(country.id);
    setForm({
      name: country.name || "",
      code: country.code || "",
      courses_csv: country.courses_csv || "",
    });
    setIsCountryModalOpen(true);
  };

  const openCountryModal = () => {
    setEditingCountryId(null);
    setForm({ name: "", code: "", courses_csv: "" });
    setIsCountryModalOpen(true);
  };

  // College Operations
  const onCreateCollege = async (e) => {
    e.preventDefault();
    setSavingCollege(true);
    try {
      const action = editingCollege ? "update_college" : "create_college";
      const payload = editingCollege
        ? { action, id: editingCollege.id, ...collegeForm }
        : { action, ...collegeForm };

      const res = await fetch("/api/admin/countries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json?.success) {
        setCollegeForm({ country_id: "", name: "", city: "", type: "" });
        setEditingCollege(null);
        setIsCollegeModalOpen(false);
        load();
        toast.success(editingCollege ? "✓ College updated successfully" : "✓ College saved successfully");
      } else if (json?.error) {
        toast.error(json.error);
      }
    } catch (e) {
      toast.error("Failed to save college");
    } finally {
      setSavingCollege(false);
    }
  };

  const openCollegeModal = (countryId = "") => {
    setEditingCollege(null);
    setCollegeForm({
      country_id: countryId || selectedCountry?.id || "",
      name: "",
      city: "",
      type: ""
    });
    setIsCollegeModalOpen(true);
  };

  const startEditCollege = (college) => {
    setEditingCollege(college);
    setCollegeForm({
      country_id: selectedCountry?.id || "",
      name: college.name || "",
      city: college.city || "",
      type: college.type || "",
    });
    setIsCollegeModalOpen(true);
  };

  // Delete Operations
  const onDeleteCountry = async (id) => {
    if (!window.confirm("Are you sure you want to delete this country and all its associated colleges?")) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/admin/countries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_country", id }),
      });
      const json = await res.json();
      if (json?.success) {
        toast.success("✓ Country deleted successfully");
        setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
        load();
      } else if (json?.error) {
        toast.error(json.error);
      }
    } catch (e) {
      toast.error("Failed to delete country");
    } finally {
      setDeletingId(null);
    }
  };

  const onDeleteCollege = async (id) => {
    if (!window.confirm("Are you sure you want to delete this college/university?")) return;
    setDeletingCollegeId(id);
    try {
      const res = await fetch("/api/admin/countries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_college", id }),
      });
      const json = await res.json();
      if (json?.success) {
        toast.success("✓ College deleted successfully");
        load();
      } else if (json?.error) {
        toast.error(json.error);
      }
    } catch (e) {
      toast.error("Failed to delete college");
    } finally {
      setDeletingCollegeId(null);
    }
  };

  // CSV Parsing helper (client-side)
  const parseCSVLine = (line) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Handle CSV file selection — instantly parse & show preview
  const handleCsvFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    try {
      const text = await file.text();
      setCsvPreviewText(text);
      const lines = text.split("\n").map(l => l.replace(/\r$/, ""));
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = parseCSVLine(line);
        if (cols.length >= 6) {
          rows.push({
            country: cols[0],
            code: cols[1],
            courses: cols[2],
            college: cols[3],
            city: cols[4],
            type: cols[5],
          });
        }
      }
      setCsvPreviewData(rows);
      setIsCsvModalOpen(false);
      setIsCsvPreviewOpen(true);
    } catch (err) {
      toast.error("Failed to read file");
    }
  };

  // Handle paste CSV text preview
  const handleCsvTextPreview = () => {
    if (!csvText || !csvText.trim()) {
      toast.error("Please paste CSV data first");
      return;
    }
    setCsvPreviewText(csvText);
    const lines = csvText.split("\n").map(l => l.replace(/\r$/, ""));
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = parseCSVLine(line);
      if (cols.length >= 6) {
        rows.push({
          country: cols[0],
          code: cols[1],
          courses: cols[2],
          college: cols[3],
          city: cols[4],
          type: cols[5],
        });
      }
    }
    if (rows.length === 0) {
      toast.error("No valid rows found in CSV");
      return;
    }
    setCsvPreviewData(rows);
    setIsCsvModalOpen(false);
    setIsCsvPreviewOpen(true);
  };

  // CSV Upload — sends the confirmed preview text
  const onUploadCsv = async () => {
    setUploading(true);
    try {
      const payloadText = csvPreviewText;
      if (!payloadText || !payloadText.trim()) {
        toast.error("No CSV data to upload");
        setUploading(false);
        return;
      }

      const res = await fetch("/api/admin/countries", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: payloadText,
      });
      const json = await res.json();
      if (json?.success) {
        setCsvText("");
        setCsvFile(null);
        setCsvPreviewData([]);
        setCsvPreviewText("");
        setIsCsvPreviewOpen(false);
        setIsCsvModalOpen(false);
        load();
        toast.success("✓ CSV uploaded successfully");
      } else {
        toast.error(json?.error || "Failed to upload CSV");
      }
    } catch (e) {
      toast.error("Failed to upload CSV");
    } finally {
      setUploading(false);
    }
  };

  const clearCsvFile = () => {
    setCsvFile(null);
  };

  // Open colleges modal
  const openCollegesModal = (country) => {
    setSelectedCountry(country);
    setIsCollegesModalOpen(true);
  };

  // Filter countries based on search
  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (country.code && country.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (country.courses_csv && country.courses_csv.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate stats
  const totalColleges = countries.reduce((acc, c) => acc + (c.colleges?.length || 0), 0);
  const totalCourses = countries.reduce((acc, c) => acc + (c.courses_csv?.split(",").length || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                    Countries Management
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Manage countries, courses, and educational institutions
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setIsCsvModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium hover:from-amber-600 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all shadow-md hover:shadow-lg"
              >
                <Upload className="w-4 h-4" />
                Bulk Upload
              </button>
              <button
                onClick={openCountryModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium hover:from-orange-600 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all shadow-md hover:shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Add Country
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Countries</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {countries.length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Globe className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Institutions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {totalColleges}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Courses</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {totalCourses}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg. per Country</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {countries.length > 0 ? Math.round(totalColleges / countries.length) : 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">institutions</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search countries by name, code, or courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Select All / Bulk Actions Bar */}
        {filteredCountries.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {selectedIds.size === filteredCountries.length && filteredCountries.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-orange-600" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {selectedIds.size === filteredCountries.length && filteredCountries.length > 0 ? "Deselect All" : "Select All"}
            </button>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={onBulkDelete}
                  disabled={bulkDeleting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium transition-colors disabled:cursor-not-allowed"
                >
                  {bulkDeleting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>
                  ) : (
                    <><Trash2 className="w-4 h-4" /> Delete Selected</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Countries Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading countries...</p>
          </div>
        ) : filteredCountries.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Globe className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No countries found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery ? "Try a different search term" : "Get started by adding your first country"}
            </p>
            <button
              onClick={openCountryModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium hover:from-orange-600 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Country
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredCountries.map((country) => (
              <motion.div
                key={country.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group"
              >
                <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${selectedIds.has(country.id) ? 'border-orange-400 dark:border-orange-500 ring-2 ring-orange-200 dark:ring-orange-800' : 'border-gray-100 dark:border-gray-700'}`}>
                  {/* Flag/Header Area */}
                  <div className="relative h-32 bg-gradient-to-r from-orange-500 to-amber-500">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Globe className="w-16 h-16 text-white/20" />
                    </div>
                    {/* Checkbox */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(country.id); }}
                      className="absolute top-4 left-4 p-1 rounded-md bg-white/20 backdrop-blur-sm hover:bg-white/40 transition-colors"
                      title={selectedIds.has(country.id) ? "Deselect" : "Select"}
                    >
                      {selectedIds.has(country.id) ? (
                        <CheckSquare className="w-5 h-5 text-white" />
                      ) : (
                        <Square className="w-5 h-5 text-white/70" />
                      )}
                    </button>
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium">
                        {country.code || "N/A"}
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-xl font-bold text-white truncate">
                        {country.name}
                      </h3>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    {/* Courses Preview */}
                    {country.courses_csv && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Courses</span>
                          <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                            {country.courses_csv.split(",").length} total
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {country.courses_csv.split(",").slice(0, 2).map((course, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-xs font-medium"
                            >
                              {course.trim()}
                            </span>
                          ))}
                          {country.courses_csv.split(",").length > 2 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium">
                              +{country.courses_csv.split(",").length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {country.colleges?.length || 0}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Institutions</div>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {country.courses_csv?.split(",").length || 0}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Courses</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openCollegesModal(country)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 text-white text-sm font-medium hover:from-amber-700 hover:to-amber-600 transition-all"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                      <button
                        onClick={() => startEditCountry(country)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Edit country"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => onDeleteCountry(country.id)}
                        disabled={deletingId === country.id}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete country"
                      >
                        {deletingId === country.id ? (
                          <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                        )}
                      </button>
                    </div>

                    {/* Add College Button */}
                    <button
                      onClick={() => {
                        setSelectedCountry(country);
                        openCollegeModal(country.id);
                      }}
                      className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      Add Institution
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Add Country Button (Mobile) */}
        <div className="fixed bottom-6 right-6 md:hidden">
          <button
            onClick={openCountryModal}
            className="p-4 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-2xl hover:shadow-3xl transition-all"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Add Country Modal */}
        <Modal
          isOpen={isCountryModalOpen}
          onClose={() => setIsCountryModalOpen(false)}
          title={editingCountryId ? "Edit Country" : "Add New Country"}
          size="md"
        >
          <form onSubmit={onCreateCountry} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country Name <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="e.g., United States, United Kingdom"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country Code
              </label>
              <input
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                placeholder="e.g., US, UK, CA"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Optional 2-letter country code
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Available Courses
              </label>
              <textarea
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all min-h-[120px]"
                placeholder="Enter courses separated by commas (Computer Science, Business, Engineering, Medicine)"
                value={form.courses_csv}
                onChange={(e) => setForm((f) => ({ ...f, courses_csv: e.target.value }))}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Separate multiple courses with commas
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsCountryModalOpen(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingCountry}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium hover:from-orange-600 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingCountry ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4 text-amber-100" /> {editingCountryId ? "Update Country" : "Save Country"}</>
                )}
              </button>
            </div>
          </form>
        </Modal>

        {/* CSV Upload Modal */}
        <Modal
          isOpen={isCsvModalOpen}
          onClose={() => setIsCsvModalOpen(false)}
          title="Bulk Upload via CSV"
          size="lg"
        >
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/10 dark:to-green-900/10 rounded-xl p-5">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">CSV Format Guide</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Your CSV should include these columns in order. The first row should contain headers.
              </p>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">country</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">code</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">courses</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">college</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">city</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">type</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400">United States</td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400">US</td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400">Computer Science,Business</td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400">Harvard University</td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400">Cambridge</td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400">university</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() => {
                  const csvContent = [
                    "country,code,courses,college,city,type",
                    "United States,US,Computer Science,Harvard University,Cambridge,university",
                    "United States,US,Business,MIT,Cambridge,university",
                    "United Kingdom,UK,Medicine,Oxford University,Oxford,university",
                    "Canada,CA,Engineering,University of Toronto,Toronto,university",
                    "Australia,AU,Data Science,University of Melbourne,Melbourne,university",
                  ].join("\n");
                  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "countries_template.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download CSV Template
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload CSV File
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleCsvFileSelect}
                      className="w-full text-sm text-gray-600 dark:text-gray-300 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 dark:file:bg-emerald-900 dark:file:text-emerald-300 dark:hover:file:bg-emerald-800 transition-colors cursor-pointer"
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Selecting a file will instantly show a preview of parsed data
                </p>
              </div>

              <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span className="text-xs text-gray-400 font-medium">OR</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Paste CSV data directly
                  </label>
                  <span className="text-xs text-gray-500">
                    {csvText.split('\n').length} lines
                  </span>
                </div>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all min-h-[160px] font-mono text-sm"
                  placeholder="Paste your CSV data here..."
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCsvTextPreview}
                  disabled={!csvText.trim()}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-medium hover:from-emerald-600 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Eye className="w-4 h-4" /> Preview & Verify
                </button>
              </div>
            </div>
          </div>
        </Modal>

        {/* CSV Preview Modal */}
        <Modal
          isOpen={isCsvPreviewOpen}
          onClose={() => setIsCsvPreviewOpen(false)}
          title={`CSV Preview — ${csvPreviewData.length} rows parsed`}
          size="xl"
        >
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{csvPreviewData.length}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Total Rows</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {[...new Set(csvPreviewData.map(r => r.country))].length}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Countries</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {[...new Set(csvPreviewData.map(r => r.college))].length}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">Colleges</p>
              </div>
            </div>

            {/* Preview Table */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="max-h-[400px] overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                    <tr>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700 dark:text-gray-300 text-xs">#</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700 dark:text-gray-300 text-xs">Country</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700 dark:text-gray-300 text-xs">Code</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700 dark:text-gray-300 text-xs">Courses</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700 dark:text-gray-300 text-xs">College</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700 dark:text-gray-300 text-xs">City</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700 dark:text-gray-300 text-xs">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {csvPreviewData.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-2 px-3 text-gray-400 text-xs">{i + 1}</td>
                        <td className="py-2 px-3 text-gray-900 dark:text-white font-medium whitespace-nowrap">{row.country}</td>
                        <td className="py-2 px-3">
                          {row.code ? (
                            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-mono">{row.code}</span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 max-w-[200px]">
                          <div className="flex flex-wrap gap-1">
                            {row.courses.split(/[|,]/).filter(Boolean).slice(0, 3).map((c, j) => (
                              <span key={j} className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs">{c.trim()}</span>
                            ))}
                            {row.courses.split(/[|,]/).filter(Boolean).length > 3 && (
                              <span className="text-xs text-gray-400">+{row.courses.split(/[|,]/).filter(Boolean).length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-gray-700 dark:text-gray-300 max-w-[250px] truncate">{row.college}</td>
                        <td className="py-2 px-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{row.city}</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">{row.type}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsCsvPreviewOpen(false);
                  setIsCsvModalOpen(true);
                }}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronRight className="w-4 h-4 rotate-180" /> Back
              </button>
              <button
                type="button"
                onClick={onUploadCsv}
                disabled={uploading || csvPreviewData.length === 0}
                className="flex-[2] px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-medium hover:from-emerald-600 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Uploading {csvPreviewData.length} rows...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Upload {csvPreviewData.length} Rows</>
                )}
              </button>
            </div>
          </div>
        </Modal>

        {/* Colleges Modal */}
        <Modal
          isOpen={isCollegesModalOpen}
          onClose={() => setIsCollegesModalOpen(false)}
          title={`${selectedCountry?.name} - Institutions`}
          size="xl"
        >
          {selectedCountry && (
            <div className="space-y-6">
              {/* Country Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedCountry.name}
                      {selectedCountry.code && (
                        <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                          {selectedCountry.code}
                        </span>
                      )}
                    </h3>
                    {selectedCountry.courses_csv && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Available Courses:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedCountry.courses_csv.split(",").map((course, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-medium"
                            >
                              {course.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => openCollegeModal(selectedCountry.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 text-white text-sm font-medium hover:from-amber-600 hover:to-amber-600 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add Institution
                  </button>
                </div>
              </div>

              {/* Colleges List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Institutions ({selectedCountry.colleges?.length || 0})
                  </h4>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Total: {selectedCountry.colleges?.length || 0}
                  </span>
                </div>

                {selectedCountry.colleges?.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                      <GraduationCap className="w-8 h-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No Institutions Found
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Add institutions to {selectedCountry.name} to get started
                    </p>
                    <button
                      onClick={() => openCollegeModal(selectedCountry.id)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium hover:from-blue-600 hover:to-cyan-600 transition-all"
                    >
                      <Plus className="w-4 h-4 text-amber-100" />
                      Add First Institution
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedCountry.colleges?.map((college) => (
                      <div
                        key={college.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-900 dark:text-white">
                              {college.name}
                            </h5>
                            <div className="flex items-center gap-3 mt-1">
                              {college.city && (
                                <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {college.city}
                                </span>
                              )}
                              {college.type && (
                                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                  {college.type}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEditCollege(college)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Edit institution"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                          <button
                            onClick={() => onDeleteCollege(college.id)}
                            disabled={deletingCollegeId === college.id}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete institution"
                          >
                            {deletingCollegeId === college.id ? (
                              <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* College Modal */}
        <Modal
          isOpen={isCollegeModalOpen}
          onClose={() => setIsCollegeModalOpen(false)}
          title={editingCollege ? "Edit Institution" : "Add New Institution"}
          size="md"
        >
          <form onSubmit={onCreateCollege} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
                value={collegeForm.country_id}
                onChange={(e) => setCollegeForm((f) => ({ ...f, country_id: e.target.value }))}
                required
              >
                <option value="" className="text-gray-500">Select a country</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id} className="text-gray-900 dark:text-white">
                    {c.name} {c.code ? `(${c.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Institution Name <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g., Harvard University, Stanford University"
                value={collegeForm.name}
                onChange={(e) => setCollegeForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MapPin className="inline w-3 h-3 mr-1" />
                  City
                </label>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g., Cambridge, Boston"
                  value={collegeForm.city}
                  onChange={(e) => setCollegeForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Type className="inline w-3 h-3 mr-1" />
                  Type
                </label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={collegeForm.type}
                  onChange={(e) => setCollegeForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="" className="text-gray-500">Select type</option>
                  <option value="college" className="text-gray-900 dark:text-white">College</option>
                  <option value="university" className="text-gray-900 dark:text-white">University</option>
                  <option value="institute" className="text-gray-900 dark:text-white">Institute</option>
                  <option value="polytechnic" className="text-gray-900 dark:text-white">Polytechnic</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsCollegeModalOpen(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingCollege}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium hover:from-amber-600 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingCollege ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4 text-amber-100" /> {editingCollege ? "Update Institution" : "Save Institution"}</>
                )}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}