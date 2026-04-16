import React, { useState, useEffect } from "react";
import {
  Search,
  Calendar,
  Download,
  ChevronDown,
  ChevronUp,
  Eye,
} from "lucide-react";
import { cn } from "@/utils/cn";

// Mock data - nanti replace dengan Firebase
const MOCK_GATE_LOGS = [
  {
    id: "log_001",
    timestamp: "2025-04-16 09:15:32",
    driverName: "Ahmad Budiman",
    driverUID: "driver_12345abcde",
    licensePlate: "D 1234 AB",
  },
  {
    id: "log_002",
    timestamp: "2025-04-16 09:22:45",
    driverName: "Siti Nabila",
    driverUID: "driver_67890fghij",
    licensePlate: "D 5678 CD",
  },
  {
    id: "log_003",
    timestamp: "2025-04-16 09:31:12",
    driverName: "Budi Santoso",
    driverUID: "driver_klmnopqrst",
    licensePlate: "D 9012 EF",
  },
  {
    id: "log_004",
    timestamp: "2025-04-16 09:45:28",
    driverName: "Dewi Kusuma",
    driverUID: "driver_uvwxyzabcd",
    licensePlate: "D 3456 GH",
  },
  {
    id: "log_005",
    timestamp: "2025-04-16 10:02:55",
    driverName: "Rudi Hermawan",
    driverUID: "driver_efghijklmn",
    licensePlate: "D 7890 IJ",
  },
  {
    id: "log_006",
    timestamp: "2025-04-16 10:18:14",
    driverName: "Maya Putri",
    driverUID: "driver_opqrstuvwx",
    licensePlate: "D 2345 KL",
  },
];

interface GateLog {
  id: string;
  timestamp: string;
  driverName: string;
  driverUID: string;
  licensePlate: string;
}

export default function GateAccessLogs() {
  const [logs, setLogs] = useState<GateLog[]>(MOCK_GATE_LOGS);
  const [filteredLogs, setFilteredLogs] = useState<GateLog[]>(MOCK_GATE_LOGS);
  const [searchInput, setSearchInput] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter logs berdasarkan search dan date
  useEffect(() => {
    let result = logs;

    // Filter berdasarkan search (cari di driver name atau license plate)
    if (searchInput.trim()) {
      const search = searchInput.toLowerCase();
      result = result.filter(
        (log) =>
          log.driverName.toLowerCase().includes(search) ||
          log.licensePlate.toLowerCase().includes(search) ||
          log.driverUID.toLowerCase().includes(search),
      );
    }

    // Filter berdasarkan date
    if (dateFilter) {
      result = result.filter((log) => log.timestamp.startsWith(dateFilter));
    }

    setFilteredLogs(result);
  }, [searchInput, dateFilter, logs]);

  // Fetch data dari Firebase (nanti implementasi)
  useEffect(() => {
    // TODO: implementasi Firebase fetch
    // const fetchGateLogs = async () => {
    //   try {
    //     setIsLoading(true);
    //     const db = getFirestore();
    //     const q = query(collection(db, "gate_logs"), orderBy("timestamp", "desc"));
    //     const querySnapshot = await getDocs(q);
    //     const data = querySnapshot.docs.map(doc => ({
    //       id: doc.id,
    //       ...doc.data()
    //     })) as GateLog[];
    //     setLogs(data);
    //   } catch (error) {
    //     console.error("Error fetching gate logs:", error);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // };
    // fetchGateLogs();
  }, []);

  const handleExport = () => {
    const csv = [
      ["Date & Time", "Driver Name", "Driver UID", "License Plate"],
      ...filteredLogs.map((log) => [
        log.timestamp,
        log.driverName,
        log.driverUID,
        log.licensePlate,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gate-access-logs-${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: "#0F172A" }}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-cyan-400 mb-2">
          Gate Access Logs
        </h1>
        <p className="text-slate-400">
          Real-time monitoring of all successful gate access entries
        </p>
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
            placeholder="Search by driver name, license plate, or UID..."
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
            <p className="text-slate-400">Loading logs...</p>
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
                  <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-400 w-12">
                    {/* Expand icon column */}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-400">
                    Date & Time
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-400">
                    Driver Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-cyan-400">
                    License Plate
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-cyan-400">
                    Action
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="bg-slate-900">
                {filteredLogs.map((log, index) => (
                  <React.Fragment key={log.id}>
                    {/* Main Row */}
                    <tr
                      className={cn(
                        "border-b border-slate-700",
                        "hover:bg-slate-800 transition-colors duration-150",
                        index % 2 === 0 ? "bg-slate-900" : "bg-slate-850",
                        expandedId === log.id && "bg-slate-800",
                      )}
                    >
                      {/* Expand Icon */}
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() =>
                            setExpandedId(expandedId === log.id ? null : log.id)
                          }
                          className="text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          {expandedId === log.id ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </button>
                      </td>

                      {/* Main Data */}
                      <td className="px-6 py-4 text-sm text-slate-200 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-200 font-medium">
                        {log.driverName}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-3 py-1 rounded-full bg-cyan-900 text-cyan-200 font-semibold text-xs">
                          {log.licensePlate}
                        </span>
                      </td>

                      {/* View Button */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() =>
                            setExpandedId(expandedId === log.id ? null : log.id)
                          }
                          className={cn(
                            "inline-flex items-center gap-1 px-3 py-1 rounded-md",
                            "text-xs font-semibold transition-all duration-200",
                            expandedId === log.id
                              ? "bg-cyan-500 text-slate-900 hover:bg-cyan-400"
                              : "bg-slate-700 text-cyan-300 hover:bg-slate-600",
                          )}
                        >
                          <Eye size={14} />
                          {expandedId === log.id ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>

                    {/* Detail Row */}
                    {expandedId === log.id && (
                      <tr className="bg-slate-800 border-b border-slate-600">
                        <td colSpan={5} className="px-6 py-6">
                          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 space-y-4">
                            {/* Detail Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Date & Time Detail */}
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                                  📅 Date & Time
                                </label>
                                <p className="text-slate-200 text-sm bg-slate-800 px-3 py-2 rounded-md border border-slate-700">
                                  {log.timestamp}
                                </p>
                              </div>

                              {/* Driver Name Detail */}
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                                  👤 Driver Name
                                </label>
                                <p className="text-slate-200 text-sm bg-slate-800 px-3 py-2 rounded-md border border-slate-700">
                                  {log.driverName}
                                </p>
                              </div>

                              {/* Driver UID Detail */}
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                                  🔐 Driver UID
                                </label>
                                <p className="text-slate-200 text-sm bg-slate-800 px-3 py-2 rounded-md border border-slate-700 font-mono break-all">
                                  {log.driverUID}
                                </p>
                              </div>

                              {/* License Plate Detail */}
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                                  🚗 License Plate
                                </label>
                                <p className="text-slate-200 text-sm bg-cyan-900 px-3 py-2 rounded-md border border-cyan-700 font-bold text-center">
                                  {log.licensePlate}
                                </p>
                              </div>
                            </div>

                            {/* Detail Footer */}
                            <div className="pt-4 border-t border-slate-700 mt-4">
                              <p className="text-xs text-slate-400">
                                Log ID:{" "}
                                <span className="text-slate-300 font-mono">
                                  {log.id}
                                </span>
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
          of <span className="text-slate-300">{logs.length}</span> total logs
        </p>
      </div>
    </div>
  );
}
