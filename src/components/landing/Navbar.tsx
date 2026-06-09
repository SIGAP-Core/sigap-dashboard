import Link from "next/link";
import { Hexagon } from "lucide-react";

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#070b14]/80 backdrop-blur-md border-b border-[#1e293b]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-600">
            <Hexagon className="h-4 w-4 text-white" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-white tracking-wide">
              SIGAP
            </span>
            <span className="text-[10px] font-medium text-slate-500 tracking-widest uppercase">
              Dashboard
            </span>
          </div>
        </div>

        <Link
          href="/auth/login"
          className="inline-flex items-center px-5 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-500 transition-colors duration-200"
        >
          Portal Admin
        </Link>
      </div>
    </header>
  );
}
