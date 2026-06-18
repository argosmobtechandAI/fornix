"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BookOpen, 
  User, 
  Stethoscope, 
  Menu, 
  X,
  Home,
  BookText,
  Users,
  BarChart3,
  Settings,
  LogOut
} from "lucide-react";

export default function Layout({ children }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { href: "/", label: "Home", icon: Home , index_key:"home-page"},
    { href: "#", label: "Courses", icon: BookText , index_key:"courses-page"},
    { href: "#", label: "About", icon: Users , index_key:"about-page"},
    { href: "#", label: "Results", icon: BarChart3 , index_key:"results-page"},
    { href: "#", label: "Contact", icon: Settings , index_key:"contact-page"},
  ];

  const isDashboard = pathname.includes('/dashboard');

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-800 to-rose-900">
      {/* Header */}
      {!isDashboard && (
        <header className={`fixed w-full z-50 transition-all duration-300 ${
          scrolled 
            ? "bg-white/10 backdrop-blur-lg border-b border-white/20" 
            : "bg-transparent"
        }`}>
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-all duration-300">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute -inset-1 bg-white/20 rounded-xl blur-sm group-hover:blur-md transition-all duration-300 -z-10"></div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Fornix Medical</h1>
                  <p className="text-xs text-amber-200">Preparation Excellence</p>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-8">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.index_key}
                      href={item.href}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                        isActive
                          ? "bg-white/20 text-white backdrop-blur-sm"
                          : "text-amber-100 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon size={16} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Login Buttons - Desktop */}
              <div className="hidden lg:flex items-center gap-4">
                <Link
                  href="/admin/login"
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-600 to-amber-700 text-white rounded-xl hover:from-orange-700 hover:to-amber-800 transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-sm border border-white/20"
                >
                  <User size={16} />
                  Admin Login
                </Link>
                <Link
                  href="/doctor/login"
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-lg hover:shadow-xl backdrop-blur-sm border border-white/20"
                >
                  <Stethoscope size={16} />
                  Doctor Login
                </Link>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 text-white hover:bg-white/10 rounded-xl transition-all duration-300"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
              <div className="lg:hidden absolute top-16 left-0 w-full bg-white/10 backdrop-blur-lg border-t border-white/20">
                <div className="container mx-auto px-4 py-4">
                  <nav className="flex flex-col gap-2">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.index_key}
                          href={item.href}
                          onClick={() => setIsMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "text-amber-100 hover:bg-white/10"
                          }`}
                        >
                          <Icon size={18} />
                          {item.label}
                        </Link>
                      );
                    })}
                    
                    <div className="border-t border-white/20 pt-4 mt-2">
                      <Link
                        href="/admin/login"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 bg-orange-600 text-white rounded-xl hover:bg-amber-700 transition-all duration-300 mb-2"
                      >
                        <User size={18} />
                        Admin Login
                      </Link>
                      <Link
                        href="/doctor/login"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-300"
                      >
                        <Stethoscope size={18} />
                        Doctor Login
                      </Link>
                    </div>
                  </nav>
                </div>
              </div>
            )}
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={isDashboard ? "min-h-screen" : "pt-16"}>
        {children}
      </main>

      {/* Footer */}
      {!isDashboard && (
        <footer className="bg-white/5 backdrop-blur-lg border-t border-white/10">
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Fornix Medical</h2>
                    <p className="text-amber-200 text-sm">Preparation Excellence</p>
                  </div>
                </div>
                <p className="text-amber-100 max-w-md">
                  Empowering medical professionals with comprehensive preparation and 
                  advanced learning methodologies for excellence in healthcare.
                </p>
              </div>
              
              <div>
                <h3 className="text-white font-semibold mb-4">Quick Links</h3>
                <div className="space-y-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.index_key}
                      href={item.href}
                      className="block text-amber-100 hover:text-white transition-colors duration-300"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-white font-semibold mb-4">Connect</h3>
                <div className="space-y-2">
                  <Link href="/admin/login" className="block text-amber-100 hover:text-white transition-colors duration-300">
                    Admin Portal
                  </Link>
                  <Link href="/doctor/login" className="block text-amber-100 hover:text-white transition-colors duration-300">
                    Doctor Portal
                  </Link>
                  <Link href="/contact" className="block text-amber-100 hover:text-white transition-colors duration-300">
                    Support
                  </Link>
                </div>
              </div>
            </div>
            
            <div className="border-t border-white/10 mt-8 pt-6 text-center">
              <p className="text-amber-200 text-sm">
                © 2025 Fornix Medical. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}