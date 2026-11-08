"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type LibraryFile = {
  name: string;
  size: number;
  date: string;
};

export default function LibraryPage() {
  const [files, setFiles] = useState<LibraryFile[]>([]);

  useEffect(() => {
    async function loadFiles() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("study_materials")
        .select("file_name, file_size, created_at")
        .eq("user_id", user.id);

      if (error) {
        console.error("Library load error:", error.message);
        return;
      }

      setFiles(
        (data || []).map((item) => ({
          name: item.file_name,
          size: item.file_size,
          date: new Date(item.created_at).toLocaleDateString(),
        })),
      );
    }

    loadFiles();
  }, []);

  async function addFile(file: File) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please login first.");
      return;
    }

    const filePath = `${user.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("study-materials")
      .upload(filePath, file);

    if (uploadError) {
      alert(uploadError.message);
      return;
    }

    const { error: dbError } = await supabase.from("study_materials").insert({
      user_id: user.id,
      file_name: file.name,
      file_size: file.size,
    });

    if (dbError) {
      alert(dbError.message);
      return;
    }

    const newFile = {
      name: file.name,
      size: file.size,
      date: new Date().toLocaleDateString(),
    };

    setFiles((previous) => [...previous, newFile]);
  }

  async function deleteFile(index: number) {
    const fileToDelete = files[index];

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: records, error } = await supabase
      .from("study_materials")
      .select("id, file_name")
      .eq("user_id", user.id)
      .eq("file_name", fileToDelete.name);

    if (error || !records || records.length === 0) {
      alert("File record not found.");
      return;
    }

    const { error: deleteError } = await supabase
      .from("study_materials")
      .delete()
      .eq("id", records[0].id)
      .eq("user_id", user.id);

    if (deleteError) {
      alert(deleteError.message);
      return;
    }

    setFiles((previous) => previous.filter((_, i) => i !== index));
  }
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          ← Back to Dashboard
        </Link>

        <h1 className="mt-6 text-3xl font-bold text-slate-900">My Library</h1>

        <p className="mt-2 text-slate-600">
          Keep track of your study documents.
        </p>

        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <label className="mb-3 block font-semibold text-slate-800">
            Add a study PDF
          </label>

          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) addFile(file);
              e.target.value = "";
            }}
            className="block w-full rounded-lg border border-slate-400 bg-white p-3 text-slate-900 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white"
          />
        </div>

        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Saved Documents ({files.length})
          </h2>

          {files.length === 0 ? (
            <p className="text-slate-500">No documents added yet.</p>
          ) : (
            <div className="space-y-3">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                >
                  <div>
                    <p className="font-semibold text-slate-800">{file.name}</p>
                    <p className="text-sm text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB · {file.date}
                    </p>
                  </div>

                  <button
                    onClick={() => deleteFile(index)}
                    className="rounded-lg bg-red-100 px-4 py-2 text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
