"use client";

import React, { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Smartphone,
  Trash2,
  Calendar,
  Info,
  Loader2,
  User,
  Shield,
  Wifi,
  Battery,
  RefreshCw,
  XCircle,
  CheckCircle,
  AlertTriangle,
  Server,
  Hash,
} from "lucide-react";

export default function UserDevicesPage() {
  const [devices, setDevices] = useState([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);

  // Load devices for a user
  const loadDevices = async () => {
    if (!userId.trim()) {
      toast.error("Please enter a user ID");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/devices/get?user_id=${encodeURIComponent(userId.trim())}`);
      const json = await res.json();
      
      if (!json.success) {
        toast.error(json.error || "Failed to load devices");
        setDevices([]);
      } else {
        setDevices(json.devices || []);
        // Add to search history if not already there
        if (!searchHistory.includes(userId.trim())) {
          setSearchHistory(prev => [userId.trim(), ...prev.slice(0, 4)]);
        }
      }
    } catch (err) {
      console.error("Error loading devices:", err);
      toast.error("Network error while loading devices");
    } finally {
      setLoading(false);
    }
  };

  // Remove a device
  const handleRemove = async (device) => {
    if (!confirm(`Are you sure you want to remove this device?\n\nDevice: ${device.device_model || 'Unknown'}\nID: ${device.device_id}\n\nThis will log the user out from this device.`)) return;

    setSubmitting(true);
    const toastId = toast.loading("Removing device...");
    
    try {
      const res = await fetch(`/api/admin/devices/delete?id=${device.id}`, { 
        method: "DELETE" 
      });
      const json = await res.json();
      
      if (!json.success) {
        toast.error(json.error || "Remove failed");
      } else {
        toast.success("Device removed successfully!");
        loadDevices(); // Refresh the list
      }
    } catch (err) {
      console.error("Remove error:", err);
      toast.error("Network error");
    } finally {
      setSubmitting(false);
      toast.dismiss(toastId);
    }
  };

  // Calculate device age
  const getDeviceAge = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // Check if device is active (used within last 7 days)
  const isDeviceActive = (lastUsed) => {
    const lastUsedDate = new Date(lastUsed);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return lastUsedDate > sevenDaysAgo;
  };

  // Stats calculations
  const activeDevices = devices.filter(d => isDeviceActive(d.last_used)).length;
  const totalDevices = devices.length;

  // Loading skeleton
  const renderSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 animate-pulse">
          <div className="flex justify-between items-center">
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48" />
              <div className="flex items-center gap-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
              </div>
            </div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-24" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-6">
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1f2937',
            color: '#fff',
            borderRadius: '0.75rem',
            border: '1px solid #374151',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <div className="mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent">
                User Devices
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                View and manage user device sessions and authorizations
              </p>
            </div>
          </div>

          {/* Search Section */}
          <div className="mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium dark:text-gray-300 mb-2">
                    Search User Devices
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && loadDevices()}
                      placeholder="Enter user ID or email address"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  
                  {/* Search History */}
                  {searchHistory.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Recent searches:</p>
                      <div className="flex flex-wrap gap-2">
                        {searchHistory.map((historyId, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setUserId(historyId);
                              loadDevices();
                            }}
                            className="px-3 py-1.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            {historyId}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-end">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={loadDevices}
                    disabled={loading || submitting || !userId.trim()}
                    className="w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Search Devices
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          {devices.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Smartphone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Devices</p>
                    <p className="text-2xl font-bold dark:text-white mt-1">{totalDevices}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Wifi className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Active Devices</p>
                    <p className="text-2xl font-bold dark:text-white mt-1">{activeDevices}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">User ID</p>
                    <p className="text-2xl font-bold dark:text-white mt-1 truncate">{userId}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          renderSkeleton()
        ) : devices.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="w-24 h-24 mx-auto mb-6 text-gray-400">
              <Smartphone className="w-full h-full opacity-50" />
            </div>
            <h3 className="text-xl font-semibold dark:text-white mb-2">
              {userId ? "No devices found" : "Search User Devices"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {userId 
                ? `No registered devices found for user: ${userId}`
                : "Enter a user ID to view their registered devices"
              }
            </p>
            {userId && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setUserId("")}
                  className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Clear Search
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={loadDevices}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-600 text-white font-semibold"
                >
                  Refresh Search
                </motion.button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Device Information
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Model & Platform
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Last Activity
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {devices.map((device) => {
                      const isActive = isDeviceActive(device.last_used);
                      const deviceAge = getDeviceAge(device.last_used);
                      
                      return (
                        <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <Hash className="w-4 h-4 text-gray-400" />
                                <div className="font-mono text-sm dark:text-white break-all">
                                  {device.device_id}
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Created: {new Date(device.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="text-sm font-medium dark:text-white">
                                {device.device_model || "Unknown Device"}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {device.platform || "Unknown Platform"}
                              </div>
                              {device.app_version && (
                                <div className="text-xs text-blue-600 dark:text-blue-400">
                                  v{device.app_version}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="text-sm dark:text-gray-300">
                                {new Date(device.last_used).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(device.last_used).toLocaleTimeString()}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {deviceAge}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-full ${isActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                {isActive ? (
                                  <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
                                ) : (
                                  <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                )}
                              </div>
                              <span className={`text-sm font-medium ${isActive ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                {isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleRemove(device)}
                                disabled={submitting}
                                className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                                title="Remove device session"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                  // Show device details
                                  toast.success(
                                    <div className="space-y-2">
                                      <p className="font-semibold">Device Details</p>
                                      <p className="text-sm">Model: {device.device_model || 'N/A'}</p>
                                      <p className="text-sm">Platform: {device.platform || 'N/A'}</p>
                                      <p className="text-sm">Version: {device.app_version || 'N/A'}</p>
                                      <p className="text-sm">Last Used: {new Date(device.last_used).toLocaleString()}</p>
                                    </div>,
                                    { duration: 5000 }
                                  );
                                }}
                                className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                title="View device details"
                              >
                                <Info className="w-4 h-4" />
                              </motion.button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary and Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {devices.length} device{devices.length !== 1 ? 's' : ''} for user: <span className="font-semibold dark:text-white">{userId}</span>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setUserId("")}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Clear Search
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={loadDevices}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-600 text-white font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}