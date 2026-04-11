import Head from "next/head";
import { useEffect, useState } from "react";
import mqtt, { MqttClient } from "mqtt";

export default function DashboardSigap() {
  const [isQrBlurred, setIsQrBlurred] = useState<boolean>(true);
  const [mqttClient, setMqttClient] = useState<MqttClient | null>(null);
  const [statusText, setStatusText] = useState<string>("Menunggu kendaraan...");

  // State baru untuk Dynamic QR dan Timer
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

  // Efek khusus untuk mengelola rotasi QR Code setiap 30 detik
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (!isQrBlurred) {
      // Buat QR pertama kali saat blur hilang
      generateNewQr();

      // Jalankan hitung mundur
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            generateNewQr(); // Refresh QR saat waktu habis
            return 30; // Reset timer
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Bersihkan timer dan payload saat gerbang kembali standby
      setCountdown(30);
      setQrPayload("SIGAP_STANDBY");
    }

    return () => clearInterval(interval);
  }, [isQrBlurred]);

  // Fungsi pembuat string statless lokal (Simulasi JWT)
  const generateNewQr = () => {
    const payloadObj = {
      gate_id: "SIGAP_GATE_01",
      timestamp: Date.now(),
    };
    // Ubah JSON ke string Base64 agar rapi masuk ke dalam URL
    const base64Payload = Buffer.from(JSON.stringify(payloadObj)).toString(
      "base64",
    );
    const deepLink = `sigapcore://auth?payload=${base64Payload}`;

    setQrPayload(deepLink);
    console.log("🔄 QR Code diperbarui:", deepLink);
  };

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
      console.log(`Pesan masuk di ${topic}: ${msgString}`);

      if (topic === topicUiState) {
        if (msgString === "MOBIL_VALID") {
          setIsQrBlurred(false);
          setStatusText("Kendaraan Valid! Silakan Scan QR Code.");
        } else if (msgString === "MOBIL_PERGI") {
          setIsQrBlurred(true);
          setStatusText("Kendaraan telah pergi. Menunggu kendaraan baru...");
        }
      }
    });

    return () => {
      if (client) client.end();
    };
  }, []);

  const handleSimulasiScan = () => {
    if (mqttClient && !isQrBlurred) {
      console.log("Mengirim perintah BUKA_GERBANG...");
      mqttClient.publish(topicGateControl, "BUKA_GERBANG");
      setStatusText("Gerbang Terbuka! Silakan masuk.");
    } else {
      alert("Tidak bisa buka gerbang. QR masih ter-blur atau MQTT belum siap.");
    }
  };

  return (
    <>
      <Head>
        <title>SIGAP - Sistem Integrasi Gerbang & Akses Pintar</title>
      </Head>
      <div
        style={{
          padding: "40px",
          fontFamily: "sans-serif",
          textAlign: "center",
        }}
      >
        <h1>SIGAP Gate Dashboard</h1>
        <p
          style={{
            fontSize: "18px",
            fontWeight: "bold",
            color: isQrBlurred ? "red" : "green",
          }}
        >
          Status: {statusText}
        </p>

        <div
          style={{ margin: "30px auto", width: "300px", position: "relative" }}
        >
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrPayload)}`}
            alt="QR Code SIGAP"
            style={{
              width: "100%",
              borderRadius: "10px",
              filter: isQrBlurred ? "blur(15px)" : "none",
              transition: "filter 0.5s ease-in-out",
            }}
          />
          {isQrBlurred ? (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                backgroundColor: "rgba(0,0,0,0.7)",
                color: "white",
                padding: "10px 20px",
                borderRadius: "5px",
              }}
            >
              Terkunci
            </div>
          ) : (
            <div
              style={{
                position: "absolute",
                bottom: "-40px",
                left: "50%",
                transform: "translateX(-50%)",
                fontWeight: "bold",
                color: "#333",
              }}
            >
              Berubah dalam: {countdown} detik
            </div>
          )}
        </div>

        <button
          onClick={handleSimulasiScan}
          disabled={isQrBlurred}
          style={{
            padding: "15px 30px",
            marginTop: "20px",
            fontSize: "16px",
            backgroundColor: isQrBlurred ? "#ccc" : "#0070f3",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: isQrBlurred ? "not-allowed" : "pointer",
          }}
        >
          Simulasi Aplikasi: Verifikasi Sukses
        </button>
      </div>
    </>
  );
}
