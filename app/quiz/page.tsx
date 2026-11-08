"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function QuizPage() {
  const [file, setFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function generateQuiz() {
    if (!file) {
      setError("Please select a PDF first.");
      return;
    }

    setLoading(true);
    setError("");
    setQuestions([]);
    setSubmitted(false);

    try {
      const form = new FormData();
      form.append("file", file);

      const upload = await fetch("/api/extract-pdf", {
        method: "POST",
        body: form,
      });

      const uploadData = await upload.json();
      if (!upload.ok)
        throw new Error(uploadData.error || "PDF extraction failed.");

      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: uploadData.extractedText }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Quiz generation failed.");

      setQuestions(data.questions || []);
      setAnswers(new Array((data.questions || []).length).fill(-1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const score = questions.filter(
    (q, i) => answers[i] === q.correctAnswer,
  ).length;

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="text-blue-600">
          ← Back to Dashboard
        </Link>

        <h1 className="mt-6 text-3xl font-bold">AI Quiz</h1>
        <p className="mt-2 text-slate-600">
          Upload a PDF to generate your quiz.
        </p>

        <div className="mt-8 rounded-xl bg-white p-6 shadow">
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full rounded-lg border border-slate-400 bg-white p-3 text-slate-900 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white"
          />

          <button
            onClick={generateQuiz}
            disabled={!file || loading}
            className="mt-4 rounded-lg bg-blue-600 px-6 py-3 text-white disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate AI Quiz"}
          </button>

          {error && <p className="mt-4 text-red-600">{error}</p>}
        </div>

        {questions.length > 0 && (
          <div className="mt-8 space-y-5">
            {questions.map((q, i) => (
              <div key={i} className="rounded-xl bg-white p-6 shadow">
                <h2 className="mb-4 font-semibold text-slate-900">
                  {i + 1}. {q.question}
                </h2>

                {q.options.map((option: string, j: number) => (
                  <button
                    key={j}
                    disabled={submitted}
                    onClick={() =>
                      setAnswers((old) =>
                        old.map((a, index) => (index === i ? j : a)),
                      )
                    }
                    className={`mb-2 block w-full rounded-lg border border-slate-300 p-3 text-left font-medium text-slate-900 ${
                      answers[i] === j
                        ? "border-blue-600 bg-blue-100 text-blue-900"
                        : "bg-white text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {option}
                  </button>
                ))}

                {submitted && (
                  <p className="mt-3 text-sm text-slate-600">
                    Correct answer: {q.options[q.correctAnswer]}
                  </p>
                )}
              </div>
            ))}

            {!submitted ? (
              <button
                disabled={answers.some((a) => a === -1)}
                onClick={async () => {
                  setSubmitted(true);

                  const {
                    data: { user },
                  } = await supabase.auth.getUser();

                  if (user) {
                    const { error } = await supabase
                      .from("quiz_attempts")
                      .insert({
                        user_id: user.id,
                        score: score,
                        total_questions: questions.length,
                      });

                    if (error) {
                      console.error("Quiz save error:", error.message);
                    } else {
                      console.log("Quiz saved to database!");
                    }
                  }
                }}
                className="w-full rounded-lg bg-purple-600 p-4 font-semibold text-white disabled:opacity-50"
              >
                Submit Quiz
              </button>
            ) : (
              <div className="rounded-xl border border-slate-300 bg-white p-6 text-center shadow">
                <h2 className="text-2xl font-bold text-slate-900">
                  Your Result
                </h2>
                <p className="mt-3 text-3xl font-bold text-blue-700">
                  {score} / {questions.length}
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  {Math.round((score / questions.length) * 100)}% Score
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
