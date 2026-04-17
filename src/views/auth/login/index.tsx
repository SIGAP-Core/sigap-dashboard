import style from "./login.module.css";
import { useState } from "react";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";
import { Mail, Lock, Hexagon } from "lucide-react";

const TampilanLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { push, query } = useRouter();

  const callbackUrl = (query.callbackUrl as string) || "/";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const email = (
      event.currentTarget.elements.namedItem("email") as HTMLInputElement
    ).value;

    const password = (
      event.currentTarget.elements.namedItem("password") as HTMLInputElement
    ).value;

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    setIsLoading(false);

    if (!res?.ok) {
      setError("Email atau password salah");
      return;
    }

    push(callbackUrl);
  };

  return (
    <div className={style.wrapper}>
      <div className={style.card}>
        {/* HEADER */}
        <div className={style.header}>
          <div className={style.logoWrapper}>
            {/* <img
              src="/logo-sigap.png"
              alt="SIGAP Logo"
              className={style.logoImage}
            /> */}
            <div className="relative flex h-16 w-16 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 mb-4 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
              <Hexagon className="h-8 w-8 text-cyan-400" strokeWidth={1.5} />
            <div className="absolute inset-0 bg-cyan-400/20 blur-md rounded-full -z-10" />
          </div>
          </div>

          <div className={style.logoText}>
            <h1>SYSTEM LOGIN</h1>
            <p>Smart Parking Gate Secure Access</p>
          </div>
        </div>

        {error && <div className={style.error}>{error}</div>}

        {/* FORM */}
        <form onSubmit={handleSubmit} className={style.form}>
          <div className={style.inputBox}>
            <label>EMAIL</label>
            <div className={style.inputWrapper}>
              <Mail size={18} />
              <input
                type="email"
                name="email"
                placeholder="admin@smartgate.sys"
                required
              />
            </div>
          </div>

          <div className={style.inputBox}>
            <label>PASSWORD</label>
            <div className={style.inputWrapper}>
              <Lock size={18} />
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button disabled={isLoading} className={style.button}>
            {isLoading ? "LOADING..." : "LOGIN"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TampilanLogin;