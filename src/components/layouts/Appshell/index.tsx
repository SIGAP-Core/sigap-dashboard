import { useState } from "react";
import Navbar from "@/components/layouts/navbar";
import Sidebar from "@/components/layouts/sidebar";

export default function Appshell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <Sidebar open={open} toggle={() => setOpen(p => !p)} />

      <Navbar isOpen={open} />

      <main
        style={{
          marginLeft: open ? "250px" : "72px",
          marginTop: "60px",
          transition: "all 0.3s ease",
          minHeight: "100vh",
          background: "#070b14",
        }}
      >
        {children}
      </main>
    </div>
  );
}