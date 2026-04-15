import styles from "./Navbar.module.css";
import { signOut } from "next-auth/react";

interface NavbarProps {
  isOpen: boolean;
}

export default function Navbar({ isOpen }: NavbarProps) {
  return (
    <header
      className={`${styles.navbar} ${
        isOpen ? styles.navbarOpen : styles.navbarClosed
      }`}
    >
      <div className={styles.right}>
        <button onClick={() => signOut()} className={styles.logoutBtn}>
          Logout
        </button>
      </div>
    </header>
  );
}