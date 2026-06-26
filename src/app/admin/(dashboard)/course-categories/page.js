"use client";
import { useEffect, useState } from "react";
import { FolderOpen, Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Modal from "@/components/Modal";

export default function CourseCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState({
    open: false,
    mode: "create",
    item: null,
    saving: false,
  });

  const [formData, setFormData] = useState({ name: "", description: "" });

  async function fetchCategories() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/course-categories");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setCategories(json.data || []);
      setFiltered(json.data || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(categories);
    } else {
      setFiltered(
        categories.filter(
          (c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.description?.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, categories]);

  const openCreate = () => {
    setFormData({ name: "", description: "" });
    setModal({ open: true, mode: "create", item: null });
  };

  const openEdit = (item) => {
    setFormData({ name: item.name, description: item.description || "" });
    setModal({ open: true, mode: "edit", item });
  };

  const closeModal = () => {
    setModal({ open: false, mode: "create", item: null, saving: false });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Category name is required.");

    try {
      setModal((m) => ({ ...m, saving: true }));
      const method = modal.mode === "create" ? "POST" : "PUT";
      const url =
        modal.mode === "create"
          ? "/api/admin/course-categories"
          : `/api/admin/course-categories/${modal.item.id}`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      toast.success(
        `Category ${modal.mode === "create" ? "created" : "updated"} successfully`
      );
      closeModal();
      fetchCategories();
    } catch (err) {
      toast.error(err.message);
      setModal((m) => ({ ...m, saving: false }));
    }
  }

  async function deleteCategory(id) {
    if (!confirm("Are you sure you want to delete this category? Courses in this category will become uncategorized.")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/course-categories/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Category deleted successfully");
      fetchCategories();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="min-h-screen  dark:from-gray-900 dark:to-gray-800 p-3 w-full">
      <div className="mx-auto w-full">
        <Toaster position="top-right" />
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
              <FolderOpen className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Course Categories
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage the professional categories (Doctors, Nurses, etc.)
              </p>
            </div>
          </div>

          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-medium group"
          >
            <Plus size={20} className="group-hover:scale-110 transition-transform" />
            <span>Add Category</span>
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search categories by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
            />
          </div>
        </div>

        {/* Loading / Empty / List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <Loader2 className="animate-spin text-blue-500 mx-auto mb-4" size={40} />
              <p className="text-gray-600 dark:text-gray-400">Loading categories...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <FolderOpen className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No categories found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Create a category to group your courses.</p>
            {!search && (
              <button
                onClick={openCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow transition-colors duration-200 font-medium"
              >
                Create First Category
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden w-full">
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 font-semibold text-sm text-gray-600 dark:text-gray-300 w-full">
              <div className="col-span-4">Category Name</div>
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            {filtered.map((cat, idx) => (
              <div key={cat.id} className={`grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-center transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${idx < filtered.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}>
                <div className="col-span-4 font-semibold text-gray-900 dark:text-white">
                  {cat.name}
                </div>
                <div className="col-span-6 text-sm text-gray-500 dark:text-gray-400">
                  {cat.description || "No description"}
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                  <button onClick={() => openEdit(cat)} className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => deleteCategory(cat.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        <Modal
          open={modal.open}
          onClose={closeModal}
          title={`${modal.mode === "create" ? "Add New" : "Edit"} Category`}
        >
          <form onSubmit={handleSubmit} className="p-4 space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Category Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Doctors"
                disabled={modal.saving}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of the category..."
                rows={3}
                disabled={modal.saving}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={modal.saving}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={modal.saving || !formData.name.trim()}
                className="flex-1 flex justify-center items-center gap-2 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {modal.saving && <Loader2 className="animate-spin w-4 h-4" />}
                {modal.saving ? "Saving..." : "Save Category"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
