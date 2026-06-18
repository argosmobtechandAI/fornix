"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, Save, Loader2, ChevronDown, ChevronRight,
  Globe, BookOpen, Info, Layout, MessageCircle, Target, Search,
  Plus, Trash2, Edit, Upload, ArrowUp, ArrowDown, Sparkles, Check, X, Image
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import RichTextEditor from "@/components/RichTextEditor";

/* =============================================
   PAGE STRUCTURE CONFIG
   Each page defines its sections and fields.
   For course pages, page_slug = course_id.
   ============================================= */

const STATIC_PAGES = [
  { slug: "home", label: "Homepage", icon: Layout },
  { slug: "about", label: "About Us", icon: Info },
  { slug: "contact", label: "Contact Us", icon: MessageCircle },
];

// Course pages use their course_id as page_slug
const COURSE_PAGES = [
  { courseId: "cc613b33-3986-4d67-b33a-009b57a72dc8", label: "AMC CAT MCQ", icon: BookOpen },
  { courseId: "8dc42a27-cf5f-4b08-83ff-809e4f3f6fba", label: "PLAB 1", icon: BookOpen },
  { courseId: "f6dd0d25-825f-4c9c-93fe-58cae47378f3", label: "FMGE", icon: BookOpen },
  { courseId: "1420d4d3-6d23-46f9-9182-726c808f5be4", label: "NEET PG", icon: BookOpen },
];

// Field definition helper
const text = (key, label, placeholder = "") => ({ key, label, type: "text", placeholder });
const textarea = (key, label, placeholder = "") => ({ key, label, type: "textarea", placeholder });
const html = (key, label) => ({ key, label, type: "html" });

/* ---- HOME PAGE SECTIONS ---- */
const HOME_SECTIONS = [
  {
    id: "seo", title: "SEO Meta", icon: Search,
    fields: [
      text("meta_title", "Meta Title", "Fornix Academy | Best Coaching..."),
      textarea("meta_description", "Meta Description", "Prepare for AMC CAT MCQ..."),
    ]
  },
  {
    id: "hero", title: "Hero Section", icon: Layout,
    fields: [
      text("hero_tagline", "Tagline", "NEXT-GEN MEDICAL EXAM PREPARATION"),
      text("hero_heading", "Main Heading", "The Smarter Way to Crack Global Medical Exams"),
      textarea("hero_subheading", "Subheading", "Prepare for AMC CAT MCQ, PLAB 1..."),
      text("hero_cta", "CTA Button Text", "Start Preparing Today"),
    ]
  },
  {
    id: "why_choose", title: "Why Choose Fornix", icon: Target,
    fields: [
      text("why_label", "Section Label", "THE FORNIX ADVANTAGE"),
      text("why_heading", "Heading", "Why Medical Aspirants Choose Fornix Academy"),
      text("why_1_title", "Feature 1 Title", "Clinically Oriented Learning"),
      textarea("why_1_desc", "Feature 1 Description"),
      text("why_2_title", "Feature 2 Title", "7000+ High-Yield Practice Questions"),
      textarea("why_2_desc", "Feature 2 Description"),
      text("why_3_title", "Feature 3 Title", "AI-Powered Performance Analytics"),
      textarea("why_3_desc", "Feature 3 Description"),
      text("why_4_title", "Feature 4 Title", "Expert Audio Revision"),
      textarea("why_4_desc", "Feature 4 Description"),
      text("why_5_title", "Feature 5 Title", "24/7 Academic Support"),
      textarea("why_5_desc", "Feature 5 Description"),
      text("why_6_title", "Feature 6 Title", "Spaced Repetition System"),
      textarea("why_6_desc", "Feature 6 Description"),
    ]
  },
  {
    id: "ecosystem", title: "Unified Ecosystem", icon: Globe,
    fields: [
      text("eco_heading", "Heading", "One Platform for End-to-End Medical Exam Preparation"),
      textarea("eco_paragraph", "Paragraph"),
      text("eco_1_title", "Feature 1 Title", "Adaptive Study Personalization"),
      textarea("eco_1_desc", "Feature 1 Description"),
      text("eco_2_title", "Feature 2 Title", "Collaborative Learning Community"),
      textarea("eco_2_desc", "Feature 2 Description"),
      text("eco_3_title", "Feature 3 Title", "Mentor-Guided Preparation"),
      textarea("eco_3_desc", "Feature 3 Description"),
    ]
  },
  {
    id: "courses", title: "Our Courses Section", icon: BookOpen,
    fields: [
      text("courses_heading", "Heading", "Explore Our Specialized Medical Exam Preparation Programs"),
    ]
  },
  {
    id: "cta", title: "Final CTA", icon: Target,
    fields: [
      text("cta_heading", "Heading", "Ready to Accelerate Your Medical Career?"),
      textarea("cta_paragraph", "Paragraph"),
      text("cta_button", "CTA Button Text", "Begin Your Success Journey"),
    ]
  },
];

