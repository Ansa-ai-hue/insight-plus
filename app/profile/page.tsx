"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        setEmail(data.user.email || "");
        setCreatedAt(
          data.user.created_at
            ? new Date(data.user.created_at).toLocaleDateString()
            : "Not available",
        );
      }

      setLoading(false);
    }

    loadProfile();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-slate-900">My Profile</h1>

        <p className="mt-2 text-slate-600">
          View your Insight Plus account information.
        </p>

        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-3xl font-bold text-blue-700">
            {email ? email.charAt(0).toUpperCase() : "U"}
          </div>

          {loading ? (
            <p className="text-slate-500">Loading profile...</p>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-sm text-slate-500">Email Address</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {email || "Not available"}
                </p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Account Created</p>
                <p className="mt-1 font-semibold text-slate-900">{createdAt}</p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Platform</p>
                <p className="mt-1 font-semibold text-slate-900">
                  Insight Plus
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
