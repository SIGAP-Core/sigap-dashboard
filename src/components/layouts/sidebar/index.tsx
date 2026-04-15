import { useRouter } from "next/router";
import {
  DoorOpen,
  Eye,
  Shield,
  Car,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";

import styles from "./Sidebar.module.css";

export default function Sidebar({
  open,
  toggle,
}: {
  open: boolean;
  toggle: () => void;
}) {
  const router = useRouter();

  const menu = [
    {
      section: "MAIN",
      items: [{ label: "Dashboard", icon: LayoutDashboard, path: "/" }],
    },
    {
      section: "MONITORING",
      items: [
        { label: "Visual Logs", icon: Eye, path: "/visual_log" },
        { label: "Gate Access Logs", icon: DoorOpen, path: "/gate_log" },
      ],
    },
    {
      section: "MANAGEMENT",
      items: [
        { label: "Admin Management", icon: Shield, path: "/administrator" },
        { label: "Driver Management", icon: Car, path: "/driver" },
      ],
    },
  ];

  return (
    <aside className={`${styles.sidebar} ${open ? styles.open : styles.close}`}>
      {/* HEADER */}
      <div className={styles.sidebarHeader}>
        <div
          className={`${styles.logo} ${
            open ? styles.logoActive : styles.logoInactive
          }`}
        >
          {open ? "SIGAP" : "S"}
          <br />
          {open ? "Control System" : "C"}
        </div>

        <button className={styles.toggleBtn} onClick={toggle}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* MENU */}
      <div className={styles.menu}>
        {menu.map((group) => (
          <div key={group.section}>
            {open && <p className={styles.sectionTitle}>{group.section}</p>}

            {group.items.map((item) => {
              const Icon = item.icon;
              const active =
                item.path === "/"
                  ? router.asPath === "/"
                  : router.asPath.startsWith(item.path);

              return (
                <div
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`${styles.item} ${active ? styles.active : ""}`}
                >
                  <Icon className={styles.icon} size={18} />

                  <span
                    className={`${styles.label} ${
                      open ? styles.show : styles.hide
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
