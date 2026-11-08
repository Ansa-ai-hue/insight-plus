"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function NotesPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  async function handleUpload() {
    if (!selectedFile) {
      setError("Please select a PDF first.");
      return;
    }

    setIsUploading(true);
    setError("");
    setExtractedText("");
    setNotes("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/extract-pdf", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "PDF upload failed.");
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please login first.");
      }

      const filePath = `${user.id}/${Date.now()}-${selectedFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("study-materials")
        .upload(filePath, selectedFile);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { error: dbError } = await supabase.from("study_materials").insert({
        user_id: user.id,
        file_name: selectedFile.name,
        file_size: selectedFile.size,
      });

      if (dbError) {
        throw new Error(dbError.message);
      }

      setExtractedText(result.extractedText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleGenerateNotes() {
    if (!extractedText) {
      setError("Please upload a PDF first.");
      return;
    }

    setIsGeneratingNotes(true);
    setError("");
    setNotes("");

    try {
      const response = await fetch("/api/generate-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: extractedText }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Notes generation failed.");
      }

      setNotes(result.notes);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { error: saveError } = await supabase.from("saved_notes").insert({
          user_id: user.id,
          title: selectedFile?.name || "My Study Notes",
          content: result.notes,
        });

        if (saveError) {
          console.error("Notes save error:", saveError.message);
        } else {
          console.log("Notes saved successfully!");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsGeneratingNotes(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-slate-900">AI Notes</h1>

        <p className="mt-2 text-slate-600">
          Upload your PDF and generate smart study notes.
        </p>

        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <label className="mb-3 block font-semibold text-slate-800">
            Select your PDF
          </label>

          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              setSelectedFile(e.target.files?.[0] || null);
              setError("");
              setExtractedText("");
              setNotes("");
            }}
            className="block w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-700"
          />

          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="mt-4 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Upload PDF"}
          </button>

          {extractedText && (
            <div className="mt-4">
              <p className="text-sm text-green-700">
                PDF uploaded and text extracted successfully.
              </p>

              <button
                onClick={handleGenerateNotes}
                disabled={isGeneratingNotes}
                className="mt-4 rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
              >
                {isGeneratingNotes
                  ? "Generating Notes..."
                  : "Generate AI Notes"}
              </button>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </div>

        {notes && (
          <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold text-slate-900">
              Your AI Notes
            </h2>

            <div className="whitespace-pre-wrap leading-7 text-slate-700">
              {notes}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
