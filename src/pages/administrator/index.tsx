import Head from "next/head";
import React, { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, MoreVertical, ShieldCheck, UserCircle2, Search } from "lucide-react";
import { useSession } from "next-auth/react";

type AdminRecord = {
  id: string;
  name: string;
  email: string;
  password: string;
};

type ModalMode = "add" | "edit";

export default function AdministratorPage() {
  const { data: session } = useSession();
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [selectedAdmin, setSelectedAdmin] = useState<AdminRecord | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admins");
      if (!response.ok) {
        throw new Error(`Unexpected status ${response.status}`);
      }

      const data = await response.json();
      const records: AdminRecord[] = (data as Array<any>).map((item) => ({
        id: item.id,
        name: item.name || "Unknown Admin",
        email: item.email || "no-reply@smartgate.sys",
        password: item.password || "",
      }));

      setAdmins(records);
    } catch (fetchError) {
      console.error("Failed to fetch admin data:", fetchError);
      setError("Unable to load admin list from Firestore.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const openAddModal = () => {
    setModalMode("add");
    setSelectedAdmin(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (admin: AdminRecord) => {
    setModalMode("edit");
    setSelectedAdmin(admin);
    setFormName(admin.name);
    setFormEmail(admin.email);
    setFormPassword(admin.password);
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormError(null);
    setSaving(false);
  };

  const handleSubmit = async () => {
    const trimmedName = formName.trim();
    const trimmedEmail = formEmail.trim();
    const trimmedPassword = formPassword.trim();

    if (!trimmedName || !trimmedEmail) {
      setFormError("Name and email are required.");
      return;
    }

    if (modalMode === "add" && !trimmedPassword) {
      setFormError("Password is required for new admins.");
      return;
    }

    if (trimmedPassword && trimmedPassword.length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (modalMode === "add") {
        const response = await fetch("/api/admins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmedName, email: trimmedEmail, password: trimmedPassword }),
        });

        if (!response.ok) {
          const body = await response.json();
          throw new Error(body?.error || `Status ${response.status}`);
        }
      } else if (modalMode === "edit" && selectedAdmin) {
        const updateData: any = { name: trimmedName, email: trimmedEmail };
        if (trimmedPassword) {
          updateData.password = trimmedPassword;
        }

        const response = await fetch(`/api/admins/${selectedAdmin.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const body = await response.json();
          throw new Error(body?.error || `Status ${response.status}`);
        }
      }

      await fetchAdmins();
      closeModal();
    } catch (submitError) {
      console.error("Failed to save admin:", submitError);
      setFormError(String(submitError));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (admin: AdminRecord) => {
    const confirmed = window.confirm(`Delete admin ${admin.name} (${admin.email})?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admins/${admin.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body?.error || `Status ${response.status}`);
      }

      setAdmins((current) => current.filter((item) => item.id !== admin.id));
    } catch (deleteError) {
      console.error("Failed to delete admin:", deleteError);
      setError("Unable to delete admin. Please try again.");
    }
  };

  const filteredAdmins = admins.filter((admin) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      admin.name.toLowerCase().includes(query) ||
      admin.email.toLowerCase().includes(query) ||
      admin.id.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <Head>
        <title>Admin Management | SIGAP</title>
      </Head>

      <div className="min-h-screen bg-slate-950 text-slate-100">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                <ShieldCheck className="h-4 w-4 text-cyan-300" />
                Admin Management
              </p>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Admin Management
                </h1>
                <p className="max-w-2xl text-slate-400">
                  Manage system administrators and operators.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400"
            >
              <Plus className="h-4 w-4" />
              Add New Admin
            </button>
          </div>

          <div className="mt-8 space-y-6">
            <div className="rounded-[28px] border border-slate-800/90 bg-slate-900/90 p-6 shadow-2xl shadow-slate-950/20">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-400">Search admins by name, email, or UID</p>
                  <div className="relative max-w-xl">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      type="text"
                      placeholder="Search"
                      className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/90 px-12 py-4 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>
                </div>
                <div className="hidden md:block">
                  <span className="inline-flex rounded-full bg-slate-800/80 px-4 py-2 text-sm text-slate-400">
                    {loading ? "Loading admins..." : `${filteredAdmins.length} admins found`}
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-slate-800/90 bg-slate-900/95 shadow-2xl shadow-slate-950/20">
              <div className="grid grid-cols-[2fr_2fr_1fr_0.8fr] gap-0 border-b border-slate-800 bg-slate-950/90 px-6 py-4 text-xs uppercase tracking-[0.22em] text-slate-500 sm:grid-cols-[2fr_2fr_1fr_1fr]">
                <span className="font-medium">Full Name</span>
                <span className="font-medium">Email Address</span>
                <span className="font-medium">Admin UID</span>
                <span className="font-medium text-right">Actions</span>
              </div>

              <div className="divide-y divide-slate-800">
                {loading ? (
                  <div className="px-6 py-16 text-center text-slate-500">Loading admin records...</div>
                ) : error ? (
                  <div className="px-6 py-16 text-center text-rose-300">{error}</div>
                ) : filteredAdmins.length === 0 ? (
                  <div className="px-6 py-16 text-center text-slate-400">No admins found.</div>
                ) : (
                  filteredAdmins.map((admin) => (
                    <div key={admin.id} className="grid grid-cols-[2fr_2fr_1fr_0.8fr] gap-0 px-6 py-5 text-sm text-slate-200 sm:grid-cols-[2fr_2fr_1fr_1fr]">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-400/20">
                          <span className="text-lg font-semibold text-cyan-100">
                            {admin.name
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-white">{admin.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <UserCircle2 className="h-5 w-5 text-cyan-400" />
                        <span className="truncate text-slate-300">{admin.email}</span>
                      </div>
                      <div className="flex items-center justify-center">
                        <span className="inline-flex rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                          {admin.id}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-3 text-slate-400">
                        <button
                          type="button"
                          onClick={() => openEditModal(admin)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/90 text-slate-400 transition hover:bg-slate-900 hover:text-cyan-300"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(admin)}
                          disabled={admin.id === (session?.user as any)?.id}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/90 text-slate-400 transition hover:bg-slate-900 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        {/* <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/90 text-slate-400 transition hover:bg-slate-900 hover:text-slate-100">
                          <MoreVertical className="h-4 w-4" />
                        </button> */}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>

        {modalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8">
            <div className="w-full max-w-2xl rounded-3xl border border-slate-800/90 bg-slate-900 p-8 shadow-2xl shadow-slate-950/40">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-white">
                    {modalMode === "add" ? "Add New Admin" : "Edit Admin"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    {modalMode === "add"
                      ? "Provide the administrator’s full name, email address, and password."
                      : "Update the admin’s name, email address, or password."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-slate-700 bg-slate-950/90 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-900"
                >
                  Close
                </button>
              </div>

              <div className="mt-8 space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Full name</label>
                  <input
                    value={formName}
                    onChange={(event) => setFormName(event.target.value)}
                    type="text"
                    placeholder="Example: Sofia Arif"
                    className="w-full rounded-3xl border border-slate-800/80 bg-slate-950/90 px-5 py-4 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Email address</label>
                  <input
                    value={formEmail}
                    onChange={(event) => setFormEmail(event.target.value)}
                    type="email"
                    placeholder="admin@example.com"
                    className="w-full rounded-3xl border border-slate-800/80 bg-slate-950/90 px-5 py-4 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Password</label>
                  <input
                    value={formPassword}
                    onChange={(event) => setFormPassword(event.target.value)}
                    type="password"
                    placeholder={modalMode === "add" ? "Enter password" : "Leave blank to keep current password"}
                    className="w-full rounded-3xl border border-slate-800/80 bg-slate-950/90 px-5 py-4 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
                {formError ? <p className="text-sm text-rose-400">{formError}</p> : null}
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-full border border-slate-700 bg-slate-950/90 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving}
                    className="rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : modalMode === "add" ? "Create Admin" : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
