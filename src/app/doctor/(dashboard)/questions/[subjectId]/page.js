"use client";
import { useEffect, useState } from "react";
import { Folder, ArrowLeft, BookOpen, Search, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function ChaptersPage({ params }) {
  const { subjectId } = useParams();
  const [subject, setSubject] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [filteredChapters, setFilteredChapters] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/doctor/subjects/${subjectId}/chapters`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSubject(json.subject);
      setChapters(json.chapters || []);
      setFilteredChapters(json.chapters || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen dark:from-gray-900 dark:to-gray-800 p-6 transition-colors duration-200">
      <div className="mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6 mb-8">
            <div className="flex-1">
              {/* Back Button */}
              <Link 
                href="/doctor/questions" 
                className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-4 py-2 rounded-lg transition-all duration-200 mb-6 group"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">Back to Subjects</span>
              </Link>

              {/* Subject Title */}
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
                  <BookOpen className="text-blue-600 dark:text-blue-400" size={32} />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                    {subject?.name || "Loading..."}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Browse chapters and learning materials
                  </p>
                </div>
              </div>
            </div>

            {/* Add Chapter Button removed for doctors */}
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
                className="w-full pl-12 pr-4 py-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-lg">Loading chapters...</p>
          </div>
        ) : (
          <>
            {/* Results Info */}
            <div className="flex justify-between items-center mb-6">
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                {filteredChapters.length} chapter{filteredChapters.length !== 1 ? 's' : ''} available
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
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
                  {searchTerm ? "No chapters found" : "No chapters available"}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto text-lg">
                  {searchTerm 
                    ? "Try adjusting your search terms."
                    : "There are no chapters available for this subject."
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredChapters.map((ch) => (
                  <div
                    key={ch.id}
                    className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-2xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-600 transition-all duration-300 transform hover:-translate-y-2"
                  >
                    {/* Chapter Icon - No action buttons for doctors */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                        <Folder className="text-blue-600 dark:text-blue-400" size={32} />
                      </div>
                      {/* Edit and Delete buttons removed for doctors */}
                    </div>

                    {/* Chapter Content */}
                    <Link
                      href={`/doctor/questions/${subjectId}/${ch.id}`}
                      className="block hover:no-underline group"
                    >
                      <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
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
                        <div className="text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                          View Questions →
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        
      </div>
    </div>
  );
}