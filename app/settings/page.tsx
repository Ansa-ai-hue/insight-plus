"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const savedTheme = localStorage.getItem("darkMode");
    const isDark = savedTheme === "true";

    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  useEffect(() => {
    localStorage.setItem("darkMode", String(darkMode));
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 transition-colors dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-slate-900">Settings</h1>

        <p className="mt-2 text-slate-600">
          Manage your Insight Plus preferences.
        </p>

        <div className="mt-8 space-y-5">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Appearance
            </h2>

            <label className="flex items-center justify-between gap-4">
              <span className="text-slate-700">Dark Mode Preference</span>
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
                className="h-5 w-5"
              />
            </label>

            <p className="mt-2 text-sm text-slate-500">
              This is a preference toggle only; it does not yet change the
              website theme.
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Notifications
            </h2>

            <label className="flex items-center justify-between gap-4">
              <span className="text-slate-700">Study Notifications</span>
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                className="h-5 w-5"
              />
            </label>

            <p className="mt-2 text-sm text-slate-500">
              This setting is currently a visual preference and does not send
              notifications.
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-slate-900">Account</h2>

            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-600 px-6 py-3 font-semibold text-white"
            >
              Logout
            </button>

            {message && <p className="mt-3 text-sm text-red-600">{message}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