/* ---- ABOUT PAGE SECTIONS ---- */
const ABOUT_SECTIONS = [
  {
    id: "seo", title: "SEO Meta", icon: Search,
    fields: [
      text("meta_title", "Meta Title"),
      textarea("meta_description", "Meta Description"),
    ]
  },
  {
    id: "hero", title: "Hero Section", icon: Layout,
    fields: [
      text("hero_tagline", "Tagline", "ABOUT FORNIX ACADEMY"),
      text("hero_heading", "Main Heading", "Empowering Future Doctors for Global Success"),
      textarea("hero_subheading", "Subheading"),
    ]
  },
  {
    id: "who", title: "Who We Are & Stats", icon: Info,
    fields: [
      text("who_heading", "Heading", "Who We Are"),
      textarea("who_paragraph", "Paragraph"),
      text("stat_1_value", "Stat 1 Value", "10k+"),
      text("stat_1_label", "Stat 1 Label", "Students Trusted"),
      text("stat_2_value", "Stat 2 Value", "95%"),
      text("stat_2_label", "Stat 2 Label", "Pass Rate"),
      text("stat_3_value", "Stat 3 Value", "500+"),
      text("stat_3_label", "Stat 3 Label", "Video Hours"),
      text("stat_4_value", "Stat 4 Value", "24/7"),
      text("stat_4_label", "Stat 4 Label", "Support"),
    ]
  },
  {
    id: "vision", title: "Our Vision", icon: Target,
    fields: [
      text("vision_heading", "Heading", "Our Vision"),
      textarea("vision_paragraph", "Paragraph"),
    ]
  },
  {
    id: "mission", title: "Our Mission", icon: Target,
    fields: [
      text("mission_heading", "Heading", "Our Mission"),
      textarea("mission_paragraph", "Paragraph"),
    ]
  },
  {
    id: "journey", title: "Our Journey", icon: Globe,
    fields: [
      text("journey_heading", "Heading", "Our Journey"),
      textarea("journey_paragraph", "Paragraph"),
      text("journey_1_year", "Milestone 1 Year", "2020"),
      text("journey_1_title", "Milestone 1 Title", "Inception"),
      textarea("journey_1_desc", "Milestone 1 Description"),
      text("journey_2_year", "Milestone 2 Year", "2021"),
      text("journey_2_title", "Milestone 2 Title", "First 1000 Students"),
      textarea("journey_2_desc", "Milestone 2 Description"),
      text("journey_3_year", "Milestone 3 Year", "2023"),
      text("journey_3_title", "Milestone 3 Title", "Global Expansion"),
      textarea("journey_3_desc", "Milestone 3 Description"),
      text("journey_4_year", "Milestone 4 Year", "2024"),
      text("journey_4_title", "Milestone 4 Title", "Tech Refresh"),
      textarea("journey_4_desc", "Milestone 4 Description"),
    ]
  },
  {
    id: "trust", title: "Why Students Trust Fornix", icon: Target,
    fields: [
      text("trust_heading", "Heading", "Why Thousands Trust Fornix Academy"),
      text("trust_1_title", "Stat 1 Title", "10,000+ Students Trained"),
      textarea("trust_1_desc", "Stat 1 Description"),
      text("trust_2_title", "Stat 2 Title", "AI-Powered Analytics"),
      textarea("trust_2_desc", "Stat 2 Description"),
      text("trust_3_title", "Stat 3 Title", "Expert Mentorship"),
      textarea("trust_3_desc", "Stat 3 Description"),
    ]
  },
  {
    id: "experts", title: "Meet Our Experts", icon: Info,
    fields: [
      text("experts_heading", "Heading", "Meet Our Expert Faculty"),
      textarea("experts_paragraph", "Paragraph"),
      text("expert_1_name", "Expert 1 Name", "Dr. A. Sharma"),
      text("expert_1_role", "Expert 1 Role", "Chief Medical Officer"),
      textarea("expert_1_desc", "Expert 1 Biography"),
      text("expert_2_name", "Expert 2 Name", "Dr. P. Patel"),
      text("expert_2_role", "Expert 2 Role", "Lead Faculty - Surgery"),
      textarea("expert_2_desc", "Expert 2 Biography"),
      text("expert_3_name", "Expert 3 Name", "Dr. K. Iyer"),
      text("expert_3_role", "Expert 3 Role", "Head of Content"),
      textarea("expert_3_desc", "Expert 3 Biography"),
      text("expert_4_name", "Expert 4 Name", "Dr. S. Khan"),
      text("expert_4_role", "Expert 4 Role", "Student Success Lead"),
      textarea("expert_4_desc", "Expert 4 Biography"),
    ]
  },
  {
    id: "cta", title: "Final CTA", icon: Target,
    fields: [
      text("cta_heading", "Heading", "Join the Future of Medical Learning"),
      textarea("cta_paragraph", "Paragraph"),
      text("cta_button", "CTA Button Text", "Get Started Today"),
    ]
  },
];

