import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative pt-32 pb-24 px-6 overflow-hidden bg-gradient-to-b from-[#070b14] to-[#0f172a]">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-cyan-900/10 rounded-full blur-3xl" />

      <div className="relative max-w-6xl mx-auto">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-white">
            Sistem Monitoring &amp; Kontrol Gerbang Jarak Jauh
          </h1>

          <p className="mt-6 text-lg md:text-xl text-slate-400 leading-relaxed max-w-2xl">
            Dashboard internal instansi untuk mengontrol dan memonitor gerbang
            secara real-time. Hubungkan perangkat IoT melalui MQTT WebSocket,
            catat seluruh aktivitas di Firebase Firestore, dan lakukan
            verifikasi visual dari satu portal terpusat.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-500 transition-colors duration-200"
            >
              Masuk ke Portal Admin
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-slate-400 border border-slate-700 rounded-md hover:border-slate-600 hover:text-slate-300 transition-colors duration-200"
            >
              Lihat Fitur
              <ChevronDown className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
