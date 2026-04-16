import Head from "next/head";
import React, { useEffect, useState } from "react";
import mqtt, { MqttClient } from "mqtt";
import {
  QrCode,
  Camera,
  AlertTriangle,
  CheckCircle,
  RefreshCcw,
  Wifi,
  Server,
  Cpu,
  XCircle,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { ImageWithFallback } from "../components/ImageWithFallback";

export default function DashboardSigap() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // --- STATE UI & MQTT ---
  const [isQrBlurred, setIsQrBlurred] = useState<boolean>(true);
  const [mqttClient, setMqttClient] = useState<MqttClient | null>(null);
  const [statusText, setStatusText] = useState<string>(
    "Standby - Menunggu Kendaraan",
  );
  const [liveImage, setLiveImage] = useState<string | null>(null);

  const PLACEHOLDER_IMG =
    "https://images.unsplash.com/photo-1760339900750-aa0a44a32e33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXIlMjBmcm9udCUyMGxpY2Vuc2UlMjBwbGF0ZXxlbnwxfHx8fDE3NzYwNTg0ODJ8MA&ixlib=rb-4.1.0&q=80&w=1080";

  // State Ekstraksi JSON AI
  const [aiConfidence, setAiConfidence] = useState<string>("0%");
  const [aiVehicleCount, setAiVehicleCount] = useState<number>(0);

  // State Dynamic QR dan Timer
  const [qrPayload, setQrPayload] = useState<string>("SIGAP_STANDBY");
  const [countdown, setCountdown] = useState<number>(30);

  // --- KONFIGURASI HIVEMQ WEBSOCKET ---
  const brokerUrl = process.env.NEXT_PUBLIC_MQTT_URL || "";
  const options = {
    username: process.env.NEXT_PUBLIC_MQTT_USER || "",
    password: process.env.NEXT_PUBLIC_MQTT_PASSWORD || "",
    clientId: `nextjs-client-${Math.random().toString(16).slice(2, 10)}`,
  };

  const topicUiState = process.env.NEXT_PUBLIC_TOPIC_UI_STATE || "";
  const topicGateControl = process.env.NEXT_PUBLIC_TOPIC_GATE_CONTROL || "";
  const topicRequestPhoto = process.env.NEXT_PUBLIC_TOPIC_REQUEST_PHOTO || "";

  // --- LOGIKA ROTASI DYNAMIC QR ---
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (!isQrBlurred) {
      generateNewQr(); // Buat QR pertama kali saat blur hilang
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            generateNewQr();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(30);
      setQrPayload("SIGAP_STANDBY");
    }

    return () => clearInterval(interval);
  }, [isQrBlurred]);

  const generateNewQr = () => {
    const payloadObj = {
      gate_id: "SIGAP_GATE_01",
      timestamp: Date.now(),
    };
    const base64Payload = Buffer.from(JSON.stringify(payloadObj)).toString(
      "base64",
    );
    const deepLink = `sigapcore://auth?payload=${base64Payload}`;
    setQrPayload(deepLink);
  };

  // --- LOGIKA KONEKSI MQTT ---
  useEffect(() => {
    console.log("Menghubungkan ke HiveMQ via WebSocket...");
    const client = mqtt.connect(brokerUrl, options);

    client.on("connect", () => {
      console.log("✅ Terhubung ke MQTT Broker (WebSocket)");
      client.subscribe(topicUiState);
      setMqttClient(client);
    });

    client.on("message", (topic: string, message: Buffer) => {
      const msgString = message.toString();
      console.log(`📥 Pesan masuk di ${topic}: ${msgString}`);

      if (topic === topicUiState) {
        try {
          const payload = JSON.parse(msgString);

          if (payload.status === "MOBIL_VALID") {
            setIsQrBlurred(false);
            setStatusText("Valid Vehicle");
            setAiConfidence(payload.confidence || "0%");
            setAiVehicleCount(payload.vehicle_count || 0);
            if (payload.image_base64) {
              setLiveImage(payload.image_base64);
            }
          } else if (payload.status === "MOBIL_TIDAK_VALID") {
            setIsQrBlurred(true);
            setStatusText("Invalid Vehicle");
            setAiConfidence(payload.confidence || "0%");
            setAiVehicleCount(payload.vehicle_count || 0);
            if (payload.image_base64) {
              setLiveImage(payload.image_base64);
            }
          } else if (payload.status === "MOBIL_PERGI") {
            setIsQrBlurred(true);
            setLiveImage(null);
            setStatusText("Standby - Menunggu Kendaraan");
            setAiConfidence("0%");
            setAiVehicleCount(0);
          }
        } catch (error) {
          if (msgString === "MOBIL_PERGI") {
            setIsQrBlurred(true);
            setStatusText("Standby - Menunggu Kendaraan");
            setAiConfidence("0%");
            setAiVehicleCount(0);
          }
        }
      }
    });

    return () => {
      if (client) client.end();
    };
  }, []);

  // --- HANDLER TOMBOL ---
  const handleManualCapture = () => {
    if (mqttClient) {
      console.log("📸 Mengirim perintah Manual Capture...");
      mqttClient.publish(topicRequestPhoto, "TAKE_PHOTO");
      // Tidak perlu alert, biar terlihat profesional
    } else {
      alert("Koneksi MQTT belum siap.");
    }
  };

  return (
    <>
      <Head>
        <title>Live Dashboard | SIGAP</title>
      </Head>
      <div className="p-6 lg:p-10 font-sans min-h-screen bg-[#0F172A] text-slate-200">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
              Live Control Center
            </h1>
            <p className="text-slate-400">Main Entry Gate Monitoring</p>
          </div>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">
                System Online
              </span>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <Wifi className="w-5 h-5" />
              <Server className="w-5 h-5" />
              <Cpu className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* --- KIRI: QR CODE PANEL --- */}
          <div className="flex flex-col space-y-6">
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden group min-h-[500px]">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-50" />

              <h2 className="text-xl font-semibold text-slate-200 mb-8 relative z-10 flex items-center gap-3">
                <QrCode className="w-6 h-6 text-cyan-400" />
                Dynamic Entry Access
              </h2>

              {/* Cyber Frame for QR */}
              <div className="relative p-6 bg-white rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.15)] transition-shadow duration-500">
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-500 rounded-tl" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-500 rounded-tr" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-500 rounded-bl" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-500 rounded-br" />

                {/* QR Code Image Implementation */}
                <div className="relative w-48 h-48 md:w-64 md:h-64 border-8 border-white bg-white flex items-center justify-center overflow-hidden">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrPayload)}`}
                    alt="QR Code SIGAP"
                    className={cn(
                      "w-full h-full object-contain transition-all duration-500",
                      isQrBlurred
                        ? "blur-[15px] opacity-40 grayscale"
                        : "blur-0 opacity-100",
                    )}
                  />
                  {/* Overlay Terkunci */}
                  {isQrBlurred && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-slate-900/90 text-white font-bold px-5 py-3 rounded-lg backdrop-blur-sm flex items-center gap-2 border border-slate-700 shadow-2xl">
                        <AlertTriangle className="w-5 h-5 text-rose-500" />
                        LOCKED
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Countdown Indicator */}
              <div
                className={cn(
                  "mt-8 flex items-center gap-3 text-sm font-medium px-4 py-2 rounded-full border transition-colors",
                  isQrBlurred
                    ? "text-slate-500 bg-slate-800/50 border-slate-700"
                    : "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
                )}
              >
                <RefreshCcw
                  className={cn(
                    "w-4 h-4",
                    !isQrBlurred && countdown < 10
                      ? "animate-spin text-rose-400"
                      : "",
                  )}
                />
                {isQrBlurred
                  ? "Waiting for Vehicle..."
                  : `Refreshes in ${countdown}s`}
              </div>

              {!isQrBlurred && (
                <div className="mt-6 w-full max-w-xs h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${(countdown / 30) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* --- KANAN: CAMERA & AI METADATA PANEL --- */}
          <div className="flex flex-col space-y-6">
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 lg:p-8 flex flex-col min-h-[500px]">
              <h2 className="text-xl font-semibold text-slate-200 mb-6 flex items-center gap-3">
                <Camera className="w-6 h-6 text-green-400" />
                Capture Camera Feed
                <span className="ml-auto flex items-center gap-2 text-xs font-mono px-2 py-1 bg-slate-950 rounded border border-slate-800 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  LIVE
                </span>
              </h2>

              {/* Camera Viewport (Sementara pakai placeholder, nanti diganti Firebase URL) */}
              <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700 bg-slate-950 group">
                <ImageWithFallback
                  // src="https://images.unsplash.com/photo-1760339900750-aa0a44a32e33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXIlMjBmcm9udCUyMGxpY2Vuc2UlMjBwbGF0ZXxlbnwxfHx8fDE3NzYwNTg0ODJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
                  src={liveImage || PLACEHOLDER_IMG}
                  alt="Live Camera Feed"
                  className={cn(
                    "w-full h-full object-cover transition-opacity duration-300",
                    isQrBlurred ? "opacity-30 grayscale" : "opacity-80",
                  )}
                />

                <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px] pointer-events-none opacity-30" />

                {/* Targeting Reticle - Warna menyesuaikan validitas */}
                <div
                  className={cn(
                    "absolute inset-1/4 border rounded-lg pointer-events-none transition-all duration-1000",
                    statusText === "Valid Vehicle"
                      ? "border-green-500/50"
                      : "border-slate-500/30",
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 -translate-x-1 -translate-y-1",
                      statusText === "Valid Vehicle"
                        ? "border-green-400"
                        : "border-slate-500",
                    )}
                  />
                  <div
                    className={cn(
                      "absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 translate-x-1 -translate-y-1",
                      statusText === "Valid Vehicle"
                        ? "border-green-400"
                        : "border-slate-500",
                    )}
                  />
                  <div
                    className={cn(
                      "absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 -translate-x-1 translate-y-1",
                      statusText === "Valid Vehicle"
                        ? "border-green-400"
                        : "border-slate-500",
                    )}
                  />
                  <div
                    className={cn(
                      "absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 translate-x-1 translate-y-1",
                      statusText === "Valid Vehicle"
                        ? "border-green-400"
                        : "border-slate-500",
                    )}
                  />
                </div>

                <div className="absolute bottom-3 left-3 text-xs font-mono text-white/80 bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                  CAM_01 |{" "}
                  {isMounted ? new Date().toLocaleTimeString() : "--:--:--"}
                </div>
              </div>

              {/* AI Metadata Chips (Dynamic Data from MQTT) */}
              <div className="mt-6 flex flex-wrap gap-3">
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 border rounded-lg",
                    statusText === "Valid Vehicle"
                      ? "bg-slate-950 border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.1)]"
                      : statusText === "Invalid Vehicle"
                        ? "bg-slate-950 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.1)]"
                        : "bg-slate-900 border-slate-800",
                  )}
                >
                  {statusText === "Valid Vehicle" ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span className="text-sm font-medium text-slate-200">
                    Status:{" "}
                    <span
                      className={
                        statusText === "Valid Vehicle"
                          ? "text-green-400"
                          : "text-rose-400"
                      }
                    >
                      {statusText}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-slate-950 border border-cyan-500/30 rounded-lg shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-slate-200">
                    Confidence:{" "}
                    <span className="text-cyan-400">{aiConfidence}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg">
                  <div className="w-4 h-4 flex items-center justify-center text-[10px] font-bold bg-slate-800 text-slate-300 rounded">
                    #
                  </div>
                  <span className="text-sm font-medium text-slate-200">
                    Count: <span className="text-white">{aiVehicleCount}</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons - Manual Override */}
              <div className="mt-auto pt-6 border-t border-slate-800">
                <button
                  onClick={handleManualCapture}
                  className="w-full group relative flex items-center justify-center gap-2 bg-transparent hover:bg-orange-500/10 border-2 border-orange-500/70 hover:border-orange-400 text-orange-400 font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(249,115,22,0.15)] hover:shadow-[0_0_25px_rgba(249,115,22,0.3)]"
                >
                  <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>MANUAL CAPTURE OVERRIDE</span>
                  <AlertTriangle className="w-5 h-5 absolute right-6 opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
