"use client";
import {
  LogOut,
  Menu,
  User,
  Settings,
  ChevronDown,
  Bell,
  Search,
  Moon,
  Sun,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { jwtDecode } from "jwt-decode";


export default function Navbar({
  role = "admin",
  onMenuClick,
  theme,
  onThemeToggle,
}) {
  const title = role === "doctor" ? "Doctor" : "Admin";
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [userInfo, setUserInfo] = useState({ name: "", email: "" });
  // ✅ Fetch user info via API (falls back to local decode)
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

      // Fallback to decode token locally
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
  const logout = () => {
    localStorage.clear();
    document.cookie = "token=; Max-Age=0; path=/";
    window.location.href = role === "doctor" ? "/doctor/login" : "/admin/login";
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userMenuItems = [
    {
      icon: User,
      label: "Profile",
      onClick: () => {
        window.location.href = role === "admin" ? "/admin/profile" : role === "university" ? "/university/profile" : "/doctor/profile";
      },
    },
    { icon: LogOut, label: "Logout", onClick: logout, isDestructive: true },
  ];

  return (
    <motion.nav
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex justify-between items-center relative z-40"
    >
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
        >
          <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </motion.button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-sm"></div>
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-900 dark:text-white">
                {title}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="hidden md:flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 min-w-60">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            suppressHydrationWarning
            type="text"
            placeholder="Search..."
            className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 flex-1"
          />
        </div>

        {/* Theme Toggle */}
        <motion.button
          suppressHydrationWarning
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (onThemeToggle) {
              onThemeToggle();
            }
          }}
          type="button"
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          )}
        </motion.button>

        {/* Notifications */}
        <motion.button
          suppressHydrationWarning
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 relative"
        >
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-gray-900"></span>
        </motion.button>

        {/* Separator */}
        <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <motion.button
            suppressHydrationWarning
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {userInfo.name || "Loading..."}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                {userInfo.email || "••••••••"}
              </p>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""
                }`}
            />
          </motion.button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
              >
                {/* User Info */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {userInfo.name || "User"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {userInfo.email || "unknown@fornix.com"}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                          Online
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="p-2">
                  {userMenuItems.map((item, index) => (
                    <motion.button
                      key={item.label}
                      whileHover={{
                        backgroundColor: item.isDestructive
                          ? "rgb(254, 242, 242)"
                          : "rgb(248, 250, 252)",
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        item.onClick();
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left group ${item.isDestructive
                        ? "text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                        : "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="text-sm font-medium flex-1">
                        {item.label}
                      </span>
                      {item.isDestructive && (
                        <LogOut className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      )}
                    </motion.button>
                  ))}
                </div>

                {/* Quick Stats Footer */}
                <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Sessions
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        24
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Tasks
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        12
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Hours
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        8.5
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.nav>
  );
}
