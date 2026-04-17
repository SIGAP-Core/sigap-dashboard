import styles from "./Navbar.module.css";
import { useSession } from "next-auth/react";

interface NavbarProps {
  isOpen: boolean;
}

export default function Navbar({ isOpen }: NavbarProps) {
  const { data: session } = useSession();

  return (
    <header
      className={`${styles.navbar} ${
        isOpen ? styles.navbarOpen : styles.navbarClosed
      }`}
    >
      <div className={styles.left}></div>

      <div className={styles.right}>
        <span className={styles.welcomeText}>
          Selamat datang,{" "}
          <b>{session?.user?.name || "User"}</b>
        </span>
      </div>
    </header>
  );
}