/* ---- GENERIC COURSE PAGE SECTIONS ---- */
const COURSE_SECTIONS = [
  {
    id: "seo", title: "SEO Meta", icon: Search,
    fields: [
      text("meta_title", "Meta Title"),
      textarea("meta_description", "Meta Description"),
    ]
  },
  {
    id: "hero", title: "Hero Section", icon: Layout,
    fields: [
      text("hero_tagline", "Tagline"),
      text("hero_heading", "Main Heading"),
      textarea("hero_subheading", "Subheading"),
      text("hero_cta", "CTA Button Text"),
    ]
  },
  {
    id: "overview", title: "Overview Section", icon: Info,
    fields: [
      text("overview_heading", "Heading"),
      textarea("overview_paragraph", "Paragraph"),
    ]
  },
  {
    id: "why_choose", title: "Why Choose Fornix (Table)", icon: Target,
    fields: [
      text("why_heading", "Heading"),
      text("why_subheading", "Subheading"),
      text("why_1_name", "Feature 1 Name"),
      text("why_1_fornix", "Feature 1 Fornix Value"),
      text("why_1_others", "Feature 1 Others Value"),
      text("why_2_name", "Feature 2 Name"),
      text("why_2_fornix", "Feature 2 Fornix Value"),
      text("why_2_others", "Feature 2 Others Value"),
      text("why_3_name", "Feature 3 Name"),
      text("why_3_fornix", "Feature 3 Fornix Value"),
      text("why_3_others", "Feature 3 Others Value"),
      text("why_4_name", "Feature 4 Name"),
      text("why_4_fornix", "Feature 4 Fornix Value"),
      text("why_4_others", "Feature 4 Others Value"),
      text("why_5_name", "Feature 5 Name"),
      text("why_5_fornix", "Feature 5 Fornix Value"),
      text("why_5_others", "Feature 5 Others Value"),
      text("why_6_name", "Feature 6 Name"),
      text("why_6_fornix", "Feature 6 Fornix Value"),
      text("why_6_others", "Feature 6 Others Value"),
      text("why_7_name", "Feature 7 Name"),
      text("why_7_fornix", "Feature 7 Fornix Value"),
      text("why_7_others", "Feature 7 Others Value"),
    ]
  },
  {
    id: "included", title: "What's Included", icon: BookOpen,
    fields: [
      text("included_heading", "Heading"),
      text("included_1_title", "Item 1 Title"),
      textarea("included_1_desc", "Item 1 Description"),
      text("included_2_title", "Item 2 Title"),
      textarea("included_2_desc", "Item 2 Description"),
      text("included_3_title", "Item 3 Title"),
      textarea("included_3_desc", "Item 3 Description"),
      text("included_4_title", "Item 4 Title"),
      textarea("included_4_desc", "Item 4 Description"),
      text("included_5_title", "Item 5 Title"),
      textarea("included_5_desc", "Item 5 Description"),
    ]
  },
  {
    id: "who_for", title: "Who Is This For", icon: Info,
    fields: [
      text("who_heading", "Heading"),
      html("who_content", "Content (Rich Text)"),
    ]
  },
  {
    id: "cta", title: "Final CTA", icon: Target,
    fields: [
      text("cta_heading", "Heading"),
      textarea("cta_paragraph", "Paragraph"),
      text("cta_button", "CTA Button Text"),
    ]
  },
];

