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
import { app } from "@/utils/db/firebase";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";

interface GateLog {
  id: string;
  timestamp: string;
  driverName: string;
  driverUID: string;
  licensePlate: string;
}

// Format timestamp: convert int64 (milliseconds) to "YYYY-MM-DD HH:mm:ss"
const formatTimestamp = (timestamp: number | any): string => {
  try {
    // Handle Firestore Timestamp objects
    let date: Date;

    if (timestamp && typeof timestamp === "object" && timestamp.toDate) {
      // Firestore Timestamp object
      date = timestamp.toDate();
    } else if (
      timestamp &&
      typeof timestamp === "object" &&
      timestamp.seconds
    ) {
      // Firestore Timestamp with seconds property
      date = new Date(timestamp.seconds * 1000);
    } else {
      // Plain milliseconds timestamp
      date = new Date(timestamp || Date.now());
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

    // Check if year is reasonable (before 1970 or way in future indicates problem)
    const year = date.getFullYear();
    if (year < 1970 || year > 2100) {
      return "Invalid Date";
    }

    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error("Error formatting timestamp:", timestamp, error);
    return "Invalid Date";
  }
};

export default function GateAccessLogs() {
  const [logs, setLogs] = useState<GateLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<GateLog[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<Map<string, any>>(new Map());

  // Fetch drivers dari Firebase Firestore (berdasarkan uid reference)
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const db = getFirestore(app);
        const driversRef = collection(db, "driver");
        const driverSnapshot = await getDocs(driversRef);

        // Buat map dengan uid (doc id) sebagai key untuk quick lookup
        const driverMap = new Map();
        console.log("=== STARTING DRIVER FETCH ===");

        driverSnapshot.docs.forEach((driverDoc) => {
          const driverData = driverDoc.data();
          const docId = driverDoc.id;

          driverMap.set(docId, {
            name: driverData.name || "Unknown",
            license: driverData.license || "-",
            email: driverData.email || "",
            status: driverData.status || "inactive",
          });

          console.log(`✓ Driver added to Map:`, {
            docId,
            name: driverData.name,
            license: driverData.license,
            email: driverData.email,
          });
        });

        console.log("=== DRIVER FETCH COMPLETE ===", {
          totalDrivers: driverMap.size,
          driverIds: Array.from(driverMap.keys()),
        });

        setDrivers(driverMap);
      } catch (error) {
        console.error("❌ Error fetching drivers:", error);
      }
    };

    fetchDrivers();
  }, []);

  // Fetch data dari Firebase Firestore access_logs (ONLY setelah drivers loaded)
  useEffect(() => {
    // Jangan fetch jika drivers belum ada
    if (drivers.size === 0) {
      console.log("⏳ Waiting for drivers to load... (drivers.size === 0)");
      return;
    }

    console.log(
      `🚀 Starting access logs fetch with ${drivers.size} drivers loaded`,
    );

    const fetchGateLogs = async () => {
      try {
        setIsLoading(true);
        const db = getFirestore(app);
        const q = query(
          collection(db, "access_logs"),
          orderBy("tanggal", "desc"),
        );
        const querySnapshot = await getDocs(q);

        console.log(`📋 Found ${querySnapshot.docs.length} access logs`);

        const data: GateLog[] = querySnapshot.docs.map((docAccess, index) => {
          const docData = docAccess.data();
          let driverName = "Unknown";
          let licensePlate = "-";

          // Gunakan uid dari access_logs untuk lookup di driver map
          const uid = docData.uid;
          const hasMatch = drivers.has(uid);

          console.log(`\n[LOG ${index + 1}]`, {
            uid,
            drivesMapSize: drivers.size,
            hasMatch,
            driverData: hasMatch ? drivers.get(uid) : "NO_MATCH",
          });

          if (uid && drivers.has(uid)) {
            const driverInfo = drivers.get(uid);
            driverName = driverInfo.name || "Unknown";
            licensePlate = driverInfo.license || "-";
            console.log(`✅ MATCH FOUND: ${driverName} / ${licensePlate}`);
          } else {
            console.log(`❌ NO MATCH for uid: ${uid}`);
          }

          return {
            id: docAccess.id,
            timestamp: formatTimestamp(docData.tanggal),
            driverName: driverName,
            driverUID: uid || `driver_${docAccess.id.substring(0, 12)}`,
            licensePlate: licensePlate,
          };
        });

        console.log("✅ Access logs processed:", data);
        setLogs(data);
      } catch (error) {
        console.error("❌ Error fetching gate logs:", error);
        setLogs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGateLogs();
  }, [drivers]);

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
