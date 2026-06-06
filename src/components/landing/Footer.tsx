export default function Footer() {
  return (
    <footer className="bg-[#070b14] border-t border-[#1e293b] py-8 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} SIGAP. Hak cipta dilindungi.
        </p>
        <p className="text-xs text-slate-600">
          Sistem Internal. Akses Terbatas.
        </p>
      </div>
    </footer>
  );
}
