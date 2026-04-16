import Head from "next/head";
import React, { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, MoreVertical, UserCheck, UserCircle2, Search } from "lucide-react";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  license: string;
  status: string;
};

type ModalMode = "add" | "edit";

export default function UserPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formLicense, setFormLicense] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/drivers");
      if (!response.ok) {
        throw new Error(`Unexpected status ${response.status}`);
      }

      const data = await response.json();
      const records: UserRecord[] = (data as Array<any>).map((item) => ({
        id: item.id,
        name: item.name || "Unknown User",
        email: item.email || "no-reply@smartgate.sys",
        license: item.license || "",
        status: item.status || "inactive",
      }));

      setUsers(records);
    } catch (fetchError) {
      console.error("Failed to fetch user data:", fetchError);
      setError("Unable to load user list from Firestore.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAddModal = () => {
    setModalMode("add");
    setSelectedUser(null);
    setFormName("");
    setFormEmail("");
    setFormLicense("");
    setFormStatus("active");
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (user: UserRecord) => {
    setModalMode("edit");
    setSelectedUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormLicense(user.license);
    setFormStatus(user.status);
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
    const trimmedLicense = formLicense.trim();

    if (!trimmedName || !trimmedEmail || !trimmedLicense || !formStatus) {
      setFormError("Name, email, license, and status are required.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (modalMode === "add") {
        const response = await fetch("/api/drivers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmedName, email: trimmedEmail, license: trimmedLicense, status: formStatus }),
        });

        if (!response.ok) {
          const body = await response.json();
          throw new Error(body?.error || `Status ${response.status}`);
        }
      } else if (modalMode === "edit" && selectedUser) {
        const response = await fetch(`/api/drivers/${selectedUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmedName, email: trimmedEmail, license: trimmedLicense, status: formStatus }),
        });

        if (!response.ok) {
          const body = await response.json();
          throw new Error(body?.error || `Status ${response.status}`);
        }
      }

      await fetchUsers();
      closeModal();
    } catch (submitError) {
      console.error("Failed to save user:", submitError);
      setFormError(String(submitError));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: UserRecord) => {
    const confirmed = window.confirm(`Delete user ${user.name} (${user.email})?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/drivers/${user.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body?.error || `Status ${response.status}`);
      }

      setUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (deleteError) {
      console.error("Failed to delete user:", deleteError);
      setError("Unable to delete user. Please try again.");
    }
  };

  const filteredUsers = users.filter((user) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.license.toLowerCase().includes(query) ||
      user.id.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <Head>
        <title>User Management | SIGAP</title>
      </Head>

      <div className="min-h-screen bg-slate-950 text-slate-100">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                <UserCheck className="h-4 w-4 text-cyan-300" />
                Driver Management
              </p>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Driver Management
                </h1>
                <p className="max-w-2xl text-slate-400">
                  Manage registered drivers and vehicle access
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400"
            >
              <Plus className="h-4 w-4" />
              Add New User
            </button>
          </div>

          <div className="mt-8 space-y-6">
            <div className="rounded-[28px] border border-slate-800/90 bg-slate-900/90 p-6 shadow-2xl shadow-slate-950/20">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-400">Search users by name, email, license, or UID</p>
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
                    {loading ? "Loading users..." : `${filteredUsers.length} users found`}
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-slate-800/90 bg-slate-900/95 shadow-2xl shadow-slate-950/20">
              <div className="grid grid-cols-[1.5fr_2fr_1fr_1fr_0.8fr] items-center gap-0 border-b border-slate-800 bg-slate-950/90 px-6 py-4 text-xs uppercase tracking-[0.22em] text-slate-500">
                <span className="font-medium">Full Name</span>
                <span className="font-medium">Email Address</span>
                <span className="font-medium">License</span>
                <span className="font-medium">Status</span>
                <span className="font-medium text-right">Actions</span>
              </div>

              <div className="divide-y divide-slate-800">
                {loading ? (
                  <div className="px-6 py-16 text-center text-slate-500">Loading user records...</div>
                ) : error ? (
                  <div className="px-6 py-16 text-center text-rose-300">{error}</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="px-6 py-16 text-center text-slate-400">No users found.</div>
                ) : (
                  filteredUsers.map((user) => (
                    <div key={user.id} className="grid grid-cols-[1.5fr_2fr_1fr_1fr_0.8fr] gap-0 px-6 py-5 text-sm text-slate-200">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-400/20">
                          <span className="text-lg font-semibold text-cyan-100">
                            {user.name
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-white">{user.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 min-w-0">
                        <UserCircle2 className="h-5 w-5 text-cyan-400" />
                        <span className="truncate text-slate-300">{user.email}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="truncate text-slate-300">{user.license}</span>
                      </div>
                      <div className="flex items-center">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] ${
                          user.status === 'active' ? 'border-green-800 bg-green-900/20 text-green-300' : 'border-red-800 bg-red-900/20 text-red-300'
                        }`}>
                          {user.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-3 text-slate-400">
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/90 text-slate-400 transition hover:bg-slate-900 hover:text-cyan-300"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(user)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/90 text-slate-400 transition hover:bg-slate-900 hover:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/90 text-slate-400 transition hover:bg-slate-900 hover:text-slate-100">
                          <MoreVertical className="h-4 w-4" />
                        </button>
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
                    {modalMode === "add" ? "Add New User" : "Edit User"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    {modalMode === "add"
                      ? "Provide the user's full name, email, license, and status."
                      : "Update the user's information."}
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
                    placeholder="Example: John Doe"
                    className="w-full rounded-3xl border border-slate-800/80 bg-slate-950/90 px-5 py-4 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Email address</label>
                  <input
                    value={formEmail}
                    onChange={(event) => setFormEmail(event.target.value)}
                    type="email"
                    placeholder="user@example.com"
                    className="w-full rounded-3xl border border-slate-800/80 bg-slate-950/90 px-5 py-4 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">License</label>
                  <input
                    value={formLicense}
                    onChange={(event) => setFormLicense(event.target.value)}
                    type="text"
                    placeholder="License key"
                    className="w-full rounded-3xl border border-slate-800/80 bg-slate-950/90 px-5 py-4 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Status</label>
                  <select
                    value={formStatus}
                    onChange={(event) => setFormStatus(event.target.value)}
                    className="w-full rounded-3xl border border-slate-800/80 bg-slate-950/90 px-5 py-4 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
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
                    {saving ? "Saving..." : modalMode === "add" ? "Create User" : "Save Changes"}
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