/* ---- CONTACT PAGE SECTIONS ---- */
const CONTACT_SECTIONS = [
  {
    id: "hero", title: "Hero Section", icon: Layout,
    fields: [
      text("hero_tagline", "Tagline", "We're Here to Help"),
      text("hero_heading", "Main Heading", "Get In Touch"),
      textarea("hero_subheading", "Subheading", "Have questions about our courses?..."),
    ]
  },
  {
    id: "contact_info", title: "Contact Information", icon: Info,
    fields: [
      text("contact_email", "Email Address", "Venkat@fornixacademy.com"),
      text("contact_phone", "Phone Number", "+996 552 448 787"),
      textarea("contact_address", "Physical Address", "Fornix Academy, Medical Education Hub"),
      text("contact_hours", "Working Hours", "Monday – Saturday, 9:00 AM – 7:00 PM"),
    ]
  },
  {
    id: "social_links", title: "Social & Chat Links", icon: Globe,
    fields: [
      text("contact_whatsapp", "WhatsApp Link", "https://wa.me/+996552448787"),
      text("social_instagram", "Instagram Link"),
      text("social_facebook", "Facebook Link"),
      text("social_telegram", "Telegram Link"),
    ]
  }
];

function getSections(slug) {
  if (slug === "home") return HOME_SECTIONS;
  if (slug === "about") return ABOUT_SECTIONS;
  if (slug === "contact") return CONTACT_SECTIONS;
  return COURSE_SECTIONS;
}

/* =============================================
   MAIN CMS PAGE COMPONENT
   ============================================= */
