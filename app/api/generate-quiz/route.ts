
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
};

const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

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

    if (typeof text !== "string" || text.trim().length < 50) {
      return NextResponse.json(
        { error: "Please upload a readable PDF first." },
        { status: 400 },
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    let response;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: `Create exactly 20 multiple-choice questions from this study material.

Return ONLY valid JSON in this format:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explanation of the correct answer"
    }
  ]
}

Rules:
- Generate exactly 20 different questions.
- Every question must have exactly 4 options.
- correctAnswer must be a number from 0 to 3.
- Include a clear explanation for every answer.
- Use only information from the PDF.
- Do not repeat questions.
- Return valid JSON only. No Markdown.

Study material:
${text.slice(0, 30000)}`,
          config: {
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        });

        break;
      } catch (error) {
        const apiError = error as { status?: number };

        if (apiError.status !== 503 || attempt === 3) {
          throw error;
        }

        console.log(`Gemini busy. Retrying quiz generation: attempt ${attempt + 1}`);
        await wait(attempt * 5000);
      }
    }

    const result = response?.text;

    if (!result) {
      throw new Error("Gemini returned an empty response.");
    }

    const quiz: { questions: QuizQuestion[] } = JSON.parse(result);

    if (!Array.isArray(quiz.questions) || quiz.questions.length !== 20) {
      throw new Error("Quiz must contain exactly 20 questions.");
    }

    for (const q of quiz.questions) {
      if (
        typeof q.question !== "string" ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        q.options.some((option) => typeof option !== "string") ||
        !Number.isInteger(q.correctAnswer) ||
        q.correctAnswer < 0 ||
        q.correctAnswer > 3 ||
        typeof q.explanation !== "string"
      ) {
        throw new Error("Invalid quiz question format.");
      }
    }

    return NextResponse.json({
      success: true,
      questions: quiz.questions,
    });
  } catch (error) {
    console.error("Gemini Quiz Error:", error);

    const apiError = error as { status?: number };

    if (apiError.status === 503) {
      return NextResponse.json(
        { error: "Gemini is busy right now. Please try again in a minute." },
        { status: 503 },
      );
    }

    if (apiError.status === 429) {
      return NextResponse.json(
        { error: "Gemini free-tier limit reached. Please try again later." },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: "Unable to generate quiz. Please try again." },
      { status: 500 },
    );
  }
}
