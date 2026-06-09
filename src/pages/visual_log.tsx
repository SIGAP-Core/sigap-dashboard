import React, { useState, useEffect } from "react";
import {
  Search,
  Calendar,
  Download,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { ImageWithFallback } from "@/components/ImageWithFallback";

interface VisualLog {
  id: string;
  timestamp: string;
  cameraImage: string;
  aiDecision: "Success" | "Failed";
  vehicleCount: number;
  confidence: number;
}

export default function VisualLogs() {
  const [logs, setLogs] = useState<VisualLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<VisualLog[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  // Filter logs berdasarkan search dan date
  useEffect(() => {
    let result = logs;

    // Filter berdasarkan search (cari di decision status atau vehicle count)
    if (searchInput.trim()) {
      const search = searchInput.toLowerCase();
      result = result.filter(
        (log) =>
          log.aiDecision.toLowerCase().includes(search) ||
          log.vehicleCount.toString().includes(search) ||
          log.timestamp.includes(search),
      );
    }

    // Filter berdasarkan date
    if (dateFilter) {
      result = result.filter((log) => log.timestamp.startsWith(dateFilter));
    }

    setFilteredLogs(result);
  }, [searchInput, dateFilter, logs]);

  /**
   * Fetch visual logs dari Hadoop (Real Data dari Camera)
   * Fallback ke mock jika Hadoop belum ready
   */
  const fetchVisualLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (dateFilter) {
        params.append("startDate", dateFilter);
      }
      params.append("limit", "100");
      params.append("offset", "0");

      console.log("[Visual Logs] Fetching REAL data from Hadoop/Hive...");

      // Fetch dari real endpoint (data dari camera capture)
      const response = await fetch(`/api/visual-logs?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        console.log(
          `[Visual Logs] Fetched ${result.data.length} logs from Hadoop`,
        );
        setLogs(result.data);
        setLastFetch(new Date());
      } else {
        throw new Error(result.error || "Failed to fetch logs");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("[Visual Logs] Fetch error:", errorMsg);

      // Fallback ke mock data jika real endpoint fail
      if (
        errorMsg.includes("Connect Timeout") ||
        errorMsg.includes("ECONNREFUSED")
      ) {
        console.log("[Visual Logs] Hive not ready, showing notification...");
        setError("⚠️ Hadoop/Hive belum siap. Untuk demonstrasi, pastikan:");
        setError((prev) => prev + "\n• Hive Server running di port 8883");
        setError((prev) => prev + "\n• MySQL Metastore sudah setup");
        setError((prev) => prev + "\n• visual_logs table sudah create");
        setError(
          (prev) =>
            prev +
            "\n\nData real dari camera akan tampil di sini ketika Hive ready.",
        );
        setLogs([]); // Clear logs
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch visual logs on component mount
  useEffect(() => {
    fetchVisualLogs();
  }, []);

  const handleExport = () => {
    const csv = [
      ["Date & Time", "AI Decision", "Vehicle Count", "Confidence %"],
      ...filteredLogs.map((log) => [
        log.timestamp,
        log.aiDecision,
        log.vehicleCount,
        log.confidence,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visual-logs-${new Date().toISOString()}.csv`;
    a.click();
  };

  const successCount = filteredLogs.filter(
    (l) => l.aiDecision === "Success",
  ).length;
  const failureCount = filteredLogs.filter(
    (l) => l.aiDecision === "Failed",
  ).length;
  const successRate =
    filteredLogs.length > 0
      ? ((successCount / filteredLogs.length) * 100).toFixed(1)
      : 0;

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: "#0F172A" }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-cyan-400 mb-2">Visual Logs</h1>
        <p className="text-slate-400">
          📸 AI vehicle detection logs from Hadoop - Real data dari camera
          capture
        </p>
        {lastFetch && (
          <p className="text-xs text-slate-500 mt-2">
            Last updated: {lastFetch.toLocaleTimeString()}
          </p>
        )}
        <p className="text-xs text-slate-500 mt-2">
          💡 Foto akan tampil di sini ketika mobil ter-capture oleh camera
          sensor
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-900 border border-red-700">
          <p className="text-red-100 text-sm whitespace-pre-line">{error}</p>
          <div className="mt-3 text-xs text-red-200">
            <p className="font-semibold mb-1">
              📖 Setup Hive untuk melihat data real dari camera:
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                SSH ke namenode:{" "}
                <code className="bg-red-800 px-2 py-1 rounded">
                  ssh admin@100.90.109.94
                </code>
              </li>
              <li>Ikuti HIVE_SETUP_GUIDE.md untuk setup Apache Hive</li>
              <li>Restart dashboard ketika Hive sudah ready</li>
            </ol>
          </div>
        </div>
      )}

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-slate-400 text-sm mb-1">Total Detections</p>
          <p className="text-2xl font-bold text-cyan-400">
            {filteredLogs.length}
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-slate-400 text-sm mb-1">Success Rate</p>
          <p className="text-2xl font-bold text-green-400">{successRate}%</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-slate-400 text-sm mb-1">Failed Detection</p>
          <p className="text-2xl font-bold text-red-400">{failureCount}</p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search Bar */}
        <div className="relative md:col-span-2">
          <Search
            className="absolute left-4 top-3.5 text-slate-500"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by decision status, vehicle count, or timestamp..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={cn(
              "w-full pl-12 pr-4 py-3 rounded-lg",
              "bg-slate-900 border border-slate-700",
              "text-slate-100 placeholder-slate-500",
              "focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
              "transition-all duration-200",
            )}
          />
        </div>

        {/* Date Filter */}
        <div className="relative">
          <Calendar
            className="absolute left-4 top-3.5 text-slate-500"
            size={20}
          />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className={cn(
              "w-full pl-12 pr-4 py-3 rounded-lg",
              "bg-slate-900 border border-slate-700",
              "text-slate-100",
              "focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500",
              "transition-all duration-200",
            )}
          />
        </div>
      </div>

      {/* Export & Refresh Buttons */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={handleExport}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg",
            "bg-cyan-500 text-slate-900 font-semibold",
            "hover:bg-cyan-400 transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
          disabled={isLoading || filteredLogs.length === 0}
        >
          <Download size={18} />
          Export CSV
        </button>

        <button
          onClick={fetchVisualLogs}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg",
            "bg-slate-700 text-slate-100 font-semibold",
            "hover:bg-slate-600 transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
          disabled={isLoading}
        >
          <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          {isLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Table Container */}
      <div className="rounded-lg border border-slate-700 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="h-64 bg-slate-900 flex items-center justify-center">
            <p className="text-slate-400">Loading visual logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="h-64 bg-slate-900 flex items-center justify-center">
            <p className="text-slate-400">No logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table Header */}
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-400">
                    Date & Time
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-cyan-400">
                    Camera Image
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-cyan-400">
                    AI Decision
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-cyan-400">
                    Vehicle Count
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-cyan-400">
                    Confidence
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="bg-slate-900">
                {filteredLogs.map((log, index) => (
                  <tr
                    key={log.id}
                    className={cn(
                      "border-b border-slate-700",
                      "hover:bg-slate-800 transition-colors duration-150",
                      index % 2 === 0 ? "bg-slate-900" : "bg-slate-850",
                    )}
                  >
                    {/* Date & Time */}
                    <td className="px-6 py-4 text-sm text-slate-200">
                      {log.timestamp}
                    </td>

                    {/* Camera Image */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="w-32 h-24 rounded-md overflow-hidden border border-slate-600 bg-slate-800">
                          <ImageWithFallback
                            src={log.cameraImage}
                            alt={`Detection ${log.id}`}
                            className="w-full h-full object-cover"
                            style={{ width: "100%", height: "100%" }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* AI Decision */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {log.aiDecision === "Success" ? (
                          <>
                            <CheckCircle size={18} className="text-green-400" />
                            <span className="px-3 py-1 rounded-full bg-green-900 text-green-200 text-sm font-semibold">
                              Success
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle size={18} className="text-red-400" />
                            <span className="px-3 py-1 rounded-full bg-red-900 text-red-200 text-sm font-semibold">
                              Failed
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Vehicle Count */}
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 rounded-full bg-slate-700 text-slate-100 font-semibold">
                        {log.vehicleCount}
                      </span>
                    </td>

                    {/* Confidence */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-20 bg-slate-700 rounded-full h-2 mr-2">
                          <div
                            className={cn(
                              "h-2 rounded-full",
                              log.confidence >= 85
                                ? "bg-green-500"
                                : log.confidence >= 70
                                  ? "bg-yellow-500"
                                  : "bg-red-500",
                            )}
                            style={{ width: `${log.confidence}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-200 w-12">
                          {log.confidence}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-sm text-slate-400">
        <p>
          Showing{" "}
          <span className="text-cyan-400 font-semibold">
            {filteredLogs.length}
          </span>{" "}
          of <span className="text-slate-300">{logs.length}</span> total
          detections
        </p>
      </div>
    </div>
  );
}