export default function CMSPage() {
  const [courses, setCourses] = useState([]);
  const [activeTab, setActiveTab] = useState("home");
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    async function loadCourses() {
      try {
        const res = await fetch("/api/admin/courses");
        const json = await res.json();
        if (json.success) {
          setCourses(json.data || []);
        }
      } catch (err) {
        console.error("Courses load error:", err);
      }
    }
    loadCourses();
  }, []);

  const allTabs = [
    ...STATIC_PAGES.map(p => ({ slug: p.slug, label: p.label, icon: p.icon })),
    { slug: "experts", label: "Faculty Experts", icon: Info },
    ...courses.map(c => ({ slug: c.id, label: c.name, icon: BookOpen })),
  ];

  const sections = getSections(
    STATIC_PAGES.find(p => p.slug === activeTab) ? activeTab : "course"
  );

  // Load content when tab changes
  const loadContent = useCallback(async (slug) => {
    if (slug === "experts") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/cms?page=${slug}`);
      const json = await res.json();
      if (json.success && json.map) {
        setFormData(json.map);
      } else {
        setFormData({});
      }
    } catch (err) {
      console.error("CMS load error:", err);
      setFormData({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContent(activeTab);
    // Expand first section by default
    if (activeTab === "experts") {
      setExpandedSections({});
      return;
    }
    const sects = getSections(
      STATIC_PAGES.find(p => p.slug === activeTab) ? activeTab : "course"
    );
    if (sects.length > 0) {
      setExpandedSections({ [sects[0].id]: true });
    }
  }, [activeTab, loadContent]);

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build sections array from all fields
      const allFields = sections.flatMap(s => s.fields);
      const sectionsPayload = allFields
        .filter(f => formData[f.key] !== undefined && formData[f.key] !== "")
        .map(f => ({
          section_key: f.key,
          content: formData[f.key] || "",
          content_type: f.type === "html" ? "html" : "text",
        }));

      const res = await fetch("/api/admin/cms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_slug: activeTab,
          sections: sectionsPayload,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Save failed");
      toast.success(`Content saved! (${json.count} fields updated)`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const activeTabInfo = allTabs.find(t => t.slug === activeTab);

  return (
    <div className="min-h-screen">
      <Toaster position="top-right" />

      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
            <Globe className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Website CMS</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Manage all public-facing website content</p>
          </div>
        </div>
      </div>

      {/* Page Tabs */}
      <div className="mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex gap-2 min-w-max">
          {allTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.slug;
            return (
              <button
                key={tab.slug}
                onClick={() => setActiveTab(tab.slug)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-orange-600 text-white shadow-lg shadow-orange-200 dark:shadow-none"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Editor */}
      {activeTab === "experts" ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <ExpertsManager />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          {/* Active Tab Header */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              {activeTabInfo && <activeTabInfo.icon size={20} className="text-orange-600" />}
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {activeTabInfo?.label || "Page"} Content
              </h2>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-200 dark:shadow-none"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>

          {/* Sections */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-orange-600" />
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {sections.map(section => {
                const isExpanded = expandedSections[section.id];
                const Icon = section.icon;
                return (
                  <div key={section.id}>
                    {/* Section Header */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center gap-3 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                    >
                      <div className="p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <Icon size={16} className="text-orange-600 dark:text-orange-400" />
                      </div>
                      <span className="flex-1 font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">
                        {section.title}
                      </span>
                      <span className="text-xs text-gray-400 mr-2">{section.fields.length} fields</span>
                      {isExpanded ? (
                        <ChevronDown size={18} className="text-gray-400" />
                      ) : (
                        <ChevronRight size={18} className="text-gray-400" />
                      )}
                    </button>

                    {/* Section Fields */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 space-y-5 bg-gray-50/50 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-800">
                            <div className="pt-4" />
                            {section.fields.map(field => (
                              <FieldRenderer
                                key={field.key}
                                field={field}
                                value={formData[field.key] || ""}
                                onChange={(val) => handleChange(field.key, val)}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bottom Save Bar */}
      {activeTab !== "experts" && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-8 py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-200 dark:shadow-none"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? "Saving..." : "Save All Changes"}
          </button>
        </div>
      )}
    </div>
  );
}

/* =============================================
   FIELD RENDERER COMPONENT
   ============================================= */
function FieldRenderer({ field, value, onChange }) {
  const { key, label, type, placeholder } = field;

  if (type === "html") {
    return (
      <RichTextEditor
        label={label}
        value={value}
        onChange={onChange}
      />
    );
  }

  if (type === "textarea") {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {label}
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
          rows={3}
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all text-sm resize-y"
        />
      </div>
    );
  }

  // Default: text input
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || `Enter ${label.toLowerCase()}...`}
        className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all text-sm"
      />
    </div>
  );
}

/* =============================================
   DYNAMIC FACULTY EXPERTS MANAGER COMPONENT
   ============================================= */
function ExpertsManager() {
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedExpert, setSelectedExpert] = useState(null);
  
  // Form states
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [orderIndex, setOrderIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const fetchExperts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/experts");
      const json = await res.json();
      if (json.success) {
        setExperts(json.data);
      }
    } catch (err) {
      toast.error("Failed to load experts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperts();
  }, []);

  const openAddModal = () => {
    setSelectedExpert(null);
    setName("");
    setRole("");
    setDescription("");
    setImageUrl("");
    setOrderIndex(experts.length + 1);
    setModalOpen(true);
  };

  const openEditModal = (expert) => {
    setSelectedExpert(expert);
    setName(expert.name);
    setRole(expert.role);
    setDescription(expert.description || "");
    setImageUrl(expert.image_url || "");
    setOrderIndex(expert.order_index || 0);
    setModalOpen(true);
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !role) {
      toast.error("Name and Role are required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { name, role, description, image_url: imageUrl, order_index: Number(orderIndex) };
      if (selectedExpert) {
        payload.id = selectedExpert.id;
      }
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch("/api/admin/experts", {
        method: selectedExpert ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        toast.success(selectedExpert ? "Expert updated successfully!" : "Expert created successfully!");
        setModalOpen(false);
        fetchExperts();
      } else {
        toast.error(json.error || "Save failed");
      }
    } catch (err) {
      toast.error("An error occurred while saving");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this expert?")) return;
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/admin/experts?id=${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": token ? `Bearer ${token}` : ""
        }
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Expert deleted successfully");
        fetchExperts();
      } else {
        toast.error(json.error || "Delete failed");
      }
    } catch (err) {
      toast.error("An error occurred while deleting");
    }
  };

  const handleOrderChange = async (expert, direction) => {
    const currIdx = experts.indexOf(expert);
    if (direction === "up" && currIdx === 0) return;
    if (direction === "down" && currIdx === experts.length - 1) return;

    const targetIdx = direction === "up" ? currIdx - 1 : currIdx + 1;
    const swapWith = experts[targetIdx];

    const tempOrder = expert.order_index;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    try {
      await Promise.all([
        fetch("/api/admin/experts", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
          },
          body: JSON.stringify({ ...expert, order_index: swapWith.order_index })
        }),
        fetch("/api/admin/experts", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
          },
          body: JSON.stringify({ ...swapWith, order_index: tempOrder })
        })
      ]);
      fetchExperts();
    } catch (err) {
      toast.error("Failed to swap order");
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Expert Faculty Members</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Create, edit, remove, and reorder faculty experts with uploaded profile pictures</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-all shadow-md self-start md:self-auto"
        >
          <Plus size={16} />
          Add Faculty Expert
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-orange-600" />
        </div>
      ) : experts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/20">
          <Info size={32} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No experts defined yet. Click "Add Faculty Expert" to get started!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {experts.map((item, index) => (
            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 rounded-2xl shadow-xs hover:shadow-md transition">
              <div className="flex items-center gap-5">
                {/* Profile Image Preview */}
                <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-700 overflow-hidden border border-gray-100 dark:border-gray-600 flex items-center justify-center shadow-inner shrink-0">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-gray-400">{item.name.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-lg text-gray-950 dark:text-white">{item.name}</h4>
                  <p className="text-orange-500 font-semibold text-sm">{item.role}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 line-clamp-1">{item.description}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 self-end sm:self-auto">
                {/* Reordering Controls */}
                <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700 p-1 rounded-xl">
                  <button
                    disabled={index === 0}
                    onClick={() => handleOrderChange(item, "up")}
                    className="p-1.5 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-30 rounded-lg transition text-gray-500"
                    title="Move Up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    disabled={index === experts.length - 1}
                    onClick={() => handleOrderChange(item, "down")}
                    className="p-1.5 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-30 rounded-lg transition text-gray-500"
                    title="Move Down"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>

                <button
                  onClick={() => openEditModal(item)}
                  className="p-2.5 bg-gray-50 dark:bg-gray-700 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-gray-600 dark:text-gray-400 hover:text-orange-600 rounded-xl transition"
                  title="Edit"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2.5 bg-gray-50 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-600 dark:text-gray-400 hover:text-red-600 rounded-xl transition"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Add / Edit */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-3xl w-full max-w-lg shadow-2xl relative my-8"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-5">
                {selectedExpert ? "Edit Faculty Expert" : "Add Faculty Expert"}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                    Profile Image
                  </label>
                  <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600 shrink-0">
                      {imageUrl ? (
                        <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Image size={24} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                        id="expert-image-file"
                      />
                      <label
                        htmlFor="expert-image-file"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition shadow-xs"
                      >
                        <Upload size={14} />
                        Choose Photo
                      </label>
                      <p className="text-[10px] text-gray-400 mt-1.5">PNG, JPG, or WEBP. Upload size capped at 4MB.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                      Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dr. A. Sharma"
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                      Role
                    </label>
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g. Chief Medical Officer"
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                    Biography / Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short description of the expert's qualifications and specialties..."
                    rows={3}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition text-sm resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                    Order Index (Position)
                  </label>
                  <input
                    type="number"
                    value={orderIndex}
                    onChange={(e) => setOrderIndex(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition text-sm"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-lg shadow-orange-200 dark:shadow-none text-sm"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    {submitting ? "Saving..." : "Save Expert"}
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

