"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Tag, 
  Percent, 
  DollarSign, 
  Users, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Copy, 
  Search,
  Filter,
  RefreshCw,
  Loader2,
  AlertTriangle,
  LayoutGrid,
  Rows
} from "lucide-react";
import Modal from "@/components/Modal";

export default function PromoCodesPage() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [promoToDelete, setPromoToDelete] = useState(null);
  const [editingPromo, setEditingPromo] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPartnerCreate, setShowPartnerCreate] = useState(false);
  const [showPartnerEdit, setShowPartnerEdit] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'cards'

  // Form state
  const [form, setForm] = useState({
    code: "",
    description: "",
    discount_type: "percent",
    discount_value: 10,
    max_uses: "",
    valid_from: "",
    valid_to: "",
    is_active: true,
    partner_name: "",
    partner_email: "",
    partner_password: "",
    partner_commission_percent: "0",
  });

  const loadPromos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/promo-codes/list`);
      const j = await res.json();
      if (!j.success) throw new Error(j.error || "Failed to load");
      setPromos(j.promos || []);
    } catch (e) {
      toast.error("Failed to load promo codes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    loadPromos(); 
  }, []);

  // Filter promos
  const filteredPromos = promos.filter(promo => {
    const matchesSearch = !searchQuery || 
      promo.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      promo.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && promo.is_active) ||
      (statusFilter === "inactive" && !promo.is_active);
    
    return matchesSearch && matchesStatus;
  });

  // Stats calculation
  const stats = {
    total: promos.length,
    active: promos.filter(p => p.is_active).length,
    used: promos.reduce((sum, p) => sum + (p.uses_count || 0), 0),
    expired: promos.filter(p => p.valid_to && new Date(p.valid_to) < new Date()).length
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm(prev => ({ ...prev, code }));
  };

  const resetForm = () => {
    setForm({
      code: "",
      description: "",
      discount_type: "percent",
      discount_value: 10,
      max_uses: "",
      valid_from: "",
      valid_to: "",
      is_active: true,
      partner_name: "",
      partner_email: "",
      partner_password: "",
      partner_commission_percent: "0",
    });
    setShowPartnerCreate(false);
    setShowPartnerEdit(false);
  };

  const handleCreate = async () => {
    // Validation
    if (!form.code.trim()) return toast.error("Please enter a promo code");
    if (form.discount_type === "percent" && (form.discount_value < 1 || form.discount_value > 100)) {
      return toast.error("Percentage must be between 1 and 100");
    }
    if (form.discount_type === "fixed" && form.discount_value < 1) {
      return toast.error("Fixed discount must be greater than 0");
    }
    if (form.valid_from && form.valid_to && new Date(form.valid_to) < new Date(form.valid_from)) {
      return toast.error("End date must be after start date");
    }

    setIsCreating(true);
    try {
      const payload = {
        code: form.code.trim(),
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        valid_from: form.valid_from || null,
        valid_to: form.valid_to || null,
        is_active: form.is_active,
        partner_name: form.partner_name || null,
        partner_email: form.partner_email || null,
        partner_password: form.partner_password || null,
        partner_commission_percent: form.partner_commission_percent ? Number(form.partner_commission_percent) : 0,
      };

      const res = await fetch(`/api/admin/promo-codes/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'Failed to create promo code');
      
      toast.success('Promo code created successfully!');
      setShowCreateModal(false);
      resetForm();
      loadPromos();
    } catch (e) {
      toast.error(e.message || 'Failed to create promo code');
    } finally {
      setIsCreating(false);
    }
  };

  const openEditModal = (promo) => {
    setEditingPromo(promo);
    setForm({
      code: promo.code,
      description: promo.description || "",
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      max_uses: promo.max_uses || "",
      valid_from: promo.valid_from ? new Date(promo.valid_from).toISOString().slice(0, 16) : "",
      valid_to: promo.valid_to ? new Date(promo.valid_to).toISOString().slice(0, 16) : "",
      is_active: promo.is_active,
      partner_name: promo.partner_name || "",
      partner_email: promo.partner_email || "",
      partner_password: "",
      partner_commission_percent: (promo.partner_commission_percent ?? 0).toString(),
    });
    setShowPartnerEdit(!!(promo.partner_name || promo.partner_email));
    setShowPartnerCreate(false);
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    if (!editingPromo) return;

    setIsSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        valid_from: form.valid_from || null,
        valid_to: form.valid_to || null,
        is_active: form.is_active,
        partner_name: form.partner_name || null,
        partner_email: form.partner_email || null,
        // Only send password if user entered a new one
        ...(form.partner_password ? { partner_password: form.partner_password } : {}),
        partner_commission_percent: form.partner_commission_percent ? Number(form.partner_commission_percent) : 0,
      };

      const res = await fetch(`/api/admin/promo-codes/${editingPromo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'Failed to update promo code');
      
      toast.success('Promo code updated successfully!');
      setShowEditModal(false);
      setEditingPromo(null);
      resetForm();
      loadPromos();
    } catch (e) {
      toast.error(e.message || 'Failed to update promo code');
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteModal = (promo) => {
    setPromoToDelete(promo);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!promoToDelete) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/promo-codes/${promoToDelete.id}`, { 
        method: 'DELETE' 
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || 'Failed to delete');
      
      toast.success('Promo code deleted successfully!');
      setShowDeleteModal(false);
      setPromoToDelete(null);
      loadPromos();
    } catch (e) {
      toast.error(e.message || 'Failed to delete promo code');
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No limit";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (promo) => {
    if (!promo.is_active) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Inactive</span>;
    }
    
    const now = new Date();
    if (promo.valid_to && new Date(promo.valid_to) < now) {
      return <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">Expired</span>;
    }
    
    if (promo.max_uses && promo.uses_count >= promo.max_uses) {
      return <span className="px-2 py-1 bg-amber-100 text-amber-600 text-xs rounded-full">Max Used</span>;
    }
    
    return <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">Active</span>;
  };

  return (
    <div className=" bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl">
              <Tag className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Promo Codes</h1>
              <p className="text-gray-600 mt-1">Manage discount codes and promotions</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
          >
            <Plus size={18} />
            Create Promo Code
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Codes</p>
                <p className="text-2xl font-bold text-gray-800 mt-2">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Tag className="text-blue-500" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Codes</p>
                <p className="text-2xl font-bold text-gray-800 mt-2">{stats.active}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <CheckCircle className="text-green-500" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Uses</p>
                <p className="text-2xl font-bold text-gray-800 mt-2">{stats.used}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Users className="text-purple-500" size={24} />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Expired</p>
                <p className="text-2xl font-bold text-gray-800 mt-2">{stats.expired}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <XCircle className="text-red-500" size={24} />
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
                  placeholder="Search by code or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                {["all", "active", "inactive"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      statusFilter === filter 
                        ? 'bg-white text-gray-800 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>

              {/* View mode toggle: table vs cards */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-2 rounded-md text-xs md:text-sm flex items-center justify-center transition-all ${
                    viewMode === "table"
                      ? "bg-white text-gray-800 shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                  title="Table view"
                >
                  <Rows size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`p-2 rounded-md text-xs md:text-sm flex items-center justify-center transition-all ${
                    viewMode === "cards"
                      ? "bg-white text-gray-800 shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                  title="Card view"
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
              
              <button
                onClick={loadPromos}
                className="p-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <RefreshCw className={loading ? 'animate-spin' : ''} size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Promo Codes Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="animate-spin text-orange-500 mx-auto" size={48} />
              <p className="mt-4 text-gray-600">Loading promo codes...</p>
            </div>
          </div>
        ) : filteredPromos.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Tag className="text-gray-400" size={48} />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No promo codes found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || statusFilter !== "all" 
                ? "Try adjusting your search or filter criteria" 
                : "Create your first promo code to get started"}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
            >
              <Plus size={18} />
              Create Promo Code
            </button>
          </div>
        ) : (
          viewMode === "cards" ? (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPromos.map((promo) => (
                <div
                  key={promo.id}
                  className="border border-gray-200 rounded-xl bg-white shadow-sm p-4 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg flex items-center justify-center">
                      <Tag className="text-orange-500" size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-gray-800 text-sm sm:text-base break-all">
                          {promo.code}
                        </span>
                        {getStatusBadge(promo)}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 line-clamp-2">
                        {promo.description || "No description"}
                      </div>
                      {(promo.partner_name || promo.partner_email) && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-medium">
                          <Users className="w-3 h-3" />
                          <span>
                            Partner{promo.partner_name ? `: ${promo.partner_name}` : ""}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => copyToClipboard(promo.code)}
                      className="p-1 text-gray-400 hover:text-orange-500 transition-colors"
                      title="Copy code"
                    >
                      <Copy size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm text-gray-700">
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-500 text-xs">Discount</span>
                      <div className="flex items-center gap-1">
                        {promo.discount_type === "percent" ? (
                          <Percent className="text-green-500" size={14} />
                        ) : (
                          <DollarSign className="text-blue-500" size={14} />
                        )}
                        <span className="font-semibold text-gray-800">
                          {promo.discount_value}
                          {promo.discount_type === "percent" ? "%" : ""}
                        </span>
                        <span className="text-[11px] text-gray-500 capitalize">
                          ({promo.discount_type})
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-gray-500 text-xs">Uses</span>
                      <div className="flex items-center gap-1">
                        <Users className="text-gray-400" size={14} />
                        <span className="font-semibold text-gray-800">{promo.uses_count || 0}</span>
                        <span className="text-[11px] text-gray-500">/ {promo.max_uses || "∞"}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 col-span-2">
                      <span className="text-gray-500 text-xs">Validity</span>
                      <div className="flex items-start gap-2 text-xs text-gray-600">
                        <Calendar className="text-gray-400 mt-0.5" size={14} />
                        <div>
                          <div>From: {formatDate(promo.valid_from) || "Any time"}</div>
                          <div>To: {formatDate(promo.valid_to) || "No limit"}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-1">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Created:</span>
                      <span className="font-medium text-gray-700">
                        {promo.created_at ? formatDate(promo.created_at) : "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(promo)}
                        className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(promo)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left p-4 text-xs md:text-sm font-semibold text-gray-700">CODE</th>
                  <th className="text-left p-4 text-xs md:text-sm font-semibold text-gray-700">DISCOUNT</th>
                  <th className="text-left p-4 text-xs md:text-sm font-semibold text-gray-700">USES</th>
                  <th className="hidden sm:table-cell text-left p-4 text-xs md:text-sm font-semibold text-gray-700">VALIDITY</th>
                  <th className="hidden sm:table-cell text-left p-4 text-xs md:text-sm font-semibold text-gray-700">STATUS</th>
                  <th className="text-left p-4 text-xs md:text-sm font-semibold text-gray-700">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredPromos.map((promo) => (
                  <tr key={promo.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg flex items-center justify-center">
                          <Tag className="text-orange-500" size={16} />
                        </div>
                        <div>
                          <div className="font-mono font-bold text-gray-800">{promo.code}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {promo.description || "No description"}
                          </div>
                          {(promo.partner_name || promo.partner_email) && (
                            <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-medium">
                              <Users className="w-3 h-3" />
                              <span>
                                Partner{promo.partner_name ? `: ${promo.partner_name}` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => copyToClipboard(promo.code)}
                          className="p-1 text-gray-400 hover:text-orange-500 transition-colors"
                          title="Copy code"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {promo.discount_type === 'percent' ? (
                          <Percent className="text-green-500" size={16} />
                        ) : (
                          <DollarSign className="text-blue-500" size={16} />
                        )}
                        <span className="font-bold text-gray-800">
                          {promo.discount_value}{promo.discount_type === 'percent' ? '%' : ''}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">({promo.discount_type})</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Users className="text-gray-400" size={16} />
                        <span className="font-medium text-gray-800">{promo.uses_count || 0}</span>
                        <span className="text-xs text-gray-500">
                          / {promo.max_uses || '∞'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell align-top">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="text-gray-400" size={14} />
                        <div>
                          <div>From: {formatDate(promo.valid_from) || 'Any time'}</div>
                          <div>To: {formatDate(promo.valid_to) || 'No limit'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell align-top">
                      {getStatusBadge(promo)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(promo)}
                          className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => openDeleteModal(promo)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
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
          )
        )}
      </div>

      {/* Create Promo Code Modal */}
      <Modal 
        open={showCreateModal} 
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }} 
        title="Create Promo Code"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Code Field */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Promo Code *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="code"
                  value={form.code}
                  onChange={handleInputChange}
                  placeholder="e.g., SUMMER2024"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={generateRandomCode}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Generate
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Use uppercase letters and numbers for better readability
              </p>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleInputChange}
                placeholder="Brief description of what this promo code offers..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Discount Type and Value */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount Type *
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleInputChange({ target: { name: 'discount_type', value: 'percent' }})}
                  className={`flex-1 py-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                    form.discount_type === 'percent' 
                      ? 'border-orange-500 bg-orange-50 text-orange-700' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Percent size={18} />
                  Percentage
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange({ target: { name: 'discount_type', value: 'fixed' }})}
                  className={`flex-1 py-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                    form.discount_type === 'fixed' 
                      ? 'border-orange-500 bg-orange-50 text-orange-700' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <DollarSign size={18} />
                  Fixed Amount
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount Value *
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="discount_value"
                  value={form.discount_value}
                  onChange={handleInputChange}
                  min="1"
                  max={form.discount_type === 'percent' ? '100' : undefined}
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  {form.discount_type === 'percent' ? '%' : '$'}
                </div>
              </div>
            </div>

            {/* Max Uses */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Uses
              </label>
              <input
                type="number"
                name="max_uses"
                value={form.max_uses}
                onChange={handleInputChange}
                min="1"
                placeholder="Unlimited if empty"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {/* Active Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="flex items-center h-full">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={form.is_active}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className={`w-12 h-6 rounded-full transition-colors ${
                      form.is_active ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        form.is_active ? 'left-7' : 'left-1'
                      }`}></div>
                    </div>
                  </div>
                  <span className={`font-medium ${
                    form.is_active ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {form.is_active ? 'Active' : 'Inactive'}
                  </span>
                </label>
              </div>
            </div>

            {/* Validity Dates */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valid From
              </label>
              <input
                type="datetime-local"
                name="valid_from"
                value={form.valid_from}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valid To
              </label>
              <input
                type="datetime-local"
                name="valid_to"
                value={form.valid_to}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Partner (optional) toggle and fields */}
          <div className="mt-2 space-y-4">
            <div className="md:col-span-2 flex items-center justify-between bg-gray-50 border border-dashed border-gray-300 rounded-lg px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-700">Assign to Partner (optional)</p>
                <p className="text-xs text-gray-500">Enable this if you want to associate this promo code with a partner and track their students.</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPartnerCreate}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setShowPartnerCreate(checked);
                    if (!checked) {
                      setForm(prev => ({
                        ...prev,
                        partner_name: "",
                        partner_email: "",
                        partner_password: "",
                        partner_commission_percent: "0",
                      }));
                    }
                  }}
                  className="h-4 w-4 text-orange-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Enable partner</span>
              </label>
            </div>

            {showPartnerCreate && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Partner Name</label>
                  <input
                    type="text"
                    name="partner_name"
                    value={form.partner_name}
                    onChange={handleInputChange}
                    placeholder="Partner full name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Partner Email</label>
                  <input
                    type="email"
                    name="partner_email"
                    value={form.partner_email}
                    onChange={handleInputChange}
                    placeholder="partner@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Partner Password</label>
                  <input
                    type="password"
                    name="partner_password"
                    value={form.partner_password}
                    onChange={handleInputChange}
                    placeholder="Minimum 6 characters"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Commission (%)</label>
                  <input
                    type="number"
                    name="partner_commission_percent"
                    value={form.partner_commission_percent}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isCreating ? (
                <>
                  <Loader2 className="animate-spin inline mr-2" size={18} />
                  Creating...
                </>
              ) : (
                'Create Promo Code'
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Promo Code Modal */}
      <Modal 
        open={showEditModal} 
        onClose={() => {
          setShowEditModal(false);
          setEditingPromo(null);
          resetForm();
        }} 
        title="Edit Promo Code"
      >
        {editingPromo && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Code Field */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Promo Code *
                </label>
                <input
                  type="text"
                  name="code"
                  value={form.code}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Discount Type and Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Type *
                </label>
                <select
                  name="discount_type"
                  value={form.discount_type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="percent">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Value *
                </label>
                <input
                  type="number"
                  name="discount_value"
                  value={form.discount_value}
                  onChange={handleInputChange}
                  min="1"
                  max={form.discount_type === 'percent' ? '100' : undefined}
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Max Uses */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Uses
                </label>
                <input
                  type="number"
                  name="max_uses"
                  value={form.max_uses}
                  onChange={handleInputChange}
                  min="1"
                  placeholder="Unlimited if empty"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              {/* Active Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={form.is_active}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className={`w-12 h-6 rounded-full transition-colors ${
                      form.is_active ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        form.is_active ? 'left-7' : 'left-1'
                      }`}></div>
                    </div>
                  </div>
                  <span className={`font-medium ${
                    form.is_active ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {form.is_active ? 'Active' : 'Inactive'}
                  </span>
                </label>
              </div>

              {/* Validity Dates */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid From
                </label>
                <input
                  type="datetime-local"
                  name="valid_from"
                  value={form.valid_from}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid To
                </label>
                <input
                  type="datetime-local"
                  name="valid_to"
                  value={form.valid_to}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Partner (optional) toggle and fields */}
            <div className="mt-2 space-y-4">
              <div className="md:col-span-2 flex items-center justify-between bg-gray-50 border border-dashed border-gray-300 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Assign to Partner (optional)</p>
                  <p className="text-xs text-gray-500">Enable this if you want to associate this promo code with a partner and track their students.</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPartnerEdit}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setShowPartnerEdit(checked);
                      if (!checked) {
                        setForm(prev => ({
                          ...prev,
                          partner_name: "",
                          partner_email: "",
                          partner_password: "",
                          partner_commission_percent: "0",
                        }));
                      }
                    }}
                    className="h-4 w-4 text-orange-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Enable partner</span>
                </label>
              </div>

              {showPartnerEdit && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Partner Name</label>
                    <input
                      type="text"
                      name="partner_name"
                      value={form.partner_name}
                      onChange={handleInputChange}
                      placeholder="Partner full name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Partner Email</label>
                    <input
                      type="email"
                      name="partner_email"
                      value={form.partner_email}
                      onChange={handleInputChange}
                      placeholder="partner@example.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Partner Password (set new)</label>
                    <input
                      type="password"
                      name="partner_password"
                      value={form.partner_password}
                      onChange={handleInputChange}
                      placeholder="Leave blank to keep current password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Commission (%)</label>
                    <input
                      type="number"
                      name="partner_commission_percent"
                      value={form.partner_commission_percent}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingPromo(null);
                  resetForm();
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={isSaving}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin inline mr-2" size={18} />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setPromoToDelete(null);
        }}
        title="Delete Promo Code"
        size="md"
      >
        {promoToDelete && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="text-red-500" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Delete Promo Code?
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this promo code? This action cannot be undone.
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Tag className="text-red-500" size={20} />
                </div>
                <div className="flex-1">
                  <div className="font-mono font-bold text-gray-800 text-lg">
                    {promoToDelete.code}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {promoToDelete.description || "No description"}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Discount:</span>
                      <span className="font-bold text-gray-800">
                        {promoToDelete.discount_value}{promoToDelete.discount_type === 'percent' ? '%' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">Uses:</span>
                      <span className="font-bold text-gray-800">
                        {promoToDelete.uses_count || 0} / {promoToDelete.max_uses || '∞'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} />
                <span className="font-medium">Warning</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-red-500">
                <li>This promo code will be permanently deleted</li>
                <li>Any users who have this code saved will no longer be able to use it</li>
                <li>This action cannot be reversed</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setPromoToDelete(null);
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="animate-spin inline mr-2" size={18} />
                    Deleting...
                  </>
                ) : (
                  'Delete Promo Code'
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}