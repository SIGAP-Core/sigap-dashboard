import {
  Activity,
  DoorOpen,
  Camera,
  Shield,
  LayoutDashboard,
  ClipboardList,
  Eye,
  UserCog,
} from "lucide-react";

const features = [
  {
    icon: Activity,
    title: "Real-time Monitoring",
    description:
      "Pantau status gerbang secara langsung melalui koneksi MQTT WebSocket. Data diperbarui tanpa perlu refresh halaman.",
  },
  {
    icon: DoorOpen,
    title: "Gate Control",
    description:
      "Buka dan tutup gerbang dari mana saja melalui dashboard. Respon instan dengan konfirmasi status real-time.",
  },
  {
    icon: Camera,
    title: "Remote Photo",
    description:
      "Minta foto dari kamera terpasang kapan saja untuk verifikasi visual di pos gerbang secara manual dari dashboard.",
  },
  {
    icon: Shield,
    title: "Admin Management",
    description:
      "Kelola akun administrator yang memiliki akses ke sistem. Tambah, ubah, atau hapus akun sesuai kebutuhan instansi.",
  },
];

const pages = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    description:
      "Menampilkan status gerbang, tampilan visual tangkapan kamera terbaru, dan tombol kontrol gate serta request foto.",
    wide: true,
  },
  {
    icon: ClipboardList,
    title: "Gate Access Logs",
    description:
      "Rekaman seluruh aktivitas akses gerbang yang tercatat di Firebase Firestore.",
  },
  {
    icon: Eye,
    title: "Visual Logs",
    description:
      "Log visual dari kamera yang terpasang. Menampilkan gambar capture beserta timestamp.",
  },
  {
    icon: UserCog,
    title: "Administrator",
    description:
      "Kelola akun administrator yang berwenang mengakses sistem SIGAP.",
  },
];

export default function Features() {
  return (
    <div>
      {/* Section: Fitur Utama — Dark navy, light cards */}
      <section id="features" className="py-24 px-6 bg-gradient-to-b from-[#0f172a] to-[#070b14]">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-slate-500 tracking-widest uppercase mb-3">
              Fitur Utama
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
              Operasional Keamanan Terpusat
            </h2>
            <p className="mt-4 text-slate-400 leading-relaxed">
              SIGAP menyediakan segala yang dibutuhkan untuk mengelola akses
              gerbang instansi secara efisien dan terukur.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="p-6 rounded-lg bg-[#070b14] border border-[#1e293b]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#0f172a] border border-cyan-800 mb-5">
                    <Icon
                      className="h-5 w-5 text-cyan-500"
                      strokeWidth={1.5}
                    />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section: Modul Dashboard — Bento on dark */}
      <section className="py-24 px-6 bg-[#070b14]">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-slate-500 tracking-widest uppercase mb-3">
              Halaman Dashboard
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
              Modul yang Tersedia
            </h2>
            <p className="mt-4 text-slate-400 leading-relaxed">
              Setiap halaman pada dashboard SIGAP dirancang untuk kebutuhan
              spesifik dalam operasional keamanan gerbang.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
            {pages.map((page) => {
              const Icon = page.icon;
              return (
                <div
                  key={page.title}
                  className={`p-6 rounded-lg bg-[#0f172a] border border-[#1e293b] ${
                    page.wide ? "md:col-span-2" : ""
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#070b14] border border-cyan-800 mb-5">
                    <Icon
                      className="h-5 w-5 text-cyan-500"
                      strokeWidth={1.5}
                    />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">
                    {page.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {page.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section: Tentang Sistem — Deepest dark */}
      <section className="py-24 px-6 bg-[#070b14]">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <p className="text-xs font-medium text-slate-500 tracking-widest uppercase mb-3">
              Tentang Sistem
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
              Apa Itu SIGAP?
            </h2>
            <div className="mt-6 space-y-4 text-slate-400 leading-relaxed">
              <p>
                SIGAP adalah sistem dashboard internal instansi yang dirancang
                untuk mengontrol dan memonitor gerbang secara jarak jauh.
                Menggabungkan keandalan Firebase Firestore untuk pencatatan log
                dan teknologi MQTT WebSocket untuk komunikasi perangkat IoT
                secara real-time, SIGAP memungkinkan Administrator untuk
                melakukan Gate Control dan Verifikasi Visual (Request Photo)
                dalam satu pintu. Seluruh tindakan dan akses diamankan secara
                ketat dan dicatat untuk menjaga akuntabilitas operasional.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
