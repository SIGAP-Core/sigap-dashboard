import { useRouter } from "next/router";
import { signOut } from "next-auth/react";

import {
  DoorOpen,
  Eye,
  Shield,
  Car,
  LayoutDashboard,
  Menu,
  X,
  Hexagon,
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
        { label: "Gate Access Logs", icon: DoorOpen, path: "/gate-log" },
        { label: "Visual Logs", icon: Eye, path: "/visual-log" },
      ],
    },
    {
      section: "MANAGEMENT",
      items: [
        { label: "Administrator", icon: Shield, path: "/administrator" },
        { label: "Driver", icon: Car, path: "/driver" },
      ],
    },
  ];

  return (
    <aside
      className={`${styles.sidebar} ${
        open ? styles.open : styles.close
      }`}
    >
      {/* HEADER */}
      <div className={styles.sidebarHeader}>
        <div className={styles.logoWrapper}>
          {/* <img
            src="/logo-sigap.png"
            alt="SIGAP Logo"
            className={styles.logoImage}
          /> */}
          
          {open && (
            <div className={`${styles.logoImage} relative flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.2)]`}>
              <Hexagon className="h-4 w-4 text-cyan-400" strokeWidth={1.5} />
              <div className="absolute inset-0 bg-cyan-400/20 blur-md rounded-full -z-10" />
            </div>
          )}

          {open && (
            <div className={styles.logoText}>
              <div className={styles.logoTitle}>SMART GATE</div>
              <div className={styles.logoSub}>SECURE ACCESS</div>
            </div>
          )}
        </div>

        <button className={styles.toggleBtn} onClick={toggle}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* MENU */}
      <div className={styles.menu}>
        {menu.map((group) => (
          <div key={group.section}>
            {open && (
              <p className={styles.sectionTitle}>
                {group.section}
              </p>
            )}

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
                  className={`${styles.item} ${
                    active ? styles.active : ""
                  }`}
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

      {/* SIGN OUT */}
      <div
        onClick={() => {
          signOut({ redirect: false }).then(() => {
            router.push("/auth/login");
          });
        }}
        className={`${styles.item} ${styles.signOut}`}
      >
        <DoorOpen size={18} className={styles.icon} />
        <span
          className={`${styles.label} ${
            open ? styles.show : styles.hide
          }`}
        >
          Sign Out
        </span>
      </div>
    </aside>
  );
}