"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Loader2, Users, BookOpen, Calendar, Clock, MessageSquare, Star, Filter, ChevronRight, Flame, Search, RefreshCw } from "lucide-react";

export default function DoctorDiscussionsPage() {
  const [loading, setLoading] = useState(true);
  const [discussions, setDiscussions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchList();
  }, []);

  async function fetchList() {
    setLoading(true);
    try {
      const res = await fetch('/api/doctor/discussions');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed');
      setDiscussions(json.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  // Filter discussions
  const filteredDiscussions = discussions.filter(discussion => {
    const matchesSearch = searchQuery === "" || 
      discussion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      discussion.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filter === "all" || 
      (filter === "recent" && isRecent(discussion.created_at)) ||
      (filter === "active" && discussion.is_active);
    
    return matchesSearch && matchesFilter;
  });

  function isRecent(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  }

  // Get discussion status
  const getDiscussionStatus = (discussion) => {
    const daysOld = Math.floor((new Date() - new Date(discussion.created_at)) / (1000 * 60 * 60 * 24));
    if (daysOld <= 1) return { label: "New", color: "text-red-600" };
    if (daysOld <= 3) return { label: "Recent", color: "text-orange-600" };
    return { label: "Older", color: "text-gray-500" };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Discussions</h1>
            <p className="text-gray-600 mt-2">Manage and respond to student discussions</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchList}
              className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className={`text-gray-600 ${loading ? 'animate-spin' : ''}`} size={20} />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { 
              label: "Total Discussions", 
              value: discussions.length, 
              icon: MessageSquare, 
              bgColor: "bg-red-50",
              iconColor: "text-red-600"
            },
            { 
              label: "Recent (7 days)", 
              value: discussions.filter(d => isRecent(d.created_at)).length, 
              icon: Clock, 
              bgColor: "bg-orange-50",
              iconColor: "text-orange-600"
            },
            { 
              label: "Active Now", 
              value: discussions.filter(d => d.is_active).length, 
              icon: Flame, 
              bgColor: "bg-amber-50",
              iconColor: "text-amber-600"
            },
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={stat.iconColor} size={24} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search discussions by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              {["all", "recent", "active"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    filter === f 
                      ? 'bg-orange-500 text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Discussions Grid */}
      <div className="mb-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="animate-spin text-orange-500 mx-auto" size={48} />
              <p className="mt-4 text-gray-600 font-medium">Loading discussions...</p>
            </div>
          </div>
        ) : filteredDiscussions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="text-gray-400" size={48} />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No discussions found</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {searchQuery || filter !== "all" 
                ? "Try adjusting your search or filter criteria" 
                : "You're all caught up! No discussions are currently assigned to you."}
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => { setSearchQuery(""); setFilter("all"); }}
                className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
              >
                Clear Filters
              </button>
              <button 
                onClick={fetchList}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDiscussions.map((d, index) => {
              const status = getDiscussionStatus(d);
              return (
                <div 
                  key={d.id} 
                  className="group bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="p-5">
                    {/* Header with status */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <BookOpen className="text-gray-600" size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-700">{d.courses?.name || 'General'}</div>
                          <div className="text-xs text-gray-500">#{d.id.slice(-6)}</div>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${status.color} bg-opacity-10`}>
                        {status.label}
                      </span>
                    </div>

                    {/* Title and Description */}
                    <div className="mb-4">
                      <h3 className="font-bold text-gray-800 text-lg mb-2 line-clamp-2">
                        {d.title}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-3">
                        {d.description || "No description provided"}
                      </p>
                    </div>

                    {/* Subject */}
                    {d.subjects?.name && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="font-medium">Subject:</span>
                          <span className="text-gray-700">{d.subjects.name}</span>
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="text-gray-400" size={14} />
                        <div className="text-xs text-gray-500">
                          {new Date(d.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="text-gray-400" size={14} />
                        <div className="text-xs text-gray-500">
                          {new Date(d.updated_at || d.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Doctors info */}
                    {(d.discussion_doctors || []).length > 0 && (
                      <div className="mb-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="text-orange-500" size={14} />
                          <span>
                            Assigned to {(d.discussion_doctors || []).length} doctor{(d.discussion_doctors || []).length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <div>
                      <Link 
                        href={`/doctor/discussions/${d.id}`}
                        className="group/btn w-full flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                      >
                        <MessageCircle size={18} />
                        <span>Open Discussion</span>
                        <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination/Info */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-800">{filteredDiscussions.length}</span> of{' '}
            <span className="font-semibold text-gray-800">{discussions.length}</span> discussions
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-100 rounded-full border border-red-200"></div>
              <span className="text-xs text-gray-600">New (≤ 1 day)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-100 rounded-full border border-orange-200"></div>
              <span className="text-xs text-gray-600">Recent (≤ 3 days)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}