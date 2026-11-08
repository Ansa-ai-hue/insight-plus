"use client";

import Link from "next/link";

const pages = [
  { name: "AI Notes", url: "/notes", desc: "Generate notes from PDFs" },
  { name: "AI Quiz", url: "/quiz", desc: "Test your knowledge" },
  { name: "Flashcards", url: "/flashcards", desc: "Revise important concepts" },
  { name: "Study Chat", url: "/study-chat", desc: "Ask your AI tutor" },
  { name: "Learning Recovery", url: "/recovery", desc: "Improve weak topics" },
  { name: "My Progress", url: "/progress", desc: "Track your performance" },
  { name: "Quiz History", url: "/history", desc: "View previous quizzes" },
  { name: "My Library", url: "/library", desc: "Manage your study files" },
  { name: "Profile", url: "/profile", desc: "Manage your account" },
  { name: "Settings", url: "/settings", desc: "Application settings" },
];

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 md:p-10">
      <h1 className="mb-2 text-3xl font-bold text-slate-900">Insight Plus</h1>
      <p className="mb-8 text-slate-600">Your AI-powered learning dashboard</p>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map((page) => (
          <Link
            key={page.url}
            href={page.url}
            className="rounded-xl bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <h2 className="mb-2 text-xl font-semibold text-slate-800">
              {page.name}
            </h2>
            <p className="text-sm text-slate-500">{page.desc}</p>
            <p className="mt-4 font-medium text-blue-600">Open →</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
