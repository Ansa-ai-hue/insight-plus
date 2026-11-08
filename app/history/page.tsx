"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    async function loadHistory() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("id, score, total_questions, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("History load error:", error.message);
        return;
      }

      setHistory(
        (data || []).map((quiz) => ({
          score: quiz.score,
          total: quiz.total_questions,
          date: new Date(quiz.created_at).toLocaleString(),
        })),
      );
    }

    loadHistory();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-slate-900">Quiz History</h1>

        <p className="mt-2 text-slate-600">
          Review your previous quiz attempts and scores.
        </p>

        <div className="mt-8 space-y-4">
          {history.length === 0 ? (
            <div className="rounded-xl bg-white p-6 text-slate-500 shadow-sm">
              No quiz attempts found yet. Complete a quiz to see your history.
            </div>
          ) : (
            history.map((quiz, index) => (
              <div key={index} className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-900">
                  Quiz Attempt {index + 1}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {quiz.date || "Date unavailable"}
                </p>

                <p className="mt-3 text-xl font-semibold text-blue-600">
                  {quiz.score ?? 0} / {quiz.total ?? 0}
                </p>

                {quiz.total > 0 && (
                  <p className="mt-1 text-sm text-slate-600">
                    {Math.round((quiz.score / quiz.total) * 100)}% Score
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
