"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tag, Users, DollarSign, Percent, LogOut, Calendar } from "lucide-react";

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [partner, setPartner] = useState(null);
  const [students, setStudents] = useState([]);
  const [totals, setTotals] = useState(null);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem("partnerDashboardData") : null;
      if (!raw) {
        router.replace("/partner/login");
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.partner) {
        router.replace("/partner/login");
        return;
      }
      setPartner(parsed.partner);
      setStudents(parsed.students || []);
      setTotals(parsed.totals || null);
    } catch (e) {
      router.replace("/partner/login");
    }
  }, [router]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("partnerDashboardData");
    }
    router.replace("/partner/login");
  };

  if (!partner) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex flex-col items-center px-4 py-10">
      <div className="w-full bg-white/90 shadow-xl rounded-2xl p-6 sm:p-8 border border-orange-100">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md">
              <Tag size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Welcome, {partner.name || "Partner"}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                This is your personal partner dashboard. Track students joining with your promo code and your earnings.
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>

        {/* Promo code card and stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-1 bg-slate-900 text-white rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-white/10">
                <Tag size={18} />
              </div>
              <span className="text-xs uppercase tracking-wide text-slate-200">Your Promo Code</span>
            </div>
            <div className="font-mono text-xl sm:text-2xl font-bold break-all">{partner.promo_code}</div>
            {typeof partner.commission_percent === "number" && (
              <p className="mt-3 text-xs text-slate-300">
                You earn
                <span className="font-semibold text-white"> {partner.commission_percent}%</span> commission on the
                net amount after discount for each student who joins using this code.
              </p>
            )}
          </div>

          {totals && (
            <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-3 flex items-start gap-2">
                <div className="p-2 rounded-xl bg-white/70 text-orange-500">
                  <Users size={18} />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total Students</p>
                  <p className="text-xl font-semibold text-gray-900">{totals.total_students}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3 flex items-start gap-2">
                <div className="p-2 rounded-xl bg-white/70 text-emerald-500">
                  <DollarSign size={18} />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Amount Before Discount</p>
                  <p className="text-xl font-semibold text-gray-900">₹{totals.total_amount_before.toFixed(2)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-purple-100 bg-purple-50/70 p-3 flex items-start gap-2">
                <div className="p-2 rounded-xl bg-white/70 text-purple-500">
                  <Percent size={18} />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total Discount Given</p>
                  <p className="text-xl font-semibold text-gray-900">₹{totals.total_discount_amount.toFixed(2)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-3 flex items-start gap-2 col-span-2 sm:col-span-1">
                <div className="p-2 rounded-xl bg-white/70 text-amber-500">
                  <DollarSign size={18} />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Your Total Commission</p>
                  <p className="text-xl font-semibold text-gray-900">₹{totals.total_commission_amount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Students table */}
        <div className="bg-white/80 border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Students Joined with Your Code</h2>
              <p className="text-xs text-gray-500">List of students who used your promo code while joining.</p>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
              <Users size={14} />
              <span>{students.length} student{students.length === 1 ? "" : "s"}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs sm:text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Student</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Email</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Phone</th>
                  <th className="hidden md:table-cell px-3 py-2 text-left font-semibold text-gray-700">Joined At</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Amount Before</th>
                  <th className="hidden sm:table-cell px-3 py-2 text-right font-semibold text-gray-700">Discount</th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">Net Amount</th>
                  <th className="hidden sm:table-cell px-3 py-2 text-right font-semibold text-gray-700">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-gray-500 text-sm">
                      No students have joined with your promo code yet.
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr key={s.promo_use_id} className="hover:bg-gray-50/80">
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900 text-xs sm:text-sm">{s.user.name || "-"}</div>
                        <div className="md:hidden text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Calendar size={12} className="text-gray-400" />
                          <span>
                            {s.joined_at ? new Date(s.joined_at).toLocaleDateString() : "-"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-700">{s.user.email || "-"}</td>
                      <td className="px-3 py-2 text-gray-700">{s.user.phone || "-"}</td>
                      <td className="hidden md:table-cell px-3 py-2 text-gray-700">
                        {s.joined_at ? new Date(s.joined_at).toLocaleString() : "-"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-800 font-medium">
                        {s.amount_before != null ? `₹${Number(s.amount_before).toFixed(2)}` : "-"}
                      </td>
                      <td className="hidden sm:table-cell px-3 py-2 text-right text-gray-700">
                        {s.discount_amount != null ? `₹${Number(s.discount_amount).toFixed(2)}` : "-"}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-800 font-medium">
                        {s.net_amount != null ? `₹${Number(s.net_amount).toFixed(2)}` : "-"}
                      </td>
                      <td className="hidden sm:table-cell px-3 py-2 text-right text-gray-700">
                        {s.commission_amount != null ? `₹${Number(s.commission_amount).toFixed(2)}` : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
