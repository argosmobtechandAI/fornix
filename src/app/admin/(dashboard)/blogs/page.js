"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Loader2, Save, Image as ImageIcon, X, Check, Search, FileText, FolderPlus } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import RichTextEditor from "@/components/RichTextEditor";

export default function BlogsAdminPage() {
  const [activeTab, setActiveTab] = useState("blogs"); // 'blogs' | 'categories'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data
  const [categories, setCategories] = useState([]);
  const [blogs, setBlogs] = useState([]);

  // Modals / Forms
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", slug: "", description: "" });

  const [showBlogModal, setShowBlogModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [blogForm, setBlogForm] = useState({
    title: "",
    slug: "",
    category_id: "",
    content: "",
    excerpt: "",
    featured_image: "",
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    is_published: true
  });

  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catsRes, blogsRes] = await Promise.all([
        fetch(`/api/admin/blog-categories?t=${Date.now()}`).then(r => r.json()),
        fetch(`/api/admin/blogs?t=${Date.now()}`).then(r => r.json())
      ]);

      if (catsRes.success) setCategories(catsRes.categories);
      if (blogsRes.success) setBlogs(blogsRes.blogs);
    } catch (err) {
      toast.error("Failed to fetch blog data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to generate slug from title/name
  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  // --- CATEGORY ACTIONS ---
  const handleOpenCategoryModal = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryForm({ name: cat.name, slug: cat.slug, description: cat.description || "" });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: "", slug: "", description: "" });
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name || !categoryForm.slug) {
      toast.error("Name and Slug are required");
      return;
    }

    setSaving(true);
    try {
      const url = "/api/admin/blog-categories";
      const method = editingCategory ? "PUT" : "POST";
      const body = JSON.stringify(editingCategory ? { ...categoryForm, id: editingCategory.id } : categoryForm);

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body
      });
      const data = await res.json();

      if (data.success) {
        toast.success(editingCategory ? "Category updated" : "Category created");
        setShowCategoryModal(false);
        fetchData();
      } else {
        toast.error(data.error || "Failed to save category");
      }
    } catch (err) {
      toast.error("An error occurred");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm("Are you sure you want to delete this category? Blogs under it will have unassigned categories.")) return;

    try {
      const res = await fetch(`/api/admin/blog-categories?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Category deleted");
        fetchData();
      } else {
        toast.error(data.error || "Failed to delete");
      }
    } catch (err) {
      toast.error("An error occurred");
      console.error(err);
    }
  };

  // --- BLOG ACTIONS ---
  const handleOpenBlogModal = (blog = null) => {
    if (blog) {
      setEditingBlog(blog);
      setBlogForm({
        title: blog.title,
        slug: blog.slug,
        category_id: blog.category_id || "",
        content: blog.content || "",
        excerpt: blog.excerpt || "",
        featured_image: blog.featured_image || "",
        meta_title: blog.meta_title || "",
        meta_description: blog.meta_description || "",
        meta_keywords: blog.meta_keywords || "",
        is_published: blog.is_published
      });
      setImagePreview(blog.featured_image || null);
    } else {
      setEditingBlog(null);
      setBlogForm({
        title: "",
        slug: "",
        category_id: categories[0]?.id || "",
        content: "",
        excerpt: "",
        featured_image: "",
        meta_title: "",
        meta_description: "",
        meta_keywords: "",
        is_published: true
      });
      setImagePreview(null);
    }
    setShowBlogModal(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const max_size = 1200;

          if (width > max_size || height > max_size) {
            if (width > height) {
              height *= max_size / width;
              width = max_size;
            } else {
              width *= max_size / height;
              height = max_size;
            }
          }

          canvas.width = Math.round(width);
          canvas.height = Math.round(height);
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL("image/webp", 0.8);
          setImagePreview(compressedBase64);
          setBlogForm(prev => ({ ...prev, featured_image: compressedBase64 }));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBlog = async (e) => {
    e.preventDefault();
    if (!blogForm.title || !blogForm.slug || !blogForm.category_id) {
      toast.error("Title, Slug, and Category are required");
      return;
    }

    setSaving(true);
    try {
      let finalImageUrl = blogForm.featured_image;

      // If it's a new base64 image, upload it via the dedicated FormData endpoint first
      if (finalImageUrl && finalImageUrl.startsWith("data:image")) {
        // Convert base64 back to Blob for FormData upload
        const blob = await (await fetch(finalImageUrl)).blob();
        const formData = new FormData();
        formData.append("image", blob, "blog_image.webp");
        if (editingBlog?.id) formData.append("blog_id", editingBlog.id);

        const uploadRes = await fetch("/api/admin/blogs/upload-image", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) {
          toast.error(uploadData.error || "Image upload failed");
          setSaving(false);
          return;
        }
        finalImageUrl = uploadData.url;
      }

      const url = "/api/admin/blogs";
      const method = editingBlog ? "PUT" : "POST";
      const payload = { ...blogForm, featured_image: finalImageUrl };
      if (editingBlog) payload.id = editingBlog.id;

      const body = JSON.stringify(payload);

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body
      });
      const data = await res.json();

      if (data.success) {
        toast.success(editingBlog ? "Blog updated" : "Blog created");
        setShowBlogModal(false);
        fetchData();
      } else {
        toast.error(data.error || "Failed to save blog");
      }
    } catch (err) {
      toast.error("An error occurred");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlog = async (id) => {
    if (!confirm("Are you sure you want to delete this blog post?")) return;

    try {
      const res = await fetch(`/api/admin/blogs?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Blog deleted");
        fetchData();
      } else {
        toast.error(data.error || "Failed to delete");
      }
    } catch (err) {
      toast.error("An error occurred");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Toaster position="top-right" />

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Blog CMS Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Create, edit, and optimize categories and SEO blog articles</p>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-900 p-1.5 rounded-xl">
          <button
            onClick={() => setActiveTab("blogs")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === "blogs" 
                ? "bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-sm" 
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            <FileText className="w-4 h-4" />
            Blogs ({blogs.length})
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
              activeTab === "categories" 
                ? "bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-sm" 
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            <FolderPlus className="w-4 h-4" />
            Categories ({categories.length})
          </button>
        </div>
      </div>

      {/* --- BLOGS TAB --- */}
      {activeTab === "blogs" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">All Blog Articles</h2>
            <button
              onClick={() => handleOpenBlogModal(null)}
              className="flex items-center gap-2 bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-orange-500/20 transition-all transform hover:scale-102 active:scale-98"
            >
              <Plus className="w-5 h-5" />
              Create New Blog
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog) => (
              <motion.div
                key={blog.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-gray-700 flex flex-col group"
              >
                <div className="relative h-48 bg-gray-100 dark:bg-gray-900 overflow-hidden">
                  {blog.featured_image ? (
                    <img src={blog.featured_image} alt={blog.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ImageIcon className="w-12 h-12 opacity-30" />
                    </div>
                  )}
                  <span className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-md ${
                    blog.is_published 
                      ? "bg-green-500/80 text-white" 
                      : "bg-amber-500/80 text-white"
                  }`}>
                    {blog.is_published ? "Published" : "Draft"}
                  </span>
                  <span className="absolute bottom-3 right-3 bg-black/60 text-white px-3 py-1 rounded-md text-xs backdrop-blur-md">
                    {blog.blog_categories?.name || "Uncategorized"}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug">{blog.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{blog.excerpt || "No excerpt..."}</p>
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">{new Date(blog.created_at).toLocaleDateString()}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenBlogModal(blog)}
                        className="p-2 bg-orange-50 dark:bg-gray-700 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-100 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBlog(blog.id)}
                        className="p-2 bg-red-50 dark:bg-gray-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {blogs.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">No blog posts found</h3>
                <p className="text-gray-400 text-sm mt-1">Get started by creating your first medical blog article</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- CATEGORIES TAB --- */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Blog Categories</h2>
            <button
              onClick={() => handleOpenCategoryModal(null)}
              className="flex items-center gap-2 bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-orange-500/20 transition-all transform hover:scale-102 active:scale-98"
            >
              <Plus className="w-5 h-5" />
              Create Category
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4">Category Name</th>
                  <th className="p-4">Slug</th>
                  <th className="p-4">Description</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="p-4 font-bold text-gray-900 dark:text-white">{cat.name}</td>
                    <td className="p-4"><code className="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-orange-600 dark:text-amber-400 text-xs">{cat.slug}</code></td>
                    <td className="p-4 text-gray-500 dark:text-gray-400 max-w-xs truncate">{cat.description || "—"}</td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleOpenCategoryModal(cat)}
                          className="p-2 bg-orange-50 dark:bg-gray-700 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-100 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-2 bg-red-50 dark:bg-gray-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-400">No categories found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- CATEGORY MODAL --- */}
      <AnimatePresence>
        {showCategoryModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto pt-12 sm:pt-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700 my-auto sm:my-8 flex flex-col max-h-[calc(100vh-80px)]"
            >
              <form onSubmit={handleSaveCategory} className="flex flex-col overflow-hidden max-h-full">
                <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shrink-0">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {editingCategory ? "Edit Category" : "Create Category"}
                  </h3>
                  <button type="button" onClick={() => setShowCategoryModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Category Name</label>
                    <input
                      type="text"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value, slug: generateSlug(e.target.value) }))}
                      placeholder="e.g. Exam Preparation"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-orange-500 transition-colors shadow-sm text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">URL Slug</label>
                    <input
                      type="text"
                      value={categoryForm.slug}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, slug: generateSlug(e.target.value) }))}
                      placeholder="e.g. exam-preparation"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-orange-500 transition-colors font-mono text-sm shadow-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Description</label>
                    <textarea
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description..."
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-orange-500 transition-colors shadow-sm text-sm"
                    />
                  </div>
                </div>

                <div className="p-5 sm:p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 font-bold hover:bg-white dark:hover:bg-gray-800 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-orange-500/20 disabled:opacity-50 text-sm"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Category
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- BLOG MODAL --- */}
      <AnimatePresence>
        {showBlogModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto pt-10 sm:pt-14">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-5xl my-auto sm:my-8 overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col max-h-[calc(100vh-60px)]"
            >
              <form onSubmit={handleSaveBlog} className="flex flex-col overflow-hidden max-h-full">
                <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shrink-0">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">
                    {editingBlog ? "Edit Blog Article" : "Create Blog Article"}
                  </h3>
                  <button type="button" onClick={() => setShowBlogModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-8">
                  {/* SECTION 1: General Details */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-orange-500 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2">General Information</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Article Title</label>
                        <input
                          type="text"
                          value={blogForm.title}
                          onChange={(e) => setBlogForm(prev => ({ ...prev, title: e.target.value, slug: generateSlug(e.target.value) }))}
                          placeholder="Enter blog title..."
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-orange-500 transition-colors font-bold shadow-sm text-sm"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">URL Slug</label>
                        <input
                          type="text"
                          value={blogForm.slug}
                          onChange={(e) => setBlogForm(prev => ({ ...prev, slug: generateSlug(e.target.value) }))}
                          placeholder="url-slug-example"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-orange-500 transition-colors font-mono text-sm shadow-sm"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Short Excerpt (Summary)</label>
                        <textarea
                          value={blogForm.excerpt}
                          onChange={(e) => setBlogForm(prev => ({ ...prev, excerpt: e.target.value }))}
                          placeholder="Brief summary appearing on blog cards..."
                          rows={2}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-orange-500 transition-colors text-sm shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: Categorization & Status */}
                  <div className="space-y-4 pt-2">
                    <h4 className="text-xs font-bold text-orange-500 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2">Publishing & Category Settings</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Category</label>
                        <select
                          value={blogForm.category_id}
                          onChange={(e) => setBlogForm(prev => ({ ...prev, category_id: e.target.value }))}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-orange-500 transition-colors shadow-sm font-bold text-sm"
                          required
                        >
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Publish Status</label>
                        <label className="flex items-center gap-3 p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer shadow-sm h-[42px]">
                          <input
                            type="checkbox"
                            checked={blogForm.is_published}
                            onChange={(e) => setBlogForm(prev => ({ ...prev, is_published: e.target.checked }))}
                            className="w-5 h-5 accent-orange-500 rounded"
                          />
                          <span className="text-sm font-bold text-gray-900 dark:text-white">Published</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: Featured Image */}
                  <div className="space-y-4 pt-2">
                    <h4 className="text-xs font-bold text-orange-500 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2">Media & Visuals</h4>
                    
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Featured Image</label>
                      <label className="block w-full max-w-lg aspect-video rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 hover:border-orange-500 transition-colors cursor-pointer relative group shadow-sm">
                        {imagePreview ? (
                          <>
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white font-bold text-xs backdrop-blur-xs">
                              Change Image
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                            <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Click to upload</span>
                            <span className="text-[10px] text-gray-400 mt-1">PNG, JPG, WebP</span>
                          </div>
                        )}
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* SECTION 4: SEO Optimization */}
                  <div className="space-y-4 pt-2">
                    <h4 className="text-xs font-bold text-orange-500 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2">SEO Optimization</h4>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Meta Title</label>
                          <input
                            type="text"
                            value={blogForm.meta_title}
                            onChange={(e) => setBlogForm(prev => ({ ...prev, meta_title: e.target.value }))}
                            placeholder="SEO Title..."
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-orange-500 transition-colors shadow-sm text-sm"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Meta Keywords</label>
                          <input
                            type="text"
                            value={blogForm.meta_keywords}
                            onChange={(e) => setBlogForm(prev => ({ ...prev, meta_keywords: e.target.value }))}
                            placeholder="comma, separated, tags"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-orange-500 transition-colors shadow-sm text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Meta Description</label>
                        <textarea
                          value={blogForm.meta_description}
                          onChange={(e) => setBlogForm(prev => ({ ...prev, meta_description: e.target.value }))}
                          placeholder="SEO Description..."
                          rows={3}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:border-orange-500 transition-colors shadow-sm text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 5: Body Content */}
                  <div className="space-y-4 pt-2">
                    <h4 className="text-xs font-bold text-orange-500 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2">Article Body Content</h4>
                    
                    <div>
                      <RichTextEditor
                        value={blogForm.content}
                        onChange={(val) => setBlogForm(prev => ({ ...prev, content: val }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 rounded-b-2xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowBlogModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 font-bold hover:bg-white dark:hover:bg-gray-800 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-orange-500/20 disabled:opacity-50 text-sm"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Article
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
