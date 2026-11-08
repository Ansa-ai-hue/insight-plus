import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is missing." },
        { status: 500 },
      );
    }

    const body = await request.json();
    const text = body.text;
    const message = body.message;
    const history = Array.isArray(body.history) ? body.history : [];

    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Please enter a message." },
        { status: 400 },
      );
    }

    const conversation = history
      .slice(-8)
      .map(
        (item: { role: string; text: string }) =>
          `${item.role === "assistant" ? "Assistant" : "Student"}: ${item.text}`,
      )
      .join("\n");

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `You are Insight Plus, a helpful AI study tutor.

Answer the student's questions clearly and accurately.
Explain difficult concepts in simple student-friendly English.
Use the supplied study material when relevant.
If the answer is not in the material, say so honestly.
Never invent facts.

STUDY MATERIAL:
${typeof text === "string" ? text.slice(0, 12000) : "No study material uploaded."}

PREVIOUS CONVERSATION:
${conversation}

STUDENT'S NEW QUESTION:
${message}`,
      config: {
        temperature: 0.4,
      },
    });

    if (!response.text) {
      throw new Error("Gemini returned an empty response.");
    }

    return NextResponse.json({
      success: true,
      answer: response.text,
    });
  } catch (error) {
    console.error("Study Chat Error:", error);

    const apiError = error as { status?: number };

    return NextResponse.json(
      {
        error:
          apiError.status === 429
            ? "Gemini quota reached. Please try again later."
            : "Unable to get an answer. Please try again.",
      },
      { status: apiError.status === 429 ? 429 : 500 },
    );
  }
}
