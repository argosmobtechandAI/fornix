"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import Navbar from "@/components/dashboard/Navbar";
import { useRouter } from "next/navigation";

export default function UniversityLayout({ children }) {
    const [theme, setTheme] = useState("light");
    const [mounted, setMounted] = useState(false);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme || (prefersDark ? "dark" : "light");

        const root = document.documentElement;
        if (initialTheme === "dark") {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }
        root.setAttribute("data-theme", initialTheme);

        setTheme(initialTheme);
        setMounted(true);

        const role = localStorage.getItem("role");
        if (role !== "university" && role !== "admin") {
            router.push("/admin/login");
        } else {
            setUserRole(role);
        }
    }, [router]);

    const toggleTheme = () => {
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

        setTheme(newTheme);
    };

    if (!userRole || !mounted) return null; // Or a loading spinner

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 overflow-hidden">
            <Sidebar
                role={userRole}
                isOpen={isSidebarOpen}
                onClose={() => setSidebarOpen(false)}
                isAdmin={userRole === "admin"}
                theme={theme}
                onThemeToggle={toggleTheme}
            />

            <div className="flex-1 flex flex-col min-w-0">
                <Navbar
                    role={userRole}
                    onMenuClick={() => setSidebarOpen(!isSidebarOpen)}
                    theme={theme}
                    onThemeToggle={toggleTheme}
                />

                <main className="flex-1 overflow-y-auto">
                    <div className="p-2 sm:p-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
