"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function RecoveryPage() {
  const [wrongAnswers, setWrongAnswers] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function analyzeAnswers() {
    if (!wrongAnswers.trim()) {
      setError("Please enter your incorrect answers.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/learning-recovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wrongAnswers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed.");
      }

      setResult(data);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { error: saveError } = await supabase.from("saved_notes").insert({
          user_id: user.id,
          title: "Learning Recovery Analysis",
          content: JSON.stringify(data),
        });

        if (saveError) {
          console.error("Recovery save error:", saveError.message);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-slate-900">
          Learning Recovery
        </h1>

        <p className="mt-2 text-slate-600">
          Identify weak topics and get a personalized recovery plan.
        </p>

        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <label className="mb-3 block font-semibold text-slate-800">
            Enter your incorrect answers
          </label>

          <textarea
            value={wrongAnswers}
            onChange={(e) => setWrongAnswers(e.target.value)}
            placeholder="Example: I got questions about photosynthesis, cell division and genetics wrong..."
            rows={7}
            className="w-full rounded-lg border border-slate-300 p-4 text-slate-900"
          />

          <button
            onClick={analyzeAnswers}
            disabled={loading || !wrongAnswers.trim()}
            className="mt-4 rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Analyzing..." : "Analyze My Weak Areas"}
          </button>

          {error && <p className="mt-4 text-red-600">{error}</p>}
        </div>

        {result && (
          <div className="mt-8 space-y-5">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-xl font-bold text-slate-900">
                Your Learning Analysis
              </h2>

              <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
