"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function FlashcardsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  async function generateCards() {
    if (!file) {
      setError("Please select a PDF first.");
      return;
    }

    setLoading(true);
    setError("");
    setCards([]);

    try {
      const form = new FormData();
      form.append("file", file);

      const upload = await fetch("/api/extract-pdf", {
        method: "POST",
        body: form,
      });

      const uploadData = await upload.json();

      if (!upload.ok) {
        throw new Error(uploadData.error || "PDF extraction failed.");
      }

      const response = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: uploadData.extractedText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Flashcard generation failed.");
      }

      const generatedCards = data.flashcards || data.cards || [];

      setCards(generatedCards);
      setIndex(0);
      setFlipped(false);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { error: saveError } = await supabase.from("flashcards").insert({
          user_id: user.id,
          title: file.name || "My Flashcards",
          cards: generatedCards,
        });

        if (saveError) {
          console.error("Flashcards save error:", saveError.message);
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
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-slate-900">
          AI Flashcards
        </h1>

        <p className="mt-2 text-slate-600">
          Upload your PDF and create smart revision flashcards.
        </p>

        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setError("");
            }}
            className="block w-full rounded-lg border border-slate-400 bg-white p-3 text-slate-900 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white"
          />

          <button
            onClick={generateCards}
            disabled={!file || loading}
            className="mt-4 rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Flashcards"}
          </button>

          {error && <p className="mt-4 text-red-600">{error}</p>}
        </div>

        {cards.length > 0 && (
          <div className="mt-8">
            <p className="mb-4 text-center text-slate-600">
              Card {index + 1} of {cards.length}
            </p>

            <button
              onClick={() => setFlipped(!flipped)}
              className="flex min-h-64 w-full items-center justify-center rounded-2xl bg-white p-8 text-center shadow-lg transition hover:shadow-xl"
            >
              <div>
                <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-purple-600">
                  {flipped ? "Answer" : "Question"} · Click to flip
                </p>
                <p className="text-xl font-semibold text-slate-900">
                  {flipped ? cards[index].answer : cards[index].question}
                </p>
              </div>
            </button>

            <div className="mt-5 flex justify-between gap-4">
              <button
                disabled={index === 0}
                onClick={() => {
                  setIndex(index - 1);
                  setFlipped(false);
                }}
                className="rounded-lg bg-slate-700 px-6 py-3 text-white disabled:opacity-40"
              >
                Previous
              </button>

              <button
                disabled={index === cards.length - 1}
                onClick={() => {
                  setIndex(index + 1);
                  setFlipped(false);
                }}
                className="rounded-lg bg-blue-600 px-6 py-3 text-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
