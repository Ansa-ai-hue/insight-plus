"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Message = {
  role: "user" | "assistant";
  text: string;
};

export default function StudyChatPage() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function uploadPDF() {
    if (!file) {
      setError("Please select a PDF first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/extract-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "PDF upload failed.");
      }

      setExtractedText(data.extractedText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    const updatedMessages: Message[] = [
      ...messages,
      { role: "user", text: userMessage },
    ];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/study-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: extractedText,
          message: userMessage,
          history: messages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Message failed.");
      }

      const assistantMessage: Message = {
        role: "assistant",
        text: data.answer,
      };

      setMessages([...updatedMessages, assistantMessage]);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { error: saveError } = await supabase.from("saved_notes").insert({
          user_id: user.id,
          title: "Study Chat Conversation",
          content: JSON.stringify([...updatedMessages, assistantMessage]),
        });

        if (saveError) {
          console.error("Chat save error:", saveError.message);
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
          AI Study Chat
        </h1>

        <p className="mt-2 text-slate-600">
          Upload your PDF and ask your AI tutor questions.
        </p>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-800">
            Upload Study Material (Optional)
          </h2>

          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setExtractedText("");
              setError("");
            }}
            className="block w-full rounded-lg border border-slate-400 bg-white p-3 text-slate-900 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white"
          />

          <button
            onClick={uploadPDF}
            disabled={!file || loading}
            className="mt-3 rounded-lg bg-blue-600 px-5 py-2 text-white disabled:opacity-50"
          >
            Upload PDF
          </button>

          {extractedText && (
            <p className="mt-3 text-sm text-green-700">
              PDF uploaded successfully. You can now ask questions.
            </p>
          )}
        </div>

        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-5 min-h-64 space-y-4">
            {messages.length === 0 && (
              <p className="pt-16 text-center text-slate-400">
                Start asking your study questions here.
              </p>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`rounded-xl p-4 ${
                  msg.role === "user"
                    ? "ml-8 bg-blue-100 text-slate-900"
                    : "mr-8 bg-slate-100 text-slate-800"
                }`}
              >
                <p className="mb-1 text-xs font-semibold uppercase">
                  {msg.role === "user" ? "You" : "AI Tutor"}
                </p>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            ))}

            {loading && (
              <p className="text-sm text-slate-500">AI Tutor is thinking...</p>
            )}
          </div>

          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              placeholder="Ask your study question..."
              className="min-w-0 flex-1 rounded-lg border border-slate-300 p-3 text-slate-900"
            />

            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="rounded-lg bg-purple-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </main>
  );
}
