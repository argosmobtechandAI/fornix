"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";
import toast, { Toaster } from "react-hot-toast";
import { useSearchParams } from "next/navigation";

import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Download,
  Eye,
  Database,
  ChevronDown,
  ChevronUp,
  BookOpen,
  CheckSquare,
  XCircle,
} from "lucide-react";

export default function BulkUploadPage() {
  // -----------------------------
  // STATE
  // -----------------------------
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");

  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [headers, setHeaders] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Get query parameters
  const searchParams = useSearchParams();
  const courseIdFromQuery = searchParams.get('course_id');

  // -----------------------------
  // LOAD COURSES
  // -----------------------------
  useEffect(() => {
    async function loadCourses() {
      try {
        const res = await fetch("/api/admin/courses");
        const json = await res.json();
        if (json.success) {
          setCourses(json.data);

          // Auto-select course if provided in query params
          if (courseIdFromQuery && json.data.length > 0) {
            const courseExists = json.data.find(c => c.id === courseIdFromQuery);
            if (courseExists) {
              setSelectedCourse(courseIdFromQuery);
              toast.success(`Course "${courseExists.name}" auto-selected`);
            } else {
              toast.error("Course not found");
            }
          }
        }
      } catch (err) {
        toast.error("Failed to load courses");
      }
    }
    loadCourses();
  }, [courseIdFromQuery]);

  // Normalize CSV keys
  const normalizeKey = (key) =>
    key
      ?.toLowerCase()
      .trim()
      .replaceAll(" ", "_")
      .replaceAll(".", "")
      .replaceAll("-", "_")
      .replaceAll("__", "_");

  // -----------------------------
  // DRAG HANDLERS
  // -----------------------------
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  // Extract correct option from various formats like "C. October 16th", "C", "c", "Option C", etc.
  const extractCorrectOption = (value) => {
    if (!value) return "";

    const str = value.toString().trim();

    // Handle formats like "C. October 16th", "A) Some text", "B - Answer"
    const match = str.match(/^([a-hA-H])[\.\-\s\)]/);
    if (match) {
      return match[1].toLowerCase();
    }

    // Handle simple letters "A", "b", "C", etc.
    if (/^[a-hA-H]$/.test(str)) {
      return str.toLowerCase();
    }

    // Handle "Option A", "option b", etc.
    const optionMatch = str.match(/option\s+([a-hA-H])/i);
    if (optionMatch) {
      return optionMatch[1].toLowerCase();
    }

    // If no pattern matches, try to extract any single letter a-h
    const letterMatch = str.match(/[a-hA-H]/);
    if (letterMatch) {
      return letterMatch[0].toLowerCase();
    }

    return "";
  };

  // Detect available options from CSV headers and data
  const detectAvailableOptions = (normalizedRow, allHeaders) => {
    const optionKeys = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const availableOptions = {};

    // Check for option columns in headers
    optionKeys.forEach(key => {
      const optionKey = `option_${key}`;
      if (allHeaders.includes(optionKey) && normalizedRow[optionKey]?.trim()) {
        availableOptions[optionKey] = normalizedRow[optionKey];
      }
    });

    return availableOptions;
  };

  // -----------------------------
  // PARSE CSV
  // -----------------------------
  const handleFile = (file) => {
    if (!selectedCourse) {
      toast.error("Select a course before uploading CSV");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("File must be a CSV");
      return;
    }

    const loadingToast = toast.loading("Reading CSV file...");
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        let csvText = "";

        // Smart encoding detection: Try strict UTF-8 first
        try {
          csvText = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
        } catch (utf8Error) {
          // Fallback to Windows-1252 / ISO-8859-1 for Excel CSV files
          csvText = new TextDecoder("windows-1252").decode(buffer);
        }

        if (csvText.charCodeAt(0) === 0xfeff) {
          csvText = csvText.slice(1);
        }

        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          transform: (value) => {
            if (value === null || value === undefined) return "";
            return String(value).trim();
          },
          complete: (result) => {
            toast.dismiss(loadingToast);

            if (!result.data || !result.data.length) {
              toast.error("CSV is empty or could not be read");
              return;
            }

            const firstRow = result.data[0];
            const normalizedHeaders = Object.keys(firstRow).map(normalizeKey);
            setHeaders(normalizedHeaders);

            const parsed = result.data.map((raw, i) => {
              const norm = {};
              for (const k in raw) {
                norm[normalizeKey(k)] = (raw[k] || "").toString().trim();
              }

              // Extract correct option using the new function
              const correctOption = extractCorrectOption(
                norm.correct_option ||
                norm.correct_answer ||
                norm.answer ||
                ""
              );

              // Detect available options dynamically
              const availableOptions = detectAvailableOptions(norm, normalizedHeaders);

              return {
                __row: i + 2,
                subject: norm.subject || "",
                chapter: norm.chapter || "",
                topic: norm.topic || "",
                question_text: norm.question_text || norm.question || "",
                explanation: norm.explanation || "",
                question_image_url: norm.question_image_url || "",
                image_url: norm.image_url || "",
                question_type: norm.question_type || "easy",
                correct_option: correctOption,
                original_correct_answer: norm.correct_option || norm.correct_answer || norm.answer || "", // Keep original for reference
                ...availableOptions,
                // Store which options are actually present
                available_option_keys: Object.keys(availableOptions)
              };
            });

            // -----------------------------
            // VALIDATION
            // -----------------------------
            const errs = [];
            const valid = [];

            parsed.forEach((r) => {
              const rowErrs = [];

              if (!r.subject) rowErrs.push("Missing subject");
              // Chapter is now optional - can add questions directly to subject
              if (!r.question_text) rowErrs.push("Missing question text");

              // Check for minimum 2 options (A and B)
              if (!r.option_a || !r.option_b) {
                rowErrs.push("At least Option A & B are required");
              }

              // Validate correct option based on available options
              const availableOptions = r.available_option_keys || [];
              const maxOption = availableOptions.length > 0
                ? availableOptions[availableOptions.length - 1].replace('option_', '')
                : 'h';

              const validOptions = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
                .slice(0, 'abcdefgh'.indexOf(maxOption) + 1);

              if (!r.correct_option) {
                rowErrs.push("Missing correct option");
              } else if (!validOptions.includes(r.correct_option)) {
                rowErrs.push(`Correct option "${r.correct_option}" is not valid. Available options: ${validOptions.join(', ').toUpperCase()}`);
              }

              // Validate that correct option has content
              if (r.correct_option && !r[`option_${r.correct_option}`]?.trim()) {
                rowErrs.push(`Correct option ${r.correct_option.toUpperCase()} is empty`);
              }

              if (rowErrs.length)
                errs.push({
                  row: r.__row,
                  msg: rowErrs.join(", "),
                  originalCorrect: r.original_correct_answer,
                  extractedCorrect: r.correct_option,
                  availableOptions: validOptions
                });
              else valid.push(r);
            });

            setErrors(errs);
            setRows(valid);

            if (errs.length) {
              toast.error(`${errs.length} invalid rows found`);
              // Show info about corrected options and detected options
              const correctedCount = valid.filter(r => r.original_correct_answer && r.correct_option).length;
              const maxOptions = Math.max(...valid.map(r => r.available_option_keys?.length || 0));

              if (correctedCount > 0) {
                toast.success(`Automatically corrected ${correctedCount} answer formats`);
              }
              if (maxOptions > 2) {
                toast.success(`Detected questions with up to ${maxOptions} options`);
              }
            } else {
              const maxOptions = Math.max(...valid.map(r => r.available_option_keys?.length || 0));
              toast.success(`${valid.length} valid rows ready with up to ${maxOptions} options`);
            }
          },

          error: () => {
            toast.dismiss(loadingToast);
            toast.error("Failed to parse CSV");
          }
        });
      } catch (err) {
        toast.dismiss(loadingToast);
        toast.error("Encoding error in CSV");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // -----------------------------
  // UPLOAD TO API
  // -----------------------------
  const upload = async () => {
    if (!selectedCourse) {
      toast.error("Select a course first");
      return;
    }

    if (!rows.length) {
      toast.error("No valid rows to upload");
      return;
    }

    setUploading(true);
    const loadingToast = toast.loading("Importing...");

    try {
      const clean = rows.map((r) => {
        const { __row, original_correct_answer, available_option_keys, ...cleanRow } = r;
        return {
          ...cleanRow,
          course_id: selectedCourse,
        };
      });

      const res = await fetch("/api/admin/questions/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: clean }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      toast.dismiss(loadingToast);
      toast.success(`Imported ${json.imported} questions`);

      setRows([]);
      setErrors([]);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Get current course name
  const getCurrentCourseName = () => {
    const course = courses.find(c => c.id === selectedCourse);
    return course ? course.name : "";
  };

  // Render options for a row in preview
  const renderOptions = (row) => {
    const optionKeys = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    return optionKeys.map(key => {
      const optionValue = row[`option_${key}`];
      if (!optionValue) return null;

      const isCorrect = row.correct_option === key;

      return (
        <div key={key} className={`flex items-center gap-2 p-1 rounded ${isCorrect ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : ''
          }`}>
          <span className={`font-medium w-4 text-xs ${isCorrect ? 'text-green-700 dark:text-green-300 font-bold' : 'text-gray-600 dark:text-gray-400'
            }`}>
            {key.toUpperCase()}
          </span>
          <span className={`text-xs truncate flex-1 ${isCorrect ? 'text-green-800 dark:text-green-200 font-medium' : 'text-gray-700 dark:text-gray-300'
            }`}>
            {optionValue}
          </span>
          {isCorrect && (
            <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0" />
          )}
        </div>
      );
    }).filter(Boolean);
  };

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 transition-colors">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#fff',
          },
          success: {
            style: {
              background: '#065f46',
            },
          },
          error: {
            style: {
              background: '#7f1d1d',
            },
          },
        }}
      />

      {/* Header */}
      <div className="mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Database className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-500" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Bulk Upload Questions
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base mt-1">
              Upload CSV files to import questions in bulk - Supports up to 8 options (A-H)
              {selectedCourse && (
                <span className="block text-blue-600 dark:text-blue-400 font-medium mt-1">
                  Current Course: {getCurrentCourseName()}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Course Selection & Upload */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Select Course Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                  Select Course
                </h2>
              </div>

              <select
                suppressHydrationWarning
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 dark:focus:border-blue-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
              >
                <option value="" className="dark:bg-gray-700">-- Select Course --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id} className="dark:bg-gray-700">
                    {c.name}
                  </option>
                ))}
              </select>

              {!selectedCourse && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Please select a course to continue
                </p>
              )}

              {selectedCourse && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Ready to upload questions for {getCurrentCourseName()}
                </p>
              )}
            </div>

            {/* Upload Card */}
            <div
              className={`bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 transition-all ${!selectedCourse ? "opacity-50 pointer-events-none" : ""
                }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                  Upload CSV File
                </h2>
              </div>

              <div
                className={`border-2 border-dashed rounded-lg sm:rounded-xl p-4 sm:p-8 text-center transition-all duration-200 ${dragActive
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-500"
                    : "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  } ${!selectedCourse ? "cursor-not-allowed" : "cursor-pointer"}`}
                onDragEnter={selectedCourse ? handleDrag : undefined}
                onDragLeave={selectedCourse ? handleDrag : undefined}
                onDragOver={selectedCourse ? handleDrag : undefined}
                onDrop={selectedCourse ? handleDrop : undefined}
              >
                <div className="max-w-md mx-auto">
                  <Upload className={`w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 ${dragActive ? "text-blue-500" : "text-gray-400 dark:text-gray-500"
                    }`} />

                  <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Drop your CSV file here
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-4 sm:mb-6">
                    or click to browse files from your computer
                  </p>

                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    disabled={!selectedCourse}
                  />

                  <label
                    htmlFor="csv-upload"
                    className={`inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base ${selectedCourse
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer"
                        : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      }`}
                  >
                    <Upload className="w-4 h-4" />
                    Choose File
                  </label>

                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 sm:mt-4">
                    Supported format: .csv only
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Instructions */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 sticky top-6 transition-colors">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-green-600 dark:text-green-500" />
                CSV Requirements
              </h3>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">Required Columns</p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">subject, question_text, option_a, option_b, correct_option</p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 mt-1">Optional: chapter, topic (leave empty to add questions directly to subject)</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">Optional Columns</p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">option_c, option_d, option_e, option_f, option_g, option_h, question_type</p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 mt-1">question_type: easy, moderate, or difficult (defaults to easy)</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">Correct Answer Format</p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Supports: "C", "C. Text", "Option C", "C) Answer"</p>
                  </div>
                </div>

                <div className="pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Supports 2-8 options (A-H). System auto-detects available options.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        {rows.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mt-4 sm:mt-6 overflow-hidden transition-colors">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-500" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                    Preview
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                    <span className="font-medium text-green-600 dark:text-green-500">{rows.length}</span> valid rows ready •
                    Up to {Math.max(...rows.map(r => r.available_option_keys?.length || 0))} options
                    {selectedCourse && (
                      <span className="block text-blue-600 dark:text-blue-400 text-xs mt-1">
                        For course: {getCurrentCourseName()}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={upload}
                disabled={uploading}
                className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg sm:rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm w-full sm:w-auto justify-center"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Import {rows.length} Questions
                  </>
                )}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                      #
                    </th>
                    <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                      Chapter <span className="text-gray-400 dark:text-gray-500 normal-case font-normal">(optional)</span>
                    </th>
                    <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                      Question
                    </th>
                    <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                      Options
                    </th>
                    <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                      Correct
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {rows
                    .slice(0, isExpanded ? rows.length : 5)
                    .map((row, i) => (
                      <tr
                        key={i}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="p-3 sm:p-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {i + 1}
                        </td>
                        <td className="p-3 sm:p-4 text-xs sm:text-sm text-gray-900 dark:text-white">
                          {row.subject}
                        </td>
                        <td className="p-3 sm:p-4 text-xs sm:text-sm text-gray-900 dark:text-white">
                          {row.chapter || <span className="text-gray-400 dark:text-gray-500 italic">No chapter</span>}
                        </td>
                        <td
                          className="p-3 sm:p-4 text-xs sm:text-sm text-gray-900 dark:text-white max-w-[200px] truncate"
                          title={row.question_text}
                        >
                          {row.question_text}
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="space-y-1 max-w-[200px]">
                            {renderOptions(row)}
                          </div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-xs font-bold uppercase">
                              {row.correct_option}
                            </span>
                            {row.original_correct_answer && row.original_correct_answer !== row.correct_option && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[80px]" title={row.original_correct_answer}>
                                from: {row.original_correct_answer}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {rows.length > 5 && (
              <div className="p-3 sm:p-4 text-center border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors text-sm sm:text-base"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Show All {rows.length} Rows
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Errors Section */}
        {errors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 mt-4 sm:mt-6 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                  Validation Errors
                </h3>
                <p className="text-red-700 dark:text-red-300 text-sm sm:text-base">
                  {errors.length} row{errors.length > 1 ? 's' : ''} need{errors.length === 1 ? 's' : ''} to be fixed
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-64 sm:max-h-96 overflow-y-auto">
              {errors.map((err, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 bg-white dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-800"
                >
                  <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-red-900 dark:text-red-100 text-sm sm:text-base">
                      Row {err.row}
                    </p>
                    <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 mb-1">
                      {err.msg}
                    </p>
                    {err.originalCorrect && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Original: "{err.originalCorrect}" → Extracted: "{err.extractedCorrect || 'none'}"
                      </p>
                    )}
                    {err.availableOptions && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Available options: {err.availableOptions.join(', ').toUpperCase()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}