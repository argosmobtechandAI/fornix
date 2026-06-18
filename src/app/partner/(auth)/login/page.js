"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tag, Mail, Lock, Loader2 } from "lucide-react";

export default function PartnerLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [partner, setPartner] = useState(null);
  const [students, setStudents] = useState([]);
  const [totals, setTotals] = useState(null);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/partner/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Login failed");
      }
      // Persist partner dashboard data for the separate dashboard page
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "partnerDashboardData",
          JSON.stringify({
            partner: data.partner,
            students: data.students || [],
            totals: data.totals || null,
          })
        );
      }
      router.replace("/partner/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50 px-4 py-8">
      <div className="w-full max-w-md bg-white/90 shadow-xl rounded-2xl p-6 sm:p-8 border border-orange-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md">
            <Tag size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Partner Login</h1>
            <p className="text-xs text-gray-600 mt-1">
              Sign in to see students who joined using your promo code and track your commission.
            </p>
          </div>
        </div>
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Mail size={16} />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Lock size={16} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-lg pl-9 pr-3 py-2.5 text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2.5 rounded-lg text-sm font-semibold hover:shadow-lg hover:-translate-y-0.5 transform disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2 justify-center">
                <Loader2 size={16} className="animate-spin" />
                Signing in...
              </span>
            ) : (
              "Login"
            )}
          </button>
        </form>
        <p className="mt-4 text-[11px] text-gray-500 leading-relaxed">
          Having trouble logging in? Please contact the admin team to confirm your partner email and reset your
          password if needed.
        </p>
      </div>
    </div>
  );
}
