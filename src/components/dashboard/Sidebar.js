"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Upload,
  X,
  Settings,
  LogOut,
  User,
  ChevronRight,
  Moon,
  Sun,
  BarChart3,
  FileText,
  Image,
  Zap,
  MessageCircle,
  Tag,
  Inbox,
  MessageSquare,
  Globe,
} from "lucide-react";
import { jwtDecode } from "jwt-decode";

export default function Sidebar({
  role = "admin",
  isOpen = false,
  onClose,
  theme,
  onThemeToggle,
}) {
  const isAdmin = role === "admin";
  const pathname = usePathname();
  const [userInfo, setUserInfo] = useState({ name: "", email: "" });
  const themeButtonRef = useRef(null);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/auth/me", { method: "GET" });
        const json = await res.json();
        if (json?.success && json.user) {
          setUserInfo({
            name: json.user.name || "User",
            email: json.user.email || "no-email@fornix.com",
          });
          return;
        }
      } catch (e) {
        // fall through to local decode
      }

      const cookieToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("token="))
        ?.split("=")[1];
      const lsToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const token = cookieToken || lsToken;
      if (!token) return;
      try {
        const decoded = jwtDecode(token);
        setUserInfo({
          name: decoded.name || "User",
          email: decoded.email || "no-email@fornix.com",
        });
      } catch (error) {
        console.error("Failed to decode JWT:", error);
      }
    };

    fetchMe();
  }, []);

  // Direct event listener for theme toggle - using capture phase
  useEffect(() => {
    const button = themeButtonRef.current;
    if (!button) {
      return;
    }

    const handleClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const root = document.documentElement;
      const isDark = root.classList.contains("dark");
      const newTheme = isDark ? "light" : "dark";

      // Toggle directly
      if (newTheme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      root.setAttribute("data-theme", newTheme);
      localStorage.setItem('theme', newTheme);

      // Force a re-render by updating a dummy state or calling the prop
      if (onThemeToggle) {
        onThemeToggle();
      }

    };

    // Use capture phase to catch event early
    button.addEventListener('click', handleClick, true);
    button.addEventListener('mousedown', handleClick, true);

    return () => {
      button.removeEventListener('click', handleClick, true);
      button.removeEventListener('mousedown', handleClick, true);
    };
  }, [onThemeToggle]);

  const menuItems = isAdmin
    ? [
      { name: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
      { name: "Website CMS", icon: FileText, href: "/admin/cms" },
      { name: "SEO Manager", icon: Globe, href: "/admin/seo" },
      { name: "FAQ CMS", icon: MessageCircle, href: "/admin/faqs" },
      { name: "Blog CMS", icon: BookOpen, href: "/admin/blogs" },
      { name: "Universities", icon: BookOpen, href: "/admin/universities" },
      { name: "Doctors", icon: Users, href: "/admin/doctors" },
      { name: "Courses", icon: BarChart3, href: "/admin/courses" },
      { name: "Course Videos", icon: Upload, href: "/admin/course-videos" },
      { name: "Course Features", icon: Settings, href: "/admin/course-features" },
      { name: "Subjects", icon: BarChart3, href: "/admin/questions" },
      { name: "Merge Subjects", icon: ChevronRight, href: "/admin/subject-merge" },
      { name: "Notes", icon: FileText, href: "/admin/notes" },
      { name: "Podcasts", icon: FileText, href: "/admin/podcasts" },
      { name: "Mock Tests", icon: Zap, href: "/admin/mock-tests" },
      { name: "Tests & Discussions", icon: MessageCircle, href: "/admin/discussions" },
      { name: "Bulk Upload", icon: Upload, href: "/admin/bulk-upload" },
      { name: "Banners", icon: Image, href: "/admin/banners" },
      { name: "Testimonials", icon: Image, href: "/admin/testimonials" },
      { name: "Brochure Leads", icon: FileText, href: "/admin/brochure-leads" },
      { name: "Contact Leads", icon: MessageSquare, href: "/admin/contact-leads" },
      { name: "Users", icon: Users, href: "/admin/users" },
      { name: "Bulk Messages", icon: MessageSquare, href: "/admin/bulk-messages" },
      { name: "Add Student", icon: User, href: "/admin/students/add" },
      { name: "Plans", icon: FileText, href: "/admin/plans" },
      { name: "Add-Ons", icon: Settings, href: "/admin/addons" },
      { name: "Subscriptions", icon: ChevronRight, href: "/admin/subscriptions" },
      { name: "Payments", icon: FileText, href: "/admin/payments" },
      { name: "Promo Codes", icon: Tag, href: "/admin/billing/promo-codes" },
      { name: "Promo Uses", icon: Tag, href: "/admin/billing/promo-uses" },
      { name: "Devices", icon: Settings, href: "/admin/devices" },
      { name: "Manage PY Topics", icon: BookOpen, href: "/admin/py-topics" },
      { name: "Countries & Colleges", icon: BookOpen, href: "/admin/countries" },
      { name: "My Profile", icon: User, href: "/admin/profile" },
    ]
    : role === "university"
      ? [
        { name: "Dashboard", icon: LayoutDashboard, href: "/university/dashboard" },
        { name: "Students", icon: Users, href: "/university/students" },
        { name: "Exams", icon: FileText, href: "/university/exams" },
        { name: "Analytics & Reports", icon: BarChart3, href: "/university/analytics" },
        { name: "Activity Logs", icon: FileText, href: "/university/activity" },
        { name: "My Profile", icon: User, href: "/university/profile" },
      ]
      : [
        { name: "Dashboard", icon: LayoutDashboard, href: "/doctor/dashboard" },
        { name: "My Subjects", icon: BookOpen, href: "/doctor/questions" },
        { name: "Discussions", icon: MessageCircle, href: "/doctor/discussions" },
      ];

  const handleLogout = () => {
    localStorage.clear();
    document.cookie = "token=; Max-Age=0; path=/";
    window.location.href = role === "doctor" ? "/doctor/login" : "/admin/login";
  };

  const sidebarContent = (
    <motion.aside
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      exit={{ x: -300 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="w-64 bg-white dark:bg-gray-900 shadow-xl h-full flex flex-col z-50 fixed lg:static overflow-hidden border-r border-gray-200 dark:border-gray-800"
    >
      {/* Header */}
      <div className="p-6 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-linear-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-sm"></div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Fornix
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs">
                {isAdmin ? "Admin" : "Doctor"}
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg bg-gray-100 dark:bg-gray-800 transition-all duration-200"
          >
            <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </motion.button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={item.href}
                  onClick={() => window.innerWidth < 1024 && onClose()}
                  className={`group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 font-medium text-sm ${isActive
                    ? "bg-orange-50 dark:bg-amber-900/20 text-orange-700 dark:text-amber-400 border border-orange-100 dark:border-amber-800"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                    }`}
                >
                  <item.icon
                    size={18}
                    className={
                      isActive
                        ? "text-orange-700 dark:text-amber-400"
                        : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                    }
                  />
                  <span className="flex-1">{item.name}</span>
                  {isActive && (
                    <div className="w-1 h-1 bg-orange-700 dark:bg-amber-400 rounded-full"></div>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </div>
      </nav>

      {/* Footer Section */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">


        {/* User Info */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div className="w-8 h-8 bg-linear-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {userInfo.name || "Loading..."}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
              {userInfo.email || "••••••••"}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <motion.button
          suppressHydrationWarning
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 group border border-red-200 dark:border-red-800"
        >
          <LogOut size={16} className="" />
          <span className="text-sm font-medium flex-1 text-left">Logout</span>
        </motion.button>
      </div>
    </motion.aside>
  );

  // Global click handler as backup
  useEffect(() => {
    const handleGlobalClick = (e) => {
      // Check if click is on theme toggle button
      const target = e.target;
      const button = target.closest('[data-theme-toggle]');
      if (button) {
        e.preventDefault();
        e.stopPropagation();

        const root = document.documentElement;
        const isDark = root.classList.contains("dark");
        const newTheme = isDark ? "light" : "dark";

        if (newTheme === "dark") {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
        root.setAttribute("data-theme", newTheme);
        localStorage.setItem('theme', newTheme);

        if (onThemeToggle) onThemeToggle();
      }
    };

    document.addEventListener('click', handleGlobalClick, true);
    return () => document.removeEventListener('click', handleGlobalClick, true);
  }, [onThemeToggle]);

  return (
    <>
      <div className="hidden lg:block">{sidebarContent}</div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            />
            {sidebarContent}
          </>
        )}
      </AnimatePresence>
    </>
  );
}
