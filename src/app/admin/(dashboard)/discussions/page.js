"use client";

import { useEffect, useState } from "react";
import { Folder, Plus, Pencil, Trash2, Loader2, Users, MessageSquare, Calendar, BookOpen, Search, ChevronRight, Star, Clock } from "lucide-react";
import Modal from "@/components/Modal";
import toast from "react-hot-toast";

export default function AdminDiscussionsPage() {
  const [loading, setLoading] = useState(true);
  const [discussions, setDiscussions] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");

  const [form, setForm] = useState({ course_id: "", subject_id: "", title: "", description: "", doctor_ids: [] });
  const [doctors, setDoctors] = useState([]);
  const [doctorQuery, setDoctorQuery] = useState("");
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [activeTab, setActiveTab] = useState("all"); // all, active, recent

  useEffect(() => {
    fetchData();
    fetchDoctors();
    fetchCourses();
  }, []);

  // Debounced doctor search
  useEffect(() => {
    const t = setTimeout(() => {
      fetchDoctors(doctorQuery);
    }, 300);
    return () => clearTimeout(t);
  }, [doctorQuery]);

  async function fetchData() {
    setLoading(true);
    try {
      const payload = selectedCourse ? { course_id: selectedCourse } : { course_id: null };
      const res = await fetch('/api/v1/discussions/list', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed');
      setDiscussions(json.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function fetchCourses() {
    const res = await fetch('/api/admin/courses');
    const json = await res.json();
    if (json?.data) setCourses(json.data);
  }

  async function fetchSubjects(courseId) {
    const res = await fetch(`/api/admin/subjects?course_id=${courseId}&limit=1000`);
    const json = await res.json();
    if (json?.data) setSubjects(json.data);
  }

  async function fetchDoctors(search = "") {
    try {
      const params = new URLSearchParams({ page: '1', limit: '200' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/doctors/get?${params.toString()}`);
      const json = await res.json();
      if (json?.doctors) setDoctors(json.doctors);
    } catch (err) {
      console.error('Failed to fetch doctors', err);
    }
  }

  async function openCreate() {
    setForm({ course_id: '', subject_id: '', title: '', description: '', doctor_ids: [] });
    setEditingId(null);
    setOpen(true);
  }

  function openEdit(d) {
    setForm({
      course_id: d.course_id || d.courses?.id || '',
      subject_id: d.subject_id || '',
      title: d.title || '',
      description: d.description || '',
      doctor_ids: (d.discussion_doctors || []).map((dd) => dd.doctor_id || dd.doctors?.id).filter(Boolean) || [],
    });
    setEditingId(d.id);
    if (d.course_id) fetchSubjects(d.course_id);
    setOpen(true);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this discussion? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/v1/discussions/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Delete failed');
      toast.success('Discussion deleted');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  }

  async function handleCourseChange(e) {
    const id = e.target.value;
    setForm((f) => ({ ...f, course_id: id }));
    if (id) await fetchSubjects(id);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.course_id || !form.title) return toast.error('Course and title are required');
    setSaving(true);
    try {
      let res, json;
      if (editingId) {
        res = await fetch(`/api/v1/discussions/${editingId}`, { 
          method: 'PUT', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ ...form }) 
        });
        json = await res.json();
        if (!json.success) throw new Error(json.error || 'Update failed');
        toast.success('Discussion updated');
      } else {
        res = await fetch('/api/v1/discussions/create', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ ...form }) 
        });
        json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed');
        toast.success('Discussion created');
      }
      setOpen(false);
      setEditingId(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Create failed');
    }
    setSaving(false);
  }

  // Filter discussions based on search and filters
  const filteredDiscussions = discussions.filter(discussion => {
    const matchesSearch = searchQuery === "" || 
      discussion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      discussion.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCourse = selectedCourse === "" || discussion.course_id === selectedCourse;
    
    let matchesTab = true;
    if (activeTab === "active") {
      // Example: Filter discussions with recent activity (last 7 days)
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const createdDate = new Date(discussion.created_at);
      matchesTab = createdDate > lastWeek;
    } else if (activeTab === "recent") {
      // Show only last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const createdDate = new Date(discussion.created_at);
      matchesTab = createdDate > yesterday;
    }
    
    return matchesSearch && matchesCourse && matchesTab;
  });

  // Get color based on course
  const getCourseColor = (courseId) => {
    const colors = [
      'bg-gradient-to-br from-blue-500 to-blue-600',
      'bg-gradient-to-br from-purple-500 to-purple-600',
      'bg-gradient-to-br from-green-500 to-green-600',
      'bg-gradient-to-br from-amber-500 to-amber-600',
      'bg-gradient-to-br from-rose-500 to-rose-600',
      'bg-gradient-to-br from-indigo-500 to-indigo-600',
    ];
    const index = (courseId?.toString().split('').reduce((a, b) => a + b.charCodeAt(0), 0) || 0) % colors.length;
    return colors[index];
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl blur opacity-30"></div>
              <div className="relative bg-white p-3 rounded-xl shadow-lg">
                <Folder className="text-amber-600" size={28} />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Discussions</h1>
              <p className="text-gray-600 mt-1">Manage and organize academic discussions</p>
            </div>
          </div>
          <button 
            onClick={openCreate} 
            className="group relative inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-5 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            Create Discussion
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Discussions</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{discussions.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <MessageSquare className="text-blue-500" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Doctors</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{doctors.length}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <Users className="text-green-500" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Courses</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{courses.length}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <BookOpen className="text-purple-500" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search discussions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              
              <div className="flex bg-gray-100 p-1 rounded-xl">
                {["all", "active", "recent"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab 
                        ? 'bg-white text-gray-800 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discussions Grid */}
      <div className="mb-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="animate-spin mx-auto text-amber-500" size={48} />
              <p className="mt-4 text-gray-600">Loading discussions...</p>
            </div>
          </div>
        ) : filteredDiscussions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="text-gray-400" size={48} />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No discussions found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your filters or create a new discussion</p>
            <button 
              onClick={openCreate} 
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <Plus size={18} />
              Create Your First Discussion
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDiscussions.map((d, index) => (
              <div 
                key={d.id} 
                className="group relative bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Animated gradient border */}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
                
                {/* Course indicator */}
                <div className={`absolute top-4 right-4 w-3 h-3 ${getCourseColor(d.course_id)} rounded-full`}></div>
                
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getCourseColor(d.course_id)} text-white`}>
                          <BookOpen size={16} />
                        </div>
                        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                          {d.courses?.name || 'No Course'}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-800 text-lg mb-2 line-clamp-1 group-hover:text-amber-600 transition-colors">
                        {d.title}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                        {d.description || "No description provided"}
                      </p>
                    </div>
                  </div>

                  {/* Subject & Doctors */}
                  <div className="space-y-3">
                    {d.subjects?.name && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Subject:</span>
                        <span className="font-medium text-gray-700">{d.subjects.name}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-gray-400" />
                      <div className="flex -space-x-2">
                        {(d.discussion_doctors || []).slice(0, 3).map((dd, idx) => (
                          <div 
                            key={dd.id || idx} 
                            className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white flex items-center justify-center text-xs font-bold text-white"
                            title={dd.doctors?.full_name}
                          >
                            {((dd.doctors?.full_name || "").match(/\b\w/gi) || []).slice(0,2).join("")}
                          </div>
                        ))}
                        {(d.discussion_doctors || []).length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs text-gray-600">
                            +{(d.discussion_doctors || []).length - 3}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 ml-2">
                        {(d.discussion_doctors || []).length || 0} doctor{(d.discussion_doctors || []).length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Footer with date and actions */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock size={12} />
                      <span>{new Date(d.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}</span>
                    </div>
                    
                    <div className="flex items-center z-[50] gap-1">
                      <button 
                        onClick={() => openEdit(d)}
                        className="p-2 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all group/btn"
                        title="Edit"
                      >
                        <Pencil size={16} className="group-hover/btn:scale-110 transition-transform" />
                      </button>
                      <button 
                        onClick={() => handleDelete(d.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all group/btn"
                        title="Delete"
                      >
                        <Trash2 size={16} className="group-hover/btn:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Hover effect indicator */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? "Edit Discussion" : "Create Discussion"} size="2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Title & Description */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Short, clear title (eg. 'Doubt on Lecture 3: Arrhythmia')"
                  className="w-full p-4 border border-gray-300 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={6}
                  placeholder="Provide context — what the student saw, what they tried, code or screenshot links, etc."
                  className="w-full p-4 border border-gray-300 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Star className="text-amber-600" size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800 mb-1">Pro Tip</p>
                  <p className="text-sm text-amber-700">Write a concise title and add detailed context in description so doctors can respond quickly and accurately.</p>
                </div>
              </div>
            </div>

            {/* Right: Course/Subject/Doctors */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Course</label>
                <select
                  value={form.course_id}
                  onChange={handleCourseChange}
                  className="w-full p-3 border border-gray-300 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                >
                  <option value="">Select course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Subject (optional)</label>
                <select
                  value={form.subject_id}
                  onChange={(e) => setForm((f) => ({ ...f, subject_id: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                >
                  <option value="">Any Subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Assign Doctors</label>
                
                {/* Selected doctors */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {form.doctor_ids.length === 0 && (
                      <div className="text-sm text-gray-500 italic">No doctors selected</div>
                    )}
                    {doctors
                      .filter((d) => form.doctor_ids.includes(d.id))
                      .map((d) => (
                        <div key={d.id} className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-sm px-3 py-2 rounded-full">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {((d.full_name || d.email || "").match(/\b\w/gi) || []).slice(0,2).join("")}
                          </div>
                          <span className="text-blue-800">{d.full_name || d.email}</span>
                          <button 
                            type="button" 
                            onClick={() => setForm(f => ({ ...f, doctor_ids: f.doctor_ids.filter(id => id !== d.id) }))}
                            className="ml-1 text-blue-400 hover:text-red-500 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Doctor search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    placeholder="Search doctors..."
                    value={doctorQuery}
                    onChange={(e) => setDoctorQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                {/* Doctors list */}
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-white">
                  {doctors.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">No doctors available</div>
                  ) : (
                    doctors.map((d) => {
                      const selected = form.doctor_ids.includes(d.id);
                      return (
                        <div 
                          key={d.id}
                          onClick={() => {
                            setForm((f) => {
                              const arr = new Set(f.doctor_ids || []);
                              if (arr.has(d.id)) arr.delete(d.id); 
                              else arr.add(d.id);
                              return { ...f, doctor_ids: Array.from(arr) };
                            });
                          }}
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer mb-1 last:mb-0 transition-all ${
                            selected 
                              ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200' 
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {((d.full_name || d.email || "").match(/\b\w/gi) || []).slice(0,2).join("")}
                            </div>
                            <div>
                              <div className="font-medium text-gray-800">{d.full_name || d.email}</div>
                              <div className="text-xs text-gray-500">{d.email}</div>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selected 
                              ? 'bg-amber-500 border-amber-500' 
                              : 'border-gray-300'
                          }`}>
                            {selected && <span className="text-white text-xs">✓</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button 
              type="button" 
              onClick={() => setOpen(false)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  {editingId ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                editingId ? 'Update Discussion' : 'Create Discussion'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}