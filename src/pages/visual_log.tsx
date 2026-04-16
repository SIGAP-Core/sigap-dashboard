import React, { useState, useEffect } from "react";
import { Search, Calendar, Download, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/utils/cn";
import { ImageWithFallback } from "@/components/ImageWithFallback";

// Mock data - nanti replace dengan Hadoop logs
const MOCK_VISUAL_LOGS = [
  {
    id: "visual_001",
    timestamp: "2025-04-16 09:15:32",
    cameraImage:
      "https://images.unsplash.com/photo-1761958329406-e86653c0df3e?w=200&h=150&fit=crop",
    aiDecision: "Success",
    vehicleCount: 1,
    confidence: 92,
  },
  {
    id: "visual_002",
    timestamp: "2025-04-16 09:22:45",
    cameraImage:
      "https://images.unsplash.com/photo-1760339900750-aa0a44a32e33?w=200&h=150&fit=crop",
    aiDecision: "Success",
    vehicleCount: 1,
    confidence: 88,
  },
  {
    id: "visual_003",
    timestamp: "2025-04-16 09:31:12",
    cameraImage:
      "https://images.unsplash.com/photo-1735402088872-f4e81cc906f0?w=200&h=150&fit=crop",
    aiDecision: "Failed",
    vehicleCount: 0,
    confidence: 34,
  },
  {
    id: "visual_004",
    timestamp: "2025-04-16 09:45:28",
    cameraImage:
      "https://images.unsplash.com/photo-1758618666607-a122c12f8c74?w=200&h=150&fit=crop",
    aiDecision: "Success",
    vehicleCount: 2,
    confidence: 85,
  },
  {
    id: "visual_005",
    timestamp: "2025-04-16 10:02:55",
    cameraImage:
      "https://images.unsplash.com/photo-1557821552-17105176677c?w=200&h=150&fit=crop",
    aiDecision: "Success",
    vehicleCount: 1,
    confidence: 91,
  },
  {
    id: "visual_006",
    timestamp: "2025-04-16 10:18:14",
    cameraImage:
      "https://images.unsplash.com/photo-1559416481-cd4628902e4a?w=200&h=150&fit=crop",
    aiDecision: "Success",
    vehicleCount: 1,
    confidence: 87,
  },
  {
    id: "visual_007",
    timestamp: "2025-04-16 10:31:08",
    cameraImage:
      "https://images.unsplash.com/photo-1493195671595-30a50e2e9e0e?w=200&h=150&fit=crop",
    aiDecision: "Failed",
    vehicleCount: 0,
    confidence: 42,
  },
  {
    id: "visual_008",
    timestamp: "2025-04-16 10:45:50",
    cameraImage:
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=200&h=150&fit=crop",
    aiDecision: "Success",
    vehicleCount: 1,
    confidence: 89,
  },
];

interface VisualLog {
  id: string;
  timestamp: string;
  cameraImage: string;
  aiDecision: "Success" | "Failed";
  vehicleCount: number;
  confidence: number;
}

export default function VisualLogs() {
  const [logs, setLogs] = useState<VisualLog[]>(MOCK_VISUAL_LOGS);
  const [filteredLogs, setFilteredLogs] =
    useState<VisualLog[]>(MOCK_VISUAL_LOGS);
  const [searchInput, setSearchInput] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  // Fetch data dari Hadoop (nanti implementasi)
  useEffect(() => {
    // TODO: implementasi Hadoop logs fetch
    // const fetchVisualLogs = async () => {
    //   try {
    //     setIsLoading(true);
    //     const response = await fetch("/api/hadoop-logs");
    //     const data = await response.json();
    //     setLogs(data);
    //   } catch (error) {
    //     console.error("Error fetching visual logs:", error);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // };
    // fetchVisualLogs();
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
          AI vehicle detection logs from Hadoop analytics engine
        </p>
      </div>

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

      {/* Export Button */}
      <div className="mb-6">
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
