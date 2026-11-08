"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ReactMarkdown from "react-markdown";
import Auth from "./auth";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [notes, setNotes] = useState("");
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [notesError, setNotesError] = useState("");

  const [questions, setQuestions] = useState<any[]>([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizError, setQuizError] = useState("");

  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showQuizResults, setShowQuizResults] = useState(false);

  const [quizHistory, setQuizHistory] = useState<any[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem("insightQuizHistory");

    if (savedHistory) {
      try {
        setQuizHistory(JSON.parse(savedHistory));
      } catch {
        localStorage.removeItem("insightQuizHistory");
      }
    }
  }, []);

  const totalQuizzes = quizHistory.length;

  const averageScore =
    totalQuizzes > 0
      ? Math.round(
          quizHistory.reduce((sum, item) => sum + item.percentage, 0) /
            totalQuizzes,
        )
      : 0;

  const bestScore =
    totalQuizzes > 0
      ? Math.max(...quizHistory.map((item) => item.percentage))
      : 0;

  const totalCorrect = quizHistory.reduce(
    (sum, item) => sum + item.correctAnswers,
    0,
  );

  const totalIncorrect = quizHistory.reduce(
    (sum, item) => sum + item.wrongAnswers,
    0,
  );

  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [flashcardsError, setFlashcardsError] = useState("");

  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  const [recoveryReport, setRecoveryReport] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");

  const [uploadError, setUploadError] = useState("");
  async function handleUpload() {
    if (!selectedFile) {
      alert("Please select a PDF first.");
      return;
    }

    setIsUploading(true);
    setUploadError("");
    setExtractedText("");

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

      setExtractedText(result.extractedText);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setIsUploading(false);
    }
  }
  async function handleGenerateNotes() {
    if (!extractedText) {
      setNotesError("Please upload a PDF first.");
      return;
    }

    setIsGeneratingNotes(true);
    setNotesError("");
    setNotes("");

    try {
      const response = await fetch("/api/generate-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: extractedText,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Notes generation failed.");
      }

      setNotes(result.notes);
    } catch (error) {
      setNotesError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setIsGeneratingNotes(false);
    }
  }

  async function handleGenerateQuiz() {
    if (!extractedText) return;

    setIsGeneratingQuiz(true);
    setQuizError("");
    setQuestions([]);

    try {
      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: extractedText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Quiz generation failed.");
      }

      setQuestions(data.questions);
    } catch (error) {
      setQuizError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setIsGeneratingQuiz(false);
    }
  }

  async function handleGenerateFlashcards() {
    if (!extractedText) {
      setFlashcardsError("Please upload a PDF first.");
      return;
    }

    setIsGeneratingFlashcards(true);
    setFlashcardsError("");
    setFlashcards([]);

    try {
      const response = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: extractedText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Flashcards generation failed.");
      }

      setFlashcards(data.flashcards);
    } catch (error) {
      setFlashcardsError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setIsGeneratingFlashcards(false);
    }
  }

  async function handleStudyChat() {
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    const updatedMessages = [
      ...chatMessages,
      { role: "user", text: userMessage },
    ];

    setChatMessages(updatedMessages);
    setChatInput("");
    setChatError("");
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/study-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: extractedText,
          message: userMessage,
          history: chatMessages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to get an answer.");
      }

      setChatMessages([
        ...updatedMessages,
        { role: "assistant", text: data.answer },
      ]);
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setIsChatLoading(false);
    }
  }

  async function handleLearningRecovery() {
    if (questions.length === 0 || selectedAnswers.length !== questions.length) {
      setRecoveryError("Please complete and submit your quiz first.");
      return;
    }

    setIsRecovering(true);
    setRecoveryError("");
    setRecoveryReport("");

    try {
      const response = await fetch("/api/learning-recovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questions,
          answers: selectedAnswers,
          text: extractedText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Recovery analysis failed.");
      }

      setRecoveryReport(data.report);
    } catch (error) {
      setRecoveryError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setIsRecovering(false);
    }
  }

  function handleAnswerSelect(questionIndex: number, optionIndex: number) {
    setSelectedAnswers((previous) => {
      const updated = [...previous];
      updated[questionIndex] = optionIndex;
      return updated;
    });
  }

  function handleSubmitQuiz() {
    if (
      selectedAnswers.length !== questions.length ||
      selectedAnswers.some((answer) => answer === undefined)
    ) {
      setQuizError("Please answer all questions before submitting.");
      return;
    }

    const correctCount = questions.filter(
      (question, index) => selectedAnswers[index] === question.correctAnswer,
    ).length;

    const historyEntry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      wrongAnswers: questions.length - correctCount,
      percentage: Math.round((correctCount / questions.length) * 100),
    };

    setQuizHistory((previous) => {
      const updated = [historyEntry, ...previous];
      localStorage.setItem("insightQuizHistory", JSON.stringify(updated));
      return updated;
    });

    setQuizError("");
    setShowQuizResults(true);
  }

  const features = [
    {
      icon: "📄",
      title: "AI Notes",
      desc: "Turn your PDFs into smart notes",
      color: "bg-blue-50",
    },
    {
      icon: "🧠",
      title: "AI Quiz",
      desc: "Test your knowledge with AI",
      color: "bg-purple-50",
    },
    {
      icon: "🗂️",
      title: "Flashcards",
      desc: "Remember more with flashcards",
      color: "bg-orange-50",
    },
    {
      icon: "💬",
      title: "Study Chat",
      desc: "Ask questions and learn faster",
      color: "bg-green-50",
    },
    {
      icon: "🎯",
      title: "Learning Recovery",
      desc: "Find and improve weak topics",
      color: "bg-pink-50",
    },
    {
      icon: "📊",
      title: "My Progress",
      desc: "Track your learning journey",
      color: "bg-yellow-50",
    },
  ];

  if (authLoading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 md:flex">
      <button
        onClick={async () => {
          await supabase.auth.signOut();
        }}
        className="fixed right-5 top-5 z-50 rounded-lg bg-red-600 px-5 py-2 text-white"
      >
        Logout
      </button>
      <aside className="w-full border-r border-slate-200 bg-white p-6 md:min-h-screen md:w-64">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-2xl text-white">
            ✦
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Insight Plus</h1>
            <p className="text-xs text-slate-500">AI Learning Platform</p>
          </div>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Workspace
        </p>

        <nav className="space-y-2">
          <a
            href="#"
            className="flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3 font-semibold text-indigo-700"
          >
            <span>🏠</span> Dashboard
          </a>
          <a
            href="#"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-600 hover:bg-slate-100"
          >
            <span>📚</span> My Library
          </a>
          <a
            href="#"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-600 hover:bg-slate-100"
          >
            <span>📝</span> Quizzes
          </a>
          <a
            href="#"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-600 hover:bg-slate-100"
          >
            <span>🗂️</span> Flashcards
          </a>
          <a
            href="#"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-600 hover:bg-slate-100"
          >
            <span>📈</span> Progress
          </a>
        </nav>

        <div className="mt-10 rounded-2xl bg-indigo-600 p-5 text-white">
          <div className="mb-2 text-2xl">✨</div>
          <h3 className="font-bold">Keep Learning!</h3>
          <p className="mt-2 text-sm text-indigo-100">
            Small steps every day lead to big results.
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:p-10">
        <header className="mb-9 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">
              Your personal learning space
            </p>
            <h2 className="mt-1 text-3xl font-bold text-slate-900">
              Welcome to Insight Plus 👋
            </h2>
            <p className="mt-2 text-slate-500">
              Learn smarter, understand better, and grow every day.
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium">
            🎓 My Study Space
          </div>
        </header>

        <section className="mb-9 overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 to-violet-600 p-7 text-white md:p-10">
          <div className="max-w-xl">
            <p className="mb-3 text-sm font-semibold text-indigo-200">
              YOUR AI-POWERED STUDY ASSISTANT
            </p>
            <h3 className="text-3xl font-bold md:text-4xl">
              Make learning easier with AI.
            </h3>
            <p className="mt-4 leading-7 text-indigo-100">
              Upload your study material, create notes, practice quizzes, and
              discover the topics you need to improve.
            </p>
            <a
              href="#upload"
              className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-indigo-700 hover:bg-indigo-50"
            >
              Upload Study Material →
            </a>
          </div>
        </section>

        <section
          id="upload"
          className="mb-10 rounded-2xl border-2 border-dashed border-indigo-200 bg-white p-8 text-center"
        >
          <div className="text-4xl">📤</div>
          <h3 className="mt-3 text-xl font-bold text-slate-900">
            Upload your study material
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Start with a PDF document to organize your learning.
          </p>
          <label className="mt-5 inline-block cursor-pointer rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700">
            Choose PDF
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (file && file.type === "application/pdf") {
                  setSelectedFile(file);
                } else {
                  setSelectedFile(null);
                  alert("Please select a valid PDF file.");
                }
              }}
            />
          </label>

          {selectedFile && (
            <p className="mt-4 text-sm font-semibold text-green-600">
              Selected: {selectedFile.name}
            </p>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="mt-4 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? "Reading PDF..." : "Upload and Read PDF"}
          </button>

          {uploadError && (
            <p className="mt-4 text-sm text-red-600">{uploadError}</p>
          )}

          {extractedText && (
            <div className="mt-6 max-h-80 overflow-auto rounded-xl bg-slate-50 p-4 text-left">
              <h4 className="font-bold text-green-700">
                PDF text extracted successfully!
              </h4>
              <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                {extractedText.slice(0, 5000)}
              </pre>
            </div>
          )}
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-xl font-bold text-slate-800">AI Study Notes</h3>

            <p className="mt-2 text-sm text-slate-500">
              Generate easy-to-understand notes from your uploaded PDF.
            </p>

            <button
              type="button"
              onClick={handleGenerateNotes}
              disabled={!extractedText || isGeneratingNotes}
              className="mt-5 rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGeneratingNotes ? "Generating Notes..." : "Generate AI Notes"}
            </button>

            <button
              type="button"
              onClick={handleGenerateQuiz}
              disabled={!extractedText || isGeneratingQuiz}
              className="mt-5 ml-3 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGeneratingQuiz ? "Generating Quiz..." : "Generate 20 MCQs"}
            </button>

            {quizError && <p className="mt-3 text-red-600">{quizError}</p>}

            {notesError && (
              <p className="mt-4 text-sm text-red-600">{notesError}</p>
            )}

            {notes && (
              <div className="mt-6 rounded-xl bg-slate-50 p-5">
                <h4 className="mb-3 font-bold text-purple-700">
                  Your AI Study Notes
                </h4>

                <div className="prose prose-purple max-w-none text-sm leading-7 text-slate-700">
                  <ReactMarkdown>{notes}</ReactMarkdown>
                </div>
              </div>
            )}

            <div className="mt-8 rounded-2xl border border-purple-200 bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-2xl font-bold text-purple-800">
                AI Study Chat
              </h2>

              <p className="mb-5 text-sm text-gray-600">
                Ask questions about your uploaded study material and get
                explanations from AI.
              </p>

              <div className="mb-5 max-h-96 space-y-4 overflow-y-auto">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`rounded-xl p-4 ${
                      msg.role === "user"
                        ? "ml-8 bg-purple-100 text-purple-950"
                        : "mr-8 bg-gray-100 text-gray-800"
                    }`}
                  >
                    <p className="mb-1 text-xs font-bold uppercase">
                      {msg.role === "user" ? "You" : "AI Tutor"}
                    </p>
                    <div className="text-sm leading-7">
                      <ReactMarkdown>
                        {msg.text
                          .replace(/\\([*_#`])/g, "$1")
                          .replace(/&#x20;/g, " ")
                          .replace(/\\-/g, "-")}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>

              {chatError && (
                <p className="mb-3 text-sm text-red-600">{chatError}</p>
              )}

              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask anything about your PDF..."
                rows={3}
                className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-purple-500"
              />

              <button
                type="button"
                onClick={handleStudyChat}
                disabled={isChatLoading || !chatInput.trim()}
                className="mt-3 rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {isChatLoading ? "Thinking..." : "Send Message"}
              </button>
            </div>

            {flashcardsError && (
              <p className="mt-4 text-sm text-red-600">{flashcardsError}</p>
            )}

            <div className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-2xl font-bold text-purple-800">
                AI Flashcards
              </h2>

              <p className="mb-5 text-sm text-gray-600">
                Generate flashcards from your uploaded PDF and click a card to
                reveal its answer.
              </p>

              <button
                type="button"
                onClick={handleGenerateFlashcards}
                disabled={isGeneratingFlashcards || !extractedText}
                className="rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {isGeneratingFlashcards
                  ? "Generating Flashcards..."
                  : "Generate Flashcards"}
              </button>

              {flashcards.length > 0 && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {flashcards.map((card, index) => (
                    <details
                      key={index}
                      className="rounded-xl border border-purple-200 bg-purple-50 p-4"
                    >
                      <summary className="cursor-pointer font-semibold text-purple-900">
                        {index + 1}. {card.front}
                      </summary>

                      <p className="mt-4 border-t border-purple-200 pt-3 leading-7 text-gray-700">
                        {card.back}
                      </p>
                    </details>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 rounded-2xl border border-purple-200 bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-2xl font-bold text-purple-800">
                AI Learning Gap Recovery
              </h2>

              <p className="mb-5 text-sm text-gray-600">
                Discover your weak topics and receive a personalized study plan
                based on your quiz mistakes.
              </p>

              <button
                type="button"
                onClick={handleLearningRecovery}
                disabled={isRecovering || !showQuizResults}
                className="rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {isRecovering
                  ? "Analyzing Your Mistakes..."
                  : "Analyze My Learning Gaps"}
              </button>

              {recoveryError && (
                <p className="mt-4 text-sm text-red-600">{recoveryError}</p>
              )}

              {recoveryReport && (
                <div className="prose mt-6 max-w-none text-sm leading-7 text-gray-700">
                  <ReactMarkdown>{recoveryReport}</ReactMarkdown>
                </div>
              )}
            </div>

            <div className="mt-8 rounded-2xl border border-purple-200 bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-2xl font-bold text-purple-800">
                Quiz History
              </h2>

              <p className="mb-5 text-sm text-gray-600">
                Review your previous quiz scores and progress.
              </p>

              {quizHistory.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No quiz attempts yet. Complete a quiz to see your history.
                </p>
              ) : (
                <div className="space-y-3">
                  {quizHistory.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-gray-200 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-gray-800">
                          Quiz Attempt
                        </p>
                        <p className="text-xs text-gray-500">{item.date}</p>
                      </div>

                      <p className="mt-2 text-sm text-gray-600">
                        Score: {item.correctAnswers}/{item.totalQuestions} ·{" "}
                        {item.percentage}%
                      </p>

                      <p className="text-sm text-gray-600">
                        Incorrect answers: {item.wrongAnswers}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8 rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
              <h2 className="mb-2 text-2xl font-bold text-blue-800">
                My Progress
              </h2>

              <p className="mb-5 text-sm text-gray-600">
                Track your learning journey and quiz performance.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-blue-50 p-4">
                  <p className="text-sm text-gray-600">Total Quizzes</p>
                  <p className="mt-2 text-3xl font-bold text-blue-800">
                    {totalQuizzes}
                  </p>
                </div>

                <div className="rounded-xl bg-purple-50 p-4">
                  <p className="text-sm text-gray-600">Average Score</p>
                  <p className="mt-2 text-3xl font-bold text-purple-800">
                    {averageScore}%
                  </p>
                </div>

                <div className="rounded-xl bg-green-50 p-4">
                  <p className="text-sm text-gray-600">Best Score</p>
                  <p className="mt-2 text-3xl font-bold text-green-800">
                    {bestScore}%
                  </p>
                </div>

                <div className="rounded-xl bg-orange-50 p-4">
                  <p className="text-sm text-gray-600">Correct Answers</p>
                  <p className="mt-2 text-3xl font-bold text-orange-800">
                    {totalCorrect}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-red-50 p-4">
                <p className="text-sm text-gray-600">Incorrect Answers</p>
                <p className="mt-2 text-2xl font-bold text-red-700">
                  {totalIncorrect}
                </p>
              </div>
            </div>

            {questions.length > 0 && (
              <div className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-2xl font-bold text-gray-800">
                  AI Quiz - 20 Questions
                </h2>

                {questions.map((q, index) => (
                  <div key={index} className="mb-6 border-b pb-5">
                    <h3 className="mb-3 font-semibold text-gray-800">
                      {index + 1}. {q.question}
                    </h3>

                    {q.options.map((option: string, optionIndex: number) => (
                      <label
                        key={optionIndex}
                        className="mb-2 flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-blue-50"
                      >
                        <input
                          type="radio"
                          name={`question-${index}`}
                          checked={selectedAnswers[index] === optionIndex}
                          disabled={showQuizResults}
                          onChange={() =>
                            handleAnswerSelect(index, optionIndex)
                          }
                        />
                        {option}
                      </label>
                    ))}

                    {showQuizResults && (
                      <div className="mt-3 rounded-lg bg-gray-50 p-3">
                        <p className="font-semibold text-green-700">
                          Correct Answer: {q.options[q.correctAnswer]}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {!showQuizResults ? (
                  <button
                    type="button"
                    onClick={handleSubmitQuiz}
                    className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
                  >
                    Submit Quiz
                  </button>
                ) : (
                  <div className="rounded-xl bg-blue-50 p-5">
                    <h3 className="text-xl font-bold text-blue-800">
                      Your Score:{" "}
                      {
                        questions.filter(
                          (q, index) =>
                            selectedAnswers[index] === q.correctAnswer,
                        ).length
                      }{" "}
                      / {questions.length}
                    </h3>
                    <p className="mt-2 text-gray-700">
                      Quiz completed! Review your explanations above.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          {selectedFile && (
            <p className="mt-4 text-sm font-semibold text-green-600">
              Selected: {selectedFile.name}
            </p>
          )}
          <p className="mt-3 text-xs text-slate-400">PDF files only</p>
        </section>

        <section>
          <div className="mb-5">
            <h3 className="text-2xl font-bold text-slate-900">Study Tools</h3>
            <p className="mt-1 text-sm text-slate-500">
              Everything you need to study effectively.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div
                  className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${feature.color}`}
                >
                  {feature.icon}
                </div>
                <h4 className="text-lg font-bold text-slate-900">
                  {feature.title}
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {feature.desc}
                </p>
                <p className="mt-4 text-sm font-semibold text-indigo-600">
                  Explore tool →
                </p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-12 border-t border-slate-200 py-6 text-center text-sm text-slate-400">
          © 2026 Insight Plus · Learn smarter, not harder.
        </footer>
      </main>
    </div>
  );
}
