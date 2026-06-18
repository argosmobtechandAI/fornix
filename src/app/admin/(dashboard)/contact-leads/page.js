"use client";
import { useEffect, useState, useMemo } from "react";
import {
  MessageSquare,
  Trash2,
  CheckCheck,
  Search,
  RefreshCw,
  Loader2,
  Phone,
  Mail,
  Calendar,
  CheckSquare,
  Square,
  Eye,
  User,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function ContactLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchLeads(f = filter) {
    setLoading(true);
    try {
      const url = f === "all"
        ? "/api/admin/contact-leads"
        : `/api/admin/contact-leads?filter=${f}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setLeads(json.data || []);
      setSelected(new Set());
    } catch (err) {
      toast.error(err.message || "Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLeads(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(l =>
      l.name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.phone?.includes(q) ||
      l.message?.toLowerCase().includes(q)
    );
  }, [leads, search]);

  const allSelected = filtered.length > 0 && filtered.every(l => selected.has(l.id));
  const someSelected = selected.size > 0;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(l => l.id)));
    }
  }

  function toggleOne(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function markRead(ids) {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/contact-leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`Marked as read`);
      setLeads(prev => prev.map(l => ids.includes(l.id) ? { ...l, is_read: true } : l));
      setSelected(new Set());
    } catch (err) {
      toast.error(err.message || "Failed to mark as read");
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteleads(ids) {
    if (!confirm(`Delete ${ids.length} lead${ids.length !== 1 ? "s" : ""}?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/contact-leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`Deleted successfully`);
      setLeads(prev => prev.filter(l => !ids.includes(l.id)));
      setSelected(new Set());
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setActionLoading(false);
    }
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 w-full max-w-full">
      <Toaster position="top-right" />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-600 rounded-xl shadow-lg shadow-orange-600/20">
            <MessageSquare className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contact Leads</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">General contact form submissions</p>
          </div>
        </div>
        <button
          onClick={() => fetchLeads(filter)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by name, email, phone, message..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all shadow-inner"
            />
          </div>
          <div className="flex items-center gap-2">
            {["all", "unread", "read"].map(f => (
              <button
                key={f}
                onClick={() => { setFilter(f); fetchLeads(f); }}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  filter === f
                    ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {someSelected && (
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <span className="text-sm font-bold text-gray-600 dark:text-gray-400">{selected.size} selected</span>
            <button onClick={() => markRead(Array.from(selected))} disabled={actionLoading} className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-green-700 shadow-md shadow-green-600/20">
              <CheckCheck size={13} /> Mark as Read
            </button>
            <button onClick={() => deleteleads(Array.from(selected))} disabled={actionLoading} className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-red-700 shadow-md shadow-red-600/20">
              <Trash2 size={13} /> Delete Selected
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs font-bold text-gray-400 hover:text-gray-600 underline ml-1">
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center py-32">
          <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading messages...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-32 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <MessageSquare className="mx-auto text-gray-200 dark:text-gray-700 mb-4" size={64} />
          <p className="text-gray-500 dark:text-gray-400">No contact leads found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
          {filtered.map(lead => (
            <div key={lead.id} className={`group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border transition-all duration-300 flex flex-col relative ${
              !lead.is_read 
                ? "border-orange-500 ring-1 ring-orange-500/10 shadow-orange-500/5" 
                : "border-gray-100 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-900/30"
            } ${selected.has(lead.id) ? "ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-gray-900" : ""}`}>
              
              {!lead.is_read && <div className="absolute top-4 right-4 w-2 h-2 bg-orange-500 rounded-full animate-pulse z-10"></div>}
              
              <div className="p-6 flex-1">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                    <User size={24} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-gray-900 dark:text-white truncate text-lg group-hover:text-orange-600 transition-colors">{lead.name}</h3>
                    <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-wider"><Calendar size={12} /> {fmtDate(lead.created_at)}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-orange-500 transition-colors">
                    <Mail size={14} className="shrink-0" /> <span className="truncate font-medium">{lead.email}</span>
                  </a>
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-orange-500 transition-colors">
                    <Phone size={14} className="shrink-0" /> <span className="font-medium">{lead.phone || "No phone"}</span>
                  </a>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed border border-gray-100 dark:border-gray-700/50">
                  "{lead.message}"
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <button onClick={() => toggleOne(lead.id)} className="p-1 text-gray-300 hover:text-orange-500 transition-colors">
                  {selected.has(lead.id) ? <CheckSquare size={22} className="text-orange-600 shadow-sm" /> : <Square size={22} className="text-gray-300" />}
                </button>
                <div className="flex gap-2">
                  {!lead.is_read && (
                    <button onClick={() => markRead([lead.id])} className="p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl hover:bg-green-100 transition-colors" title="Mark as read">
                      <Eye size={18} />
                    </button>
                  )}
                  <button onClick={() => deleteleads([lead.id])} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl hover:bg-red-100 transition-colors" title="Delete">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Selection Status Bar (Floating) ── */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-gray-900 text-white rounded-2xl shadow-2xl flex items-center gap-6 animate-fade-in-up border border-white/10 backdrop-blur-md">
          <p className="text-sm font-black tracking-wide uppercase">
            <span className="text-orange-500">{selected.size}</span> Selected
          </p>
          <div className="h-4 w-[1px] bg-white/20"></div>
          <button 
            onClick={toggleAll}
            className="text-xs font-bold hover:text-orange-400 transition-colors"
          >
            {allSelected ? "Deselect All" : "Select All Visible"}
          </button>
        </div>
      )}
    </div>
  );
}
