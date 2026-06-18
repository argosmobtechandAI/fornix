"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { 
  ShoppingBag, 
  Users, 
  DollarSign, 
  TrendingDown, 
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  CreditCard,
  User,
  Tag,
  ChevronDown,
  ChevronUp,
  IndianRupee
} from "lucide-react";

export default function PromoUsesPage() {
  const [uses, setUses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [expandedRows, setExpandedRows] = useState([]);

  const loadUses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/promo-uses/list');
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'Failed to load');
      setUses(j.uses || []);
    } catch (e) { 
      toast.error('Failed to load promo uses');
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    loadUses(); 
  }, []);

  // Calculate stats
  const stats = {
    totalUses: uses.length,
    totalDiscount: uses.reduce((sum, u) => sum + (u.discount_amount || 0), 0),
    averageDiscount: uses.length > 0 ? 
      uses.reduce((sum, u) => sum + (u.discount_amount || 0), 0) / uses.length : 0,
    uniqueUsers: new Set(uses.map(u => u.user_id)).size,
  };

  // Filter and sort uses
  const filteredUses = uses
    .filter(use => {
      const matchesSearch = !searchQuery || 
        (use.promo_codes?.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (use.user_email || use.user_id || '').toString().includes(searchQuery);
      
      const matchesDateFilter = dateFilter === "all" || 
        (dateFilter === "today" && isToday(use.created_at)) ||
        (dateFilter === "week" && isThisWeek(use.created_at)) ||
        (dateFilter === "month" && isThisMonth(use.created_at));
      
      return matchesSearch && matchesDateFilter;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "date":
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case "amount":
          aValue = a.discount_amount || 0;
          bValue = b.discount_amount || 0;
          break;
        case "code":
          aValue = (a.promo_codes?.code || '').toLowerCase();
          bValue = (b.promo_codes?.code || '').toLowerCase();
          break;
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
      }
      
      return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
    });

  // Helper functions for date filtering
  function isToday(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  function isThisWeek(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    return date >= startOfWeek;
  }

  function isThisMonth(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    return date.getMonth() === now.getMonth() &&
           date.getFullYear() === now.getFullYear();
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleRowExpansion = (id) => {
    setExpandedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-600 to-amber-500 rounded-xl">
              <ShoppingBag className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Promo Code Uses</h1>
              <p className="text-gray-600 mt-1">Track discount code usage and analytics</p>
            </div>
          </div>
          
          <button
            onClick={loadUses}
            className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Uses</p>
                <p className="text-2xl font-bold text-gray-800 mt-2">{stats.totalUses}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <ShoppingBag className="text-blue-500" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Discount</p>
                <p className="text-2xl font-bold text-gray-800 mt-2">{formatCurrency(stats.totalDiscount)}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <IndianRupee className="text-amber-600" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Avg. Discount</p>
                <p className="text-2xl font-bold text-gray-800 mt-2">{formatCurrency(stats.averageDiscount)}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <TrendingDown className="text-purple-500" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Unique Users</p>
                <p className="text-2xl font-bold text-gray-800 mt-2">{stats.uniqueUsers}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <Users className="text-orange-500" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by promo code, user ID, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                {["all", "today", "week", "month"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setDateFilter(filter)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                      dateFilter === filter 
                        ? 'bg-white text-gray-800 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
              
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
                >
                  <option value="date">Sort by Date</option>
                  <option value="amount">Sort by Amount</option>
                  <option value="code">Sort by Code</option>
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <ChevronDown size={20} className="text-gray-400" />
                </div>
              </div>
              
              <button
                onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                className="p-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {sortOrder === "desc" ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Promo Uses Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="animate-spin text-green-500 mx-auto" size={48} />
              <p className="mt-4 text-gray-600">Loading promo code usage...</p>
            </div>
          </div>
        ) : filteredUses.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="text-gray-400" size={48} />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No promo uses found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || dateFilter !== "all" 
                ? "Try adjusting your search or filter criteria" 
                : "No promo codes have been used yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop Table */}
            <div className="hidden lg:block">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">CODE</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">USER</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">ORDER</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">AMOUNT</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">DISCOUNT</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUses.map((use) => (
                    <tr 
                      key={use.id} 
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors group"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
                            <Tag className="text-green-500" size={14} />
                          </div>
                          <div>
                            <div className="font-mono font-bold text-gray-800">
                              {use.promo_codes?.code || use.promo_code_id}
                            </div>
                            <div className="text-xs text-gray-500">
                              {use.promo_codes?.discount_type === 'percent' 
                                ? `${use.promo_codes?.discount_value}% off` 
                                : `$${use.promo_codes?.discount_value} off`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="text-gray-600" size={14} />
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">
                              User #{use.user_id?.slice(-6)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {use.user_email || 'No email'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <CreditCard className="text-blue-500" size={14} />
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">
                              Order #{use.order_id?.slice(-6) || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {use.order_id ? 'Completed' : 'Not linked'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-500">Before Discount</div>
                          <div className="font-bold text-gray-800">
                            {formatCurrency(use.amount_before)}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-500">Discount Applied</div>
                          <div className="font-bold text-green-600">
                            -{formatCurrency(use.discount_amount)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Final: {formatCurrency((use.amount_before || 0) - (use.discount_amount || 0))}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="text-gray-400" size={14} />
                          <div className="text-sm text-gray-600">
                            {formatDate(use.created_at)}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden">
              <div className="p-4 space-y-4">
                {filteredUses.map((use) => {
                  const isExpanded = expandedRows.includes(use.id);
                  return (
                    <div 
                      key={use.id} 
                      className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                    >
                      <div 
                        className="cursor-pointer"
                        onClick={() => toggleRowExpansion(use.id)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
                              <Tag className="text-green-500" size={18} />
                            </div>
                            <div>
                              <div className="font-bold text-gray-800">
                                {use.promo_codes?.code || use.promo_code_id}
                              </div>
                              <div className="text-sm text-gray-600">
                                User #{use.user_id?.slice(-6)}
                              </div>
                            </div>
                          </div>
                          <div className="text-gray-400">
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </div>
                        </div>
                        
                        {/* Quick info */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-xs text-gray-500">Discount</div>
                            <div className="font-bold text-green-600">
                              -{formatCurrency(use.discount_amount)}
                            </div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-xs text-gray-500">Date</div>
                            <div className="font-medium text-gray-800 text-sm">
                              {new Date(use.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">User ID:</span>
                            <span className="font-medium text-gray-800">{use.user_id}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Email:</span>
                            <span className="font-medium text-gray-800">{use.user_email || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Order ID:</span>
                            <span className="font-medium text-gray-800">{use.order_id || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Amount Before:</span>
                            <span className="font-bold text-gray-800">{formatCurrency(use.amount_before)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Discount Type:</span>
                            <span className="font-medium text-gray-800">
                              {use.promo_codes?.discount_type === 'percent' 
                                ? `${use.promo_codes?.discount_value}%` 
                                : `$${use.promo_codes?.discount_value}`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Final Amount:</span>
                            <span className="font-bold text-gray-800">
                              {formatCurrency((use.amount_before || 0) - (use.discount_amount || 0))}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">Time:</span>
                            <span className="font-medium text-gray-800">
                              {new Date(use.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Summary Footer */}
        {filteredUses.length > 0 && (
          <div className="bg-gray-50 border-t border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-800">{filteredUses.length}</span> of{' '}
                <span className="font-semibold text-gray-800">{uses.length}</span> uses
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-100 rounded-full border border-green-200"></div>
                  <span className="text-gray-600">Total Discount: {formatCurrency(stats.totalDiscount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}