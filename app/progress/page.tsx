"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ProgressPage() {
  const [quizCount, setQuizCount] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [notesCount, setNotesCount] = useState(0);
  const [materialsCount, setMaterialsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProgress() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: quizzes } = await supabase
        .from("quiz_attempts")
        .select("score, total_questions")
        .eq("user_id", user.id);

      const { count: notes } = await supabase
        .from("saved_notes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: materials } = await supabase
        .from("study_materials")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const total =
        quizzes?.reduce((sum, quiz) => sum + quiz.total_questions, 0) || 0;

      const correct = quizzes?.reduce((sum, quiz) => sum + quiz.score, 0) || 0;

      setQuizCount(quizzes?.length || 0);
      setAverageScore(total > 0 ? Math.round((correct / total) * 100) : 0);
      setNotesCount(notes || 0);
      setMaterialsCount(materials || 0);
      setLoading(false);
    }

    loadProgress();
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-slate-900">My Progress</h1>

        <p className="mt-2 text-slate-600">Track your learning activity.</p>

        {loading ? (
          <p className="mt-8 text-slate-600">Loading progress...</p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {[
              { title: "Quiz Attempts", value: quizCount },
              { title: "Average Score", value: `${averageScore}%` },
              { title: "Saved Notes", value: notesCount },
              { title: "Study Materials", value: materialsCount },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl bg-white p-6 shadow-sm"
              >
                <p className="text-slate-500">{item.title}</p>
                <p className="mt-3 text-3xl font-bold text-blue-700">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
